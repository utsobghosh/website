/* notes.js : the "Notes" section. Loaded AFTER app.js (see the loader list at the bottom of index.html).
   It adds its own button (top of the first card), its own card (#sn) and its own CSS. app.js / style.css are NOT touched.
   The file list comes from notes-list.js, which update-notes.bat creates by scanning the Notes folder.

   ===== HOW TO CHANGE THINGS (instructions for Claude / future me) =====
   ADD / REMOVE FILES : put them in the Notes folder (sub-folders are fine), double-click update-notes.bat, upload Notes + notes-list.js.
   ADD A NEW SECTION (e.g. "Question"): add ONE line to CATS below: {id:"q",label:"Question",icon:"❓",keys:["question","qb"]}
        keys = words looked for in the file path (case-insensitive, whole words; "_", "-", digits, spaces count as separators).
        A file goes to the FIRST category that matches, so put more specific ones higher. No match -> "Others".
   ADD A SUB-SECTION (filter chips inside every section): add a line to SUBS: {label:"Before mid",keys:["before mid"]}
   Files are only opened/downloaded here: there is NO print option for Notes on purpose. */
(function(){
var CATS=[
 {id:"dsa",label:"DSA",icon:"🧮",keys:["dsa","data structure","algorithm"]},
 {id:"oop",label:"OOP",icon:"☕",keys:["oop","java"]},
 {id:"eee",label:"EEE",icon:"⚡",keys:["eee","circuit"]},
 {id:"law",label:"LAW",icon:"⚖️",keys:["law"]},
 {id:"math",label:"MATH",icon:"➗",keys:["math"]}
];
var OTHERS={id:"oth",label:"Others",icon:"📁"};
var STRIP="row";      // top-page strip of newest files: "row" = one line, scroll sideways | "grid" = wrapped chips, scroll down
var STRIP_MAX=20;     // how many newest files the strip shows
var AUTO_SPEED=0.7;       // top strip auto-scroll speed (px per frame, ~0.7 = gentle). 0 = no auto-scroll
var AUTO_RESUME_MS=6000;  // restarts this long after you stop touching it. 0 = once stopped, stays stopped
var SUBS=[];   // e.g. [{label:"Khata",keys:["khata"]},{label:"Question",keys:["question"]}]

function rx(keys){return new RegExp("(^|[^a-z])("+keys.map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}).join("|")+")([^a-z]|$)","i")}
CATS.forEach(function(c){c.re=rx(c.keys)});SUBS.forEach(function(s){s.re=rx(s.keys)});
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function catOf(p){for(var i=0;i<CATS.length;i++)if(CATS[i].re.test(p))return CATS[i].id;return OTHERS.id}

var FILES=(window.NOTES_FILES||[]).map(function(f){f.c=catOf(f.p);return f}).sort(function(a,b){return b.t-a.t});
var ALL=CATS.concat([OTHERS]),curCat="",curSub=-1;

var st=document.createElement("style");
st.textContent=".nbtn{display:flex;align-items:center;gap:14px;width:100%;padding:26px 18px;margin:6px 0 18px;border:0;border-radius:20px;background:linear-gradient(135deg,var(--accent),#8a4dff);color:#fff;font:inherit;font-size:28px;font-weight:800;animation:nglow 2.4s ease-in-out infinite;text-align:left;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.22),0 10px 20px var(--shadow);transition:transform .08s,box-shadow .08s}.nbtn:active{transform:translateY(4px);box-shadow:0 1px 0 rgba(0,0,0,.22)}.nbtn .ni{font-size:40px;background:rgba(255,255,255,.25);border-radius:16px;padding:6px 12px}.nbtn .nt2{flex:1}.nbtn small{display:block;font-size:15px;font-weight:400;opacity:.9}.nbtn .na{font-size:42px;opacity:.95}@keyframes nglow{0%,100%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 10px 22px var(--shadow)}50%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 6px var(--shadow),0 10px 28px var(--shadow)}}"+
".nlab{font-size:12px;font-weight:600;color:var(--muted);margin:0 0 4px}.nstrip{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin:0 0 8px;scrollbar-width:thin}.nstrip.grid{flex-wrap:wrap;max-height:110px;overflow-x:hidden;overflow-y:auto}.nchip{flex:none;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:8px 12px;border:1px solid var(--line);border-radius:99px;background:var(--panel);color:inherit;text-decoration:none;font-size:13px}.nchip:hover{border-color:var(--accent)}"+
".nwrap{display:flex;gap:10px;margin-top:10px;align-items:flex-start}.ncats{flex:0 0 34%;display:flex;flex-direction:column;gap:8px}"+
".ncat{padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:inherit;font:inherit;font-weight:600;cursor:pointer;text-align:left}.ncat small{opacity:.7;font-weight:400}.ncat.on{background:var(--accent);border-color:var(--accent);color:var(--onacc)}.ncat.zero{opacity:.45}"+
".nlist{flex:1;min-width:0;max-height:68vh;overflow-y:auto;border:1px solid var(--line);border-radius:12px;padding:6px;background:var(--panel)}"+
".nchips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}.nchips button{padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer}.nchips button.on{background:var(--accent);color:var(--onacc);border-color:var(--accent)}"+
".nf{display:block;padding:10px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none;border-radius:8px}.nf:last-child{border-bottom:0}.nf:hover{background:var(--line)}.nf b{display:block;word-break:break-word;font-size:14px}.nf small{color:var(--muted);font-size:12px}";
document.head.appendChild(st);

var recent=FILES.slice(0,STRIP_MAX).map(function(f){var n=f.p.split("/").pop().replace(/\.[^.]+$/,"");return'<a class="nchip" target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(n)+'" title="'+esc(n)+'" href="'+esc(encodeURI(f.p))+'">📄 '+esc(n)+"</a>"}).join("");
$("s1").insertAdjacentHTML("afterbegin",(recent?'<div class="nlab">🕘 Latest notes (tap to open)</div><div class="nstrip'+(STRIP==="grid"?" grid":"")+'">'+recent+"</div>":"")+'<button type="button" class="nbtn" id="nOpen"><span class="ni">📚</span><span class="nt2">Notes by utsob 🐱<small>Browse all notes by subject</small></span><span class="na">›</span></button>');
$("sp").insertAdjacentHTML("beforebegin",'<div class="card hidden" id="sn"><b>📚 Notes</b><div class="nwrap"><div class="ncats" id="nCats"></div><div class="nlist" id="nList"></div></div><div style="margin-top:10px"><button class="s" id="nBack">Back</button></div></div>');

function fmtSize(b){return b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB"}
function fmtDate(t){var d=new Date(t);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+", "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
function count(id){return FILES.filter(function(f){return f.c===id}).length}

function render(){
 $("nCats").innerHTML=ALL.filter(function(c){return count(c.id)}).map(function(c){var n=count(c.id);
  return'<button type="button" class="ncat'+(c.id===curCat?" on":"")+'" data-c="'+c.id+'">'+c.icon+" "+esc(c.label)+" <small>("+n+")</small></button>"}).join("");
 var list=FILES.filter(function(f){return f.c===curCat&&(curSub<0||SUBS[curSub].re.test(f.p))});
 var chips=SUBS.length?'<div class="nchips"><button type="button" data-s="-1" class="'+(curSub<0?"on":"")+'">All</button>'+SUBS.map(function(s,i){return'<button type="button" data-s="'+i+'" class="'+(i===curSub?"on":"")+'">'+esc(s.label)+"</button>"}).join("")+"</div>":"";
 $("nList").innerHTML=chips+(list.length?list.map(function(f){
  var parts=f.p.split("/"),name=parts.pop().replace(/\.[^.]+$/,""),sub=parts.slice(1).join(" / ");
  return'<a class="nf" target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(name)+'" href="'+esc(encodeURI(f.p))+'"><b>📄 '+esc(name)+"</b><small>"+fmtDate(f.t)+" · "+fmtSize(f.s)+(sub?" · "+esc(sub):"")+"</small></a>"}).join("")
  :'<p class="note" style="margin:8px">'+(FILES.length?"No files here yet.":"No notes found. Run update-notes.bat, then reload.")+"</p>")}

$("nOpen").onclick=function(){if(!curCat){var c=ALL.filter(function(c){return count(c.id)})[0];curCat=c?c.id:CATS[0].id}render();show(["sn"])};
$("nBack").onclick=function(){show(["s1"])};
$("nCats").onclick=function(e){var b=e.target.closest("button");if(!b)return;curCat=b.getAttribute("data-c");curSub=-1;render()};
$("nList").onclick=function(e){var b=e.target.closest("button");if(!b)return;curSub=+b.getAttribute("data-s");render()};
// ----- auto-scrolling "Latest notes" strip: loops, stops when touched, restarts after AUTO_RESUME_MS -----
function autoScroll(el){
 if(!el||STRIP==="grid"||!AUTO_SPEED||(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches))return;
 new IntersectionObserver(function(es,io){if(!es[0].isIntersecting)return;io.disconnect();go()}).observe(el);
 function go(){
  if(el.scrollWidth<=el.clientWidth+4)return;
  var n=el.children.length;Array.prototype.slice.call(el.children).forEach(function(k){var c=k.cloneNode(true);c.setAttribute("aria-hidden","true");c.tabIndex=-1;el.appendChild(c)});
  var period=el.children[n].offsetLeft-el.children[0].offsetLeft,pos=0,paused=false,t=0,last=0;
  function pause(){paused=true;clearTimeout(t)}
  function later(){clearTimeout(t);if(AUTO_RESUME_MS>0)t=setTimeout(function(){pos=el.scrollLeft;paused=false},AUTO_RESUME_MS)}
  ["pointerdown","touchstart","wheel","mouseenter"].forEach(function(ev){el.addEventListener(ev,pause,{passive:true})});
  ["pointerup","pointercancel","touchend","mouseleave"].forEach(function(ev){el.addEventListener(ev,later,{passive:true})});
  el.addEventListener("scroll",function(){if(paused)later()},{passive:true});
  (function tick(ts){if(!paused){pos+=AUTO_SPEED*(last?Math.min(ts-last,50):16)/16;if(pos>=period)pos-=period;el.scrollLeft=pos}last=ts;requestAnimationFrame(tick)})(0)}}
autoScroll(document.querySelector(".nstrip"));

// ----- PDFs open inside the app (phones/GitHub download PDFs instead of showing them). Other file types open normally. -----
var st2=document.createElement("style");
st2.textContent=".nv{position:fixed;inset:0;z-index:9999;background:#1b1b1b;display:flex;flex-direction:column}.nv.hidden{display:none}.nvh{display:flex;gap:6px;align-items:center;padding:8px;background:#000;color:#fff}.nvh span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.nvh button,.nvh a{padding:8px 12px;border:1px solid #666;border-radius:10px;background:#222;color:#fff;text-decoration:none;font:inherit;font-size:15px;cursor:pointer}.nvb{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y}@media (pointer:coarse){#nvM,#nvP{display:none}}.nvi{width:calc(100% * var(--z,1));margin:0 auto}.nvp{position:relative;background:#fff;margin:0 0 6px;width:100%}.nvp canvas{display:block;width:100%;height:auto}#nvD{background:#8a4dff!important;border-color:#8a4dff!important;font-weight:700}.nvh span{margin-right:2px}.nvl{position:absolute;display:block;cursor:pointer;border-radius:3px}.nvl:hover{background:rgba(138,77,255,.18)}.nvm{color:#fff;padding:20px}.nvm a{color:#9cf}";
document.head.appendChild(st2);
var vOv,vTok=0,vZ=1;
function viewer(){if(vOv)return vOv;vOv=document.createElement("div");vOv.className="nv hidden";
 vOv.innerHTML='<div class="nvh"><button type="button" id="nvX">✕ Close</button><span id="nvT"></span><button type="button" id="nvM">➖</button><button type="button" id="nvP">➕</button><a id="nvO" target="_blank" rel="noopener">↗ Open</a><a id="nvD" download>⬇ Download</a></div><div class="nvb" id="nvB"></div>';
 document.body.appendChild(vOv);
 $("nvX").onclick=function(){vTok++;vOv.classList.add("hidden");$("nvB").innerHTML=""};
 var vb=$("nvB"),pz=null;
 function zoomTo(z,mx,my){var i=$("nvI");if(!i)return;var fx=(vb.scrollLeft+mx)/vb.scrollWidth,fy=(vb.scrollTop+my)/vb.scrollHeight;
  vZ=Math.max(.3,Math.min(3,z));i.style.setProperty("--z",vZ);vb.scrollLeft=fx*vb.scrollWidth-mx;vb.scrollTop=fy*vb.scrollHeight-my}
 function zoom(f){zoomTo(vZ*f,vb.clientWidth/2,vb.clientHeight/2)}   // keeps the middle of the screen in place
 function dist(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)}
 vb.addEventListener("touchstart",function(e){pz=e.touches.length===2?{d:dist(e.touches),z:vZ}:null},{passive:true});
 vb.addEventListener("touchmove",function(e){if(!pz||e.touches.length!==2)return;e.preventDefault();var r=vb.getBoundingClientRect(),t=e.touches;
  zoomTo(pz.z*dist(t)/pz.d,(t[0].clientX+t[1].clientX)/2-r.left,(t[0].clientY+t[1].clientY)/2-r.top)},{passive:false});
 vb.addEventListener("touchend",function(e){if(e.touches.length<2)pz=null});
 vb.addEventListener("wheel",function(e){if(!e.ctrlKey)return;e.preventDefault();var r=vb.getBoundingClientRect();zoomTo(vZ*Math.exp(-e.deltaY/300),e.clientX-r.left,e.clientY-r.top)},{passive:false});
 $("nvM").onclick=function(){zoom(1/1.25)};$("nvP").onclick=function(){zoom(1.25)};
 document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!vOv.classList.contains("hidden"))$("nvX").click()});
 return vOv}
async function drawPg(doc,d,cw,my){var pg=await doc.getPage(+d.getAttribute("data-n")),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:Math.min(2.5*cw,1800)/v0.width}),c=document.createElement("canvas");
 c.width=Math.round(v.width);c.height=Math.round(v.height);var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
 await pg.render({canvasContext:x,viewport:v}).promise;if(my!==vTok)return;d.appendChild(c);
 try{var an=await pg.getAnnotations();if(my!==vTok)return;   // clickable links of the PDF: laid over the picture
  an.forEach(function(a){if(a.subtype!=="Link"||!a.rect)return;
   var r=v0.convertToViewportRectangle(a.rect),l=document.createElement("a");l.className="nvl";
   l.style.cssText="left:"+Math.min(r[0],r[2])/v0.width*100+"%;top:"+Math.min(r[1],r[3])/v0.height*100+"%;width:"+Math.abs(r[2]-r[0])/v0.width*100+"%;height:"+Math.abs(r[3]-r[1])/v0.height*100+"%";
   if(a.url&&/^(https?:|mailto:)/i.test(a.url)){l.href=a.url;l.target="_blank";l.rel="noopener noreferrer"}
   else if(a.dest){l.href="#";l.onclick=function(e){e.preventDefault();goDest(doc,a.dest,d.parentNode)}}
   else return;
   d.appendChild(l)})}catch(e){}}
async function goDest(doc,dest,host){try{if(typeof dest==="string")dest=await doc.getDestination(dest);if(!dest)return;
 var i=(dest[0]&&typeof dest[0]==="object")?await doc.getPageIndex(dest[0]):dest[0],t=host.children[i];if(t)t.scrollIntoView({block:"start"})}catch(e){}}
async function openV(path,name){
 var o=viewer(),my=++vTok,b=$("nvB"),url=encodeURI(path);vZ=1;o.classList.remove("hidden");
 $("nvT").textContent=name;$("nvD").href=url;$("nvD").setAttribute("download",name+".pdf");$("nvO").href=url;$("nvO").style.display=navigator.pdfViewerEnabled===true?"":"none";   // "Open" only where the browser can really show PDFs (not phones)
 b.innerHTML='<p class="nvm">⏳ Loading…</p>';
 try{var r=await fetch(url);if(!r.ok)throw new Error("x");var doc=await openPdf(await r.arrayBuffer());if(my!==vTok)return;
  var p1=await doc.getPage(1),v1=p1.getViewport({scale:1}),cw=b.clientWidth||360;
  b.innerHTML='<div class="nvi" id="nvI"></div>';var host=$("nvI");vZ=Math.min(1,900/cw);host.style.setProperty("--z",vZ);
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);drawPg(doc,e.target,cw,my).catch(function(){})})},{root:b,rootMargin:"900px 0px"});
  for(var i=1;i<=doc.numPages;i++){var d=document.createElement("div");d.className="nvp";d.setAttribute("data-n",i);d.style.aspectRatio=v1.width+" / "+v1.height;host.appendChild(d);io.observe(d)}}
 catch(e){console.error("notes viewer:",e);if(my===vTok)b.innerHTML='<p class="nvm">Could not show this file here ('+esc((e&&e.message)||e)+'). <a href="'+esc(url)+'" target="_blank" rel="noopener">Open it directly</a></p>'}}
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a.nchip,a.nf");if(!a||e.ctrlKey||e.metaKey||e.shiftKey)return;
 var p=a.getAttribute("data-p");if(p&&/\.pdf$/i.test(p)){e.preventDefault();openV(p,a.getAttribute("data-n")||"")}});

var _s=show;show=function(ids){_s(ids);$("sn").classList.toggle("hidden",ids.indexOf("sn")<0)};
})();