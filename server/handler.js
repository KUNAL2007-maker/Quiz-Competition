import {db,identify,mutate} from './cloud.js';
import {emailKey,digest,requireThat,profileData,eventData,Fault} from './domain.js';
import {deck,play,publish,board,standings,certificates,verify,stage,attemptId} from './competition.js';
import {mailRoute} from './mail.js';
async function parse(req){
  if(req.body!==undefined){const s=typeof req.body==='string'?req.body:JSON.stringify(req.body);requireThat(Buffer.byteLength(s)<600000,413,'Upload is too large.');return JSON.parse(s)}
  const chunks=[];let len=0;
  for await(const b of req){len+=b.length;requireThat(len<600000,413,'Upload is too large.');chunks.push(b)}
  return JSON.parse(Buffer.concat(chunks).toString()||'{}');
}
export async function dispatch(method,path,b,user,ip){
  const [key,id,op]=path.split('/').filter(Boolean);
  const get=method==='GET',post=method==='POST';
  if(key==='events'&&get&&!id)return {events:await db.query('events',[],[['opens','DESCENDING']],500)};
  if(key==='board'&&get){const e=await deck(id);const s=await board(e);return {rows:standings(s),final:s.final,updatedAt:s.checked}}
  if(key==='verify'&&get)return verify(id);
  if(key==='mail'&&id==='reset'&&post){await mailRoute(id,b,null,ip);return {ok:true}}
  requireThat(user,401,'Sign in to continue.');
  if(key==='me'&&get)return {admin:user.admin,profile:(await db.get('profiles/'+digest(user.uid)))?.data||null};
  if(key==='profile'&&post){const data=profileData(b,user.uid);await mutate('profiles/'+digest(user.uid),()=>data);return {profile:data}}
  if(key==='mail'&&post&&['verify','link','confirm'].includes(id)){await mailRoute(id,b,user,ip);return {ok:true}}
  if(key==='admin'&&post&&id==='events'){requireThat(user.admin,403,'Administrator access required.');return {event:await publish(eventData(b))}}
  if(key==='certificates'&&get)return {certificates:await certificates(user)};
  if(key==='quiz'&&id){
    const e=await deck(id);
    if(post && !op)return play(e,user,b);
    if(get && op==='review'){
      const a=(await db.get('attempts/'+attemptId(id,user.uid)))?.data;
      requireThat(a?.status==='completed'&&(a.practice||await stage(e)),403,'Answer review opens after the event finishes.');
      return {questions:e.questions.map((q,i)=>({...q,chosenIndex:a.answers[i]}))};
    }
    if(get && !op){const a=(await db.get('attempts/'+attemptId(id,user.uid)))?.data;return {attempt:a?{status:a.status,nonce:a.nonce}:null}}
  }
  throw new Fault(404,'Page not found.');
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');
  try{
    const url=new URL(req.url,'http://localhost');
    const route=(url.searchParams.get('route')||url.pathname.replace(/^\/api\/?/,'')).replace(/^\/+|\/+$/g,'');
    const pub=req.method==='GET'&&['events','board','verify'].includes(route.split('/')[0]);
    requireThat(['GET','POST'].includes(req.method),405,'Method not allowed.');
    if(req.method==='POST')requireThat(req.headers['content-type']?.includes('application/json'),415,'Send JSON data.');
    let b={};if(req.method==='POST'){try{b=await parse(req)}catch(e){if(e.status)throw e;throw new Fault(400,'Invalid request data.')}}
    requireThat(b&&typeof b==='object'&&!Array.isArray(b),400,'Invalid request data.');
    const user=pub?null:await identify(req);
    const result=await dispatch(req.method,route,b,user,req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown');
    if(pub)res.setHeader('Cache-Control','public, max-age=0, s-maxage='+(result.final?3600:route==='events'?10:15));
    res.statusCode=200;res.end(JSON.stringify({...result,serverNow:Date.now()}));
  }catch(err){res.statusCode=err.status||503;if(!err.status)console.error('api failure',err.code||err.name);res.end(JSON.stringify({error:err.status?err.message:'Temporarily unavailable. Please try again.'}))}
}
