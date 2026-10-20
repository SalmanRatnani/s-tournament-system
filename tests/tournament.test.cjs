const test=require('node:test');const assert=require('node:assert/strict');
// Self-contained smoke tests work without a TS transpiler dependency.
function fixtures(ids){const r=[...ids],o=[];for(let n=1;n<=5;n++){for(let c=1;c<=3;c++)o.push([r[c-1],r[6-c]]);r.splice(1,0,r.pop())}return o}
test('six teams have exactly fifteen distinct fixtures',()=>{const x=fixtures([1,2,3,4,5,6]);assert.equal(x.length,15);assert.equal(new Set(x.map(x=>x.slice().sort().join('-'))).size,15)});
test('five rounds contain each team exactly once',()=>{const x=fixtures([1,2,3,4,5,6]);for(let i=0;i<5;i++){assert.deepEqual(x.slice(i*3,i*3+3).flat().sort(),[1,2,3,4,5,6]);}});
