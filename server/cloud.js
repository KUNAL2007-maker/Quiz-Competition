import {GoogleAuth,OAuth2Client} from 'google-auth-library';
import {createPrivateKey} from 'node:crypto';
import {Fault,requireThat} from './domain.js';
export const project=()=>process.env.FIREBASE_PROJECT_ID;
let auth,certs,certsUntil=0;
const verifier=new OAuth2Client();
export function readSigningKey(raw) {
  // The dashboard may receive a PEM, a JSON string, or the copied private_key property.
  let source = raw.trim();
  try {
    if (source.startsWith('{')) source = JSON.parse(source).private_key;
  } catch {
    source = '';
  }
  const pem = typeof source === 'string' && source.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
  if (pem) {
    const body = pem[1].replace(/\\+[rn]|\s/g, '');
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
      try {
        const key = createPrivateKey({key: Buffer.from(body, 'base64'), format: 'der', type: 'pkcs8'});
        if (key.asymmetricKeyType === 'rsa') return key.export({format: 'pem', type: 'pkcs8'});
      } catch {
        // Report only the configuration field. Parser exceptions can contain input details.
      }
    }
  }
  console.error('Firebase configuration: FIREBASE_PRIVATE_KEY needs a complete RSA PKCS8 PEM.');
  throw new Fault(503, 'The competition service is awaiting Firebase configuration.');
}
export async function token(){
  requireThat(project()&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY,503,'The competition service is awaiting Firebase configuration.');
  auth??=new GoogleAuth({credentials:{client_email:process.env.FIREBASE_CLIENT_EMAIL.trim().replace(/^"|"[,]?$/g,''),private_key:readSigningKey(process.env.FIREBASE_PRIVATE_KEY)},scopes:['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/identitytoolkit']});
  return auth.getAccessToken();
}
export async function identify(req){
  const raw=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if(!raw)return null;
  requireThat(project(),503,'Sign-in is awaiting Firebase configuration.');
  if(Date.now()>certsUntil){
    const res=await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(8000)});
    requireThat(res.ok,503,'Sign-in verification is temporarily unavailable.');
    certs=await res.json();certsUntil=Date.now()+1000*Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300);
  }
  try{
    const header=JSON.parse(Buffer.from(raw.split('.')[0],'base64url'));
    if(header.alg!=='RS256'||!Object.hasOwn(certs,header.kid))throw Error();
    const ticket=await verifier.verifySignedJwtWithCertsAsync(raw,certs,project(),['https://securetoken.google.com/'+project()]);
    const p=ticket.getPayload();
    if(!p.sub||!p.email||!p.auth_time||p.auth_time>Date.now()/1000+60)throw Error();
    return {uid:p.sub,email:p.email,verified:p.email_verified===true,admin:p.email_verified===true&&((process.env.ADMIN_UIDS||'').split(',').map(s=>s.trim()).includes(p.sub)),authTime:p.auth_time,raw};
  }catch{throw new Fault(401,'Your sign-in expired. Please sign in again.')}
}
const root=()=>'projects/'+project()+'/databases/(default)/documents';
const base='https://firestore.googleapis.com/v1/';
function encode(x){
  if(x&&typeof x==='object'&&Object.keys(x).length===1&&typeof x.timestamp==='string')return {timestampValue:x.timestamp};
  if(x===null)return {nullValue:null};
  if(typeof x==='string')return {stringValue:x};
  if(typeof x==='boolean')return {booleanValue:x};
  if(typeof x==='number')return Number.isInteger(x)?{integerValue:String(x)}:{doubleValue:x};
  if(Array.isArray(x))return {arrayValue:{values:x.map(encode)}};
  return {mapValue:{fields:fields(x)}};
}
const fields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,encode(v)]));
function decode(v){
  const [k,x]=Object.entries(v)[0];
  if(k==='integerValue')return Number(x);
  if(k==='arrayValue')return (x.values||[]).map(decode);
  if(k==='mapValue')return unpack(x.fields);
  return x;
}
const unpack=f=>Object.fromEntries(Object.entries(f||{}).map(([k,v])=>[k,decode(v)]));
async function call(path,body){
  const res=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
  const json=await res.json();
  if(!res.ok){
    if(!body&&res.status===404)return null;
    if(['ALREADY_EXISTS','ABORTED','FAILED_PRECONDITION'].includes(json.error?.status)&&path.endsWith(':commit'))throw new Fault(409,'Concurrent change. Please retry.');
    console.error('firestore',res.status,json.error?.status);
    throw new Fault(503,'The database is temporarily unavailable. Please retry.');
  }
  return json;
}
export const db={
  async get(path){const doc=await call(root()+'/'+path);return doc?{data:unpack(doc.fields),version:doc.updateTime}:null},
  async write(changes){
    const writes=changes.map(({path,data,version})=>({update:{name:root()+'/'+path,fields:fields(data)},currentDocument:version?{updateTime:version}:{exists:false},...(path.startsWith('attempts/')&&data.status==='completed'?{updateTransforms:[{fieldPath:'publishedAt',setToServerValue:'REQUEST_TIME'}]}:{})}));
    return call(root()+':commit',{writes});
  },
  async query(collection,filters=[],order=[],limit=500,select){
    const where=filters.map(([key,op,value])=>({fieldFilter:{field:{fieldPath:key},op,value:encode(value)}}));
    const query={from:[{collectionId:collection}],limit};
    if(where.length)query.where=where.length===1?where[0]:{compositeFilter:{op:'AND',filters:where}};
    if(order.length)query.orderBy=order.map(([fieldPath,direction])=>({field:{fieldPath},direction}));
    if(select)query.select={fields:select.map(fieldPath=>({fieldPath}))};
    const rows=await call(root()+':runQuery',{structuredQuery:query});
    return rows.filter(r=>r.document).map(r=>({...unpack(r.document.fields),_id:r.document.name.split('/').pop()}));
  }
};
export async function mutate(path,update){
  for(let i=0;i<5;i++){
    const old=await db.get(path);
    const value=await update(old?.data);
    if(!value)return old?.data;
    try{await db.write([{path,data:value,version:old?.version}]);return value}
    catch(e){if(e.status!==409||i===4)throw e}
  }
}
