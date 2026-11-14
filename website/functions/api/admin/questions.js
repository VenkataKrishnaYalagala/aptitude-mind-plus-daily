import {json,fail,isAdmin,handleError} from '../_helpers.js';
export async function onRequestGet({request,env}){
 if(!(await isAdmin(request,env)))return fail('Sign in to review questions.',401);
 try{const status=new URL(request.url).searchParams.get('status');const where=status==='pending'?" WHERE q.status='pending'":" WHERE q.status!='pending'";
 const r=await env.DB.prepare('SELECT q.*,EXISTS(SELECT 1 FROM question_images im WHERE im.question_id=q.id) AS has_image FROM questions q'+where+' ORDER BY q.created_at DESC,q.id DESC LIMIT 100').all();
 const pending=await env.DB.prepare("SELECT COUNT(*) AS n FROM questions WHERE status='pending'").first();return json({items:r.results||[],pending_count:pending?.n||0});
 }catch(e){return handleError(e);}
}