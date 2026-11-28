import React,{createContext,useCallback,useContext,useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {api,date,duration} from './client';
import {useAccount,Msg} from './account';
const Events=createContext(null);
export const useEvents=()=>useContext(Events);
export function EventsProvider({children}){
 const [state,set]=useState({events:[],loading:true,error:''});
 const refresh=useCallback(async()=>{try{const r=await api('/events');set({events:r.events,error:'',loading:false})}catch(e){set(s=>({...s,error:e.message,loading:false}))}},[]);
 useEffect(()=>{refresh();const tick=()=>{if(document.visibilityState==='visible')refresh()};const id=setInterval(tick,60000);return()=>clearInterval(id)},[refresh]);
 return <Events.Provider value={{...state,refresh}}>{children}</Events.Provider>
}
export function Competitions(){
 const {events,loading,error,refresh}=useEvents();
 return <section className="page"><p className="eyebrow">Tournament directory</p><h1>Competitions</h1><Msg>{error}</Msg>{error&&<button onClick={refresh}>Retry directory</button>}{loading?<p>Loading competitions…</p>:!events.length&&!error?<div className="panel"><h2>No competitions scheduled</h2><p>Published events will appear here.</p></div>:<div className="cards">{events.map(e=><article key={e.id} className="panel stack"><small>{e.mode==='paid'?'Registered entrants':e.mode==='practice'?'Practice':'Open entry'}</small><h2>{e.title}</h2><p>{e.description}</p><p>{e.count} questions · {e.seconds} sec each</p><p>Opens {date(e.opens)}<br/>Entry closes {date(e.closes)}</p><div className="actions bottom"><Link className="btn" to={'/quiz/'+e.id}>{Date.now()>=e.closes?'Attempt details':'Enter quiz'}</Link>{e.mode!=='practice'&&<Link to={'/standings/'+e.id}>Standings</Link>}</div></article>)}</div>}</section>
}
export function Leaderboard(){
 const {id}=useParams(),{events,loading,error}=useEvents();const [rows,setRows]=useState(null),[msg,setMsg]=useState(''),[page,setPage]=useState(0),[retry,setRetry]=useState(0);
 const now=Date.now(),official=events.filter(e=>e.mode!=='practice');
 const event=id?official.find(e=>e.id===id):official.find(e=>now>=e.opens&&now<e.closes+e.count*e.seconds*1000);
 useEffect(()=>{let alive=true,busy=false,timer;setRows(null);setMsg('');setPage(0);
 async function fetchBoard(){if(!event||busy)return;busy=true;try{const r=await api('/board/'+event.id);if(alive){setRows(r);setMsg('');if(r.final)clearInterval(timer)}}catch(err){if(alive)setMsg(err.message)}finally{busy=false}}
 fetchBoard();timer=setInterval(()=>{if(document.visibilityState==='visible')fetchBoard()},30000);return()=>{alive=false;clearInterval(timer)}},[event?.id,retry]);
 const list=rows?.rows||[];return <section className="page"><p className="eyebrow">Rankings ledger</p><h1>{id&&rows?.final?'Final standings':'Live leaderboard'}</h1><Msg>{error||msg}</Msg>{msg&&<button onClick={()=>setRetry(n=>n+1)}>Retry rankings</button>}
 {event?<div className="panel stack"><h2>{event.title}</h2><p>{rows?.final?'Final rankings':('Completed attempts · refreshes approximately every 30 seconds')}{rows?.updatedAt?' · Updated '+date(rows.updatedAt):''}</p>
 {list.length?<><div className="score-table" role="region" aria-label="Tournament rankings"><table><thead><tr><th>Rank</th><th>Username</th><th>Score</th><th>Time</th></tr></thead><tbody>{list.slice(page*25,page*25+25).map((r,i)=><tr key={i}><td>#{r.rank}</td><td>{r.username}</td><td>{r.score}/{event.count}</td><td>{duration(r.elapsed)}</td></tr>)}</tbody></table></div><p>{list.length} eligible finishers</p>{list.length>25&&<div className="actions"><button disabled={!page} onClick={()=>setPage(page-1)}>Previous</button><button disabled={(page+1)*25>=list.length} onClick={()=>setPage(page+1)}>Next page</button></div>}</>:<p>{rows?'Waiting for the first eligible finisher.':'Loading rankings…'}</p>}</div>:<div className="panel">{loading?'Loading events…':id?'Competition unavailable.':'Standby · No live tournament.'}</div>}
 {official.length>0&&<div className="panel stack"><h2>Tournament standings</h2>{official.map(e=><Link to={'/standings/'+e.id} key={e.id}>{e.title}</Link>)}</div>}</section>
}
export function Admin(){
 const {admin,user,loading}=useAccount(),{refresh}=useEvents();const [mode,setMode]=useState('open'),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[questions,setQuestions]=useState(''),[emails,setEmails]=useState('');
 if(loading)return <p>Checking access…</p>;if(!admin)return <section className="page"><h1>Admin console</h1><p>Administrator sign-in required.</p>{!user&&<Link to="/login">Sign in</Link>}</section>;
 async function publish(e){e.preventDefault();setBusy(true);setMsg('');const form=e.currentTarget;try{const b=Object.fromEntries(new FormData(form));let items;try{items=JSON.parse(questions)}catch{throw Error('The question list must be valid JSON.')}
 const result=await api('/admin/events',{title:b.title,description:b.description,mode,opens:new Date(b.opens).getTime(),closes:new Date(b.closes).getTime(),seconds:Number(b.seconds),questions:items,emails:emails.split(/[\s,;]+/).filter(Boolean)});
 setMsg('Published '+result.event.title+'.');form.reset();setQuestions('');setEmails('');setMode('open');await refresh();
 }catch(err){setMsg(err.message)}finally{setBusy(false)}}
 return <section className="page narrow"><p className="eyebrow">Tournament operations</p><h1>Admin console</h1><form className="panel stack" onSubmit={publish}><h2>Publish a competition</h2>
 <label>Competition title<input required name="title" maxLength="120"/></label><label>Description<textarea name="description" maxLength="1500"/></label>
 <label>Entry type<select value={mode} onChange={e=>setMode(e.target.value)}><option value="open">Open competition</option><option value="paid">Paid · email invitation list</option><option value="practice">Practice · unlimited retakes</option></select></label>
 <div className="form-split"><label>Entry opens<input type="datetime-local" name="opens" required/></label><label>Last entry<input type="datetime-local" name="closes" required/></label></div><small>Times use your current time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</small>
 <label>Seconds per question<input name="seconds" type="number" min="5" max="300" defaultValue="30" required/></label>
 <label>Question file (JSON)<input type="file" accept=".json" onChange={async e=>{const f=e.target.files[0];if(f&&f.size<=450000)setQuestions(await f.text());else setMsg('Choose a JSON file smaller than 450 KB.')}}/></label>
 <label>Question list<textarea rows="7" required value={questions} onChange={e=>setQuestions(e.target.value)} /></label><small>Each item needs text, an options array, and correctIndex (0 for the first option).</small>
 {mode==='paid'&&<><label>Paid entry list (CSV or TXT)<input type="file" accept=".csv,.txt" onChange={async e=>{const f=e.target.files[0];if(f&&f.size<=250000)setEmails(await f.text());else setMsg('Choose a smaller email list.')}}/></label><label>Allowed emails<textarea required rows="4" value={emails} onChange={e=>setEmails(e.target.value)} placeholder="One email per line, or comma-separated"/></label></>}
 <p>Check the schedule and answers before publishing. Published question sets are locked for fair scoring.</p><button className="btn" disabled={busy}>{busy?'Publishing…':'Publish competition'}</button><Msg>{msg}</Msg></form></section>
}
