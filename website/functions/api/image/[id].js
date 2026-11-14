import {fail,isAdmin,handleError} from '../_helpers.js';
export async function onRequestGet({request,env,params}){
 if(!env.DB)return fail('Not configured',503);
 const id=params.id;if(!/^[0-9a-f-]{36}$/.test(id))return fail('Invalid image ID',400);
 try{
  const row=await env.DB.prepare('SELECT im.data_base64, q.status FROM question_images im JOIN questions q ON q.id=im.question_id WHERE im.question_id=?').bind(id).first();
  if(!row||row.status!=='approved'&&!(await isAdmin(request,env)))return fail('Image unavailable',404);
  const binary=atob(row.data_base64);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  return new Response(bytes,{status:200,headers:{'Content-Type':'image/jpeg','Cache-Control':row.status==='approved'?'public, max-age=300':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(err){return handleError(err);}
}