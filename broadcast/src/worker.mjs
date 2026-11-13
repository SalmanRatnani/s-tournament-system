import {DurableObject} from 'cloudflare:workers';
import {isScoreSnapshot, scoreDelta, scoreSnapshotIsNewer} from '../../src/lib/score-protocol.mjs';

const MAX_BYTES = 256 * 1024;
const RECONCILE_MS = 30_000;
const response = (body, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});

async function authorized(request, env) {
  if (!env.PUBLISH_SECRET || env.PUBLISH_SECRET.length < 32) return false;
  const actual = new TextEncoder().encode(request.headers.get('Authorization') || '');
  const expected = new TextEncoder().encode('Bearer ' + env.PUBLISH_SECRET);
  return actual.length === expected.length && crypto.subtle.timingSafeEqual(actual, expected);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return response({ok: true});
    if (path === '/publish' && request.method === 'POST') {
      if (!await authorized(request, env)) return response({error: 'Unauthorized'}, 401);
      return env.SCORES.getByName('public-tournament').fetch(request);
    }
    if (path === '/scores' && request.method === 'GET') {
      const origins = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim());
      if (!origins.includes(request.headers.get('Origin'))) return response({error: 'Origin not allowed'}, 403);
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return response({error: 'WebSocket required'}, 426);
      return env.SCORES.getByName('public-tournament').fetch(request);
    }
    return response({error: 'Not found'}, 404);
  }
};

export class ScoreRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.current = null;
    this.reconcileFlight = null;
    this.sourceHealthy = false;
    // Native auto-response avoids waking the object for viewer heartbeats.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.ctx.blockConcurrencyWhile(async () => {this.current = await this.ctx.storage.get('snapshot') || null;});
  }

  async reconcile() {
    if (this.reconcileFlight) return this.reconcileFlight;
    this.reconcileFlight = (async () => {
      const source = new URL(this.env.SOURCE_URL);
      if (source.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(source.hostname)) throw Error('Invalid source');
      const result = await fetch(source, {signal: AbortSignal.timeout(5000), redirect: 'manual'});
      if (!result.ok) throw Error('Score source unavailable');
      const text = await result.text();
      if (new TextEncoder().encode(text).length > MAX_BYTES) throw Error('Snapshot too large');
      const data = JSON.parse(text);
      if (!isScoreSnapshot(data)) throw Error('Invalid snapshot');
      await this.acceptSnapshot(data);
      this.setSourceHealth(true);
    })().finally(() => {this.reconcileFlight = null;});
    return this.reconcileFlight;
  }

  async acceptSnapshot(data) {
    // Serialize concurrent publish/reconciliation storage changes. No stale
    // response may regress either the stored snapshot or the broadcast revision.
    await this.ctx.blockConcurrencyWhile(async () => {
      if (this.current && !scoreSnapshotIsNewer(data, this.current.data)) return;
      const delta = this.current ? scoreDelta(this.current.data, data) : null;
      const revision = (this.current?.revision || 0) + (delta || !this.current ? 1 : 0);
      const message = this.current ? (delta ? {type: 'update', previousRevision: this.current.revision, revision, data: delta} : null) : {type: 'snapshot', revision, data};
      this.current = {revision, data};
      await this.ctx.storage.put('snapshot', this.current);
      if (!message) return;
      const encoded = JSON.stringify(message);
      for (const socket of this.ctx.getWebSockets()) {
        try {socket.send(encoded);} catch {try {socket.close(1011, 'Reconnect for scores');} catch {}}
      }
    });
  }

  setSourceHealth(healthy) {
    this.sourceHealthy = healthy;
    const encoded = JSON.stringify({type: 'status', healthy});
    for (const socket of this.ctx.getWebSockets()) {try {socket.send(encoded);} catch {}}
  }

  async fetch(request) {
    if (new URL(request.url).pathname === '/publish') {
      // This method is only routed after Worker authentication.
      if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return response({error: 'Too large'}, 413);
      const reader = request.body?.getReader();
      if (!reader) return response({error: 'Missing snapshot'}, 400);
      const parts = [];let bytes = 0;
      for (;;) {
        const {done, value} = await reader.read();if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {await reader.cancel();return response({error: 'Too large'}, 413);}
        parts.push(value);
      }
      try {
        const combined = new Uint8Array(bytes);let offset = 0;
        for (const part of parts) {combined.set(part, offset);offset += part.length;}
        const data = JSON.parse(new TextDecoder().decode(combined));
        if (!isScoreSnapshot(data)) return response({error: 'Invalid snapshot'}, 400);
        await this.acceptSnapshot(data);
        this.setSourceHealth(true);
        return response({ok: true, revision: this.current.revision});
      } catch {return response({error: 'Invalid snapshot'}, 400);}
    }
    const maximum = Math.min(2000, Math.max(1, Number(this.env.MAX_CONNECTIONS) || 1200));
    if (this.ctx.getWebSockets().length >= maximum) return response({error: 'Viewer capacity reached'}, 503);
    // Only the first join / reconnect after idle needs a source read. Concurrent
    // joins share it. An existing stored snapshot remains available on failure.
    if (!this.current || this.ctx.getWebSockets().length === 0) {
      try {await this.reconcile();} catch (error) {
        console.warn('Public score bootstrap failed', error instanceof Error ? error.message : 'Unknown error');
        this.setSourceHealth(false);
        if (!this.current) return response({error: 'Score source unavailable'}, 503);
      }
    }
    if (this.ctx.getWebSockets().length >= maximum) return response({error: 'Viewer capacity reached'}, 503);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({type: 'snapshot', ...this.current, sourceHealthy: this.sourceHealthy}));
    if (this.ctx.getWebSockets().length === 1) await this.ctx.storage.setAlarm(Date.now() + RECONCILE_MS);
    return new Response(null, {status: 101, webSocket: client});
  }

  async alarm() {
    if (!this.ctx.getWebSockets().length) return;
    try {await this.reconcile();} catch {this.setSourceHealth(false);console.warn('Public score reconciliation failed; retaining last snapshot');}
    if (this.ctx.getWebSockets().length) await this.ctx.storage.setAlarm(Date.now() + RECONCILE_MS);
  }
  async webSocketClose(socket, code) {
    try {socket.close(code === 1006 ? 1001 : code, 'Disconnected');} catch {}
    if (!this.ctx.getWebSockets().length) await this.ctx.storage.deleteAlarm();
  }
  webSocketMessage(socket) {socket.close(1008, 'Read-only scores');}
  webSocketError(socket) {try {socket.close(1011, 'Reconnect for scores');} catch {}}
}
