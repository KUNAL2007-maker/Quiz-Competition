import nodemailer from 'nodemailer';
import {randomInt,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {mutate,project,token} from './cloud.js';
import {requireThat,digest,emailKey} from './domain.js';
export async function sendEmail(to,subject,text){
  requireThat(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD,503,'Email delivery is awaiting configuration.');
  const port=Number(process.env.SMTP_PORT||587);
  const client=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:8000,socketTimeout:12000});
  await client.sendMail({from:'Null Origin <contact@nullorigin.live>',to,subject:'Null Origin · '+subject,text});
}
export async function throttle(key,limit,windowMs){
  await mutate('mailLimits/'+digest(key),prev=>{
    const n=Date.now(),v=prev&&prev.until>n?prev:{count:0,until:n+windowMs};
    requireThat(v.count<limit,429,'Please wait before requesting another message.');
    return {...v,count:v.count+1};
  });
}
function otpHash(uid,code,salt){requireThat(process.env.EMAIL_OTP_SECRET?.length>=32,503,'Account linking is awaiting configuration.');return createHmac('sha256',process.env.EMAIL_OTP_SECRET).update(uid+':'+salt+':'+code).digest('hex')}
export async function mailRoute(kind,b,user,ip){
  const email=kind==='reset'?emailKey(b.email):emailKey(user?.email);
  requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254,400,'Enter a valid email address.');
  if(kind==='link'||kind==='confirm'){
    requireThat(user?.verified && Date.now()/1000-user.authTime<600,403,'Sign in again with Google to set your password.');
  }
  if(kind==='confirm'){
    requireThat(/^\d{6}$/.test(b.code)&&typeof b.password==='string'&&b.password.length>=8&&b.password.length<=128,400,'Enter the six-digit code and a password of 8–128 characters.');
    const accepted=await mutate('passwordCodes/'+digest(user.uid),old=>{
      requireThat(old&&!old.used&&old.until>Date.now()&&old.tries<5,403,'This code has expired. Request another.');
      const ok=timingSafeEqual(Buffer.from(old.hash,'hex'),Buffer.from(otpHash(user.uid,b.code,old.salt),'hex'));
      return {...old,tries:old.tries+1,used:ok};
    });
    requireThat(accepted.used,403,'Incorrect code. Please try again.');
    const r=await identity('update',{localId:user.uid,password:b.password});
    requireThat(r.ok,400,'Could not set the password. Sign in again and retry.');return;
  }
  await throttle('recipient:'+kind+email,3,15*60000);
  await throttle('ip:'+kind+ip,kind==='reset'?10:250,60*60000);
  if(kind==='link'){
    const code=String(randomInt(100000,1000000)),salt=randomBytes(12).toString('hex');
    await mutate('passwordCodes/'+digest(user.uid),()=>({salt,hash:otpHash(user.uid,code,salt),tries:0,used:false,until:Date.now()+600000}));
    await sendEmail(email,'Password linking code','Your code is '+code+'. It expires in 10 minutes.');return;
  }
  const res=await identity('sendOobCode',{requestType:kind==='reset'?'PASSWORD_RESET':'VERIFY_EMAIL',email,returnOobLink:true});
  const data=await res.json();
  if(kind==='reset'&&data.error?.message==='EMAIL_NOT_FOUND')return;
  requireThat(res.ok&&data.oobLink,503,'Unable to prepare your email at the moment.');
  const original=new URL(data.oobLink);
  const href=new URL('/auth/action',process.env.SITE_ORIGIN);
  href.searchParams.set('oobCode',original.searchParams.get('oobCode'));href.searchParams.set('mode',kind==='reset'?'resetPassword':'verifyEmail');
  const label=kind==='reset'?'Reset your password':'Verify your email';
  await sendEmail(email,label,label+' for your Null Origin account:\n\n'+href+'\n\nIf you did not request this message, you can ignore it.');
}
function identity(method,payload){
  return token().then(bearer=>fetch('https://identitytoolkit.googleapis.com/v1/projects/'+project()+'/accounts:'+method,{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(9000)}));
}
