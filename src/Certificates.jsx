import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {api,date} from './client';
import {useAccount,Msg} from './account';
import {CertificateArtwork,awardName,makeCertificatePdf} from './certificates/CertificateArtwork';
function Card({cert}){const ref=useRef(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 return <article className="panel stack"><h2>{cert.eventTitle}</h2><p>{awardName(cert.type)} · {date(cert.issuedAt)}</p><div className="certificate-frame"><CertificateArtwork cert={cert} ref={ref}/></div>
 <button className="btn" disabled={busy} onClick={async()=>{setBusy(true);try{const pdf=await makeCertificatePdf(ref.current,cert);pdf.save('Null-Origin-'+cert.id+'.pdf');setMsg('Your PDF is ready.')}catch{setMsg('Download failed. Try again.')}finally{setBusy(false)}}}>{busy?'Preparing PDF…':'Download certificate'}</button><Msg>{msg}</Msg></article>
}
export default function Certificates(){const {user,loading}=useAccount(),[list,setList]=useState(null),[err,setErr]=useState(''),[retry,setRetry]=useState(0);useEffect(()=>{let live=true;setList(null);setErr('');if(user)api('/certificates').then(data=>live&&setList({uid:user.uid,items:data.certificates})).catch(e=>live&&setErr(e.message));return()=>{live=false}},[user?.uid,retry]);
 return <section className="page"><p className="eyebrow">Official credentials</p><h1>My certificates</h1>{loading?'Loading account…':!user?<div className="panel stack"><p>Sign in to see certificates earned by your account.</p><Link className="btn" to="/login?next=/certification">Sign in</Link></div>:err?<div className="panel"><Msg>{err}</Msg><button onClick={()=>setRetry(x=>x+1)}>Retry</button></div>:list?.uid!==user.uid?'Loading certificates…':list.items.length?list.items.map(c=><Card key={c.id} cert={c}/>):<div className="panel"><h2>No certificates yet</h2><p>Eligible completed events appear here once their final standings are ready.</p></div>}</section>
}
