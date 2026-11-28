import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eventData,profileData,startAttempt,act,advance,view,ranked,digest,Fault} from '../server/domain.js';
import {db} from '../server/cloud.js';
import {play,publish,board,standings,certificates,verify} from '../server/competition.js';
import {dispatch} from '../server/handler.js';
const t=Date.now()-1200000;
const qs=Array.from({length:20},(_,i)=>({text:'Question '+(i+1),options:['A','B'],correctIndex:0}));
const e={...eventData({title:'Quiz',mode:'open',description:'',opens:t-10000,closes:t+300000,seconds:30,questions:qs}),id:'test'};
const u={uid:'u',email:'owner@example.org',verified:true};
const profile={uid:'u',username:'Echo',fullName:'Participant',phone:'9123456780'};
const attempt=()=>startAttempt(e,u,profile,t,'n1');
test('profile and verified email gate admission, exclusive closing instant',()=>{
 assert.throws(()=>startAttempt(e,{...u,verified:false},profile,t,'x'),/Verify/);
 assert.throws(()=>startAttempt(e,u,null,t,'x'),/profile/);
 assert.throws(()=>startAttempt(e,u,profile,e.closes,'x'),/over/);
 assert.equal(startAttempt(e,u,profile,e.closes-1,'x').deadline,e.closes-1+600000);
 assert.throws(()=>profileData({...profile,phone:'9999999999'},'u'),/10-digit/);
});
test('private paid list matches only verified email and is normalized',()=>{
 const paid={...e,mode:'paid',allowed:[digest('owner@example.org')]};
 assert.equal(startAttempt(paid,{...u,email:'OWNER@example.org'},profile,t,'n').status,'active');
 assert.throws(()=>startAttempt(paid,{...u,email:'other@example.org'},profile,t,'n'),/list/);
});
test('forward-only confirmation, double-click idempotence, refresh and expiry',()=>{
 const a=attempt();act(a,e,{action:'answer',index:0,option:0},t+4000);
 act(a,e,{action:'answer',index:0,option:0},t+6500);
 act(a,e,{action:'sync'},t+14000);
 assert.equal(a.index,1);assert.equal(a.score,1);assert.equal(a.opened,t+4000);
 act(a,e,{action:'answer',index:1,option:0},t+34000);
 assert.equal(a.index,2);assert.deepEqual(a.answers,[0,null]);assert.equal(a.elapsed,34000);
 assert.equal(view(a,e).question.correctIndex,undefined);
});
test('present all-timeout finisher earns zero, early departure is abandoned',()=>{
 const a=attempt();for(let i=1;i<=20;i++)act(a,e,{action:'sync'},t+i*30000);
 assert.equal(a.status,'completed');assert.equal(a.score,0);assert.equal(a.elapsed,600000);
 const early=attempt();advance(early,e,t+600001);assert.equal(early.status,'abandoned');
});
test('deduplicated warnings, third disqualifies, practice permits retakes',()=>{
 const a=attempt();for(const n of ['a','a','b','c'])act(a,e,{action:'incident',kind:'hidden',incident:n},t+1000);
 assert.equal(a.status,'disqualified');assert.equal(a.violations.length,3);
 const p={...a,practice:true,status:'active',violations:[]};act(p,e,{action:'incident',kind:'copy',incident:'x'},t+1100);assert.equal(p.violations.length,0);
});
test('score dominates elapsed time and exact ties share rank',()=>{
 const r=ranked([{username:'c',score:1,elapsed:2},{username:'d',score:2,elapsed:4},{username:'b',score:2,elapsed:3},{username:'a',score:2,elapsed:3}]);
 assert.deepEqual(r.map(v=>[v.username,v.rank]),[['a',1],['b',1],['d',3],['c',4]]);
});
test('leaving a one-question countdown earns no entry in the standings',async t=>{
 const event={...e,questions:[qs[0]],id:'single'};
 const docs=new Map();
 t.mock.method(db,'get',async path=>structuredClone(docs.get(path)||null));
 t.mock.method(db,'write',async changes=>{
   for(const {path,data} of changes)docs.set(path,{data:structuredClone(data),version:'1'});
 });
 docs.set('profiles/'+digest(u.uid),{data:profile});
 const startTime=Date.now();
 event.opens=startTime-1;event.closes=startTime+60000;
 const countdown=await play(event,u,{action:'start'},startTime);
 assert.equal(countdown.status,'countdown');
 const expired=await play(event,u,{action:'start'},startTime+33000);
 assert.equal(expired.status,'abandoned');
 const nextEvent={...event,id:'single-present'};
 const second=await play(nextEvent,u,{action:'start'},startTime);
 await play(nextEvent,u,{action:'sync',nonce:second.nonce},startTime+3000);
 const present=await play(nextEvent,u,{action:'sync',nonce:second.nonce},startTime+33000);
 assert.equal(present.status,'completed');
 assert.equal(present.score,0);
});
test('200 concurrent entrants, replay-safe starts and 4,000 answers, independent rankings and certificates',async()=>{
 const docs=new Map();let version=0,reads=0,writes=0,boardOffline=false;
 db.get=async key=>{reads++;return structuredClone(docs.get(key)||null)};
 db.write=async changes=>{
   if(changes.some(c=>(docs.get(c.path)?.version||undefined)!==c.version))throw new Fault(409,'Concurrent change.');
   for(const c of changes){const data=structuredClone(c.data);if(c.path.startsWith('attempts/')&&data.status==='completed')data.publishedAt=new Date(t+version).toISOString();
     docs.set(c.path,{data,version:String(++version)});writes++}
 };
 db.query=async(coll,filters=[],order=[],limit=500)=>{
   if(boardOffline)throw Error('rankings unavailable');
   const result=[...docs.entries()].filter(([key])=>key.startsWith(coll+'/')).map(([key,o])=>({...o.data,_id:key.split('/')[1]})).filter(r=>filters.every(([k,op,v])=>op==='EQUAL'?r[k]===v:r[k]>=(v.timestamp||v)));
   for(const [k,dir] of [...order].reverse())result.sort((a,b)=>(a[k]>b[k]?1:a[k]===b[k]?0:-1)*(dir==='ASCENDING'?1:-1));
   reads+=Math.max(1,Math.min(result.length,limit));return result.slice(0,limit)
 };
 const published=await publish(e),event={...e,id:published.id};
 const users=Array.from({length:200},(_,i)=>({uid:'uid'+i,email:'participant'+i+'@example.org',verified:true}));
 await Promise.all(users.map(user=>db.write([{path:'profiles/'+digest(user.uid),data:{...profile,username:user.uid}}])));
 await assert.rejects(dispatch('POST','admin/events',{},users[0]),/Administrator/);
 const [states,concurrentStart]=await Promise.all([
   Promise.all(users.map(user=>play(event,user,{action:'start'},t))),
   play(event,users[0],{action:'start'},t)
 ]);
 assert.equal(concurrentStart.nonce,states[0].nonce);
 const duplicates=await Promise.all([play(event,users[0],{action:'start'},t),play(event,users[0],{action:'start'},t)]);
 assert.equal(duplicates[0].nonce,states[0].nonce);
 await assert.rejects(play(event,{...users[1],email:users[0].email,uid:'unregistered'},{action:'start'},t),/profile/);
 await db.write([{path:'profiles/'+digest('alternate-uid'),data:profile}]);
 await assert.rejects(play(event,{...users[0],uid:'alternate-uid'},{action:'start'},t),/already used/);
 boardOffline=true;
 for(let i=0;i<20;i++)await Promise.all(users.map((user,j)=>play(event,user,{action:'answer',index:i,option:j===0?1:0,nonce:states[j].nonce},t+3000+(i+1)*1000)));
 const receipt=await play(event,users[1],{action:'answer',index:19,option:0,nonce:states[1].nonce},t+25000);
 assert.equal(receipt.status,'completed');assert.equal(receipt.score,20);assert.equal(receipt.elapsed,20000);
 boardOffline=false;const table=standings(await board(event));assert.equal(table.length,200);assert.equal(table.at(-1).rank,200);assert.equal(table.at(-1).score,0);
 const owned=await certificates(users[0]);assert.equal(owned.length,1);assert.equal(owned[0].username,'uid0');
 assert.deepEqual(await certificates({uid:'spectator'}),[]);
 assert.equal((await verify(owned[0].id)).valid,true);assert.equal((await verify(owned[0].id)).fullName,undefined);
 await assert.rejects(verify(owned[0].id.slice(0,-1)+'E'),/not found/);
 assert.ok(writes<20000);assert.ok(reads<50000);console.log('Simulated document operations:',{reads,writes});
});
