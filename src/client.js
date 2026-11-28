import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
export const auth=Object.values(config).every(Boolean)?getAuth(initializeApp(config)):null;
export async function api(path,body){
  const pub=body===undefined&&/^\/(events|board|verify)(\/|$)/.test(path);
  const headers={};
  if(!pub&&auth?.currentUser)headers.Authorization='Bearer '+await auth.currentUser.getIdToken();
  if(body!==undefined)headers['Content-Type']='application/json';
  let res;try{res=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(18000)})}catch{throw Error('Connection interrupted. Reconnect and try again.')}
  const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'This service is temporarily unavailable.');
  return data;
}
export function friendly(err){
  if(!err?.code)return err?.message||'Please try again.';
  const messages={'auth/invalid-credential':'Check your email and password. If you registered with Google, use Google to sign in and set a password in your profile.','auth/email-already-in-use':'This email already has an account. Sign in or reset your password.','auth/weak-password':'Choose a stronger password.','auth/popup-closed-by-user':'Google sign-in was closed.','auth/too-many-requests':'Too many requests. Please try again later.','auth/invalid-action-code':'This link has expired or was already used. Request a new email.','auth/network-request-failed':'Check your internet connection and retry.'};
  return messages[err.code]||'Unable to complete sign-in. Please retry.';
}
export const date=ms=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(ms)+' IST';
export const duration=ms=>{const sec=Math.floor(ms/1000);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')};
