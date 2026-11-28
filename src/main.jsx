import React,{Suspense,lazy,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Link,Navigate,Route,Routes} from 'react-router-dom';
import {AccountProvider,Profile,Login,EmailAction} from './account';
import {EventsProvider,Competitions,Leaderboard,Admin} from './events';
import Shell from './Shell';
import Home from './Home';
import Info from './Info';
import Quiz from './Quiz';
import './forms.css';
const Certificates=lazy(()=>import('./Certificates'));
const Verify=lazy(()=>import('./Verify'));
function Settings(){
  const [audio,setAudio]=useState(()=>localStorage.getItem('origin-countdown-sound')!=='off');
  return <section className="page narrow"><h1>Settings</h1><div className="panel stack"><label className="choice"><input type="checkbox" checked={audio} onChange={e=>{setAudio(e.target.checked);localStorage.setItem('origin-countdown-sound',e.target.checked?'on':'off')}}/>Play countdown sounds</label><Link to="/profile">Manage your profile</Link></div></section>;
}
function Missing(){return <div className="panel stack"><h1>Page not found</h1><Link to="/">Return to overview</Link></div>}
class Boundary extends React.Component{
 state={failed:false};static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="page panel"><h1>This page could not load</h1><button onClick={()=>location.reload()}>Reload page</button></main>:this.props.children}
}
createRoot(document.querySelector('#root')).render(<Boundary><BrowserRouter><AccountProvider><EventsProvider><Suspense fallback={<p role="status">Loading…</p>}><Routes><Route element={<Shell/>}><Route index element={<Home/>}/><Route path="competitions" element={<Competitions/>}/><Route path="arena" element={<Navigate to="/competitions" replace/>}/><Route path="quiz" element={<Competitions/>}/><Route path="quiz/:id" element={<Quiz/>}/><Route path="leaderboard" element={<Leaderboard/>}/><Route path="leaderboard/:id" element={<Leaderboard/>}/><Route path="standings" element={<Leaderboard/>}/><Route path="standings/:id" element={<Leaderboard/>}/><Route path="login" element={<Login/>}/><Route path="profile" element={<Profile/>}/><Route path="results" element={<Navigate to="/profile" replace/>}/><Route path="auth/action" element={<EmailAction/>}/><Route path="certification" element={<Certificates/>}/><Route path="verify/:id" element={<Verify/>}/><Route path="admin" element={<Admin/>}/><Route path="settings" element={<Settings/>}/>{['about','terms','privacy'].map(p=><Route key={p} path={p} element={<Info/>}/>)}
 <Route path="*" element={<Missing/>}/></Route></Routes></Suspense></EventsProvider></AccountProvider></BrowserRouter></Boundary>);
