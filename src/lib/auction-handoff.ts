/** Stable, versioned interchange contract; JSON contains image filenames/URLs, not binary photo bytes. */
export type AuctionPlayer = {
  source_player_id:string;player_code:string|null;name:string;category:string|null;
  image_filename:string|null;image_url:string|null;image_storage_path:string|null;
  is_captain:boolean;is_playing_captain:boolean;auction_amount:number|null;
  metadata:Record<string,unknown>;
};
export type AuctionTeam={source_team_id:string;name:string;captain_name:string|null;logo_filename:string|null;logo_url:string|null;players:AuctionPlayer[];metadata:Record<string,unknown>};
export type AuctionHandoff={format:"s-tournament-auction-handoff";version:1;exported_at:string;source:{system:"s-auction-system";auction_id:string|null;status:"completed"};teams:AuctionTeam[]};
const bad=(msg:string):never=>{throw Error(msg)};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:bad("Expected an object");
const str=(v:unknown,label:string,max=180)=>typeof v==="string"&&v.trim()&&v.length<=max?v.trim():bad(`Invalid ${label}`);
const optional=(v:unknown,label:string,max=255)=>v==null||v===""?null:str(v,label,max);
const safeURL=(v:unknown,label:string):string|null=>{const value=optional(v,label,2048);if(!value)return null;try{const u=new URL(value);if(u.protocol!=="https:")bad(`${label} must be an HTTPS URL`);if(u.username||u.password)bad(`${label} must not contain credentials`);return value;}catch{return bad(`Invalid ${label}`)}};
/** Reject unknown shapes before reaching privileged import RPC. */
export function validateAuctionHandoff(raw:unknown,strictRoster=true):AuctionHandoff{
 const d=obj(raw);if(d.format!=="s-tournament-auction-handoff"||d.version!==1)bad("Unsupported interchange file/version");
 const source=obj(d.source);if(source.system!=="s-auction-system"||source.status!=="completed")bad("Only completed s-auction-system exports are accepted");
 const teamInputs:unknown[]=Array.isArray(d.teams)?d.teams:bad("Expected six teams");
 if((!strictRoster&&teamInputs.length>6)||(strictRoster&&teamInputs.length!==6))bad("Expected six teams");
 const names=new Set<string>(),teamIds=new Set<string>(),allIds=new Set<string>();
 const teams:AuctionTeam[]=teamInputs.map((input,i)=>{
  const t=obj(input);const name=str(t.name,`team ${i+1} name`,80), id=str(t.source_team_id,"team ID");
  if(names.has(name.toLowerCase())||teamIds.has(id))bad("Duplicate teams in export");names.add(name.toLowerCase());teamIds.add(id);
  const playerInputs:unknown[]=Array.isArray(t.players)?t.players:bad(`Invalid players for ${name}`);
  if(playerInputs.length>18||(strictRoster&&playerInputs.length!==18))bad(`Team ${name} must contain exactly 18 players`);
  const playerNames=new Set<string>();
  const players:AuctionPlayer[]=playerInputs.map((input,j)=>{
   const p=obj(input),pid=str(p.source_player_id,`player ${j+1} ID`),pn=str(p.name,`player ${j+1} name`,120);
   if(allIds.has(pid)||playerNames.has(pn.toLowerCase()))bad(`Duplicate player in export: ${pn}`);
   allIds.add(pid);playerNames.add(pn.toLowerCase());
   const amount=p.auction_amount==null?null:p.auction_amount;
   if(amount!==null&&(typeof amount!=="number"||!Number.isFinite(amount)||amount<0||amount>1e12))bad(`Invalid auction amount for ${pn}`);
   const image_filename=optional(p.image_filename,"image filename",255);
   const image_storage_path=optional(p.image_storage_path,"image storage path",500);
   if(image_filename&&(/[\\/\x00-\x1f]/.test(image_filename)||image_filename==="."||image_filename===".."))bad("Image filename must be a basename");
   return {source_player_id:pid,name:pn,player_code:optional(p.player_code,"player code",70),category:optional(p.category,"category",70),
     image_filename,image_url:safeURL(p.image_url,"player image"),image_storage_path,is_captain:p.is_captain===true,
     is_playing_captain:p.is_playing_captain===true,auction_amount:amount as number|null,metadata:obj(p.metadata??{})};
  });
  return {source_team_id:id,name,captain_name:optional(t.captain_name,"captain name",120),logo_filename:optional(t.logo_filename,"logo filename",255),logo_url:safeURL(t.logo_url,"team logo"),players,metadata:obj(t.metadata??{})};
 });
 return {format:"s-tournament-auction-handoff",version:1,exported_at:str(d.exported_at,"export date",40),source:{system:"s-auction-system",auction_id:optional(source.auction_id,"auction ID",100),status:"completed"},teams};
}
