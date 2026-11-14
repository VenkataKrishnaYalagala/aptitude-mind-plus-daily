import {json,fail,isAdmin,handleError} from '../_helpers.js';
export async function onRequestGet({request,env}){
 if(!(await isAdmin(request,env)))return fail('Sign in to review course enquiries.',401);
 try{const r=await env.DB.prepare('SELECT * FROM course_applications ORDER BY created_at DESC,id DESC LIMIT 100').all();return json({items:r.results||[]});}
 catch(err){return handleError(err);}
}