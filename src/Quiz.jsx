import React,{useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useAccount,Msg} from './account';
import {useEvents} from './events';
import {api,date,duration} from './client';
function sound(ctx,frequency){if(!ctx||ctx.state!=='running')return;const tone=ctx.createOscillator(),gain=ctx.createGain();tone.type='sine';tone.frequency.value=frequency;gain.gain.setValueAtTime(.055,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.17);tone.connect(gain);gain.connect(ctx.destination);tone.start();tone.stop(ctx.currentTime+.18)}
export default function Quiz(){const {id}=useParams(),{user}=useAccount();return <Attempt key={id+':'+(user?.uid||'')} id={id}/>}
function Attempt({id}){
 const {user,profile,loading:authLoading}=useAccount(),{events,error:dirError,loading}=useEvents(),e=events.find(x=>x.id===id);
 const [state,setState]=useState(null),[loaded,setLoaded]=useState(false),[option,setOption]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[tick,setTick]=useState(0),[review,setReview]=useState(null);
 const active=useRef(null),clock=useRef(0),chain=useRef(Promise.resolve()),mounted=useRef(true),nextSync=useRef(0),audio=useRef(null),beep=useRef(-1),inFlight=useRef(false);
 const path='/quiz/'+id;
 const apply=r=>{if(!mounted.current)return;clock.current=r.serverNow-Date.now();if(r.index!==active.current?.index||r.nonce!==active.current?.nonce)setOption(null);active.current=r;setState(r)};
 const pendingKey=(a)=>'no-incidents:'+user.uid+':'+id+':'+a.nonce;
 function pending(a){try{return JSON.parse(sessionStorage.getItem(pendingKey(a))||'[]')}catch{return []}}
 async function flush(a){
   const key=pendingKey(a);
   for(const incident of pending(a)){const response=await api(path,{action:'incident',nonce:a.nonce,...incident});apply(response);
     sessionStorage.setItem(key,JSON.stringify(pending(a).filter(i=>i.incident!==incident.incident)));if(response.status!=='active')break}
 }
 function enqueue(task){
   chain.current=chain.current.then(async()=>{if(!mounted.current)return;try{setMsg('');await task()}catch(err){if(mounted.current)setMsg(err.message)}});
   return chain.current;
 }
 function sync(){
   if(inFlight.current)return;inFlight.current=true;
   return enqueue(async()=>{const a=active.current;if(a?.nonce){await flush(a);apply(await api(path,{action:'sync',nonce:a.nonce}))}}).finally(()=>{inFlight.current=false});
 }
 useEffect(()=>{mounted.current=true;let alive=true;
   if(user){api(path).then(async r=>{if(!alive)return;if(r.attempt){active.current=r.attempt;await sync()}}).catch(err=>alive&&setMsg(err.message)).finally(()=>alive&&setLoaded(true))}else setLoaded(true);
   return()=>{mounted.current=false;alive=false;audio.current?.close().catch(()=>{})}},[id,user?.uid]);
 useEffect(()=>{if(!['active','countdown'].includes(state?.status))return;
  const timer=setInterval(()=>{const now=Date.now()+clock.current;setTick(n=>n+1);
   const remaining=(state.status==='countdown'?state.begins:state.expires)-now;
   if(state.status==='countdown'){const n=Math.ceil(remaining/1000);if(n!==beep.current&&n>=0){beep.current=n;sound(audio.current,n?480:880)}}
   if(remaining<=0&&Date.now()>nextSync.current){nextSync.current=Date.now()+2500;sync()}
  },200);
  const online=()=>sync();window.addEventListener('online',online);return()=>{clearInterval(timer);window.removeEventListener('online',online)}
 },[state?.index,state?.status,state?.nonce]);
 useEffect(()=>{if(state?.status!=='active'||e?.mode==='practice')return;
   function incident(ev){if(ev.type==='visibilitychange'&&!document.hidden)return;
     if(ev.type!=='visibilitychange')ev.preventDefault();const a=active.current;if(a?.status!=='active')return;
     const value={incident:crypto.randomUUID(),kind:ev.type==='visibilitychange'?'hidden':ev.type};
     try{sessionStorage.setItem(pendingKey(a),JSON.stringify([...pending(a),value].slice(0,3)))}catch{enqueue(async()=>apply(await api(path,{action:'incident',nonce:a.nonce,...value})));return}
     enqueue(()=>flush(a));
   }
   const kinds=['visibilitychange','copy','paste','cut'];kinds.forEach(k=>document.addEventListener(k,incident));return()=>kinds.forEach(k=>document.removeEventListener(k,incident));
 },[state?.status,state?.nonce,e?.mode]);
 async function start(retry=false){setBusy(true);try{const C=window.AudioContext||window.webkitAudioContext;if(C&&localStorage.getItem('origin-countdown-sound')!=='off'){audio.current??=new C();await audio.current.resume().catch(()=>{})}
 apply(await api(path,{action:'start',retry}));setMsg('');setReview(null)}catch(error){setMsg(error.message)}finally{setBusy(false)}}
 async function answer(){if(busy||option===null)return;const shown=active.current;setBusy(true);await enqueue(async()=>{await flush(shown);apply(await api(path,{action:'answer',nonce:shown.nonce,index:shown.index,option}))});setBusy(false)}
 const now=Date.now()+clock.current;
 if(loading||authLoading||!loaded)return <p role="status">Loading competition…</p>;
 if(!e)return <section className="page"><h1>Competition unavailable</h1><Msg>{dirError}</Msg><Link to="/competitions">Browse competitions</Link></section>;
 const retrySync=active.current?.nonce?<button onClick={sync}>Reconnect to attempt</button>:null;
 return <section className="page narrow"><p className="eyebrow">{e.mode==='practice'?'Practice arena':'Official competition'}</p><h1>{e.title}</h1><Msg>{msg}</Msg>{msg&&retrySync}
 {state?.status==='countdown'?<div className="panel countdown" aria-live="polite"><h2>Get ready</h2><strong>{Math.max(0,Math.ceil((state.begins-now)/1000))||'GO!'}</strong></div>:state?.status==='active'?<div className="panel stack quiz"><div className="actions spread"><strong>Question {state.index+1} of {e.count}</strong><span className="time">{Math.max(0,Math.ceil((state.expires-now)/1000))} sec</span></div>
 <progress value={state.index} max={e.count} aria-label="Quiz progress"/>{state.warnings>0&&<p className="notice" role="alert">Warning {state.warnings} of 2. A third incident ends this official attempt.</p>}
 <fieldset disabled={busy||now>=state.expires}><legend>{state.question.text}</legend>{state.question.options.map((o,i)=><label className={'choice '+(i===option?'chosen':'')} key={i}><input type="radio" name="answer" checked={i===option} onChange={()=>setOption(i)}/><span>{o}</span></label>)}</fieldset>
 <button className="btn bottom" disabled={busy||option===null||now>=state.expires} onClick={answer}>{busy?'Saving…':state.index+1===e.count?'Submit Quiz':'Next'}</button></div>:
 state?<div className="panel stack"><h2>{state.status==='completed'?'Quiz complete':state.status==='disqualified'?'Disqualified':'Attempt abandoned'}</h2>
 {state.status==='completed'?<><p className="score">{state.score} / {e.count}</p><p>Total time · {duration(state.elapsed)}</p><p>Your submission is saved.</p><button onClick={async()=>{try{const r=await api(path+'/review');setReview(r.questions);setMsg('')}catch(err){setMsg(err.message)}}}>View answer review</button>{review?.map((q,i)=><div className="review" key={i}><strong>{i+1}. {q.text}</strong><p>Your answer · {q.options[q.chosenIndex]||'Not answered'}</p><p>Correct answer · {q.options[q.correctIndex]}</p></div>)}</>:<p>This attempt is closed and does not qualify for standings or certificates.</p>}
 {e.mode==='practice'?<button onClick={()=>start(true)} disabled={busy}>Practice again</button>:<Link className="btn" to={'/leaderboard/'+id}>View live rankings</Link>}</div>:
 <div className="panel stack"><h2>Tournament briefing</h2><p>{e.description}</p><p>{e.count} questions · {e.seconds} seconds each · {duration(e.count*e.seconds*1000)} maximum</p><p>Entry closes {date(e.closes)}. Start before closing to receive your full attempt.</p>
 <ul><li>Select an option and tap Next. On the final question, tap Submit Quiz.</li><li>Unconfirmed answers expire. You can only move forward.</li><li>Your score comes first in rankings. Faster total time breaks a tie.</li>{e.mode!=='practice'&&<li>Switching tabs, copying, cutting or pasting triggers a warning. A third incident disqualifies you from this event.</li>}</ul>
 {now>=e.closes?<p>This quiz is over.</p>:now<e.opens?<p>Entry opens {date(e.opens)}.</p>:!user?<Link className="btn" to={'/login?next='+encodeURIComponent(path)}>Sign in to enter</Link>:!profile||!user.emailVerified?<Link className="btn" to={'/profile?required=1&next='+encodeURIComponent(path)}>Complete profile and verify email</Link>:<button className="btn" onClick={()=>start()} disabled={busy}>{busy?'Starting…':'Start Quiz'}</button>}</div>}</section>
}
