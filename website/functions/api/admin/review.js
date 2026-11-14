import {json,fail,checkOrigin,isAdmin,parseJSON,handleError} from '../_helpers.js';
export async function onRequestPost({request,env}){
 if(!(await isAdmin(request,env)))return fail('Sign in to review questions.',401);
 if(!checkOrigin(request))return fail('Invalid request origin.',403);
 try{const d=await parseJSON(request,2000);if(!/^[0-9a-f-]{36}$/.test(d.id||'')||!['approved','rejected'].includes(d.status))return fail('Invalid review action.');
 const current=await env.DB.prepare('SELECT id,status,source_url,exam_year FROM questions WHERE id=?').bind(d.id).first();if(!current)return fail('Question not found.',404);
 if(current.status!=='pending')return fail('This question has already been reviewed. Reload the queue.',409);
 const verified=d.status==='approved'&&d.verified_official===true;
 if(verified&&(!current.source_url||!current.exam_year))return fail('Official verification requires a cited HTTPS source and exam year.');
 const r=await env.DB.prepare("UPDATE questions SET status=?,verified_official=?,reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(d.status,verified?1:0,d.id).run();
 if(!r.meta?.changes)return fail('This question has already been reviewed.',409);
 return json({ok:true,status:d.status});
 }catch(e){return handleError(e);}
}