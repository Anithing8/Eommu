/* Background: layered, lit and perspective-tilted flowers drawn on a 2D canvas (no libraries). */
(()=>{'use strict';
const c=document.getElementById('bg'),x=c.getContext('2d'),TAU=6.2832;
const PAL=[['#5c0b17','#c8283d','#f59aa8'],['#7a5200','#f2b705','#fff0a0'],['#102a5c','#2a64c8','#b4d0ff'],['#8f8a78','#f3efe2','#ffffff']];
const still=matchMedia('(prefers-reduced-motion:reduce)').matches,dpr=Math.min(devicePixelRatio||1,1.5);
let W,H,F=[];
function build(){W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);
const n=W<600?6:10,r=W<600?62:70;
F=Array.from({length:n},(_,i)=>({x:Math.random()*W,y:(i+.5)/n*H,R:r+Math.random()*r*.8,p:PAL[i%4],n:9+(Math.random()*5|0),
tilt:.45+Math.random()*.3,rot:Math.random()*TAU,sp:(Math.random()<.5?-1:1)*(.00005+Math.random()*.00006),ph:Math.random()*TAU}))}
function petal(L,w){x.beginPath();x.moveTo(0,0);x.bezierCurveTo(w,-L*.25,w*1.1,-L*.8,0,-L);x.bezierCurveTo(-w*1.1,-L*.8,-w,-L*.25,0,0);x.closePath()}
function flower(f,t){x.save();x.translate(f.x,f.y+Math.sin(t/2600+f.ph)*8);x.rotate(Math.sin(t/4000+f.ph)*.08);x.scale(1,f.tilt+Math.sin(t/5200+f.ph)*.05);
const spin=f.rot+t*f.sp;
for(let l=0;l<3;l++){const L=f.R*(1-l*.24),w=L*.34,off=l*Math.PI/f.n,g=x.createLinearGradient(0,0,0,-L);
g.addColorStop(0,f.p[0]);g.addColorStop(.55,f.p[1]);g.addColorStop(1,f.p[2]);
for(let i=0;i<f.n;i++){const a=spin+off+i*TAU/f.n;x.save();x.rotate(a);
x.fillStyle=g;petal(L,w);x.fill();
x.fillStyle='rgba(0,0,0,'+(.34*(.5-.5*Math.cos(a+.785))).toFixed(3)+')';x.fill();
x.strokeStyle='rgba(0,0,0,.2)';x.lineWidth=1;x.stroke();
x.beginPath();x.moveTo(0,-L*.1);x.lineTo(0,-L*.88);x.strokeStyle='rgba(255,255,255,.25)';x.stroke();x.restore()}}
const r=f.R*.17,g2=x.createRadialGradient(-r*.3,-r*.3,1,0,0,r);g2.addColorStop(0,'#ffe27a');g2.addColorStop(1,'#8a5a00');
x.fillStyle=g2;x.beginPath();x.arc(0,0,r,0,TAU);x.fill();x.fillStyle='rgba(60,30,0,.55)';
for(let i=0;i<14;i++){const a=i*2.4,d=r*(.3+.65*((i*7)%10)/10);x.beginPath();x.arc(Math.cos(a)*d,Math.sin(a)*d,1.4,0,TAU);x.fill()}
x.restore()}
function draw(t){x.clearRect(0,0,W,H);F.forEach(f=>flower(f,t))}
function loop(t){if(!document.hidden)draw(t);requestAnimationFrame(loop)}
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{build();if(still)draw(0)},150)});
build();still?draw(0):requestAnimationFrame(loop);
})();
