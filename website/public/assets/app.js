/* Aptitude Mind Plus UI; no tracking, no hidden analytics or dependencies. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const config=window.AMP_CONFIG||{};
const EXAMS={upsc:'UPSC CSAT',gate:'GATE Aptitude',ssc:'SSC',bank:'Banking',state:'APPSC / TGPSC',rail:'Railways',custom:'Personalised guidance'};
const validLink=v=>typeof v==='string'&&/^https:\/\/[a-z0-9]/i.test(v)?v:null;
$$('[data-external]').forEach(a=>{const url=validLink(config[a.dataset.external]);if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.hidden=false;}else a.hidden=true;});
$$('[data-year]').forEach(x=>x.textContent=String(new Date().getFullYear()));
const menu=$('[data-menu-trigger]'),mobile=$('[data-mobile-nav]');
menu?.addEventListener('click',()=>{const opened=mobile.classList.toggle('open');menu.setAttribute('aria-expanded',String(opened));});
$$('[data-mobile-nav] a').forEach(a=>a.addEventListener('click',()=>{mobile.classList.remove('open');menu?.setAttribute('aria-expanded','false');}));

function startAnnouncements(){
 const parent=$('#announcements');if(!parent)return;
 const items=$$('.announcement-item',parent);let current=0;
 const move=delta=>{items[current].classList.remove('current');current=(current+delta+items.length)%items.length;items[current].classList.add('current');};
 $('[data-ann-next]')?.addEventListener('click',()=>move(1));$('[data-ann-prev]')?.addEventListener('click',()=>move(-1));
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){setInterval(()=>{if(!document.hidden&&!parent.matches(':hover')&&!parent.matches(':focus-within'))move(1)},6500)}
}startAnnouncements();

function initConcepts(){
 const grid=$('[data-topic-grid]');if(!grid)return;
 const input=$('[data-concept-search]'),chips=$$('[data-topic-filter]'),count=$('[data-concept-count]'),empty=$('[data-concept-empty]');
 const items=$$('[data-topic]',grid);let filter='all';
 const q=new URLSearchParams(location.search).get('q');if(q&&input)input.value=q.slice(0,100);
 function refresh(){const term=(input?.value||'').trim().toLowerCase();let visible=0;
  items.forEach(i=>{const okay=(filter==='all'||i.dataset.category===filter)&&(!term||(i.dataset.search||'').includes(term));i.hidden=!okay;if(okay)visible++;});
  count.textContent=`${visible} concept${visible===1?'':'s'}`;empty.hidden=visible!==0;
  chips.forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.topicFilter===filter)));
 }
 input?.addEventListener('input',refresh);chips.forEach(c=>c.addEventListener('click',()=>{filter=c.dataset.topicFilter;refresh();}));refresh();
}initConcepts();

const questions=[
 {q:'What is the units digit of 7²⁰²⁶?',options:['1','3','7','9'],a:3,why:'Powers of 7 repeat 7, 9, 3, 1. The exponent 2026 leaves remainder 2 when divided by 4, so the second digit is 9.'},
 {q:'What is the units digit of 3²⁰²⁷?',options:['1','3','7','9'],a:2,why:'Powers of 3 repeat 3, 9, 7, 1. Remainder 3 selects the third digit: 7.'},
 {q:'What is the units digit of 2¹⁰⁰?',options:['2','4','6','8'],a:2,why:'Powers of 2 repeat 2, 4, 8, 6. Since 100 is divisible by 4, choose the fourth digit: 6.'},
 {q:'What is the units digit of 9¹¹¹?',options:['1','9','0','7'],a:1,why:'Odd powers of 9 end in 9; even powers end in 1. Since 111 is odd, the answer is 9.'},
 {q:'What is the units digit of 6⁹⁹⁹?',options:['9','6','4','0'],a:1,why:'All positive integer powers of 6 end in 6.'},
 {q:'What is the units digit of 4⁴⁸?',options:['4','8','6','2'],a:2,why:'Powers of 4 alternate 4 and 6. An even exponent gives 6.'},
 {q:'What is the units digit of 8²³?',options:['8','4','2','6'],a:2,why:'Powers of 8 repeat 8, 4, 2, 6. Remainder 3 means the third digit: 2.'},
 {q:'What is the units digit of 7⁵ + 3⁴?',options:['6','8','2','4'],a:1,why:'7⁵ ends in 7. 3⁴ ends in 1. Adding them gives a units digit of 8.'}
];
function elem(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function initQuiz(){const root=$('[data-quiz-root]');if(!root)return;
 questions.forEach((q,i)=>{const card=elem('section','quiz-card');const head=elem('div','quiz-head');head.append(elem('span','',`QUESTION ${String(i+1).padStart(2,'0')}`),elem('span','','ORIGINAL PRACTICE'));card.append(head,elem('h3','',q.q));const choices=elem('div','quiz-choices');q.options.forEach((opt,j)=>{const label=elem('label','quiz-option'),radio=elem('input');radio.type='radio';radio.name=`quiz-${i}`;radio.value=String(j);label.append(radio,elem('span','',opt));choices.append(label);});const solution=elem('div','solution');solution.hidden=true;card.append(choices,solution);root.append(card);});
 $('[data-quiz-submit]')?.addEventListener('click',()=>{let correct=0,answered=0;const cards=$$('.quiz-card',root);cards.forEach((card,i)=>{const chosen=$('input:checked',card),feedback=$('.solution',card);if(chosen)answered++;const okay=!!chosen&&Number(chosen.value)===questions[i].a;if(okay)correct++;feedback.hidden=false;feedback.className='solution '+(okay?'correct':'incorrect');feedback.textContent=`${okay?'Correct.':chosen?'Review this one.':'Not answered.'} ${questions[i].why}`;});const result=$('[data-quiz-result]');result.hidden=false;result.textContent=`Your score: ${correct} of ${questions.length}. Answered ${answered} of ${questions.length}. Review the explanations above.`;result.scrollIntoView({behavior:'smooth',block:'nearest'});});
 $('[data-quiz-reset]')?.addEventListener('click',()=>{$$('input[type=radio]:checked',root).forEach(el=>el.checked=false);$$('.solution',root).forEach(el=>{el.hidden=true;el.textContent='';});$('[data-quiz-result]').hidden=true;});
}initQuiz();

async function requestJSON(url,options={}){let res;try{res=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});}catch(e){throw Error('Cannot reach the submission service. Please try again later.');}let data={};try{data=await res.json();}catch(e){data={error:'The server did not return a valid response.'};}if(!res.ok)throw Error(data.error||`Request failed (${res.status})`);return data;}
function setNotice(el,text,type=''){if(!el)return;el.textContent=text;el.className='form-notice '+type;}
async function getStatus(){try{return await requestJSON('/api/health');}catch(e){return {ready:false,error:e.message}}}
async function bindStatus(){const tags=$$('[data-backend-status]');if(!tags.length)return;const status=await getStatus();tags.forEach(tag=>{tag.classList.toggle('ready',!!status.ready);tag.classList.toggle('unavailable',!status.ready);tag.textContent=status.ready?'Submission service connected':'Submission service requires setup before sending';});}
bindStatus();

function imageBlobToBase64(file){return new Promise(async(resolve,reject)=>{
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)){reject(Error('Choose a JPG, PNG or WebP image.'));return;}
 if(file.size>12*1024*1024){reject(Error('Photo is too large. Choose a file smaller than 12 MB.'));return;}
 let bmp;try{bmp=await createImageBitmap(file);}catch(e){reject(Error('This image could not be opened. Try a different photo.'));return;}
 try{const cv=document.createElement('canvas');const scale=Math.min(1,1680/Math.max(bmp.width,bmp.height));cv.width=Math.max(1,Math.round(bmp.width*scale));cv.height=Math.max(1,Math.round(bmp.height*scale));const cx=cv.getContext('2d',{alpha:false});cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(bmp,0,0,cv.width,cv.height);let output='';for(const q of [.85,.72,.56,.43]){output=cv.toDataURL('image/jpeg',q);if(output.length<780000)break;}if(output.length>780000)throw Error('Image is still too large. Try cropping to the question only.');resolve(output);}catch(e){reject(e);}finally{bmp.close?.();}
});}
function initQuestionSubmit(){const form=$('[data-question-form]');if(!form)return;
 const notice=$('[data-question-notice]'),picker=$('input[name=image]',form),preview=$('[data-upload-preview]');let imgData=null;let busy=false;
 picker?.addEventListener('change',async()=>{imgData=null;preview.hidden=true;if(!picker.files?.length)return;setNotice(notice,'Optimizing photo for readability…');try{imgData=await imageBlobToBase64(picker.files[0]);$('[data-preview-image]').src=imgData;preview.hidden=false;setNotice(notice,'Photo ready. It will remain private until approved.','success');}catch(e){picker.value='';setNotice(notice,e.message,'error');}});
 $('[data-remove-image]')?.addEventListener('click',()=>{imgData=null;picker.value='';preview.hidden=true;setNotice(notice,'Photo removed.');});
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const fd=new FormData(form);if(String(fd.get('website')||'').trim())return;
  const data={exam:String(fd.get('exam')||''),topic:String(fd.get('topic')||'').trim(),question:String(fd.get('question')||'').trim(),answer:String(fd.get('answer')||'').trim(),exam_year:fd.get('exam_year')?Number(fd.get('exam_year')):null,source_url:String(fd.get('source_url')||'').trim(),name:String(fd.get('name')||'').trim(),email:String(fd.get('email')||'').trim(),image_data:imgData};
  if(!data.exam||!data.topic||(!data.question&&!imgData)||!fd.get('rights')){setNotice(notice,'Choose an exam and topic, provide question text or a photo, and confirm you have the right to share it.','error');return;}
  if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)){setNotice(notice,'Please correct the email address or leave it blank.','error');return;}
  busy=true;const b=$('button[type=submit]',form);b.disabled=true;setNotice(notice,'Sending securely…');
  try{const result=await requestJSON('/api/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});setNotice(notice,`Received. Your reference is ${result.id.slice(0,8).toUpperCase()}. Your question is pending review and is not public.`, 'success');form.reset();imgData=null;preview.hidden=true;}catch(err){setNotice(notice,err.message,'error');}finally{busy=false;b.disabled=false;}
 });
}initQuestionSubmit();

function initApplications(){const form=$('[data-application-form]');if(!form)return;
 const param=new URLSearchParams(location.search).get('course');if(param&&EXAMS[param])form.elements.exam.value=param;
 const notice=$('[data-application-notice]');let busy=false;
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const fd=new FormData(form);if(String(fd.get('website')||'').trim())return;
  const d={name:String(fd.get('name')||'').trim(),email:String(fd.get('email')||'').trim(),phone:String(fd.get('phone')||'').trim(),exam:String(fd.get('exam')||''),message:String(fd.get('message')||'').trim()};
  if(!d.name||!d.exam||(!d.email&&!d.phone)||!fd.get('consent')){setNotice(notice,'Enter your name, course, at least one contact method, and your consent.','error');return;}
  if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)){setNotice(notice,'Please enter a valid email address.','error');return;}
  busy=true;const button=$('button[type=submit]',form);button.disabled=true;setNotice(notice,'Sending your course enquiry…');
  try{await requestJSON('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});setNotice(notice,'Your request has been received. We will review it and contact you about scheduling and course details. No payment has been taken.','success');form.reset();}catch(err){setNotice(notice,err.message,'error');}finally{busy=false;button.disabled=false;}
 });
}initApplications();

function makeLibraryCard(item){const card=elem('article','library-card');const tags=elem('div','library-meta');const examTag=elem('span','library-badge',EXAMS[item.exam]||item.exam);const verified=elem('span','library-badge '+(item.verified_official?'official':''),item.verified_official?'Officially verified PYQ':'Community reviewed');tags.append(examTag,verified);if(item.exam_year)tags.append(elem('span','library-badge',item.exam_year));card.append(tags,elem('h3','',item.question||'View the submitted question image.'));
 if(item.has_image){const img=elem('img');img.src=`/api/image/${encodeURIComponent(item.id)}`;img.alt='Question image contributed to the library';img.loading='lazy';card.append(img);}
 const footer=elem('div');if(item.answer){const button=elem('button','', 'Show proposed solution');button.type='button';const ans=elem('div','library-answer',item.answer);ans.hidden=true;button.addEventListener('click',()=>{ans.hidden=!ans.hidden;button.textContent=ans.hidden?'Show proposed solution':'Hide solution';});footer.append(button,ans);}
 if(item.source_url){const link=elem('a','text-link','View cited source ↗');link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';footer.append(elem('span','','  '),link);}
 card.append(footer);card.append(elem('small','',`Topic: ${item.topic}`));return card;}
function initLibrary(){const root=$('[data-library-list]');if(!root)return;
 const search=$('[data-library-search]'),exam=$('[data-library-exam]'),kind=$('[data-library-type]'),more=$('[data-library-more]');let offset=0,limit=12,term='',busy=false;
 async function load(reset){if(busy)return;busy=true;if(reset){offset=0;root.replaceChildren();more.hidden=true;}const qs=new URLSearchParams({offset:String(offset),limit:String(limit),q:term,exam:exam.value,type:kind.value});
  try{const data=await requestJSON('/api/questions?'+qs.toString());if(!data.items.length&&offset===0){const msg=elem('div','empty-state','No approved questions match these filters yet. Try another exam, or contribute a question for review.');root.append(msg);}else data.items.forEach(i=>root.append(makeLibraryCard(i)));offset+=data.items.length;more.hidden=!data.more;}
  catch(e){if(offset===0)root.append(elem('div','empty-state','The live question library will appear here after the Cloudflare database is connected. Free original practice is already available in Practice.'));more.hidden=true;}finally{busy=false;}
 }
 let wait;search.addEventListener('input',()=>{clearTimeout(wait);wait=setTimeout(()=>{term=search.value.trim().slice(0,90);load(true);},260);});exam.addEventListener('change',()=>load(true));kind.addEventListener('change',()=>load(true));more.addEventListener('click',()=>load(false));load(true);
}initLibrary();

function initAdmin(){const panel=$('[data-admin-panel]');if(!panel)return;
 const login=$('[data-admin-login]'),msg=$('[data-admin-login-message]'),content=$('[data-admin-content]'),notice=$('[data-admin-notice]');let tab='pending';
 async function session(){try{const r=await requestJSON('/api/admin/session');if(r.authenticated){login.hidden=true;panel.hidden=false;await loadTab();}else{login.hidden=false;panel.hidden=true;if(!r.configured)setNotice(msg,'Admin credentials and the database must first be configured in your hosting account.','error');}}catch(err){login.hidden=false;panel.hidden=true;setNotice(msg,'This dashboard activates when the Cloudflare backend is deployed.','error');}}
 $('[data-admin-login-form]')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const button=$('button[type=submit]',form);button.disabled=true;setNotice(msg,'Checking credentials…');try{await requestJSON('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:form.elements.password.value})});form.reset();setNotice(msg,'');await session();}catch(e){setNotice(msg,e.message,'error');}finally{button.disabled=false;}});
 $('[data-admin-logout]')?.addEventListener('click',async()=>{try{await requestJSON('/api/admin/logout',{method:'POST'});}catch(e){}location.reload();});
 $$('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.adminTab;$$('[data-admin-tab]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});loadTab();}));
 async function loadTab(){content.replaceChildren(elem('div','empty-state','Loading…'));setNotice(notice,'');try{
  if(tab==='applications'){const r=await requestJSON('/api/admin/applications');content.replaceChildren();if(!r.items.length)content.append(elem('div','empty-state','No course applications yet.'));r.items.forEach(i=>{const item=elem('article','application-card');item.append(elem('h3','',`${i.name} · ${EXAMS[i.exam]||i.exam}`));if(i.email){const a=elem('a','','Email applicant');a.href='mailto:'+i.email;item.append(a);}item.append(elem('p','',`Phone: ${i.phone||'—'}`));item.append(elem('p','',`Message: ${i.message||'—'}`));item.append(elem('p','',`Received: ${i.created_at||''}`));content.append(item);});return;}
  const r=await requestJSON('/api/admin/questions?status='+(tab==='pending'?'pending':'reviewed'));content.replaceChildren();$('[data-pending-counter]').textContent=String(r.pending_count??0);if(!r.items.length)content.append(elem('div','empty-state',tab==='pending'?'No questions waiting for review.':'No reviewed questions yet.'));
  r.items.forEach(i=>{const article=elem('article','moderation-item');article.append(elem('h3','',i.question||'Question in the attached image'));const tags=elem('div','mod-tags');[EXAMS[i.exam]||i.exam,i.topic,i.exam_year||'',i.status].filter(Boolean).forEach(t=>tags.append(elem('span','',t)));article.append(tags);if(i.has_image){const img=elem('img');img.src=`/api/image/${encodeURIComponent(i.id)}`;img.alt='Uploaded question for moderation';article.append(img);}if(i.answer)article.append(elem('div','mod-answer',`Proposed answer: ${i.answer}`));if(i.source_url){const a=elem('a','text-link','Inspect provided source ↗');a.target='_blank';a.rel='noopener noreferrer';a.href=i.source_url;article.append(a);}if(i.name||i.email)article.append(elem('p','',`Contributor: ${i.name||'Anonymous'}${i.email?' • '+i.email:''}`));if(tab==='pending'){const actions=elem('div','mod-actions');const verify=elem('label');const cb=elem('input');cb.type='checkbox';verify.append(cb,elem('span','','I verified the official paper, year and source'));actions.append(verify);const approve=elem('button','button button-primary','Approve & publish'),reject=elem('button','button button-light reject-btn','Reject');approve.type=reject.type='button';approve.addEventListener('click',()=>review(i.id,'approved',cb.checked));reject.addEventListener('click',()=>review(i.id,'rejected',false));actions.append(approve,reject);article.append(actions);}content.append(article);});
  }catch(e){content.replaceChildren(elem('div','empty-state',e.message));}}
 async function review(id,status,verified){if(verified&&!confirm('Confirm you independently checked the official paper and correct year/source?'))return;if(!confirm(status==='approved'?'Publish this question to the public library?':'Reject this submission?'))return;try{await requestJSON('/api/admin/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status,verified_official:verified})});setNotice(notice,status==='approved'?'Question approved and now public.':'Question rejected.','success');await loadTab();}catch(e){setNotice(notice,e.message,'error');}}
 session();
}initAdmin();
})();