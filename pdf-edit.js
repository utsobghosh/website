// pdf-edit.js: "Merge & arrange PDF" tool = open one or more PDFs, see every page, reorder (buttons, drag, or type a position), remove pages, add pages (from another PDF or photos) anywhere. Download the result or send it to print.
// Loaded AFTER app.js (uses its helpers: $, say, show, save, openPdf, needPdfLib, photoJpeg, isImgFile, startUpload, bearReact).
// ONE view with collapsible files:
//   Every page is a tile in one flat grid. Tap a file's coloured chip (above the grid) to COLLAPSE it into one thin bar
//   (then ◀ ▶ move the whole file) or to EXPAND it again (then ◀ ▶ move single pages). Collapsed and expanded files can be mixed.
//   Moving: every page / folded file has "⤵ Move": type a page number and it is put right AFTER that page (take page 3, type 7 -> 1 2 4 5 6 7 3 8). Adding new pages: ＋ on a page, or the top button "＋ Add pages at a position…". No ◀ ▶ swap buttons (dragging still works).
(function(){
var PE=[],SRC=[],peDrag=-1,peUid=0,peFlash=[],peImgN=0,peAt=0,peName="file",peView=-1,peTok=0,PE_MAX=1000,peObs=null,peRel=null,H=[],peW=105,peRank={},peCol=0;
var COLORS=["#8a4dff","#e67e22","#16a085","#d63384","#2980b9","#b8960b","#27ae60","#c0392b"],PHOTO_COL="#7f8c8d";
var st=document.createElement("style");
st.textContent=".pevt{display:flex;gap:6px;margin:10px 0 4px}.pevt button{flex:1;margin:0;min-height:38px}"+
".peleg{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0;position:sticky;top:0;z-index:5;background:var(--panel,#fff);padding:6px 0;border-bottom:1px solid #8a4dff44;touch-action:none}.peleg .lh{flex:1 1 100%;font-size:11px;color:#777;margin:0}"+
".peleg button{color:#fff;border:0;border-radius:9px;padding:3px 9px;font-size:12px;line-height:1.2;max-width:48%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0;min-height:30px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}.peleg button.off{opacity:.55}.peleg button.dg{opacity:.85;z-index:9;box-shadow:0 4px 12px rgba(0,0,0,.45);position:relative}.peleg button.tg{outline:3px dashed #222;outline-offset:1px}.peleg button.cb{box-shadow:-6px 0 0 0 #ff2d87}.peleg button.ca{box-shadow:6px 0 0 0 #ff2d87}"+
".peg{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:8px;margin:10px 0;align-items:start}"+
".pet{position:relative;border:1px solid #ccc;border-top:5px solid #8a4dff;border-radius:10px;padding:5px;text-align:center;background:#fff;color:#222}"+
".pet canvas{width:100%;height:auto;display:block;border-radius:4px;cursor:zoom-in;min-height:60px;border:1px solid #eee}"+
".pet.rm canvas{opacity:.25;filter:grayscale(1)}.pet.rm{border-top-color:#c0392b!important}"+
".pn{color:#fff;border-radius:10px;font-size:14px;font-weight:700;padding:2px 9px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.4)}.pet .pn{position:absolute;top:-3px;left:-3px;z-index:1}"+
".pet .pcap{font-size:11px;color:#555;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
".pet .pb{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.pet .pb button{flex:1 1 28%;margin:0;padding:4px 0;min-height:36px}.pet .pb button.m{flex:1 1 100%;font-size:13px;white-space:nowrap}"+
".peb{grid-column:1/-1;display:flex;align-items:center;gap:5px;border:1px solid #ccc;border-left:7px solid #8a4dff;border-radius:10px;padding:4px 6px;background:#fff;color:#222;cursor:grab}.peb.rm{opacity:.45}"+
".peb .bi{flex:1;min-width:0;line-height:1.2}.peb .bi b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.peb .bi small{color:#666;font-size:11px}"+
".peb button{flex:none;width:36px;min-height:36px;margin:0;padding:0}"+
".pet .po::before{content:\"was \"}.peg.pes .po::before{content:\"\"}.pet,.peb{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}.dg2{opacity:.9;position:relative;z-index:20;box-shadow:0 6px 16px rgba(0,0,0,.5);transition:none}"+
".pet .po{position:absolute;top:-3px;right:-3px;z-index:1;background:#555;color:#fff;border-radius:10px;font-size:11px;padding:2px 7px;opacity:.75}.pet .po.mv{background:#e67e22;opacity:1;font-weight:700}"+
".pesz{display:flex;gap:8px;align-items:center;margin:4px 0}.pesz input{flex:1;min-width:0}.pesz button{margin:0;min-height:36px;white-space:nowrap}"+
".peg{grid-template-columns:repeat(auto-fill,minmax(var(--pew,105px),1fr))!important}"+
".peg.pes .pet{padding:3px;border-top-width:3px}.peg.pes .pet canvas{min-height:30px}.peg.pes .pcap{display:none}.peg.pes .pb{display:none}.peg.pes .pet canvas{cursor:grab}.peg.pes .pn{font-size:11px;padding:1px 6px}.peg.pes .po{font-size:10px;padding:1px 5px}"+
".peg.pen .pet{display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:1/.8;padding:1px;border:0;background:var(--fc,#8a4dff);color:#fff;border-radius:7px}.peg.pen .pet.rm{background:#c0392b}"+
".peg.pen .pet canvas,.peg.pen .pcap{display:none}.peg.pen .pn{position:static;background:none!important;box-shadow:none;padding:0;font-size:clamp(11px,calc(var(--pew,40px)*.5),30px);line-height:1}"+
".peg.pen .po{position:static;background:#fff;color:#c05a00;font-size:9px;padding:0 3px;margin-top:1px;border-radius:6px;line-height:1.3}.peg.pen .po:not(.mv){display:none}"+
".drag{opacity:.35}.over{outline:3px dashed #8a4dff}"+
".pet.over-a,.pet.over-b,.peb.over-a,.peb.over-b{transition:transform .15s}.pet.over-b{transform:translateX(18px);box-shadow:-9px 0 0 0 #ff2d87,-9px 0 16px 2px rgba(255,45,135,.6)}.pet.over-a{transform:translateX(-18px);box-shadow:9px 0 0 0 #ff2d87,9px 0 16px 2px rgba(255,45,135,.6)}.peb.over-b{transform:translateY(14px);box-shadow:0 -9px 0 0 #ff2d87,0 -9px 16px 2px rgba(255,45,135,.6)}.peb.over-a{transform:translateY(-14px);box-shadow:0 9px 0 0 #ff2d87,0 9px 16px 2px rgba(255,45,135,.6)}.tgarea{outline:3px dashed #ff2d87!important;outline-offset:-2px}.pehint{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:10000;background:#ff2d87;color:#fff;font-weight:700;font-size:15px;padding:8px 16px;border-radius:99px;box-shadow:0 4px 14px rgba(0,0,0,.45);pointer-events:none;max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
"@keyframes peflash{0%{box-shadow:0 0 0 4px #8a4dff;background:#e0d2ff}100%{box-shadow:0 0 0 0 rgba(138,77,255,0)}}.flash{animation:peflash 1.5s ease-out}"+
".peov{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px}"+
".peov .st{overflow:auto;max-width:100%;max-height:78vh}.peov .st canvas,.peov .st img{max-width:100%;max-height:76vh;background:#fff;display:block;margin:auto}"+
".peov .rw{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center;color:#fff}.peov .rw button{margin:0}";
document.head.appendChild(st);

function isPdf(f){return /pdf/i.test(f.type||"")||/\.pdf$/i.test(f.name||"")}
function kept(){return PE.filter(function(x){return !x.rm}).length}
function busy(t){$("peBusy").textContent=t}
function curRes(){return PE.length>300?120:(PE.length>100?160:200)}   // many pages: smaller thumbnails so phones do not run out of memory
function colOf(it){return it.img?PHOTO_COL:SRC[it.s].c}
function short(n,m){n=n||"PDF";m=m||16;return n.length>m?n.slice(0,m-1)+"…":n}
function fname(it){return it.img?(it.img.name||"Photo"):(SRC[it.s].name||"PDF")}
function peOrig(it){return it.img?"📷"+it.o:(SRC.length>1?short(fname(it),12)+" p.":"p.")+it.o}   // original place, kept even after pages are moved
function posOf(k){return PE.slice(0,k).filter(function(x){return !x.rm}).length+1}   // place in the new PDF

// ----- drawing -----
async function peDrawImg(it,cv,w){   // a photo is drawn as the A4 page it will become (white margin, rotated like the PDF page)
 if(!it.im){it.im=new Image();it.im.src=it.url;await it.im.decode()}
 var im=it.im,iw=im.naturalWidth,ih=im.naturalHeight,land=iw>ih*1.05,PW=land?841.89:595.28,PH=land?595.28:841.89,M=18,rot=(it.rot||0)%360,sw=rot%180?PH:PW,sh=rot%180?PW:PH,k=w/sw;
 cv.width=Math.round(sw*k);cv.height=Math.round(sh*k);
 var x=cv.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);
 var sc=Math.min((PW-2*M)/iw,(PH-2*M)/ih)*k;x.save();x.translate(cv.width/2,cv.height/2);x.rotate(rot*Math.PI/180);x.drawImage(im,-iw*sc/2,-ih*sc/2,iw*sc,ih*sc);x.restore()}
async function peDraw(it,cv,w){
 if(it.img)return peDrawImg(it,cv,w);
 var pg=await SRC[it.s].doc.getPage(it.i+1),rot=((pg.rotate||0)+(it.rot||0))%360,v0=pg.getViewport({scale:1,rotation:rot}),v=pg.getViewport({scale:w/v0.width,rotation:rot});
 cv.width=Math.round(v.width);cv.height=Math.round(v.height);
 var x=cv.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);
 await pg.render({canvasContext:x,viewport:v}).promise;try{pg.cleanup()}catch(e){}}
var peQ=[],peRun=0,PE_PAR=1,PE_GAP=150;   // SLOW LOADING ON PURPOSE: one page at a time, with a pause (PE_GAP = milliseconds) after each, so the page never freezes. Bigger PE_GAP = slower but smoother
function peSlot(){return new Promise(function(r){if(peRun<PE_PAR){peRun++;r()}else peQ.push(r)})}
function peFree(){var n=peQ.shift();if(n)n();else peRun--}
function peRedraw(it,w){it.want=w;if(it.job)return it.job;   // one drawing job per page, always ends at the latest size/rotation
 it.job=(async function(){while(it.w!==it.want||(it.dv||0)!==(it.ver||0)){var t=it.want,v=it.ver||0,far=false;await peSlot();
  try{var r=it.el.getBoundingClientRect();far=r.bottom<-1500||r.top>window.innerHeight+1500;   // scrolled far away while waiting: skip it, it is drawn when it comes back
   if(!far){await peDraw(it,it.el,t);it.el.style.aspectRatio=""}}catch(e){}finally{setTimeout(peFree,PE_GAP)}
  if(far){it.job=null;return}it.w=t;it.dv=v}it.job=null})();return it.job}
function peWatch(g){   // thumbnails are drawn only near the screen, and given back (memory) when they are far away
 if(peObs)peObs.disconnect();if(peRel)peRel.disconnect();
 var need=function(it){return !it.job&&(it.w===undefined||(it.dv||0)!==(it.ver||0))};
 var cs=Array.prototype.filter.call(g.querySelectorAll("canvas"),function(c){return c.__it});
 if(!window.IntersectionObserver){cs.forEach(function(c){if(need(c.__it))peRedraw(c.__it,curRes())});return}
 peObs=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var it=e.target.__it;if(need(it))peRedraw(it,curRes())})},{rootMargin:"150px"});
 peRel=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)return;var it=e.target.__it,c=it.el;if(!it||it.job||it.w===undefined||!c||!c.width||!c.height)return;
  c.style.aspectRatio=c.width+"/"+c.height;c.width=0;c.height=0;it.w=undefined})},{rootMargin:"1600px"});
 cs.forEach(function(c){peObs.observe(c);peRel.observe(c)})}
function peRotate(k){peSnap();var it=PE[k];it.rot=((it.rot||0)+90)%360;it.ver=(it.ver||0)+1;peFlash=[it.u];peRender()}
function peCanvas(it,k){if(!it.el){it.el=document.createElement("canvas");it.el.__it=it}it.el.onclick=function(){if(peW<92)return;peOpenView(k)};return it.el}

// ----- undo: every change can be taken back with ↩ Undo (up to 60 steps) -----
function peSnap(){H.push(PE.map(function(it){return{it:it,rm:!!it.rm,rot:it.rot||0}}));if(H.length>60)H.shift()}
function peUndo(){var sn=H.pop();if(!sn)return;PE=sn.map(function(x){x.it.rm=x.rm;if((x.it.rot||0)!==x.rot){x.it.rot=x.rot;x.it.ver=(x.it.ver||0)+1}return x.it});peFlash=[];peRender();peNote("↩ Undone")}
function peOriginal(){if(!PE.length)return;peSnap();PE.sort(function(a,b){return a.og-b.og});peFlash=[];peRender();peNote("⟲ Back in the original order")}   // removed pages stay removed, use Undo for those

// ----- units: the grid is a list of units. A unit is ONE page tile, or ONE collapsed file (all its neighbouring pages as a thin bar) -----
function peUnits(){var U=[],i=0;
 while(i<PE.length){var it=PE[i];
  if(!it.img&&SRC[it.s].col){var j=i;while(j+1<PE.length&&!PE[j+1].img&&PE[j+1].s===it.s)j++;U.push({start:i,end:j,n:j-i+1,stack:true,it:it});i=j+1}
  else{U.push({start:i,end:i,n:1,it:it});i++}}
 return U}
function peMoveUnit(i,j){var U=peUnits(),a=U[i],b=U[j];if(!a||!b||i===j)return;peSnap();var adj=Math.abs(i-j)===1,sl=PE.splice(a.start,a.n),at=j<i?b.start:b.end+1-a.n;
 PE.splice.apply(PE,[at,0].concat(sl));peFlash=adj?[a.it.u,b.it.u]:[a.it.u];peRender();
 var nm=function(u){return u.stack?"📄 "+fname(u.it):peOrig(u.it)};
 peNote(adj?"↔ Swapped "+nm(a)+" and "+nm(b):"↔ "+nm(a)+" moved to place "+posOf(PE.indexOf(a.it)))}
function peGoTo(start,n,v){   // move PE[start..start+n-1] so its first kept page lands at place v of the new PDF
 peSnap();var first=PE[start],sl=PE.splice(start,n),allRm=sl.every(function(x){return x.rm}),c=0,at=PE.length;
 if(allRm)at=Math.min(v-1,PE.length);else for(var i=0;i<PE.length;i++){if(!PE[i].rm&&++c===v){at=i;break}}
 PE.splice.apply(PE,[at,0].concat(sl));peFlash=[first.u];peRender();peNote("↔ "+(n>1?"📄 "+fname(first):peOrig(first))+" moved to place "+posOf(PE.indexOf(first)))}
function pePos(start,n){var sl=PE.slice(start,start+n),keptIn=sl.filter(function(x){return !x.rm}).length,allRm=!keptIn,tot=allRm?PE.length:kept()-keptIn+1,cur=allRm?start+1:posOf(start);
 var v=prompt("Move this "+(n>1?"file":"page")+" to which position? (1 to "+tot+")",cur);if(v===null)return;v=Math.round(+v);if(!(v>=1))return;peGoTo(start,n,Math.min(v,tot))}
function peMoveAfter(start,n){   // "take page 3 and put it between 7 and 8": type 7 -> goes right after page 7 (numbers as they are now). 0 = very start
 var tot=kept(),v=prompt("Move this "+(n>1?"file":"page")+" to AFTER which page?\nType that page's number (7 = between page 7 and page 8). 0 = very start. (1 to "+tot+")","");if(v===null||String(v).trim()==="")return;
 v=Math.round(+v);if(!(v>=0))return;v=Math.min(v,tot);
 var tg=null,c=0;if(v>0)for(var i=0;i<PE.length;i++)if(!PE[i].rm&&++c===v){tg=PE[i];break}
 var ti=tg?PE.indexOf(tg):-1;if(tg&&ti>=start&&ti<start+n){peNote("It is already there");return}
 peSnap();var first=PE[start],sl=PE.splice(start,n),at=tg?PE.indexOf(tg)+1:0;
 PE.splice.apply(PE,[at,0].concat(sl));peFlash=[first.u];peRender();peNote("↔ "+(n>1?"📄 "+fname(first):peOrig(first))+" moved to place "+posOf(PE.indexOf(first))+(v?" (after page "+v+")":" (very start)"))}
function peHint(m){var h=$("peHint");if(!h){h=document.createElement("div");h.id="peHint";h.className="pehint";document.body.appendChild(h)}h.style.display=m?"":"none";h.textContent=m}
function peDnD(d,ui){d.setAttribute("data-un",ui);d.draggable=false}
(function(){   // drag a page tile or a file bar onto another one to move it there. Mouse: just drag. Finger: press and HOLD a moment, then drag (a quick swipe still scrolls the page)
 var d=null,tm=null,just=0;
 function units(){return Array.prototype.slice.call($("peGrid").querySelectorAll("[data-un]"))}
 function hit(x,y,skip){var rs=d.rs||[],px=x+window.scrollX,py=y+window.scrollY,best=null,bd=1e9;   // uses the positions measured when the drag started (no layout work on every move = no lag with hundreds of pages)
 for(var i=0;i<rs.length;i++){var q=rs[i];if(q.el===skip)continue;if(px>=q.l&&px<=q.r&&py>=q.t&&py<=q.b)return q.el;
  var dx=Math.max(q.l-px,0,px-q.r),dy=Math.max(q.t-py,0,py-q.b),dd=Math.hypot(dx,dy);if(dd<bd){bd=dd;best=q.el}}
 return bd<=14?best:null}   // dropped in the small gap between two tiles: take the nearest one
 function place(){if(!d||!d.on)return;d.el.style.transform="translate("+(d.cx-d.x+(window.scrollX-d.sx))+"px,"+(d.cy-d.y+(window.scrollY-d.sy))+"px)";
  var pk=d.cx+","+d.cy+","+window.scrollX+","+window.scrollY;if(pk===d.pk)return;d.pk=pk;   // nothing moved since the last check: do nothing
  var t=hit(d.cx,d.cy,d.el);if(d.t&&d.t!==t)d.t.classList.remove("over-a","over-b");
  if(t){var after=+t.getAttribute("data-un")>+d.el.getAttribute("data-un");t.classList.toggle("over-a",after);t.classList.toggle("over-b",!after);   // a pink line on the side where the page will land (after = right/below, before = left/above)
   var u=d.U[+t.getAttribute("data-un")],lab=u?(u.stack?"file “"+short(fname(u.it),18)+"”":(u.it.rm?"this removed page":"page "+posOf(u.start))):"";hint((after?"Will land AFTER ":"Will land BEFORE ")+lab)}else hint("");
  d.t=t}
  function hint(m){var h=$("peHint");if(!h){h=document.createElement("div");h.id="peHint";h.className="pehint";document.body.appendChild(h)}h.style.display=m?"":"none";h.textContent=m}
 function start(){d.rs=units().map(function(el){var r=el.getBoundingClientRect();return{el:el,l:r.left+window.scrollX,r:r.right+window.scrollX,t:r.top+window.scrollY,b:r.bottom+window.scrollY}});d.U=peUnits();d.pk="";d.on=true;d.el.classList.add("dg2");try{d.el.setPointerCapture(d.id)}catch(x){}if(navigator.vibrate)try{navigator.vibrate(15)}catch(x){};
  tm=setInterval(function(){if(!d)return;if(d.cy<90)window.scrollBy(0,-14);else if(d.cy>window.innerHeight-90)window.scrollBy(0,14);place()},30)}
 function stop(){clearTimeout(d&&d.timer);clearInterval(tm);tm=null}
 document.addEventListener("pointerdown",function(e){if(d)return;var el=e.target.closest&&e.target.closest("#peGrid [data-un]");if(!el||e.target.closest("button")||(e.target.closest(".pn")&&!$("peGrid").classList.contains("pen")))return;   // in number-only mode the number fills the tile, so it must be draggable tooif(e.pointerType==="mouse"&&e.button!==0)return;
  d={el:el,x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,sx:window.scrollX,sy:window.scrollY,id:e.pointerId,type:e.pointerType,on:false,t:null,timer:null};
  if(d.type!=="mouse")d.timer=setTimeout(function(){if(d&&!d.on)start()},280)});
 document.addEventListener("pointermove",function(e){if(!d||e.pointerId!==d.id)return;d.cx=e.clientX;d.cy=e.clientY;
  if(!d.on){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<8)return;if(d.type==="mouse")start();else{stop();d=null;return}}   // finger moved before the hold = the person is scrolling
  place();e.preventDefault()},{passive:false});
 document.addEventListener("touchmove",function(e){if(d&&d.on)e.preventDefault()},{passive:false});
 function end(e,cancel){if(!d||e.pointerId!==d.id)return;var o=d;stop();d=null;if(!o.on)return;
  o.el.classList.remove("dg2");o.el.style.transform="";try{o.el.releasePointerCapture(o.id)}catch(x){}if(o.t)o.t.classList.remove("over-a","over-b");hint("");just=Date.now();
  if(!cancel&&o.t)peMoveUnit(+o.el.getAttribute("data-un"),+o.t.getAttribute("data-un"))}
 document.addEventListener("pointerup",function(e){end(e,false)});document.addEventListener("pointercancel",function(e){end(e,true)});
 document.addEventListener("click",function(e){if(Date.now()-just<400){e.stopPropagation();e.preventDefault()}},true);
 document.addEventListener("contextmenu",function(e){if(d&&d.on)e.preventDefault()});
})();

// ----- an expanded page = tile: number in the new PDF, thumbnail, where it came from, buttons -----
function peTile(u,ui,N){var it=u.it,k=u.start;
 var c=colOf(it),d=document.createElement("div");d.className="pet"+(it.rm?" rm":"");d.style.borderTopColor=c;d.style.setProperty("--fc",c);d.setAttribute("data-u","t"+it.u);peDnD(d,ui);
 var n=document.createElement("span");n.className="pn";n.style.background=it.rm?"#c0392b":c;n.textContent=it.rm?"✕":posOf(k);n.title="Place in the new PDF. Tap to type a new position";n.onclick=function(e){e.stopPropagation();pePos(k,1)};d.appendChild(n);
 var og=document.createElement("span"),rk=peRank[it.u];og.className="po"+(rk!==k+1?" mv":"");og.textContent=rk;og.title="Original number of this page"+(rk!==k+1?" (it was moved)":"");d.appendChild(og);
 d.appendChild(peCanvas(it,k));
 var cap=document.createElement("div");cap.className="pcap";cap.textContent=(it.img?"📷 "+short(fname(it),14):short(fname(it),14)+" · p."+it.o);cap.title=fname(it)+(it.img?"":" · original page "+it.o);d.appendChild(cap);
 var r=document.createElement("div");r.className="pb";
 r.innerHTML='<button type="button" class="s m" data-mv="'+k+'" title="Move this page: type the page number it should go after">⤵ Move</button><button type="button" class="s" data-ro="'+k+'" title="Rotate 90°">↻</button><button type="button" class="s" data-a="'+k+'" title="Add new pages after this one">＋</button><button type="button" class="s danger" data-r="'+k+'" title="'+(it.rm?"Put this page back":"Remove this page")+'">'+(it.rm?"↩":"✕")+'</button>';
 d.appendChild(r);return d}

// ----- a collapsed file = ONE thin bar. ◀ ▶ move the whole file -----
function peBar(u,ui,N,parts){var it=u.it,all=PE.slice(u.start,u.end+1),rm=all.every(function(x){return x.rm}),c=colOf(it),
 os=all.map(function(x){return x.o}),lo=Math.min.apply(null,os),hi=Math.max.apply(null,os),kc=all.filter(function(x){return !x.rm}).length,p1=posOf(u.start);
 var d=document.createElement("div");d.className="peb"+(rm?" rm":"");d.style.borderLeftColor=c;d.setAttribute("data-u","g"+it.u);peDnD(d,ui);
 d.innerHTML='<button type="button" class="s" data-bo="'+ui+'" title="Show the pages of this file">▸</button><div class="bi"><b></b><small></small></div><span class="pn" title="Place in the new PDF. Tap to type a position"></span>'+
  '<button type="button" class="s" data-bm="'+ui+'" title="Move this whole file: type the page number it should go after">⤵</button><button type="button" class="s" data-ba="'+ui+'" title="Add pages after this file">＋</button><button type="button" class="s danger" data-bx="'+ui+'" title="'+(rm?"Put this file back":"Remove this whole file")+'">'+(rm?"↩":"✕")+'</button>';
 d.querySelector("b").textContent="📄 "+fname(it);
 d.querySelector("small").textContent=all.length+" page"+(all.length>1?"s":"")+" · original p."+(lo===hi?lo:lo+"-"+hi)+(parts>1?" · part":"")+(rm?" · removed":"");
 var n=d.querySelector(".pn");n.style.background=rm?"#c0392b":c;n.textContent=rm?"✕":"→"+p1+(kc>1?"–"+(p1+kc-1):"");n.onclick=function(e){e.stopPropagation();pePos(u.start,u.n)};
 return d}

// ----- render -----
// ----- file chips (top bar): ONE small chip per file or photo, in the order they have in the new PDF. DRAG a chip onto another chip to swap whole files; TAP a PDF chip to collapse/expand it -----
function peEnts(){var E=[],by={};PE.forEach(function(it){var key=it.img?"i"+it.u:"s"+it.s;if(!by[key]){by[key]={key:key,img:!!it.img,s:it.s,items:[]};E.push(by[key])}by[key].items.push(it)});return E}
function peMoveEnt(i,j){var E=peEnts(),a=E[i],b=E[j];if(!a||!b||i===j)return;
 peSnap();var mine=a.items,set=mine.map(function(x){return x.u}),first=mine[0];
 var tgt=j<i?b.items[0]:b.items[b.items.length-1];
 PE=PE.filter(function(x){return set.indexOf(x.u)<0});
 var at=PE.indexOf(tgt)+(j<i?0:1);PE.splice.apply(PE,[at,0].concat(mine));
 peFlash=[first.u];peRender();var nm=function(e){return e.img?"📷"+e.items[0].o:fname(e.items[0])};
 peNote("↔ "+nm(a)+" moved "+(Math.abs(i-j)===1?"(swapped with "+nm(b)+")":"to file place "+(j+1)))}
function peLegend(){var E=peEnts(),h='<p class="lh">Drag a file to swap it with another · tap it to fold / unfold its pages</p>';
 E.forEach(function(e,i){if(e.img){h+='<button type="button" data-ei="'+i+'" data-ck="i'+e.items[0].u+'" style="background:'+PHOTO_COL+'" title="Drag to move this photo">'+(i+1)+' 📷'+e.items[0].o+'</button>';return}
  var s=SRC[e.s];h+='<button type="button" data-ei="'+i+'" data-ck="s'+e.s+'" data-lg="'+e.s+'" class="'+(s.col?"off":"")+'" style="background:'+s.c+'" title="Drag to swap files. Tap to '+(s.col?"unfold":"fold")+' its pages">'+(i+1)+' '+(s.col?"▸":"▾")+' '+short(s.name,14).replace(/[<>&]/g,"")+' ('+e.items.length+')</button>'});
 return h}
(function(){   // pointer drag (works with finger and mouse)
 var d=null;
 function clearMk(){Array.prototype.forEach.call($("peGrid").querySelectorAll(".tgarea,.over-a,.over-b"),function(el){el.classList.remove("tgarea","over-a","over-b")});Array.prototype.forEach.call($("peLeg").querySelectorAll(".tg,.ca,.cb"),function(el){el.classList.remove("tg","ca","cb")})}
 function mark(t){clearMk();if(!t){peHint("");return}   // the AREA of the file you hover is outlined in the grid, with a pink line where your file will land
  var E=peEnts(),ti=+t.getAttribute("data-ei"),di=+d.b.getAttribute("data-ei"),e=E[ti];if(!e)return;
  var ids={};e.items.forEach(function(x){ids["t"+x.u]=1;ids["g"+x.u]=1});
  var els=Array.prototype.filter.call($("peGrid").querySelectorAll("[data-u]"),function(el){return ids[el.getAttribute("data-u")]}),after=ti>di;
  t.classList.add("tg",after?"ca":"cb");   // the chip too: dashed outline + pink line on the side where yours lands
  els.forEach(function(el){el.classList.add("tgarea")});if(els.length)els[after?els.length-1:0].classList.add(after?"over-a":"over-b");
  peHint("Will land "+(after?"AFTER ":"BEFORE ")+(e.img?"photo "+(ti+1):"file “"+short(SRC[e.s].name,18)+"”"))}
 function hit(x,y,skip){var bs=$("peLeg").querySelectorAll("[data-ei]"),r;for(var i=0;i<bs.length;i++){if(bs[i]===skip)continue;r=bs[i].getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return bs[i]}return null}
 document.addEventListener("pointerdown",function(e){var b=e.target.closest&&e.target.closest("#peLeg [data-ei]");if(!b)return;d={b:b,x:e.clientX,y:e.clientY,mv:false,id:e.pointerId,t:null};try{b.setPointerCapture(e.pointerId)}catch(x){}});
 document.addEventListener("pointermove",function(e){if(!d||e.pointerId!==d.id)return;var dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.mv){if(Math.hypot(dx,dy)<8)return;d.mv=true;d.b.classList.add("dg")}
  d.b.style.transform="translate("+dx+"px,"+dy+"px)";var t=hit(e.clientX,e.clientY,d.b);
  if(t!==d.t)mark(t);d.t=t;e.preventDefault()},{passive:false});
 function end(e,cancel){if(!d||e.pointerId!==d.id)return;var o=d;d=null;try{o.b.releasePointerCapture(e.pointerId)}catch(x){}
  clearMk();peHint("");o.b.classList.remove("dg");o.b.style.transform="";
  if(cancel)return;
  if(!o.mv){var lg=o.b.getAttribute("data-lg");if(lg!==null){SRC[+lg].col=!SRC[+lg].col;peRender()}return}
  if(o.t)peMoveEnt(+o.b.getAttribute("data-ei"),+o.t.getAttribute("data-ei"))}
 document.addEventListener("pointerup",function(e){end(e,false)});document.addEventListener("pointercancel",function(e){end(e,true)});
})();
function peRender(){
 var old={},fl=peFlash;peFlash=[];Array.prototype.forEach.call(document.querySelectorAll("#peGrid [data-u]"),function(e){old[e.getAttribute("data-u")]=e.getBoundingClientRect()});
 $("pePick").classList.toggle("hidden",!!PE.length);$("peBody").classList.toggle("hidden",!PE.length);$("peOk").classList.add("hidden");
 var oc={};Array.prototype.forEach.call($("peLeg").querySelectorAll("[data-ck]"),function(b){oc[b.getAttribute("data-ck")]=b.getBoundingClientRect()});
 $("peLeg").innerHTML=peLegend();
 Array.prototype.forEach.call($("peLeg").querySelectorAll("[data-ck]"),function(b){var o=oc[b.getAttribute("data-ck")];if(!o||!b.animate)return;var n=b.getBoundingClientRect(),dx=o.left-n.left,dy=o.top-n.top;if(dx||dy)b.animate([{transform:"translate("+dx+"px,"+dy+"px)"},{transform:"none"}],{duration:320,easing:"ease"})});   // the file chips slide to their new place too
 peRank={};PE.slice().sort(function(a,b){return a.og-b.og}).forEach(function(it,i){peRank[it.u]=i+1});
 $("peUn").disabled=!H.length;
 var g=$("peGrid");g.innerHTML="";g.className="peg"+(peW<92?" pes":"")+(peW<56?" pen":"");g.style.setProperty("--pew",peW+"px");$("peZ").value=peW;
 var U=peUnits(),parts={};U.forEach(function(u){if(u.stack)parts[u.it.s]=(parts[u.it.s]||0)+1});
 U.forEach(function(u,ui){g.appendChild(u.stack?peBar(u,ui,U.length,parts[u.it.s]):peTile(u,ui,U.length))});
 var k2=kept(),rm=PE.length-k2,nf=SRC.length+PE.filter(function(x){return x.img}).length;
 $("peInfo").textContent=!PE.length?"":k2+" page"+(k2===1?"":"s")+" will be in your PDF"+(rm?" ("+rm+" removed)":"")+". Top bar: drag a file chip onto another to swap whole files, tap a chip to fold/unfold its pages. Drag any page (on a phone: press and hold, then drag) onto another page to put it there. ⤵ Move: type the page number to put it after (page 3 → type 7 puts it between 7 and 8). ＋ adds new pages after a page, or use the top button to add at a position. Tap a number to type its final position instead. Orange “was N” = the page was moved from place N (↩ Undo (or Ctrl+Z) or ⟲ Original order brings it back). ↻ rotates, ✕ removes.";
 $("peDl").disabled=$("pePrint").disabled=!k2;
 var an=0;Array.prototype.forEach.call(g.querySelectorAll("[data-u]"),function(e){var u=e.getAttribute("data-u"),o=old[u];   // slide every tile from its old place to the new one, and flash the ones that were moved
  if(o){var n=e.getBoundingClientRect(),dx=o.left-n.left,dy=o.top-n.top;if((dx||dy)&&e.animate&&n.bottom>-80&&n.top<window.innerHeight+80&&an++<50)e.animate([{transform:"translate("+dx+"px,"+dy+"px)"},{transform:"none"}],{duration:350,easing:"ease"})}   // only tiles you can see are animated (hundreds of animations = lag)
  if(fl.indexOf(+u.slice(1))>=0)e.classList.add("flash")});
 var fe=g.querySelector(".flash");if(fe&&fe.scrollIntoView)setTimeout(function(){fe.scrollIntoView({block:"nearest",behavior:"smooth"})},60);
 peWatch(g)}

// ----- adding / opening files -----
async function peInsert(fs,at){
 fs=Array.prototype.slice.call(fs);if(!fs.length)return;say("errPe","");busy("⏳ Adding…");
 var bad=[],add=[];
 for(var i=0;i<fs.length;i++){var f=fs[i];
  try{
   if(isPdf(f)){var buf=await f.arrayBuffer(),doc=await openPdf(buf),si=SRC.push({buf:buf,doc:doc,name:f.name||"PDF",c:COLORS[peCol++%COLORS.length]})-1;for(var k=0;k<doc.numPages;k++)add.push({s:si,i:k,o:k+1,u:++peUid})}
   else if(isImgFile(f))add.push({img:f,url:URL.createObjectURL(f),o:++peImgN,u:++peUid});
   else bad.push(f.name||"file")}
  catch(e){bad.push(f.name||"file")}}
 var cut=false;if(PE.length+add.length>PE_MAX){add=add.slice(0,Math.max(0,PE_MAX-PE.length));cut=true}
 peSnap();var prev=at>0?PE[at-1].og:0,nxt=Infinity;PE.forEach(function(x){if(x.og>prev&&x.og<nxt)nxt=x.og});if(nxt===Infinity)nxt=prev+1;
 add.forEach(function(x,i){x.og=prev+(nxt-prev)*(i+1)/(add.length+1)});   // original place of a new page = right after the page it was inserted behind
 PE.splice.apply(PE,[at,0].concat(add));busy("");peFlash=add.map(function(x){return x.u});peRender();if(add.length)peNote("＋ Added "+add.length+" page"+(add.length>1?"s":"")+" at place "+posOf(at));
 if(bad.length)say("errPe","Could not use: "+bad.join(", ")+". Only PDF files and photos work here (a PDF locked with a password cannot be opened).");
 else if(cut)say("errPe","Only "+PE_MAX+" pages fit. Extra pages were not added.")}
function peReset(){H=[];PE.forEach(function(x){if(x.url)URL.revokeObjectURL(x.url)});PE=[];SRC=[];peImgN=0;peCol=0}
async function peOpenFile(fs){
 fs=Array.prototype.slice.call(fs||[]);if(!fs.length)return;
 if(!fs.some(function(x){return isPdf(x)||isImgFile(x)})){say("errPe","Please choose PDF files (or photos).");return}
 peReset();peName=fs.length>1?"merged":(fs[0].name||"file").replace(/\.[A-Za-z0-9]+$/,"");
 await peInsert(fs,0);H=[];if(SRC.length>1){SRC.forEach(function(x){x.col=true});peRender()}}   // several PDFs at once: start collapsed so whole files are easy to order


function peNote(m){busy(m);clearTimeout(peNote.t);peNote.t=setTimeout(function(){busy("")},5000)}

// ----- big preview of one page -----
function peOv(){var o=$("peov");if(o)return o;
 o=document.createElement("div");o.id="peov";o.className="peov hidden";
 o.innerHTML='<div class="st" id="peSt"></div><div class="rw"><button type="button" class="s" id="pePrev">◀</button><span id="peLab"></span><button type="button" class="s" id="peNext">▶</button><button type="button" class="s" id="peRot">↻ Rotate</button><button type="button" class="s danger" id="peRm"></button><button type="button" class="p" id="peClose">Close</button></div>';
 document.body.appendChild(o);
 $("peClose").onclick=function(){o.classList.add("hidden");peView=-1};
 o.addEventListener("click",function(e){if(e.target===o)$("peClose").click()});
 $("pePrev").onclick=function(){if(peView>0)peOpenView(peView-1)};
 $("peNext").onclick=function(){if(peView<PE.length-1)peOpenView(peView+1)};
 $("peRot").onclick=function(){peRotate(peView);peOpenView(peView)};
 $("peRm").onclick=function(){peSnap();PE[peView].rm=!PE[peView].rm;peRender();peOpenView(peView)};
 return o}
async function peOpenView(k){
 var o=peOv(),it=PE[k],tok=++peTok;peView=k;o.classList.remove("hidden");
 $("peLab").textContent="Page "+(k+1)+" of "+PE.length+" · original "+peOrig(it)+(it.rm?" (removed)":"");
 $("peRm").textContent=it.rm?"↩ Put back":"✕ Remove this page";
 $("pePrev").disabled=k===0;$("peNext").disabled=k===PE.length-1;
 var s=$("peSt");s.innerHTML="";
 var cv=document.createElement("canvas");s.appendChild(cv);
 try{await peDraw(it,cv,900)}catch(e){if(tok===peTok)s.textContent="Could not show this page."}}

// ----- make the new PDF -----
async function peBuild(){
 await needPdfLib();var out=await PDFLib.PDFDocument.create(),cache={},last={};
 PE.forEach(function(x,k){if(!x.rm&&!x.img)last[x.s]=k});
 await peSlot();   // picture drawing pauses while the PDF is made (less memory, no crash)
 try{
 for(var k=0;k<PE.length;k++){var it=PE[k];if(it.rm)continue;
  if(it.img){var p=await photoJpeg(it.img),land=p.w>p.h*1.05,PW=land?841.89:595.28,PH=land?595.28:841.89,M=18,sc=Math.min((PW-2*M)/p.w,(PH-2*M)/p.h),dw=p.w*sc,dh=p.h*sc,im=await out.embedJpg(p.bytes),pg=out.addPage([PW,PH]);
   pg.drawImage(im,{x:(PW-dw)/2,y:(PH-dh)/2,width:dw,height:dh});if(it.rot)pg.setRotation(PDFLib.degrees(it.rot))}
  else{var lib=cache[it.s]||(cache[it.s]=await PDFLib.PDFDocument.load(SRC[it.s].buf,{ignoreEncryption:true})),cp=await out.copyPages(lib,[it.i]);if(it.rot)cp[0].setRotation(PDFLib.degrees((cp[0].getRotation().angle+it.rot)%360));out.addPage(cp[0]);
   if(last[it.s]===k)delete cache[it.s]}   // that file is finished: give its memory back now
  if(k%8===7)await new Promise(function(r){setTimeout(r,0)})}   // let the phone breathe
 var bytes=await out.save();out=null;cache=null;
 return new File([bytes],peName+"-edited.pdf",{type:"application/pdf"})}
 finally{peFree()}}

// ----- buttons -----
$("peGrid").insertAdjacentHTML("beforebegin",'<div class="pevt"><button type="button" class="p" id="peAtPos">＋ Add pages at a position…</button></div><div class="pevt"><button type="button" class="s" id="peUn" disabled>↩ Undo</button><button type="button" class="s" id="peOg">⟲ Original order</button></div><div class="pevt"><button type="button" class="s" id="peCA">▸ Fold all files</button><button type="button" class="s" id="peEA">▾ Unfold all files</button></div><div class="pesz"><span>🔍</span><input type="range" id="peZ" min="24" max="200" value="105" aria-label="Page size"><button type="button" class="s" id="peFit">Fit all on screen</button></div><div class="peleg" id="peLeg"></div>');
function peIdxOfPos(v){var c=0;for(var i=0;i<PE.length;i++)if(!PE[i].rm&&++c===v)return i;return PE.length}   // place v of the new PDF -> index in the list
$("peAtPos").onclick=function(){var tot=kept()+1,v=prompt("New pages will become page number…  (1 = at the very start, "+tot+" = at the end)",tot);if(v===null)return;v=Math.round(+v);if(!(v>=1))return;peAt=peIdxOfPos(Math.min(v,tot));$("peIns").click()};
$("peUn").onclick=peUndo;$("peOg").onclick=peOriginal;
$("peZ").oninput=function(){peW=+this.value;var g=$("peGrid");g.style.setProperty("--pew",peW+"px");var was=g.classList.contains("pen");g.classList.toggle("pes",peW<92);g.classList.toggle("pen",peW<56);if(was&&peW>=56)peWatch(g)};   // number-only tiles have no thumbnail, so draw them when they come back
$("peFit").onclick=function(){var g=$("peGrid"),W=g.clientWidth||320,U=peUnits(),t=U.filter(function(u){return !u.stack}).length,b=U.length-t,Hh=Math.max(240,window.innerHeight-200),pick=24;
 for(var w=200;w>=24;w-=2){var cols=Math.max(1,Math.floor((W+8)/(w+8))),cw=(W-8*(cols-1))/cols,rows=Math.ceil(t/cols),th=w<56?cw*.8:cw*1.42+(w<92?10:w<120?100:110);if(rows*(th+8)+b*52<=Hh){pick=w;break}}
 peW=pick;peRender();g.scrollIntoView({block:"start",behavior:"smooth"})};
$("peCA").onclick=function(){SRC.forEach(function(x){x.col=true});peRender()};
$("peEA").onclick=function(){SRC.forEach(function(x){x.col=false});peRender()};
$("peOpen").onclick=function(){peReset();say("errPe","");busy("");peRender();show(["se"]);$("peFile").click();needPdfLib().catch(function(){})};
$("peBack").onclick=function(){show(["s1"])};
$("peFile").onchange=function(){var fs=Array.prototype.slice.call(this.files);this.value="";peOpenFile(fs)};
$("peIns").onchange=function(){var fs=Array.prototype.slice.call(this.files);this.value="";peInsert(fs,peAt)};
$("peGrid").addEventListener("click",function(e){var t=e.target.closest("button");if(!t)return;
 var g=function(n){var v=t.getAttribute(n);return v===null?null:+v};
 if(g("data-mv")!==null)peMoveAfter(g("data-mv"),1)
 else if(g("data-bm")!==null){var u4=peUnits()[g("data-bm")];if(u4)peMoveAfter(u4.start,u4.n)}
 else if(g("data-bo")!==null){var u=peUnits()[g("data-bo")];if(u){SRC[u.it.s].col=false;peFlash=[u.it.u];peRender()}}
 else if(g("data-bx")!==null){var u2=peUnits()[g("data-bx")];if(u2){peSnap();var all=PE.slice(u2.start,u2.end+1),to=!all.every(function(x){return x.rm});all.forEach(function(x){x.rm=to});peRender()}}
 else if(g("data-ba")!==null){var u3=peUnits()[g("data-ba")];if(u3){peAt=u3.end+1;$("peIns").click()}}
 else if(g("data-ro")!==null)peRotate(g("data-ro"));
 else if(g("data-r")!==null){peSnap();PE[g("data-r")].rm=!PE[g("data-r")].rm;peRender()}
 else if(g("data-a")!==null){peAt=g("data-a")+1;$("peIns").click()}});
$("peStart").onclick=function(){peAt=0;$("peIns").click()};
$("peDl").onclick=async function(){var b=this;b.disabled=true;b.textContent="⏳ Making your PDF…";say("errPe","");
 try{var f=await peBuild();await save(f,f.name);$("peOk").classList.remove("hidden");bearReact("cheer")}
 catch(e){say("errPe",e&&e.message==="blocked"?"Could not load the PDF maker here. Open this page in your browser and try again.":(e&&e.message)||"Could not make the PDF.")}
 finally{b.textContent="📥 Download PDF";b.disabled=!kept()}};
$("pePrint").onclick=async function(){var b=this;b.disabled=true;say("errPe","");
 try{var f=await peBuild();await startUpload(f)}catch(e){say("errPe",(e&&e.message)||"Could not make the PDF.")}
 finally{b.disabled=!kept()}};

// keyboard: Ctrl+Z (Cmd+Z on Mac) = Undo
document.addEventListener("keydown",function(e){if(!(e.ctrlKey||e.metaKey)||e.shiftKey||e.altKey||(e.key||"").toLowerCase()!=="z")return;
 var se=$("se");if(!se||se.classList.contains("hidden")||!PE.length)return;
 var t=e.target,tag=t&&t.tagName;if(tag==="INPUT"||tag==="TEXTAREA"||(t&&t.isContentEditable))return;
 e.preventDefault();peUndo()});

// Photos -> PDF: tapping its button on the first screen also opens the photo picker straight away
if($("ppOpen"))$("ppOpen").addEventListener("click",function(){if($("ppAdd"))$("ppAdd").click()});
// show() must also hide/show this card
var _s=show;show=function(ids){_s(ids);$("se").classList.toggle("hidden",ids.indexOf("se")<0)};

// drop on this page: first drop opens the PDF, later drops add pages at the end
window.peDrop=async function(fs){
 if(!PE.length){var f=fs.filter(function(x){return isPdf(x)||isImgFile(x)});if(f.length)return peOpenFile(f);say("errPe","Drop a PDF file first.");return}
 await peInsert(fs,PE.length)};
// paste (Ctrl+V / long-press > Paste): on the Edit a PDF page, an image or PDF/photo file from the clipboard is added like a dropped file
//   (first paste opens it, later pastes add pages at the end). Works for screenshots (Win+Shift+S), copied pictures and files copied in File Explorer.
window.addEventListener("paste",async function(e){
 var se=$("se");if(!se||se.classList.contains("hidden"))return;
 var cd=e.clipboardData;if(!cd)return;var fs=[];
 if(cd.files&&cd.files.length)fs=Array.prototype.slice.call(cd.files);
 else if(cd.items)Array.prototype.forEach.call(cd.items,function(it){if(it.kind==="file"){var f=it.getAsFile();if(f)fs.push(f)}});
 fs=fs.filter(function(x){return isPdf(x)||isImgFile(x)});if(!fs.length)return;
 e.preventDefault();var n=0;fs=fs.map(function(f){if(f.name&&!/^image\.\w+$/i.test(f.name))return f;n++;var ext=((f.type||"image/png").split("/")[1]||"png").replace("jpeg","jpg");return new File([f],"Pasted image "+(Date.now()%100000)+"-"+n+"."+ext,{type:f.type||"image/png"})});
 await window.peDrop(fs)});
})();