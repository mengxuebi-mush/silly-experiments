import { LINES, FLOW } from '../../src/poem.js'
import { reduceMotion } from '../../src/stage.js'

// Stepped breaks the poem by hand, the way a compositor would.
var FRAGS=['Fury said to a','mouse, That he','met in the','house,','“Let us','both go','to law: I','will prosecute','you.—Come,','I’ll take no','denial; We','must have','the trial;','For really','this morning','I’ve nothing','to do.”','Said the','mouse to the','cur, “Such','a trial,','dear sir,','With','no jury','or judge,','would be','wasting','our','breath.”','“I’ll be','judge, I’ll','be jury,”','Said','cunning','old Fury:','“I’ll','try the','whole','cause,','and','condemn','you','to','death.”'];

var NS='http://www.w3.org/2000/svg';
function $(s){return document.querySelector(s);}
function el(n,a){var e=document.createElementNS(NS,n);if(a)for(var k in a)e.setAttribute(k,a[k]);return e;}

var mc=document.createElement('canvas').getContext('2d');
function M(str){
  mc.font='400 100px '+getComputedStyle(document.body).getPropertyValue('--serif');
  return mc.measureText(str).width/100;
}

function buildVerse(){
  var v=$('#verse');v.replaceChildren();
  LINES.forEach(function(t){var d=document.createElement('div');d.textContent=t;v.append(d);});
}

function buildStepped(){
  var box=$('#steps');box.replaceChildren();
  var n=FRAGS.length,SMAX=6.2,SMIN=2.0,XMAX=24,CYC=2,sum=0;
  FRAGS.forEach(function(t,i){
    var u=i/(n-1);
    var s=SMAX-(SMAX-SMIN)*Math.pow(u,.85);sum+=s*1.12;
    var ph=(u*CYC)%1,tri=1-Math.abs(2*ph-1);
    var d=document.createElement('div');d.className='step';
    d.style.setProperty('--s',s.toFixed(2));
    d.style.setProperty('--x',(XMAX*tri).toFixed(2));
    d.textContent=t;box.append(d);
  });
  box.style.setProperty('--sum',sum.toFixed(2));box.style.setProperty('--n',n);
  $('#spec-stepped').textContent=n+' lines · '+SMAX+'% → '+SMIN+'% of measure · indent 0–'+XMAX+'%';
  measureTail();
}

// The stepped lines are a chain hung from the first one. Pinch a line near the tip:
// it follows the pointer, the links go taut and the zigzag straightens; let go and
// every line springs back to where it was set, wiggling on the way.
var T={el:[],rest:[],p:[],q:[],len:[],ang:[],held:-1,gx:0,gy:0,px:0,py:0,raf:0,last:0},TIP_FROM=.55;
// Lines turn with the tail's overall direction, measured across a whole zigzag, so
// straightening tilts the column instead of undoing every step's slant.
function spineAngle(a,i){
  var j=Math.max(0,i-11),k=Math.min(a.length-1,i+11);
  return Math.atan2(a[k].y-a[j].y,a[k].x-a[j].x);
}
function measureTail(){
  var box=$('#steps'),n=box.children.length;
  T.el=[].slice.call(box.children);
  T.el.forEach(function(d){d.style.transform='';});
  // The spine runs a fixed distance in from each line's indent, so it follows the
  // zigzag rather than the ragged line ends; each line turns about that point.
  var ws=T.el.map(function(d){return d.offsetWidth;}).sort(function(a,b){return a-b;});
  var c=ws[n>>1]*.4;
  T.rest=T.el.map(function(d,i){
    d.dataset.i=i;d.classList.toggle('tip',i>=n*TIP_FROM);
    d.style.transformOrigin=c.toFixed(1)+'px 50%';
    return{x:d.offsetLeft+c,y:d.offsetTop+d.offsetHeight/2};
  });
  T.p=T.rest.map(function(r){return{x:r.x,y:r.y};});
  T.q=T.rest.map(function(r){return{x:r.x,y:r.y};});
  T.len=T.rest.map(function(r,i){return i?Math.hypot(r.x-T.rest[i-1].x,r.y-T.rest[i-1].y):0;});
  T.ang=T.rest.map(function(_,i){return spineAngle(T.rest,i);});
  T.held=-1;$('#steps').classList.remove('held');
}
function stepTail(){
  var n=T.p.length,DAMP=reduceMotion?.82:.965,i,it;
  for(i=1;i<n;i++){
    var p=T.p[i],q=T.q[i],r=T.rest[i],k=.012*(1+3*Math.pow(1-i/n,2));
    var vx=(p.x-q.x)*DAMP,vy=(p.y-q.y)*DAMP;
    q.x=p.x;q.y=p.y;
    p.x+=vx+(r.x-p.x)*k;p.y+=vy+(r.y-p.y)*k;
  }
  // The held line can only go as far as the links above it reach, plus a little stretch.
  var tx=T.px-T.gx,ty=T.py-T.gy;
  if(T.held>0){
    var reach=0;for(i=1;i<=T.held;i++)reach+=T.len[i];reach*=1.06;
    var dx=tx-T.rest[0].x,dy=ty-T.rest[0].y,d=Math.hypot(dx,dy);
    if(d>reach){tx=T.rest[0].x+dx*reach/d;ty=T.rest[0].y+dy*reach/d;}
  }
  for(it=0;it<16;it++){
    if(T.held>0){T.p[T.held].x=tx;T.p[T.held].y=ty;}
    for(var s=1;s<n;s++){
      i=it&1?n-s:s;
      var a=T.p[i-1],b=T.p[i],ex=b.x-a.x,ey=b.y-a.y,e=Math.hypot(ex,ey)||1,f=(e-T.len[i])/e;
      var wa=i-1===0||i-1===T.held?0:.5,wb=i===T.held?0:.5;
      if(!wa&&!wb)continue;
      var m=1/(wa+wb);
      a.x+=ex*f*wa*m;a.y+=ey*f*wa*m;b.x-=ex*f*wb*m;b.y-=ey*f*wb*m;
    }
  }
}
function drawTail(){
  var moving=T.held>=0;
  T.el.forEach(function(d,i){
    var p=T.p[i],r=T.rest[i],q=T.q[i];
    var th=spineAngle(T.p,i)-T.ang[i];th=Math.atan2(Math.sin(th),Math.cos(th));
    if(Math.abs(p.x-r.x)+Math.abs(p.y-r.y)+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)>.05)moving=true;
    d.style.transform='translate('+(p.x-r.x).toFixed(2)+'px,'+(p.y-r.y).toFixed(2)+'px) rotate('+th.toFixed(4)+'rad)';
  });
  return moving;
}
function tailFrame(now){
  // Physics runs at a fixed 60 steps a second whatever the display rate.
  var steps=T.last?Math.min(3,Math.max(1,Math.round((now-T.last)/16.7))):1;
  T.last=now;
  for(var k=0;k<steps;k++)stepTail();
  if(drawTail())T.raf=requestAnimationFrame(tailFrame);
  else{T.raf=0;T.last=0;T.el.forEach(function(d){d.style.transform='';});}
}
function wakeTail(){if(!T.raf)T.raf=requestAnimationFrame(tailFrame);}
if(import.meta.env.DEV)window.__tick=function(frames){
  for(var k=0;k<(frames||1);k++){stepTail();stepCurl();}
  drawTail();drawCurl();
};
if(import.meta.env.DEV)window.__curl=function(){return C;};
(function(){
  var box=$('#steps'),sheet=box.parentNode;
  function at(e){var r=box.getBoundingClientRect();T.px=e.clientX-r.left;T.py=e.clientY-r.top;}
  // The tip lines are small, so a press near one counts, not only on its glyphs.
  function nearestTip(e){
    var best=null,bd=24;
    box.querySelectorAll('.step.tip').forEach(function(d){
      var r=d.getBoundingClientRect();
      var dx=Math.max(r.left-e.clientX,0,e.clientX-r.right),dy=Math.max(r.top-e.clientY,0,e.clientY-r.bottom);
      var dd=Math.hypot(dx,dy);if(dd<=bd){bd=dd;best=d;}
    });
    return best;
  }
  sheet.addEventListener('pointerdown',function(e){
    var d=e.button>0?null:nearestTip(e);
    if(!d)return;
    e.preventDefault();at(e);
    T.held=+d.dataset.i;T.gx=T.px-T.p[T.held].x;T.gy=T.py-T.p[T.held].y;
    sheet.setPointerCapture(e.pointerId);box.classList.add('held');wakeTail();
  });
  sheet.addEventListener('pointermove',function(e){if(T.held>=0)at(e);});
  function drop(){if(T.held<0)return;T.held=-1;box.classList.remove('held');wakeTail();}
  sheet.addEventListener('pointerup',drop);
  sheet.addEventListener('pointercancel',drop);
  sheet.addEventListener('lostpointercapture',drop);
  // The column scales with both the sheet's width and the viewport's height.
  if(window.ResizeObserver){
    var w=0,h=0;
    new ResizeObserver(function(es){
      var r=es[0].contentRect;
      if((r.width!==w||r.height!==h)&&T.held<0){w=r.width;h=r.height;measureTail();}
    }).observe(box);
  }
})();

function buildCurled(){
  var svg=$('#curled-svg');svg.replaceChildren();
  var cx=280,cy=290,r0=232,r1=24,FMAX=34,FMIN=6.4,EXP=.7;
  var words=FLOW.split(' '),N=words.length,sp=M(' ');
  var sizes=words.map(function(_,k){return FMAX-(FMAX-FMIN)*Math.pow(k/(N-1),EXP);});
  var total=0;words.forEach(function(w,k){total+=(M(w)+sp)*sizes[k];});
  var q=total*1.035/(r0-r1),kk=1/Math.sqrt(q*q-1);
  var th=Math.log(r0/r1)/kk*1.03,xs=[],ys=[];
  for(var t=0;t<=th;t+=.03){
    var r=r0*Math.exp(-kk*t),a=-Math.PI/2+t;
    xs.push(cx+r*Math.cos(a));ys.push(cy+r*Math.sin(a));
  }
  var path=el('path',{id:'curled-path','class':'guide-line'});
  svg.append(path);
  restCurl(path,xs,ys,cx,cy);
  var tx=el('text',{'class':'poem-text'}),tp=el('textPath',{href:'#curled-path'});
  words.forEach(function(w,k){
    var ts=el('tspan',{'font-size':sizes[k].toFixed(2)});
    ts.textContent=w+(k<N-1?' ':'');tp.append(ts);
  });
  tx.append(tp);svg.append(tx);
  $('#spec-curled').textContent=(th/(2*Math.PI)).toFixed(1)+' turns · type '+FMAX+' → '+FMIN;
}

// The spiral is a chain of segments with a turn at each joint, anchored at one end.
// Holding the inner tip anchors the outer end and peels the coil from the inside;
// holding the outer end anchors the tip and unrolls it from the outside, like a scroll.
// Either way the coil stays coiled up to a peel point and the free part beyond it is an
// arc ending under the pointer. Winding the inner tip round the centre rolls the coil
// tighter or looser. Released, every joint springs back to its own curl, the anchored
// end drifts home, and the whole thing overshoots and settles.
var C={e:0,ax:0,ay:0,ah:0,axp:0,ayp:0,ahp:0,rest:[],hi:0,cx:0,cy:0,wa:0,rx:[],ry:[],rH:[],n:0,len:[],S:[],a0:[],a:[],ap:[],W:[],x:[],y:[],p:0,R:1,path:null,held:false,tx:0,ty:0,gx:0,gy:0,raf:0,last:0};
function wrap(t){return Math.atan2(Math.sin(t),Math.cos(t));}
function restCurl(path,xs,ys,cx,cy){
  var n=xs.length,m=n-1,h=0,h1=0,ph=0;
  C.n=n;C.path=path;C.cx=cx;C.cy=cy;C.len=[0];C.S=[0];C.a0=[0];
  for(var i=1;i<n;i++){
    C.len.push(Math.hypot(xs[i]-xs[i-1],ys[i]-ys[i-1]));C.S.push(C.S[i-1]+C.len[i]);
    h=Math.atan2(ys[i]-ys[i-1],xs[i]-xs[i-1]);
    // a[i] is the turn at point i, from segment i to segment i+1.
    if(i>1)C.a0.push(wrap(h-ph));else h1=h;
    ph=h;
  }
  C.a0.push(0);
  C.rest=[{x:xs[0],y:ys[0],h:h1},{x:xs[m],y:ys[m],h:h}];
  for(C.hi=0;C.S[C.hi]<24;C.hi++);
  C.rx=xs.slice();C.ry=ys.slice();C.rH=C.a0.slice();C.W=C.a0.slice();C.x=xs.slice();C.y=ys.slice();
  curlHome();
  drawCurl();
}
function curlHome(){
  var r=C.rest[0];
  C.a=C.a0.slice();C.ap=C.a0.slice();C.e=0;C.held=false;C.p=C.n-1;C.R=1;
  C.ax=C.axp=r.x;C.ay=C.ayp=r.y;C.ah=C.ahp=r.h;
}
// Re-anchor at end e (0 the outer end, 1 the tip) without moving anything.
function anchorAt(e){
  curlFK();
  var m=C.n-1,x=C.x,y=C.y;
  C.e=e;
  if(!e){C.ax=x[0];C.ay=y[0];C.ah=Math.atan2(y[1]-y[0],x[1]-x[0]);}
  else{C.ax=x[m];C.ay=y[m];C.ah=Math.atan2(y[m]-y[m-1],x[m]-x[m-1]);}
  C.axp=C.ax;C.ayp=C.ay;C.ahp=C.ah;
}
// Lay the chain out from its anchor with turns t(i): points into x, y, and the heading
// of segment i into H[i-1].
function layChain(x,y,H,t){
  var L=C.len,n=C.n,m=n-1,h=C.ah,i;
  if(!C.e){
    x[0]=C.ax;y[0]=C.ay;
    for(i=1;i<n;i++){if(i>1)h+=t(i-1);if(H)H[i-1]=h;x[i]=x[i-1]+L[i]*Math.cos(h);y[i]=y[i-1]+L[i]*Math.sin(h);}
  }else{
    x[m]=C.ax;y[m]=C.ay;
    for(i=m;i>=1;i--){if(H)H[i-1]=h;x[i-1]=x[i]-L[i]*Math.cos(h);y[i-1]=y[i]-L[i]*Math.sin(h);h-=t(i-1);}
  }
}
function curlFK(){layChain(C.x,C.y,null,function(i){return C.a[i];});}
// The coil as it would rest at roll R (its rest curl times R), hung from the current
// anchor: the peel takes its tangents from this.
function coilAt(R){layChain(C.rx,C.ry,C.rH,function(i){return R*C.a0[i];});}
// Unrolling at point p: the free part (past p toward the held end) is an arc of its own
// fixed length, curling the same way as the coil, whose far end is on the pointer. The
// arc's chord fixes its curvature (sin x / x = chord / length, x = half the turn) and so
// the heading it must leave p at. Where that heading matches the coil's own, the tail
// comes off the coil tangentially, like string off a spool. Null when the free part is
// too short to reach.
function curlArc(p){
  var fwd=!C.e,Lf=fwd?C.S[C.n-1]-C.S[p]:C.S[p],dx=C.tx-C.rx[p],dy=C.ty-C.ry[p],r=Math.hypot(dx,dy)/Lf;
  if(r>=.999)return null;
  var lo=1e-6,hi=Math.PI;
  for(var i=0;i<24;i++){var mid=(lo+hi)/2;if(Math.sin(mid)/mid>r)lo=mid;else hi=mid;}
  // Walking backward from p the same curl turns the other way.
  var x=(lo+hi)/2,phi=Math.atan2(dy,dx),h0=fwd?phi-x:phi+x,base=fwd?C.rH[p]:C.rH[p-1]+Math.PI;
  return{p:p,h0:h0,k:2*x/Lf,mis:wrap(h0-base)};
}
// Several wraps can offer a tangent point; keep the one nearest the last peel point so
// the tail doesn't jump a whole coil from one frame to the next.
function curlPeel(){
  var m=C.n-1,prev=null,best=null;
  for(var q=12;q<=m-12;q++){
    var p=C.e?q:m-q,arc=curlArc(p);
    if(arc&&prev&&(arc.mis<=0)!==(prev.mis<=0)&&Math.abs(arc.mis-prev.mis)<1){
      var hit=Math.abs(arc.mis)<Math.abs(prev.mis)?arc:prev;
      if(!best||Math.abs(hit.p-C.p)<Math.abs(best.p-C.p))best=hit;
    }
    prev=arc;
  }
  return best;
}
// Weighted least-norm step that lands the held end exactly: on the free joints, plus
// (holding the tip, barely peeled) one "roll" that scales the coil's curl. Turning
// joint j swings the held end about point j; a joint gives way in inverse proportion to
// that lever, so the bend lands near the held end.
function curlReach(p){
  var m=C.n-1,fwd=!C.e,t=fwd?m:0,s=fwd?1:-1,j1=fwd?p:1,j2=fwd?m:p+1,a=C.a,a0=C.a0,W=C.W,j,jx,jy;
  for(var it=0;it<4;it++){
    curlFK();
    var ex=C.tx-C.x[t],ey=C.ty-C.y[t];
    if(ex*ex+ey*ey<.01)break;
    var A=0,B=0,D=0,rx=0,ry=0,WR=0;
    if(fwd&&p>m-40){
      for(j=1;j<p;j++){rx-=a0[j]*(C.y[t]-C.y[j]);ry+=a0[j]*(C.x[t]-C.x[j]);}
      WR=.3/(rx*rx+ry*ry+400);A+=WR*rx*rx;B+=WR*rx*ry;D+=WR*ry*ry;
    }
    for(j=j1;j<j2;j++){
      jx=-s*(C.y[t]-C.y[j]);jy=s*(C.x[t]-C.x[j]);
      W[j]=1/(jx*jx+jy*jy+400);
      A+=W[j]*jx*jx;B+=W[j]*jx*jy;D+=W[j]*jy*jy;
    }
    var lam=1e-3*(A+D)+1e-9,det=(A+lam)*(D+lam)-B*B,u=((D+lam)*ex-B*ey)/det,v=((A+lam)*ey-B*ex)/det;
    if(WR){
      var dR=Math.max(-.05,Math.min(.05,WR*(rx*u+ry*v))),R=Math.max(.6,Math.min(2.2,C.R+dR));
      dR=R-C.R;C.R=R;
      for(j=1;j<p;j++)a[j]+=a0[j]*dR;
    }
    for(j=j1;j<j2;j++){
      jx=-s*(C.y[t]-C.y[j]);jy=s*(C.x[t]-C.x[j]);
      a[j]+=Math.max(-.08,Math.min(.08,W[j]*(jx*u+jy*v)));
    }
  }
}
function springAnchor(k,D){
  var r=C.rest[C.e],vx=(C.ax-C.axp)*D,vy=(C.ay-C.ayp)*D,vh=(C.ah-C.ahp)*D;
  C.axp=C.ax;C.ayp=C.ay;C.ahp=C.ah;
  C.ax+=vx+(r.x-C.ax)*k;C.ay+=vy+(r.y-C.ay)*k;C.ah+=vh+wrap(r.h-C.ah)*k;
}
function stepCurl(){
  var n=C.n,m=n-1,a=C.a,ap=C.ap,a0=C.a0,DAMP=reduceMotion?.8:.95,j;
  if(C.held){
    var keep=a.slice(),arc,R=1;
    if(!C.e){
      // Winding the held tip round the centre while it's barely peeled winds the coil:
      // clockwise tighter, counter-clockwise looser.
      var wa=Math.atan2(C.ty-C.cy,C.tx-C.cx),dw=wrap(wa-C.wa);
      C.wa=wa;
      if(C.p>m-120)C.R=Math.max(.8,Math.min(1.6,C.R+dw*.05));
      R=C.R;
    }
    coilAt(R);arc=curlPeel();
    // The coiled joints ease back to their curl, the free ones onto the arc, and the
    // joint at the peel point takes whatever kink is left.
    var c1=C.e?(arc?arc.p+1:13):1,c2=C.e?m:(arc?arc.p:m-12);
    if(arc)C.p=arc.p;else C.p=C.e?12:m-12;
    for(j=c1;j<c2;j++)a[j]+=(R*a0[j]-a[j])*.25;
    if(arc){
      var p=C.p,t0=C.e?C.rH[p]-(arc.h0-arc.k*C.len[p]/2-Math.PI):arc.h0+arc.k*C.len[p+1]/2-C.rH[p-1];
      a[p]+=(wrap(t0)-a[p])*.6;
      var f1=C.e?1:p+1,f2=C.e?p:m;
      for(j=f1;j<f2;j++)a[j]+=(arc.k*(C.len[j]+C.len[j+1])/2-a[j])*.6;
    }
    curlReach(C.p);
    for(j=0;j<n;j++)ap[j]=keep[j];
    springAnchor(.01,DAMP);
    return;
  }
  for(j=1;j<m;j++){
    var k=.01*(1-.5*j/n),v=(a[j]-ap[j])*DAMP;
    ap[j]=a[j];a[j]+=v+(a0[j]-a[j])*k;
  }
  springAnchor(.01,DAMP);
}
function drawCurl(){
  curlFK();
  var d='M'+C.x[0].toFixed(1)+' '+C.y[0].toFixed(1);
  for(var i=1;i<C.n;i++)d+='L'+C.x[i].toFixed(1)+' '+C.y[i].toFixed(1);
  C.path.setAttribute('d',d);
  placeCurlEnds();
  var r=C.rest[C.e],moving=C.held||Math.abs(C.ax-r.x)+Math.abs(C.ay-r.y)+Math.abs(wrap(C.ah-r.h))+Math.abs(C.ax-C.axp)+Math.abs(C.ay-C.ayp)>1e-3;
  for(var j=1;j<C.n-1&&!moving;j++)if(Math.abs(C.a[j]-C.a0[j])+Math.abs(C.a[j]-C.ap[j])>1e-5)moving=true;
  return moving;
}
// Grab spots: on the tip's last point, and a little way into the first word.
function placeCurlEnds(){
  var svg=$('#curled-svg'),m=svg.getScreenCTM(),r=svg.parentNode.getBoundingClientRect();
  if(!m)return;
  [['#curl-tip',C.n-1],['#curl-head',C.hi]].forEach(function(o){
    var h=$(o[0]);if(!h)return;
    var p=new DOMPoint(C.x[o[1]],C.y[o[1]]).matrixTransform(m);
    h.style.left=(p.x-r.left).toFixed(1)+'px';h.style.top=(p.y-r.top).toFixed(1)+'px';
  });
}
function curlFrame(now){
  var steps=C.last?Math.min(3,Math.max(1,Math.round((now-C.last)/16.7))):1;
  C.last=now;
  for(var k=0;k<steps;k++)stepCurl();
  if(drawCurl())C.raf=requestAnimationFrame(curlFrame);
  else{C.raf=0;C.last=0;curlHome();drawCurl();}
}
function wakeCurl(){if(!C.raf)C.raf=requestAnimationFrame(curlFrame);}
(function(){
  var svg=$('#curled-svg'),sheet=svg.parentNode;
  function at(e){
    var p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    C.tx=p.x-C.gx;C.ty=p.y-C.gy;
  }
  // Holding one end anchors the other.
  [['curl-tip',0],['curl-head',1]].forEach(function(o){
    var h=document.createElement('div');h.id=o[0];h.className='curl-tip';sheet.append(h);
    h.addEventListener('pointerdown',function(e){
      if(e.button>0)return;
      e.preventDefault();
      anchorAt(o[1]);
      var node=o[1]?0:C.n-1;
      C.gx=C.gy=0;at(e);C.gx=C.tx-C.x[node];C.gy=C.ty-C.y[node];at(e);
      C.held=true;C.p=o[1]?0:C.n-1;C.R=1;C.wa=Math.atan2(C.ty-C.cy,C.tx-C.cx);
      h.setPointerCapture(e.pointerId);sheet.classList.add('held');wakeCurl();
    });
    h.addEventListener('pointermove',function(e){if(C.held)at(e);});
    function drop(){if(!C.held)return;C.held=false;sheet.classList.remove('held');wakeCurl();}
    h.addEventListener('pointerup',drop);
    h.addEventListener('pointercancel',drop);
    h.addEventListener('lostpointercapture',drop);
  });
  window.addEventListener('resize',placeCurlEnds);
})();

function buildAll(){
  [buildStepped,buildCurled].forEach(function(f){
    try{f();}catch(e){console.error(f.name,e);}
  });
}

buildVerse();
buildAll();
try{
  Promise.race([
    document.fonts.load('400 20px "Libre Caslon Text"'),
    new Promise(function(r){setTimeout(r,2500);})
  ]).then(buildAll);
}catch(e){}

var cb=$('#guides');
cb.addEventListener('change',function(){document.body.classList.toggle('guides',cb.checked);});
if(cb.checked)document.body.classList.add('guides');
