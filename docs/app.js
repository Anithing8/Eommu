'use strict';
const $=s=>document.querySelector(s),K='eommu.v1';
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const loc=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString();
const day=d=>loc(d||new Date()).slice(0,10);
const h=(t,p={},...k)=>{const e=document.createElement(t);for(const[a,v]of Object.entries(p))a.startsWith('on')?e.addEventListener(a.slice(2),v):a==='class'?e.className=v:e[a]=v;e.append(...k.flat().filter(x=>x!=null&&x!==false));return e};
let S;try{S=JSON.parse(localStorage.getItem(K))}catch{}
S=S||{lists:[{id:'l1',name:'My tasks'}],tasks:[],cur:'l1',sort:'manual'};
const SORTS={manual:'Order: added',date:'Order: due date',star:'Order: starred'};
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch{toast('Could not save: storage is full or blocked')}render()};
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600)}
function add(title,notes,parent){title=(title||'').trim();if(!title)return;S.tasks.push({id:uid(),list:S.cur,title,notes:notes||'',due:'',star:false,done:false,parent:parent||null,repeat:'',day:day(),notified:false});save()}
function shift(due,r){const d=new Date(due);r==='daily'?d.setDate(d.getDate()+1):r==='weekly'?d.setDate(d.getDate()+7):d.setMonth(d.getMonth()+1);return loc(d).slice(0,16)}
function toggle(t){t.done=!t.done;if(t.done&&t.repeat&&t.due&&!t.parent)S.tasks.push({...t,id:uid(),done:false,notified:false,due:shift(t.due,t.repeat),day:day()});save()}
const kids=t=>S.tasks.filter(s=>s.parent===t.id);
function fmt(t){if(!t.due)return'';const d=new Date(t.due);return d.toLocaleString([],{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function row(t,sub){const k=kids(t),late=t.due&&!t.done&&new Date(t.due)<new Date();
return h('li',{class:'task raised'+(t.done?' done':'')+(sub?' sub':'')},
h('button',{class:'chk inset',ariaLabel:t.done?'Mark as not done':'Mark as done',onclick:()=>toggle(t)},t.done?'✓':''),
h('div',{class:'body',onclick:()=>edit(t)},h('span',{class:'tt'},t.title),
(t.due||t.repeat||k.length||t.notes)&&h('span',{class:'meta'+(late?' late':'')},[fmt(t),t.repeat&&'↻ '+t.repeat,k.length&&`${k.filter(x=>x.done).length}/${k.length} subtasks`,t.notes&&'notes'].filter(Boolean).join(' · '))),
sub?null:h('button',{class:'star'+(t.star?' on':''),ariaLabel:t.star?'Remove star':'Star',onclick:()=>{t.star=!t.star;save()}},t.star?'★':'☆'))}
function render(){
$('#tabs').replaceChildren(...S.lists.map(l=>h('button',{class:'tab',ariaCurrent:l.id===S.cur,onclick:()=>{S.cur=l.id;save()}},l.name)),h('button',{class:'tab',ariaLabel:'New list',onclick:()=>{const n=(prompt('List name')||'').trim();if(n){const id=uid();S.lists.push({id,name:n.slice(0,40)});S.cur=id;save()}}},'+ List'));
$('#sort').textContent=SORTS[S.sort];
let all=S.tasks.filter(t=>t.list===S.cur&&!t.parent);
const cmp={manual:()=>0,date:(a,b)=>(a.due||'~').localeCompare(b.due||'~'),star:(a,b)=>b.star-a.star}[S.sort];
const act=all.filter(t=>!t.done).sort(cmp),dn=all.filter(t=>t.done);
const out=[];act.forEach(t=>{out.push(row(t));kids(t).forEach(s=>out.push(row(s,1)))});
$('#list').replaceChildren(...(out.length?out:[h('li',{class:'empty'},dn.length?'All done. Nicely finished.':'Nothing here yet.')]));
$('#done').replaceChildren(...dn.map(t=>row(t)));$('#dc').textContent=dn.length?`(${dn.length})`:'';$('#dn').hidden=!dn.length;bell()}
function edit(t){const d=$('#dlg'),sub=!!t.parent;
const f={title:h('input',{class:'inset',value:t.title,maxLength:200}),notes:h('textarea',{class:'inset',rows:3,value:t.notes}),due:h('input',{class:'inset',type:'datetime-local',value:t.due}),
rep:h('select',{class:'inset'},...[['','Does not repeat'],['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([v,l])=>h('option',{value:v,selected:v===t.repeat},l))),
lst:h('select',{class:'inset'},...S.lists.map(l=>h('option',{value:l.id,selected:l.id===t.list},l.name)))};
const ns=h('input',{class:'inset',placeholder:'Add a subtask',maxLength:200});
const close=()=>d.close();
d.replaceChildren(h('label',{},'Title'),f.title,h('label',{},'Details'),f.notes,h('label',{},'Due'),f.due,
...(sub?[]:[h('label',{},'Repeat (needs a due date)'),f.rep,h('label',{},'List'),f.lst,h('label',{},'Subtasks'),...kids(t).map(s=>h('div',{class:'meta'},(s.done?'✓ ':'○ ')+s.title)),ns]),
h('div',{class:'row'},h('button',{class:'pill raised',onclick:()=>{if(confirm('Delete this task?')){S.tasks=S.tasks.filter(x=>x!==t&&x.parent!==t.id);close();save()}}},'Delete'),
h('button',{class:'pill raised',onclick:close},'Cancel'),
h('button',{class:'pill raised',style:'color:var(--ac)',onclick:()=>{const ttl=f.title.value.trim();if(!ttl)return toast('Title cannot be empty');
if(f.due.value!==t.due)t.notified=false;Object.assign(t,{title:ttl,notes:f.notes.value,due:f.due.value});
if(!sub){t.repeat=f.due.value?f.rep.value:'';if(f.lst.value!==t.list){t.list=f.lst.value;kids(t).forEach(s=>s.list=t.list)}if(ns.value.trim())add(ns.value,'',t.id);}
close();save()}},'Save')));d.showModal()}
function copyY(){const y=day(new Date(Date.now()-864e5)),have=new Set(S.tasks.filter(t=>t.list===S.cur&&t.day===day()).map(t=>t.title));let n=0;
for(const t of S.tasks.filter(t=>t.list===S.cur&&t.day===y&&!t.parent)){if(have.has(t.title))continue;const id=uid();
S.tasks.push({...t,id,done:false,notified:false,day:day(),due:t.due?day()+t.due.slice(10):''});
kids(t).forEach(s=>S.tasks.push({...s,id:uid(),parent:id,done:false,day:day()}));n++}
toast(n?`Copied ${n} task${n>1?'s':''} from yesterday`:'Nothing new to copy from yesterday');save()}
/* notifications: delivered while the app is open or running in the background; no server involved */
const can='Notification' in window;
function bell(){$('#bell').style.color=can&&Notification.permission==='granted'?'var(--ac)':''}
$('#bell').onclick=async()=>{if(!can)return toast('Notifications are not supported in this browser');const p=await Notification.requestPermission();toast(p==='granted'?'Reminders are on':'Reminders are blocked in browser settings');bell()};
async function ping(t){const o={body:t.notes||'Due now',tag:t.id,icon:'icons/icon-192.png'};try{await(await navigator.serviceWorker.ready).showNotification(t.title,o)}catch{try{new Notification(t.title,o)}catch{}}}
function tick(){if(!can||Notification.permission!=='granted')return;let c=0;const n=new Date();for(const t of S.tasks)if(!t.done&&t.due&&!t.notified&&new Date(t.due)<=n){t.notified=true;ping(t);c=1}if(c)save()}
setInterval(tick,15e3);document.addEventListener('visibilitychange',tick);
$('#add').onsubmit=e=>{e.preventDefault();add($('#new').value);$('#new').value=''};
$('#sort').onclick=()=>{const k=Object.keys(SORTS);S.sort=k[(k.indexOf(S.sort)+1)%k.length];save()};
$('#yday').onclick=copyY;
$('#clr').onclick=()=>{const n=S.tasks.filter(t=>t.list===S.cur&&t.done).length;if(n&&confirm(`Remove ${n} completed task(s)?`)){S.tasks=S.tasks.filter(t=>!(t.list===S.cur&&t.done));save()}};
$('#opts').onclick=()=>{const l=S.lists.find(x=>x.id===S.cur),a=(prompt(`"${l.name}": type r to rename or d to delete`)||'').trim().toLowerCase();
if(a==='r'){const n=(prompt('New name',l.name)||'').trim();if(n){l.name=n.slice(0,40);save()}}
else if(a==='d'){if(S.lists.length<2)return toast('Keep at least one list');if(confirm(`Delete "${l.name}" and its tasks?`)){S.tasks=S.tasks.filter(t=>t.list!==l.id);S.lists=S.lists.filter(x=>x!==l);S.cur=S.lists[0].id;save()}}};
/* share target: tasks sent from the system share sheet arrive as ?title=&text=&url= */
const q=new URLSearchParams(location.search),st=q.get('title')||q.get('text');
if(st){add(st.slice(0,200),[q.get('title')&&q.get('text'),q.get('url')].filter(Boolean).join('\n'));history.replaceState(null,'',location.pathname)}
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
/* background: rings drift upward like finished tasks, each with a check that fades in and out */
(()=>{const c=$('#bg'),x=c.getContext('2d');if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
let w,H;const rs=()=>{w=c.width=innerWidth;H=c.height=innerHeight};rs();addEventListener('resize',rs);
const P=Array.from({length:14},()=>({x:Math.random()*w,y:Math.random()*H,r:14+Math.random()*30,v:.15+Math.random()*.25,p:Math.random()*6}));
(function f(t){x.clearRect(0,0,w,H);x.strokeStyle=matchMedia('(prefers-color-scheme:dark)').matches?'#5fbfa9':'#2f7d6d';x.lineWidth=2;x.lineCap='round';
for(const p of P){p.y-=p.v;if(p.y<-60){p.y=H+60;p.x=Math.random()*w}const a=.5+.5*Math.sin(t/2500+p.p),px=p.x+Math.sin(t/3000+p.p)*14,k=p.r*.45;
x.globalAlpha=.08;x.beginPath();x.arc(px,p.y,p.r,0,7);x.stroke();
x.globalAlpha=.14*a;x.beginPath();x.moveTo(px-k,p.y);x.lineTo(px-k*.25,p.y+k*.7);x.lineTo(px+k,p.y-k*.6);x.stroke()}
requestAnimationFrame(f)})(0)})();
render();tick();
