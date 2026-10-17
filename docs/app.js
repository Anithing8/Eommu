'use strict';
const $=s=>document.querySelector(s),K='eommu.v1';
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const loc=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString();
const h=(t,p={},...k)=>{const e=document.createElement(t);for(const[a,v]of Object.entries(p))a.startsWith('on')?e.addEventListener(a.slice(2),v):a==='class'?e.className=v:e[a]=v;e.append(...k.flat().filter(x=>x!=null&&x!==false));return e};
const P={star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
dots:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',bell:'<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0"/>',plus:'<path d="M12 5v14M5 12h14"/>'};
const ic=n=>{const s=h('span',{class:'i'});s.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+P[n]+'</svg>';return s};
let S;try{S=JSON.parse(localStorage.getItem(K))}catch{}
S=S||{lists:[{id:'l1',name:'My tasks'}],tasks:[],cur:'l1',sort:'manual'};
if(!S.lists.some(l=>l.id===S.cur))S.cur=S.lists[0].id;
const SORTS={manual:'Added',date:'Due date',star:'Starred'};
const can='Notification' in window;
let tt;
function toast(m,undo){const t=$('#toast');t.replaceChildren(m,...(undo?[h('button',{onclick:()=>{undo();t.classList.remove('on')}},'Undo')]:[]));t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),undo?6000:2800)}
function mirror(){try{caches.open('eommu-data').then(c=>c.put('due.json',new Response(JSON.stringify(S.tasks.filter(t=>!t.done&&t.due&&!t.notified).map(({id,title,notes,due})=>({id,title,notes,due}))))))}catch{}}
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch{toast('Could not save: storage is full or blocked')}mirror();render()}
function del(fn,msg){const before=JSON.stringify(S.tasks);fn();save();toast(msg,()=>{S.tasks=JSON.parse(before);save()})}
function add(title,notes,parent,due){title=(title||'').trim();if(!title)return;S.tasks.push({id:uid(),list:S.cur,title,notes:notes||'',due:due||'',star:false,done:false,parent:parent||null,repeat:'',notified:false});save()}
function shift(due,r){const d=new Date(due);r==='daily'?d.setDate(d.getDate()+1):r==='weekly'?d.setDate(d.getDate()+7):d.setMonth(d.getMonth()+1);return loc(d).slice(0,16)}
function toggle(t){t.done=!t.done;if(t.done&&t.repeat&&t.due&&!t.parent)S.tasks.push({...t,id:uid(),done:false,notified:false,due:shift(t.due,t.repeat)});save()}
const kids=t=>S.tasks.filter(s=>s.parent===t.id);
const fmt=t=>t.due?new Date(t.due).toLocaleString([],{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
const delTask=t=>del(()=>{S.tasks=S.tasks.filter(x=>x!==t&&x.parent!==t.id)},'Task deleted');
const sameDay=(a,b)=>a.toDateString()===b.toDateString();
function dueLabel(v){const d=new Date(v),n=new Date(),tm=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});return sameDay(d,n)?'Today, '+tm:sameDay(d,new Date(n.getTime()+864e5))?'Tomorrow, '+tm:fmt({due:v})}
const LOGO='<svg viewBox="18 18 72 72" aria-hidden="true"><path d="M79.8 45.9A27.4 27.4 0 1 1 63.4 29.5M41.3 56.5l10.2 10.6 26.9-32.5" fill="none" stroke="currentColor" stroke-width="5.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function line(t,sub){const k=kids(t),late=t.due&&!t.done&&new Date(t.due)<new Date(),today=t.due&&sameDay(new Date(t.due),new Date());
const extra=[k.length&&`${k.filter(x=>x.done).length} of ${k.length} subtasks`,t.notes&&'notes'].filter(Boolean).join(' · ');
return h('div',{class:'ln'+(t.done?' done':'')+(sub?' sub':'')},
h('button',{class:'chk',ariaLabel:t.done?'Mark as not done':'Mark as done',onclick:()=>toggle(t)},ic('check')),
h('button',{class:'body',onclick:()=>edit(t)},h('span',{class:'tt'},t.title),
(t.due||t.repeat)&&h('span',{class:'pills'},t.due&&h('span',{class:'pill'+(late?' late':today?' today':'')},dueLabel(t.due)),t.repeat&&h('span',{class:'pill'},'repeats '+t.repeat)),
extra&&h('span',{class:'meta'},extra)),
sub?null:h('button',{class:'ib st'+(t.star?' on':''),ariaLabel:t.star?'Remove star':'Star task',onclick:()=>{t.star=!t.star;save()}},ic('star')),
h('button',{class:'ib del',ariaLabel:'Delete task',title:'Delete',onclick:()=>delTask(t)},ic('trash')))}
const block=t=>h('li',{class:'card task'},line(t),...kids(t).sort((a,b)=>0).map(s=>line(s,1)));
function render(){
$('#tabs').replaceChildren(...S.lists.map(l=>{const n=S.tasks.filter(t=>t.list===l.id&&!t.parent&&!t.done).length;return h('button',{class:'pl'+(l.id===S.cur?' on':''),onclick:()=>{S.cur=l.id;save()}},l.name,n?h('small',{},String(n)):null)}),h('button',{class:'pl new',onclick:newList},'+ New list'));
const cur=S.lists.find(l=>l.id===S.cur);$('#lname').textContent=cur.name;
const top=S.tasks.filter(t=>t.list===S.cur&&!t.parent),dn=top.filter(t=>t.done);
const cmp={manual:()=>0,date:(a,b)=>(a.due||'~').localeCompare(b.due||'~'),star:(a,b)=>b.star-a.star}[S.sort];
const act=top.filter(t=>!t.done).sort(cmp);
$('#cnt').textContent=top.length?`${dn.length} of ${top.length} done`:'No tasks yet';$('#prog').style.width=(top.length?dn.length/top.length*100:0)+'%';
const em=h('li',{class:'empty'});em.innerHTML=LOGO;em.append(dn.length?'All done for now.':'A clear page.');
$('#list').replaceChildren(...(act.length?act.map(block):[em]));
$('#done').replaceChildren(...dn.map(block));$('#dc').textContent=dn.length?`(${dn.length})`:'';$('#dn').hidden=!dn.length;bell()}
const show=d=>{if(!d.open)d.showModal()};
function ask(title,val,ok){const d=$('#dlg'),i=h('input',{value:val||'',maxLength:40,ariaLabel:title});
const go=()=>{const v=i.value.trim();if(v){d.close();ok(v)}};i.addEventListener('keydown',e=>e.key==='Enter'&&go());
d.replaceChildren(h('h2',{},title),h('label',{},'Name'),i,h('div',{class:'row'},h('button',{class:'btn',onclick:()=>d.close()},'Cancel'),h('button',{class:'btn pri',onclick:go},'Save')));show(d);i.focus();i.select()}
function sure(title,text,label,fn){const d=$('#dlg');d.replaceChildren(h('h2',{},title),h('p',{class:'sub'},text),h('div',{class:'row'},h('button',{class:'btn',onclick:()=>d.close()},'Cancel'),h('button',{class:'btn dngb',onclick:()=>{d.close();fn()}},label)));show(d)}
const cur=()=>S.lists.find(l=>l.id===S.cur);
const newList=()=>ask('New list','',v=>{const id=uid();S.lists.push({id,name:v});S.cur=id;save()});
const rename=()=>ask('Rename list',cur().name,v=>{cur().name=v;save()});
function delList(){if(S.lists.length<2)return toast('Keep at least one list');const l=cur(),n=S.tasks.filter(t=>t.list===l.id&&!t.parent).length;
sure('Delete this list?',`"${l.name}" and its ${n} task${n===1?'':'s'} will be removed. This cannot be undone.`,'Delete list',()=>{S.tasks=S.tasks.filter(t=>t.list!==l.id);S.lists=S.lists.filter(x=>x!==l);S.cur=S.lists[0].id;save()})}
function clearDone(){const gone=new Set(S.tasks.filter(t=>t.list===S.cur&&t.done).map(t=>t.id));if(!gone.size)return toast('No completed tasks to remove');
del(()=>{S.tasks=S.tasks.filter(t=>!gone.has(t.id)&&!gone.has(t.parent))},`${gone.size} completed removed`)}
function sortNext(){const k=Object.keys(SORTS);S.sort=k[(k.indexOf(S.sort)+1)%k.length];save();toast('Sorted by '+SORTS[S.sort].toLowerCase())}
const menu=$('#menu');
$('#more').append(ic('dots'));$('#go').append(ic('plus'));
$('#more').onclick=e=>{e.stopPropagation();if(!menu.hidden){menu.hidden=true;return}
const it=[['Rename list',rename],['Copy from another list',copyFrom],['Sort by: '+SORTS[S.sort],sortNext],['Remove completed tasks',clearDone],null,['Delete list',delList,'dng']];
menu.replaceChildren(...it.map(x=>x?h('button',{role:'menuitem',class:x[2]||'',onclick:()=>{menu.hidden=true;x[1]()}},x[0]):h('hr')));menu.hidden=false};
document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target))menu.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')menu.hidden=true});
function edit(t){const d=$('#dlg'),sub=!!t.parent;
const f={title:h('input',{value:t.title,maxLength:200}),notes:h('textarea',{rows:3,value:t.notes}),due:h('input',{type:'datetime-local',value:t.due}),
rep:h('select',{},...[['','Does not repeat'],['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([v,l])=>h('option',{value:v,selected:v===t.repeat},l))),
lst:h('select',{},...S.lists.map(l=>h('option',{value:l.id,selected:l.id===t.list},l.name)))};
const ns=h('input',{placeholder:'Add a subtask',maxLength:200});
d.replaceChildren(h('h2',{},'Edit task'),h('label',{},'Title'),f.title,h('label',{},'Details'),f.notes,h('label',{},'Due'),f.due,
...(sub?[]:[h('label',{},'Repeat (needs a due date)'),f.rep,h('label',{},'List'),f.lst,h('label',{},'Subtasks'),
...kids(t).map(s=>h('div',{class:'sb'},h('span',{},(s.done?'✓ ':'')+s.title),h('button',{class:'ib',ariaLabel:'Delete subtask',onclick:()=>{S.tasks=S.tasks.filter(x=>x!==s);save();edit(t)}},ic('trash')))),ns]),
h('div',{class:'row'},h('button',{class:'btn dngt l',onclick:()=>{d.close();delTask(t)}},'Delete'),h('button',{class:'btn',onclick:()=>d.close()},'Cancel'),
h('button',{class:'btn pri',onclick:()=>{const ttl=f.title.value.trim();if(!ttl)return toast('Title cannot be empty');
if(f.due.value!==t.due)t.notified=false;Object.assign(t,{title:ttl,notes:f.notes.value,due:f.due.value});
if(!sub){t.repeat=f.due.value?f.rep.value:'';if(f.lst.value!==t.list){t.list=f.lst.value;kids(t).forEach(s=>s.list=t.list)}if(ns.value.trim())add(ns.value,'',t.id)}
d.close();save()}},'Save')));show(d)}
function copyFrom(){const o=S.lists.filter(l=>l.id!==S.cur);if(!o.length)return toast('Create a second list first, then copy from it');
const d=$('#dlg'),sel=h('select',{},...o.map(l=>h('option',{value:l.id},l.name))),box=h('div',{class:'pick'}),mv=h('input',{type:'checkbox'});
const fill=()=>{const a=S.tasks.filter(t=>t.list===sel.value&&!t.parent);box.replaceChildren(...(a.length?a.map(t=>h('label',{class:'pk'},h('input',{type:'checkbox',value:t.id,checked:!t.done}),t.title)):[h('p',{class:'sub'},'No tasks in this list')]))};
sel.onchange=fill;fill();
const go=()=>{const ids=new Set([...box.querySelectorAll('input:checked')].map(i=>i.value));if(!ids.size)return toast('Pick at least one task');
const have=new Set(S.tasks.filter(t=>t.list===S.cur&&!t.parent).map(t=>t.title));let n=0,skip=0;const src=S.tasks.filter(t=>ids.has(t.id));
for(const t of src){if(have.has(t.title)){skip++;continue}const id=uid(),past=t.due&&new Date(t.due)<new Date();
S.tasks.push({...t,id,list:S.cur,done:false,notified:false,due:past?'':t.due});kids(t).forEach(s=>S.tasks.push({...s,id:uid(),list:S.cur,parent:id,done:false}));n++}
if(mv.checked)S.tasks=S.tasks.filter(t=>(!ids.has(t.id)&&!ids.has(t.parent))||t.list===S.cur);
d.close();save();toast(`${n} copied${skip?`, ${skip} skipped (same title)`:''}`)};
d.replaceChildren(h('h2',{},'Copy tasks here'),h('label',{},'From list'),sel,h('label',{},'Tasks'),box,
h('label',{class:'pk opt'},mv,'Move them instead of copying'),h('div',{class:'row'},h('button',{class:'btn',onclick:()=>d.close()},'Cancel'),h('button',{class:'btn pri',onclick:go},'Copy here')));show(d)}
/* reminders */
function bell(){const b=$('#bell');b.replaceChildren(ic('bell'));const g=can&&Notification.permission==='granted';b.classList.toggle('on',g);b.title=g?'Reminders are on':'Turn on reminders';b.ariaLabel=b.title}
async function note(title,o){o={icon:'icons/icon-192.png',badge:'icons/icon-192.png',...o};try{await(await navigator.serviceWorker.ready).showNotification(title,o)}catch{try{new Notification(title,o)}catch{}}}
$('#bell').onclick=async()=>{if(!can)return toast('Notifications are not supported in this browser');
if(Notification.permission==='denied')return toast('Reminders are blocked. Allow them in your browser or site settings');
if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')return bell();
try{const r=await navigator.serviceWorker.ready;if('periodicSync'in r)await r.periodicSync.register('eommu-due',{minInterval:15*6e4})}catch{}
bell();mirror();note('Reminders are on',{body:'Tasks with a due time will notify you here.',tag:'eommu-test'})};
function tick(){if(!can||Notification.permission!=='granted')return;let c=0;const n=new Date();
for(const t of S.tasks)if(!t.done&&t.due&&!t.notified&&new Date(t.due)<=n){t.notified=true;note(t.title,{body:t.notes||'Due now',tag:t.id});c=1}if(c)save()}
setInterval(tick,15e3);document.addEventListener('visibilitychange',()=>!document.hidden&&tick());
let pend='',picking=false;
function chips(){const q=$('#qc'),has=$('#new').value.trim();q.hidden=!has;if(!has){pend='';picking=false;return}
const c=(l,f,on)=>h('button',{type:'button',class:'chip'+(on?' on':''),onclick:f},l);
q.replaceChildren(...(picking?[h('input',{type:'datetime-local',class:'dt',onchange:e=>{pend=e.target.value;picking=false;chips()}}),c('Cancel',()=>{picking=false;chips()})]
:pend?[c(dueLabel(pend)+'  ×',()=>{pend='';chips()},1)]
:[c('In 1 hour',()=>{pend=loc(new Date(Date.now()+36e5)).slice(0,16);chips()}),c('Tomorrow 9 am',()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(9,0,0,0);pend=loc(d).slice(0,16);chips()}),c('Pick date and time',()=>{picking=true;chips()})]))}
$('#new').addEventListener('input',chips);
$('#add').onsubmit=e=>{e.preventDefault();add($('#new').value,'',null,pend);$('#new').value='';chips()};
{const hr=new Date().getHours();$('#greet').textContent=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'}
$('#date').textContent=new Date().toLocaleDateString([],{weekday:'long',day:'numeric',month:'long'});
const q=new URLSearchParams(location.search),st=q.get('title')||q.get('text');
if(st){add(st.slice(0,200),[q.get('title')&&q.get('text'),q.get('url')].filter(Boolean).join('\n'));history.replaceState(null,'',location.pathname)}
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
try{caches.open('eommu-data').then(c=>c.match('due.json')).then(r=>r&&r.json()).then(a=>{if(!a)return;const ids=new Set(a.map(t=>t.id));let ch=0;
S.tasks.forEach(t=>{if(!t.done&&t.due&&!t.notified&&!ids.has(t.id)&&new Date(t.due)<=new Date()){t.notified=true;ch=1}});if(ch)save()}).catch(()=>{})}catch{}
render();mirror();tick();
