import {randomUUID} from 'node:crypto';
import {db,mutate} from './cloud.js';
import {requireThat,Fault,digest,emailKey,idOK,publicEvent,startAttempt,act,view,ranked} from './domain.js';
const decks=new Map();
export async function deck(id){
  requireThat(idOK(id),400,'Invalid competition.');
  if(decks.has(id))return decks.get(id);
  const e=(await db.get('decks/'+id))?.data;
  requireThat(e,404,'Competition not found.');
  if(decks.size>=16)decks.delete(decks.keys().next().value);
  decks.set(id,e);return e;
}
export async function publish(event){
  const e={...event,id:randomUUID()};
  await db.write([{path:'events/'+e.id,data:publicEvent(e)},{path:'decks/'+e.id,data:e}]);return publicEvent(e);
}
export const attemptId=(eventId,uid)=>digest('attempt',eventId,uid);
export async function play(e,u,b,now=Date.now()){
  const id=attemptId(e.id,u.uid),path='attempts/'+id;
  if(b.action==='start'){
    const existing=await db.get(path);
    if(existing && !(e.mode==='practice'&&b.retry===true&&existing.data.status!=='active')){
      if(existing.data.status!=='active'||now<existing.data.started)return view(existing.data,e);
      return play(e,u,{action:'sync',nonce:existing.data.nonce},now);
    }
    const profile=(await db.get('profiles/'+digest(u.uid)))?.data;
    const a=startAttempt(e,u,profile,now,randomUUID());
    a.started+=3000;a.opened+=3000;a.deadline+=3000;
    // Starting returns the countdown. The first sync delivers question zero.
    a.lastSeenIndex=-1;
    const writes=[{path,data:a,version:existing?.version}];
    if(!existing&&!a.practice)writes.push({path:'entries/'+digest(e.id,emailKey(u.email)),data:{uid:u.uid}});
    try{await db.write(writes)}catch(error){
      if(error.status!==409)throw error;
      const saved=await db.get(path);requireThat(saved,409,'This email already used its entry.');return view(saved.data,e);
    }
    return view(a,e);
  }
  const a=await mutate(path,old=>{
    requireThat(old,404,'Start this quiz first.');
    requireThat(b.nonce===old.nonce,409,'Reopen the current attempt.');
    if(old.status!=='active')return null;
    if(now<old.started)return null;
    const updated=structuredClone(old);act(updated,e,b,Math.max(now,old.opened));
    return JSON.stringify(old)===JSON.stringify(updated)?null:updated;
  });
  return view(a,e);
}
export async function stage(e,now=Date.now()){
  if(now<e.closes)return false;
  // Expired clients may have closed their browser. Settle them without a scheduled job.
  for(let pass=0;pass<24;pass++){
    const active=await db.query('attempts',[['eventId','EQUAL',e.id],['status','EQUAL','active']],[],25,['deadline','opened','index','lastSeenIndex']);
    if(!active.length)return true;
    const expired=active.filter(a=>a.deadline<now || (a.index===e.questions.length-1 && a.opened+e.seconds*1000<=now));
    if(!expired.length)return false;
    await Promise.all(expired.map(a=>mutate('attempts/'+a._id,old=>{
      if(old.status!=='active')return null;
      const v=structuredClone(old);
      // advance() distinguishes a delivered final question from an early departure.
      act(v,e,{action:'sync'},now);return v;
    })));
    if(expired.length<active.length)return false;
  }
  return false;
}
export async function board(e){
  if(e.mode==='practice')return {rows:[],final:false};
  const path='boards/'+e.id;
  const saved=await db.get(path);
  if(saved?.data.final)return saved.data;
  const final=await stage(e);
  if(saved&&!final&&Date.now()-saved.data.checked<30000)return saved.data;
  const records={...(saved?.data.records||{})};
  // Firestore commit timestamps advance when completed attempts are first persisted.
  const filters=[['eventId','EQUAL',e.id],['status','EQUAL','completed']];
  if(saved?.data.cursor)filters.push(['publishedAt','GREATER_THAN_OR_EQUAL',{timestamp:saved.data.cursor}]);
  const changes=await db.query('attempts',filters,[['publishedAt','ASCENDING']],1000,['username','score','elapsed','publishedAt']);
  let cursor=saved?.data.cursor||null;
  for(const row of changes){records[row._id]={username:row.username,score:row.score,elapsed:row.elapsed};cursor=row.publishedAt}
  const snapshot={records,cursor,final,checked:Date.now()};
  try{await db.write([{path,data:snapshot,version:saved?.version}])}catch(err){if(err.status!==409)throw err}
  return snapshot;
}
export function standings(snapshot){return ranked(Object.values(snapshot.records||{}))}
export async function place(a,e){
  const s=await board(e);if(!s.final)return null;
  return 1+Object.values(s.records).filter(v=>v.score>a.score||(v.score===a.score&&v.elapsed<a.elapsed)).length;
}
export async function certificates(u){
  const attempts=await db.query('attempts',[['uid','EQUAL',u.uid],['status','EQUAL','completed']],[],1000,['eventId','practice','fullName','username','score','elapsed','finished']);
  const out=[];
  for(const a of attempts.filter(x=>!x.practice)){
    const e=await deck(a.eventId);
    const rank=await place(a,e);
    if(!rank)continue;
    for(const type of rank<=3?['participation','excellence']:['participation']){
      out.push({id:a._id+(type==='excellence'?'-E':'-P'),type,fullName:a.fullName,username:a.username,eventTitle:e.title,issuedAt:e.closes,rank,score:a.score});
    }
  }
  return out.sort((a,b)=>b.issuedAt-a.issuedAt);
}
export async function verify(id){
  requireThat(/^[a-f0-9]{64}-(P|E)$/.test(id),404,'Certificate not found.');
  const a=(await db.get('attempts/'+id.slice(0,-2)))?.data;
  requireThat(a?.status==='completed'&&!a.practice,404,'Certificate not found.');
  const e=await deck(a.eventId),rank=await place(a,e);
  requireThat(rank && (!id.endsWith('-E')||rank<=3),404,'Certificate not found.');
  return {valid:true,eventTitle:e.title,type:id.endsWith('-E')?'excellence':'participation',issuedAt:e.closes,username:a.username};
}
