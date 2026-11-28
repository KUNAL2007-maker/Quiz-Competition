import React,{createContext,useContext,useEffect,useState,useCallback,useRef} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,signOut,applyActionCode,verifyPasswordResetCode,confirmPasswordReset,reauthenticateWithPopup} from 'firebase/auth';
import {auth,api,friendly} from './client';
const Context=createContext(null);
export const useAccount=()=>useContext(Context);
export function AccountProvider({children}){
  const [state,set]=useState({user:null,profile:null,admin:false,loading:!!auth,error:''});const epoch=useRef(0);
  const refresh=useCallback(async()=>{
    const id=++epoch.current,user=auth?.currentUser||null;
    set({user,profile:null,admin:false,loading:!!user,error:''});
    if(!user)return;
    try{const val=await api('/me');if(id===epoch.current)set({user,profile:val.profile,admin:val.admin,loading:false,error:''})}
    catch(e){if(id===epoch.current)set({user,profile:null,admin:false,loading:false,error:friendly(e)})}
  },[]);
  useEffect(()=>auth?onAuthStateChanged(auth,refresh):undefined,[refresh]);
  return <Context.Provider value={{...state,refresh}}>{children}</Context.Provider>
}
export function Msg({children}){return children?<p className="notice" role="status">{children}</p>:null}
export function Login(){
  const {user,refresh}=useAccount(),[params]=useSearchParams(),navigate=useNavigate();
  const [mode,setMode]=useState('login'),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
  const target=params.get('next')||'/profile';
  const done=()=>navigate(/^\/(quiz\/[-\w]+|profile|certification)$/.test(target)?target:'/profile',{replace:true});
  async function submit(e,google=false){e.preventDefault();if(busy)return;setMsg('');setBusy(true);
    try{if(!auth)throw Error('Sign-in is awaiting Firebase configuration.');
      if(google){await signInWithPopup(auth,new GoogleAuthProvider());done();return}
      const d=new FormData(e.currentTarget),email=String(d.get('email')||'').trim(),password=d.get('password');
      if(mode==='reset'){await api('/mail/reset',{email});setMsg('If this address has an account, a reset email is on its way.');return}
      if(mode==='signup'){await createUserWithEmailAndPassword(auth,email,password);await api('/mail/verify',{});}
      else await signInWithEmailAndPassword(auth,email,password);
      done();
    }catch(err){setMsg(friendly(err))}finally{setBusy(false)}
  }
  return <section className="page narrow"><h1>Operator Account</h1><div className="panel stack">{user?<><h2>Signed in</h2><p>{user.email}</p><Link className="btn" to="/profile">Open profile</Link><button onClick={async()=>{await signOut(auth);await refresh()}}>Sign out</button></>:<>
  <h2>{mode==='reset'?'Reset password':mode==='signup'?'Create your account':'Sign in to Null Origin'}</h2>
  <button disabled={busy} onClick={e=>submit(e,true)}>Continue with Google</button>
  <form className="stack" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required/></label>{mode!=='reset'&&<label>Password<input name="password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?8:1} required/></label>}
  <button className="btn" disabled={busy}>{mode==='reset'?'Send reset link':mode==='signup'?'Create account':'Sign in'}</button></form>
  <div className="actions">{['login','signup','reset'].filter(v=>v!==mode).map(v=><button key={v} onClick={()=>{setMode(v);setMsg('')}}>{v==='signup'?'Create account':v==='reset'?'Forgot password?':'Back to sign in'}</button>)}</div></>}
  <Msg>{msg}</Msg></div></section>
}
export function Profile(){
 const {user,profile,loading,error,refresh}=useAccount();const [params]=useSearchParams();const [msg,set]=useState(''),[busy,setBusy]=useState(false),[linkSent,setLink]=useState(false);
 const job=async(fn)=>{set('');setBusy(true);try{await fn()}catch(e){set(friendly(e))}finally{setBusy(false)}};
 if(loading)return <p role="status">Loading your profile…</p>;
 if(!user)return <Link className="btn" to="/login">Sign in to view your profile</Link>;
 const google=user.providerData.some(p=>p.providerId==='google.com'),password=user.providerData.some(p=>p.providerId==='password');
 return <section className="page narrow"><h1>Operator Profile</h1><Msg>{error||msg||(params.get('required')?'Complete your profile before entering the competition.':'')}</Msg>
 <div className="panel stack"><h2>Competitor details</h2><p>{user.email} · {user.emailVerified?'Email verified':'Verification pending'}</p>
 {!user.emailVerified&&<div className="actions"><button disabled={busy} onClick={()=>job(async()=>{await api('/mail/verify',{});set('Verification email sent.')})}>Resend verification</button><button disabled={busy} onClick={()=>job(async()=>{await user.reload();await user.getIdToken(true);await refresh();set(user.emailVerified?'Verified.':'Check your inbox for the verification link.')})}>I verified my email</button></div>}
 <form className="stack" key={user.uid} onSubmit={e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget));job(async()=>{await api('/profile',b);await refresh();set('Profile saved.')})}}>
 <label>Full name for certificates<input name="fullName" defaultValue={profile?.fullName} maxLength="90" autoComplete="name" required/></label>
 <label>Leaderboard username<input name="username" defaultValue={profile?.username} maxLength="32" placeholder="Choose a callsign"/></label>
 <label>WhatsApp number<input type="tel" inputMode="tel" name="phone" defaultValue={profile?.phone} placeholder="10-digit Indian number" required/></label>
 <button className="btn" disabled={busy}>Save profile</button></form>{profile&&user.emailVerified&&<Link to={/^\/quiz\/[\w-]+$/.test(params.get('next')||'')?params.get('next'):'/competitions'}>Continue to competition →</Link>}</div>
 {google&&!password&&<section className="panel stack"><h2>Add password sign-in</h2>{!linkSent?<button disabled={busy} onClick={()=>job(async()=>{await reauthenticateWithPopup(user,new GoogleAuthProvider());await user.getIdToken(true);await api('/mail/link',{});setLink(true);set('Check your email for a six-digit code.')})}>Verify with Google and send code</button>:<form className="stack" onSubmit={e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));job(async()=>{await api('/mail/confirm',data);await user.reload();await refresh();setLink(false);set('Password linked. You can now use either sign-in method.')})}}>
 <label>Email code<input name="code" pattern="[0-9]{6}" autoComplete="one-time-code" required/></label><label>New password<input name="password" type="password" autoComplete="new-password" minLength="8" required/></label><button disabled={busy}>Set password</button></form>}</section>}</section>
}
export function EmailAction(){
 const [params]=useSearchParams(),code=params.get('oobCode'),reset=params.get('mode')==='resetPassword';const [msg,set]=useState('Checking your link…'),[ready,setReady]=useState(false);
 useEffect(()=>{let alive=true;async function go(){try{if(!auth||!code)throw Error('This email link is incomplete.');if(reset){await verifyPasswordResetCode(auth,code);if(alive){setReady(true);set('Choose your new password.')}}else if(params.get('mode')==='verifyEmail'){await applyActionCode(auth,code);if(auth.currentUser){await auth.currentUser.reload();await auth.currentUser.getIdToken(true)}if(alive)set('Your email is verified. Return to your profile to compete.')}else throw Error('Unknown email action.')}catch(e){if(alive)set(friendly(e))}}go();return()=>{alive=false}},[code,reset]);
 return <section className="page narrow panel stack"><h1>{reset?'Reset password':'Email verification'}</h1><Msg>{msg}</Msg>{ready&&<form className="stack" onSubmit={async e=>{e.preventDefault();try{await confirmPasswordReset(auth,code,new FormData(e.currentTarget).get('password'));setReady(false);set('Password updated. You can sign in.')}catch(err){set(friendly(err))}}}><label>New password<input name="password" type="password" autoComplete="new-password" minLength="8" required/></label><button className="btn">Save password</button></form>}<Link to={reset?'/login':'/profile'}>Continue</Link></section>
}
