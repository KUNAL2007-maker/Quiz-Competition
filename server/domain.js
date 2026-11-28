import {createHash} from 'node:crypto';
export class Fault extends Error {
  constructor(status,message){super(message);this.status=status}
}
export function requireThat(ok,status,message){if(!ok)throw new Fault(status,message)}
export const digest=(...parts)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
export const emailKey=email=>String(email||'').trim().toLowerCase();
export const idOK=id=>/^[a-zA-Z0-9_-]{1,96}$/.test(id||'');
function field(value,max,label){
  requireThat(typeof value==='string' && value.trim().length>0 && value.trim().length<=max,400,'Check '+label+'.');
  return value.trim();
}
export function profileData(body,uid){
  const fullName=field(body.fullName,90,'your full name');
  const username=field(body.username||'Operator-'+digest(uid).slice(0,8),32,'your username');
  requireThat(/^[\p{L}\p{N}_. -]+$/u.test(username),400,'Use letters, numbers, spaces, dots, dashes or underscores for your username.');
  const phone=String(body.phone||'').replace(/[\s()-]/g,'').replace(/^\+91/,'');
  requireThat(/^[6-9]\d{9}$/.test(phone) && !/^(\d)\1{9}$/.test(phone) && !['9876543210','6789012345'].includes(phone),400,'Enter a valid 10-digit Indian mobile number.');
  return {uid,fullName,username,phone};
}
export function eventData(b){
  const title=field(b.title,120,'the event title');
  const description=String(b.description||'').trim().slice(0,1500);
  requireThat(['open','paid','practice'].includes(b.mode),400,'Choose the event type.');
  const {opens,closes,seconds}=b;
  requireThat(Number.isSafeInteger(opens)&&Number.isSafeInteger(closes)&&opens<closes,400,'Choose a valid entry window.');
  requireThat(Number.isInteger(seconds)&&seconds>=5&&seconds<=300,400,'Choose 5–300 seconds per question.');
  requireThat(Array.isArray(b.questions)&&b.questions.length>0&&b.questions.length<=100,400,'Upload 1–100 questions.');
  const questions=b.questions.map((q,i)=>{
    requireThat(q && typeof q==='object' && Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=6&&Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<q.options.length,400,'Check the options and correctIndex on question '+(i+1)+'.');
    return {text:field(q.text,1200,'question '+(i+1)),options:q.options.map(o=>field(o,300,'an answer option')),correctIndex:q.correctIndex};
  });
  requireThat(Buffer.byteLength(JSON.stringify(questions))<450000,400,'Question file is too large.');
  const list=b.emails||[];
  requireThat(Array.isArray(list)&&list.length<=2000,400,'Upload up to 2,000 email addresses.');
  const allowed=[...new Set(list.map(emailKey))];
  if(b.mode==='paid')requireThat(allowed.length&&allowed.every(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&x.length<255),400,'Supply valid registered email addresses.');
  return {title,description,mode:b.mode,opens,closes,seconds,questions,allowed:b.mode==='paid'?allowed.map(x=>digest(x)):[]};
}
export function publicEvent(e){
  return {id:e.id,title:e.title,description:e.description,mode:e.mode,opens:e.opens,closes:e.closes,seconds:e.seconds,count:e.questions.length};
}
export function startAttempt(event,user,profile,now,nonce){
  requireThat(user.verified,403,'Verify your email before starting.');
  requireThat(profile?.fullName&&profile.phone,403,'Complete your profile before starting.');
  requireThat(now>=event.opens&&now<event.closes,409,now<event.opens?'Entry has not opened yet.':'This quiz is over.');
  requireThat(event.mode!=='paid'||event.allowed.includes(digest(emailKey(user.email))),403,'This email is not on the paid entry list.');
  return {uid:user.uid,eventId:event.id,username:profile.username,fullName:profile.fullName,status:'active',practice:event.mode==='practice',index:0,opened:now,started:now,deadline:now+event.questions.length*event.seconds*1000,answers:[],elapsed:0,score:0,violations:[],nonce,lastSeenIndex:0};
}
function record(a,e,option,ms){
  a.answers.push(option);
  a.score+=Number(option===e.questions[a.index].correctIndex);
  a.elapsed+=ms;
  a.index++;
  a.opened+=ms;
}
export function advance(a,e,now){
  if(a.status!=='active')return;
  const limit=e.seconds*1000;
  while(a.index<e.questions.length && now>=a.opened+limit)record(a,e,null,limit);
  if(a.index===e.questions.length){
    a.status=a.lastSeenIndex===e.questions.length-1?'completed':'abandoned';a.finished=a.opened;
  }
}
export function act(a,e,b,now){
  const duration=e.seconds*1000;
  const currentBefore=a.index;
  advance(a,e,now);
  if(a.status!=='active')return;
  if(b.action==='incident'){
    requireThat(idOK(b.incident)&&['hidden','copy','paste','cut'].includes(b.kind),400,'Invalid warning.');
    if(!a.practice&&!a.violations.includes(b.incident)){
      a.violations.push(b.incident);
      if(a.violations.length>=3){a.status='disqualified';a.finished=now;return}
    }
  }else if(b.action==='answer'){
    requireThat(Number.isInteger(b.index)&&b.index>=0&&b.index<=a.index,409,'Refresh this question.');
    if(b.index===a.index && currentBefore===a.index){
      requireThat(Number.isInteger(b.option)&&b.option>=0&&b.option<e.questions[a.index].options.length,400,'Select an option.');
      record(a,e,b.option,Math.max(0,Math.min(duration,now-a.opened)));
      if(a.index===e.questions.length){a.status='completed';a.finished=now;return}
    }
  }else requireThat(b.action==='sync',400,'Unknown quiz action.');
  a.lastSeenIndex=a.index;
}
export function view(a,e){
  const base={status:a.status,index:a.index,nonce:a.nonce,count:e.questions.length,warnings:a.violations.length,deadline:a.deadline};
  if(a.status==='active'&&Date.now()<a.started)return {...base,status:'countdown',begins:a.started};
  if(a.status==='active'){const q=e.questions[a.index];return {...base,question:{text:q.text,options:q.options},expires:a.opened+e.seconds*1000}}
  return {...base,score:a.score,elapsed:a.elapsed};
}
export function ranked(rows){
  const sorted=rows.toSorted((a,b)=>b.score-a.score||a.elapsed-b.elapsed||a.username.localeCompare(b.username));
  let rank=0;
  return sorted.map((row,i)=>{if(!i||row.score!==sorted[i-1].score||row.elapsed!==sorted[i-1].elapsed)rank=i+1;return {username:row.username,score:row.score,elapsed:row.elapsed,rank}});
}
