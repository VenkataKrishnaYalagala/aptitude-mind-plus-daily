/* Server-side utilities. This file is not included in public/ and is never browser-accessible. */
export const EXAMS=new Set(['upsc','gate','ssc','bank','state','rail']);
export const COURSE_EXAMS=new Set([...EXAMS,'custom']);
const TE=new TextEncoder();
export function json(obj,status=200,headers={}){return new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
export function fail(message,status=400){return json({error:message},status);}
export function backendReady(env){return !!(env.DB && typeof env.ADMIN_PASSWORD==='string' && env.ADMIN_PASSWORD.length>=18 && typeof env.SESSION_SECRET==='string' && env.SESSION_SECRET.length>=32);}
export function checkOrigin(request){const origin=request.headers.get('Origin');return !!origin && origin===new URL(request.url).origin;}
export function text(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
export function validEmail(value){return !value||(/^[^\s@]{1,90}@[^\s@]{1,90}\.[^\s@]{2,30}$/.test(value));}
export function validUrl(value){if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&url.username===''&&url.password===''&&value.length<=500;}catch{return false;}}
export async function parseJSON(request,maxBytes=1100000){
 const length=Number(request.headers.get('Content-Length')||0);if(length>maxBytes)throw Error('Payload too large.');
 if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw Error('Expected JSON.');
 const body=await request.text();if(TE.encode(body).byteLength>maxBytes)throw Error('Payload too large.');
 try{return JSON.parse(body);}catch{throw Error('Invalid JSON.');}
}
function encode64(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decode64(str){const raw=atob(str.replaceAll('-','+').replaceAll('_','/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function hash(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',TE.encode(value)));}
function equalBytes(a,b){if(a.length!==b.length)return false;let xor=0;for(let i=0;i<a.length;i++)xor|=a[i]^b[i];return xor===0;}
export async function secureCompare(a,b){return equalBytes(await hash(a),await hash(b));}
async function signature(secret,payload){const k=await crypto.subtle.importKey('raw',TE.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return encode64(new Uint8Array(await crypto.subtle.sign('HMAC',k,TE.encode(payload))));}
export async function makeSession(secret){const payload=encode64(TE.encode(JSON.stringify({v:1,exp:Date.now()+12*60*60*1000})));return payload+'.'+await signature(secret,payload);}
function cookies(request){const all={};for(const part of (request.headers.get('Cookie')||'').split(';')){const i=part.indexOf('=');if(i>0)all[part.slice(0,i).trim()]=part.slice(i+1).trim();}return all;}
export async function isAdmin(request,env){if(!backendReady(env))return false;const token=cookies(request).amp_admin;if(!token||token.length>700)return false;
 const parts=token.split('.');if(parts.length!==2)return false;const expected=await signature(env.SESSION_SECRET,parts[0]);const valid=equalBytes(TE.encode(expected),TE.encode(parts[1]));if(!valid)return false;
 try{const value=JSON.parse(new TextDecoder().decode(decode64(parts[0])));return value.v===1&&Number.isFinite(value.exp)&&value.exp>Date.now()&&value.exp<Date.now()+13*60*60*1000;}catch{return false;}
}
export function sessionCookie(request,value,clear=false){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `amp_admin=${clear?'':value}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${clear?0:43200}`;}
export async function rateLimit(env,request,kind,limit=5){
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';const period=kind==='login'?new Date().toISOString().slice(0,13):new Date().toISOString().slice(0,10);
 const digest=encode64(await hash(env.SESSION_SECRET+'|'+ip+'|'+kind+'|'+period));
 await env.DB.prepare('INSERT INTO request_limits (key,hits) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET hits=hits+1,updated_at=datetime(\'now\')').bind(digest).run();
 const count=await env.DB.prepare('SELECT hits FROM request_limits WHERE key=?').bind(digest).first();return (count?.hits||0)<=limit;
}
export function handleError(err){console.error('API failure:',err?.name||'Error');if(/Payload too large/.test(err.message))return fail('The image or form exceeds the allowed size.',413);if(/Expected JSON|Invalid JSON/.test(err.message))return fail(err.message,400);return fail('The service encountered a problem. Please try again later.',500);}