import {COURSE_EXAMS,json,fail,backendReady,checkOrigin,text,validEmail,parseJSON,rateLimit,handleError} from './_helpers.js';
export async function onRequestPost({request,env}){
 if(!backendReady(env))return fail('Enquiries are not enabled yet. The site owner must connect the secure backend.',503);
 if(!checkOrigin(request))return fail('Invalid request origin.',403);
 try{const d=await parseJSON(request,10000);const name=text(d.name,100),email=text(d.email,160),phone=text(d.phone,24),message=text(d.message,1500),exam=text(d.exam,20);
 if(name.length<2||!COURSE_EXAMS.has(exam)||(!email&&!phone))return fail('Enter your name, course and a way to contact you.');
 if(!validEmail(email))return fail('The email address is invalid.');
 if(phone&&!/^[0-9+()\s-]{7,24}$/.test(phone))return fail('The phone number format is invalid.');
 if(!(await rateLimit(env,request,'application',3)))return fail('Daily enquiry limit reached. Try again tomorrow.',429);
 const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO course_applications(id,name,email,phone,exam,message) VALUES(?,?,?,?,?,?)').bind(id,name,email,phone,exam,message).run();return json({id,status:'received'},201);
 }catch(e){return handleError(e);}
}