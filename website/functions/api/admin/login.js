import {json,fail,backendReady,checkOrigin,parseJSON,rateLimit,secureCompare,makeSession,sessionCookie,handleError} from '../_helpers.js';
export async function onRequestPost({request,env}){
 if(!backendReady(env))return fail('Admin configuration is incomplete.',503);
 if(!checkOrigin(request))return fail('Invalid request origin.',403);
 try{const d=await parseJSON(request,500);if(!(await rateLimit(env,request,'login',10)))return fail('Too many sign-in attempts. Try again later.',429);
  if(typeof d.password!=='string'||d.password.length>300||!(await secureCompare(d.password,env.ADMIN_PASSWORD)))return fail('Incorrect password.',401);
  const cookie=sessionCookie(request,await makeSession(env.SESSION_SECRET));return json({authenticated:true},200,{'Set-Cookie':cookie});
 }catch(err){return handleError(err);}
}