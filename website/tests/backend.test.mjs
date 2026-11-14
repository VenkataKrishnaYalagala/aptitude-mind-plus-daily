import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as health} from '../functions/api/health.js';
import {onRequestGet as questionsGet,onRequestPost as questionsPost} from '../functions/api/questions.js';
import {onRequestGet as session} from '../functions/api/admin/session.js';
import {onRequestPost as login} from '../functions/api/admin/login.js';
import {onRequestGet as adminQuestions} from '../functions/api/admin/questions.js';
import {onRequestPost as review} from '../functions/api/admin/review.js';
import {onRequestGet as image} from '../functions/api/image/[id].js';
import {onRequestPost as application} from '../functions/api/applications.js';
import {onRequestGet as adminApps} from '../functions/api/admin/applications.js';
import {onRequestPost as logout} from '../functions/api/admin/logout.js';
const sqlDB=new DatabaseSync(':memory:');sqlDB.exec(readFileSync(new URL('../schema/schema.sql',import.meta.url),'utf8'));
const DB={prepare(sql){
 function bound(params){return {
  async first(){return sqlDB.prepare(sql).get(...params)||null;},
  async all(){return {results:sqlDB.prepare(sql).all(...params)};},
  async run(){const r=sqlDB.prepare(sql).run(...params);return {meta:{changes:r.changes}};}
 };}
 return {...bound([]),bind(...params){return bound(params)}};
 },async batch(stmts){sqlDB.exec('BEGIN');try{for(const stmt of stmts)await stmt.run();sqlDB.exec('COMMIT');}catch(e){sqlDB.exec('ROLLBACK');throw e;}}
};
const env={DB,ADMIN_PASSWORD:'correct-horse-battery-staple-2026',SESSION_SECRET:'0123456789abcdef'.repeat(5)};
const site='https://aptitudemindplus.pages.dev';
function mk(url,method='GET',data=null,cookie='',origin=site){const headers={Origin:origin};if(data!==null)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;return new Request(site+url,{method,headers,body:data===null?undefined:JSON.stringify(data)});}
async function check(res,status){const body=await res.text();assert.equal(res.status,status,body);return JSON.parse(body);}
assert.deepEqual(await check(await health({env}),200),{ready:true});
assert.equal((await check(await questionsGet({request:mk('/api/questions'),env}),200)).items.length,0);
const qbase={exam:'gate',topic:'Units digit',question:'What is units digit of 7^5?',answer:'7',name:'Test',email:'sample@example.com',source_url:'',exam_year:null,image_data:null};
let submitted=await check(await questionsPost({request:mk('/api/questions','POST',qbase),env}),201);assert.equal(submitted.status,'pending');
assert.equal((await check(await questionsGet({request:mk('/api/questions'),env}),200)).items.length,0,'pending not public');
assert.equal((await check(await session({request:mk('/api/admin/session'),env}),200)).authenticated,false);
await check(await login({request:mk('/api/admin/login','POST',{password:'incorrect'}),env}),401);
const logged=await login({request:mk('/api/admin/login','POST',{password:env.ADMIN_PASSWORD}),env});assert.equal(logged.status,200);const cookie=logged.headers.get('set-cookie').split(';')[0];
assert.equal((await check(await session({request:mk('/api/admin/session','GET',null,cookie),env}),200)).authenticated,true);
const pending=await check(await adminQuestions({request:mk('/api/admin/questions?status=pending','GET',null,cookie),env}),200);assert.equal(pending.items.length,1);
await check(await review({request:mk('/api/admin/review','POST',{id:submitted.id,status:'approved',verified_official:false},cookie),env}),200);
const publicRows=await check(await questionsGet({request:mk('/api/questions?q=units'),env}),200);assert.equal(publicRows.items.length,1);assert.equal(publicRows.items[0].verified_official,0);assert.equal(publicRows.items[0].contributor_email,undefined,'email private');
assert.equal((await check(await questionsGet({request:mk('/api/questions?type=official'),env}),200)).items.length,0);
const jpg='data:image/jpeg;base64,'+Buffer.from([0xff,0xd8,0xff,0xd9]).toString('base64');
const imgSubmission=await check(await questionsPost({request:mk('/api/questions','POST',{...qbase,question:'',image_data:jpg,email:'',name:'',exam:'upsc'}),env}),201);
await check(await image({request:mk('/api/image/'+imgSubmission.id),env,params:{id:imgSubmission.id}}),404);
const adminImage=await image({request:mk('/api/image/'+imgSubmission.id,'GET',null,cookie),env,params:{id:imgSubmission.id}});assert.equal(adminImage.status,200);assert.equal(adminImage.headers.get('Content-Type'),'image/jpeg');
await check(await review({request:mk('/api/admin/review','POST',{id:imgSubmission.id,status:'rejected'},cookie),env}),200);
await check(await image({request:mk('/api/image/'+imgSubmission.id),env,params:{id:imgSubmission.id}}),404,'rejected image private');
await check(await questionsPost({request:mk('/api/questions','POST',{...qbase,source_url:'javascript:alert(1)'},'',site),env}),400);
await check(await questionsPost({request:mk('/api/questions','POST',qbase,'','https://other.example'),env}),403);
const appl=await check(await application({request:mk('/api/applications','POST',{name:'Parent One',email:'parent@example.com',phone:'',exam:'ssc',message:'Need classes'},'',site),env}),201);assert.equal(appl.status,'received');
assert.equal((await check(await adminApps({request:mk('/api/admin/applications','GET',null,cookie),env}),200)).items.length,1);
await check(await adminApps({request:mk('/api/admin/applications'),env}),401);
const off=await check(await logout({request:mk('/api/admin/logout','POST',{},cookie),env}),200);assert.equal(off.authenticated,false);
const st=await check(await questionsGet({request:mk('/api/questions?q=%25'),env}),200);assert.ok(Array.isArray(st.items));
console.log('PASS: 17 moderation, privacy, authentication, upload, enquiry and search checks');