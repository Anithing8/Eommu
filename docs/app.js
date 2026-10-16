'use strict';
const $=s=>document.querySelector(s),K='eommu.v1';
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const loc=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString();
const h=(t,p={},...k)=>{const e=document.createElement(t);for(const[a,v]of Object.entries(p))a.startsWith('on')?e.addEventListener(a.slice(2),v):a==='class'?e.className=v:e[a]=v;e.append(...k.flat().filter(x=>x!=null&&x!==false));return e};
let S;try{S=JSON.parse(localStorage.getItem(K))}catch{}
S=S||{lists:[{id:'l1',name:'My tasks'}],tasks:[],cur:'l1',sort:'manual'};
if(!S.lists.some(l=>l.id===S.cur))S.cur=S.lists[0].id;
const SORTS={manual:'Order: added',date:'Order: due date',star:'Order: starred'};
const can='Notification' in window;
let tt;
function toast(m,undo){const t=$('#toast');t.replaceChildren(m,undo&&h('button',{class:'b yel',onclick:()=>{undo();t.classList.remove('on')}},'Undo'));t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),undo?6000:2800)}
function mirror(){try{caches.open('eommu-data').then(c=>c.put('due.json',new Response(JSON.stringify(S.tasks.filter(t=>!t.done&&t.due&&!t.notified).map(({id,title,notes,due})=>({id,title,notes,due}))))))}catch{}}
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch{toast('Could not save: storage is full or blocked')}mirror();render()}
function del(fn,msg){const before=JSON.stringify(S.tasks);fn();save();toast(msg,()=>{S.tasks=JSON.parse(before);save()})}
function add(title,notes,parent){title=(title||'').trim();if(!title)return;S.tasks.push({id:uid(),list:S.cur,title,notes:notes||'',due:'',star:false,done:false,parent:parent||null,repeat:'',notified:false});save()}
function shift(due,r){const d=new Date(due);r==='daily'?d.setDate(d.getDate()+1):r==='weekly'?d.setDate(d.getDate()+7):d.setMonth(d.getMonth()+1);return loc(d).slice(0,16)}
function toggle(t){t.done=!t.done;if(t.done&&t.repeat&&t.due&&!t.parent)S.tasks.push({...t,id:uid(),done:false,notified:false,due:shift(t.due,t.repeat)});save()}
const kids=t=>S.tasks.filter(s=>s.parent===t.id);
const fmt=t=>t.due?new Date(t.due).toLocaleString([],{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
const delTask=t=>del(()=>{S.tasks=S.tasks.filter(x=>x!==t&&x.parent!==t.id)},'Task deleted');
function row(t,sub){const k=kids(t),late=t.due&&!t.done&&new Date(t.due)<new Date();
const m=[fmt(t),t.repeat&&'repeats '+t.repeat,k.length&&`${k.filter(x=>x.done).length}/${k.length} subtasks`,t.notes&&'notes'].filter(Boolean).join(' · ');
return h('li',{class:'task'+(t.done?' done':'')+(sub?' sub':'')+(!t.done&&late?' late':t.star&&!t.done?' star':'')},
h('button',{class:'chk',ariaLabel:t.done?'Mark as not done':'Mark as done',onclick:()=>toggle(t)},t.done?'✓':''),
h('div',{class:'body',onclick:()=>edit(t)},h('span',{class:'tt'},t.title),m&&h('span',{class:'meta'+(late&&!t.done?' late':'')},m)),
sub?null:h('button',{class:'st'+(t.star?' on':''),ariaLabel:t.star?'Remove star':'Star',onclick:()=>{t.star=!t.star;save()}},'★'),
h('button',{class:'del',ariaLabel:'Delete task',title:'Delete',onclick:()=>delTask(t)},'×'))}
function render(){
$('#tabs').replaceChildren(...S.lists.map(l=>h('button',{class:'b'+(l.id===S.cur?' on':''),onclick:()=>{S.cur=l.id;save()}},l.name)),h('button',{class:'b yel',onclick:newList},'+ List'));
const cur=S.lists.find(l=>l.id===S.cur);$('#lname').textContent=cur.name;
$('#sort').textContent=SORTS[S.sort];
const all=S.tasks.filter(t=>t.list===S.cur&&!t.parent),dn=all.filter(t=>t.done);
const cmp={manual:()=>0,date:(a,b)=>(a.due||'~').localeCompare(b.due||'~'),star:(a,b)=>b.star-a.star}[S.sort];
const act=all.filter(t=>!t.done).sort(cmp);$('#cnt').textContent=act.length+' open';
const out=[];act.forEach(t=>{out.push(row(t));kids(t).forEach(s=>out.push(row(s,1)))});
$('#list').replaceChildren(...(out.length?out:[h('li',{class:'empty'},dn.length?'All done.':'Nothing here yet.')]));
$('#done').replaceChildren(...dn.map(t=>row(t)));$('#dc').textContent=dn.length?`(${dn.length})`:'';$('#dn').hidden=!dn.length;bell()}
function show(d){if(!d.open)d.showModal()}
function ask(title,val,ok){const d=$('#dlg'),i=h('input',{value:val||'',maxLength:40,ariaLabel:title});
const go=()=>{const v=i.value.trim();if(v){d.close();ok(v)}};i.addEventListener('keydown',e=>e.key==='Enter'&&go());
d.replaceChildren(h('h2',{},title),i,h('div',{class:'row'},h('button',{class:'b',onclick:()=>d.close()},'Cancel'),h('button',{class:'b blue',onclick:go},'Save')));show(d);i.focus()}
const newList=()=>ask('New list','',v=>{const id=uid();S.lists.push({id,name:v});S.cur=id;save()});
$('#ren').onclick=()=>{const l=S.lists.find(x=>x.id===S.cur);ask('Rename list',l.name,v=>{l.name=v;save()})};
$('#dl').onclick=()=>{if(S.lists.length<2)return toast('Keep at least one list');const l=S.lists.find(x=>x.id===S.cur);
if(confirm(`Delete the list "${l.name}" and all its tasks?`)){S.tasks=S.tasks.filter(t=>t.list!==l.id);S.lists=S.lists.filter(x=>x!==l);S.cur=S.lists[0].id;save()}};
function edit(t){const d=$('#dlg'),sub=!!t.parent;
const f={title:h('input',{value:t.title,maxLength:200}),notes:h('textarea',{rows:3,value:t.notes}),due:h('input',{type:'datetime-local',value:t.due}),
rep:h('select',{},...[['','Does not repeat'],['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([v,l])=>h('option',{value:v,selected:v===t.repeat},l))),
lst:h('select',{},...S.lists.map(l=>h('option',{value:l.id,selected:l.id===t.list},l.name)))};
const ns=h('input',{placeholder:'Add a subtask',maxLength:200});
d.replaceChildren(h('h2',{},'Edit task'),h('label',{},'Title'),f.title,h('label',{},'Details'),f.notes,h('label',{},'Due'),f.due,
...(sub?[]:[h('label',{},'Repeat (needs a due date)'),f.rep,h('label',{},'List'),f.lst,h('label',{},'Subtasks'),
...kids(t).map(s=>h('div',{class:'sb'},h('span',{},(s.done?'✓ ':'○ ')+s.title),h('button',{class:'b red',ariaLabel:'Delete subtask',onclick:()=>{S.tasks=S.tasks.filter(x=>x!==s);save();edit(t)}},'×'))),ns]),
h('div',{class:'row'},h('button',{class:'b red',onclick:()=>{d.close();delTask(t)}},'Delete'),h('button',{class:'b',onclick:()=>d.close()},'Cancel'),
h('button',{class:'b blue',onclick:()=>{const ttl=f.title.value.trim();if(!ttl)return toast('Title cannot be empty');
if(f.due.value!==t.due)t.notified=false;Object.assign(t,{title:ttl,notes:f.notes.value,due:f.due.value});
if(!sub){t.repeat=f.due.value?f.rep.value:'';if(f.lst.value!==t.list){t.list=f.lst.value;kids(t).forEach(s=>s.list=t.list)}if(ns.value.trim())add(ns.value,'',t.id)}
d.close();save()}},'Save')));show(d)}
/* copy (or move) tasks from another list into the current one */
function copyFrom(){const o=S.lists.filter(l=>l.id!==S.cur);if(!o.length)return toast('Create a second list first, then copy from it');
const d=$('#dlg'),sel=h('select',{},...o.map(l=>h('option',{value:l.id},l.name))),box=h('div',{class:'pick'}),mv=h('input',{type:'checkbox'});
const fill=()=>{const a=S.tasks.filter(t=>t.list===sel.value&&!t.parent);box.replaceChildren(...(a.length?a.map(t=>h('label',{class:'pk'},h('input',{type:'checkbox',value:t.id,checked:!t.done}),t.title)):[h('div',{class:'meta'},'No tasks in this list')]))};
sel.onchange=fill;fill();
const go=()=>{const ids=new Set([...box.querySelectorAll('input:checked')].map(i=>i.value));if(!ids.size)return toast('Pick at least one task');
const have=new Set(S.tasks.filter(t=>t.list===S.cur&&!t.parent).map(t=>t.title));let n=0,skip=0;const src=S.tasks.filter(t=>ids.has(t.id));
for(const t of src){if(have.has(t.title)){skip++;continue}const id=uid(),past=t.due&&new Date(t.due)<new Date();
S.tasks.push({...t,id,list:S.cur,done:false,notified:false,due:past?'':t.due});kids(t).forEach(s=>S.tasks.push({...s,id:uid(),list:S.cur,parent:id,done:false}));n++}
if(mv.checked)S.tasks=S.tasks.filter(t=>!ids.has(t.id)&&!ids.has(t.parent)||(t.list===S.cur));
d.close();save();toast(`${n} copied${skip?`, ${skip} skipped (same title)`:''}`)};
d.replaceChildren(h('h2',{},'Copy from list'),h('label',{},'Source list'),sel,h('label',{},'Tasks'),box,
h('label',{class:'pk'},mv,'Move instead of copy'),h('div',{class:'row'},h('button',{class:'b',onclick:()=>d.close()},'Cancel'),h('button',{class:'b blue',onclick:go},'Copy here')));show(d)}
$('#cp').onclick=copyFrom;
/* reminders */
function bell(){const b=$('#bell');if(!can){b.textContent='Remind: n/a';return}const g=Notification.permission==='granted';b.textContent=g?'Remind: on':'Remind: off';b.className='b'+(g?' yel':'')}
async function note(title,o){o={icon:'icons/icon-192.png',badge:'icons/icon-192.png',...o};try{await(await navigator.serviceWorker.ready).showNotification(title,o)}catch{try{new Notification(title,o)}catch{}}}
$('#bell').onclick=async()=>{if(!can)return toast('Notifications are not supported in this browser');
if(Notification.permission==='denied')return toast('Reminders are blocked. Allow them in the browser or site settings');
if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')return bell();
try{const r=await navigator.serviceWorker.ready;if('periodicSync'in r)await r.periodicSync.register('eommu-due',{minInterval:15*6e4})}catch{}
bell();mirror();note('Eommu reminders are on',{body:'Tasks with a due time will notify you here.',tag:'eommu-test'})};
function tick(){if(!can||Notification.permission!=='granted')return;let c=0;const n=new Date();
for(const t of S.tasks)if(!t.done&&t.due&&!t.notified&&new Date(t.due)<=n){t.notified=true;note(t.title,{body:t.notes||'Due now',tag:t.id});c=1}if(c)save()}
setInterval(tick,15e3);document.addEventListener('visibilitychange',()=>!document.hidden&&tick());
$('#add').onsubmit=e=>{e.preventDefault();add($('#new').value);$('#new').value=''};
$('#sort').onclick=()=>{const k=Object.keys(SORTS);S.sort=k[(k.indexOf(S.sort)+1)%k.length];save()};
$('#clr').onclick=()=>{const gone=new Set(S.tasks.filter(t=>t.list===S.cur&&t.done).map(t=>t.id));if(!gone.size)return toast('No completed tasks to remove');
del(()=>{S.tasks=S.tasks.filter(t=>!gone.has(t.id)&&!gone.has(t.parent))},`${gone.size} completed removed`)};
/* share target: the system share sheet opens Eommu with ?title=&text=&url= */
const q=new URLSearchParams(location.search),st=q.get('title')||q.get('text');
if(st){add(st.slice(0,200),[q.get('title')&&q.get('text'),q.get('url')].filter(Boolean).join('\n'));history.replaceState(null,'',location.pathname)}
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
/* tasks the background worker already announced must not fire twice */
try{caches.open('eommu-data').then(c=>c.match('due.json')).then(r=>r&&r.json()).then(a=>{if(!a)return;const ids=new Set(a.map(t=>t.id));let ch=0;
S.tasks.forEach(t=>{if(!t.done&&t.due&&!t.notified&&!ids.has(t.id)&&new Date(t.due)<=new Date()){t.notified=true;ch=1}});if(ch)save()}).catch(()=>{})}catch{}
render();mirror();tick();
