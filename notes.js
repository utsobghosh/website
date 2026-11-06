/* notes.js : the "Notes" section. Loaded AFTER app.js (see the loader list at the bottom of index.html).
   It adds its own button (top of the first card), its own card (#sn) and its own CSS. app.js / style.css are NOT touched.
   The file list comes from notes-list.js, which update-notes.bat creates by scanning the Notes folder.

   ===== HOW TO CHANGE THINGS (instructions for Claude / future me) =====
   ADD / REMOVE FILES : put them in the Notes folder (sub-folders are fine), double-click update-notes.bat, upload Notes + notes-list.js.
   ADD A NEW SECTION (e.g. "Question"): add ONE line to CATS below: {id:"q",label:"Question",icon:"❓",keys:["question","qb"]}
        keys = words looked for in the file path (case-insensitive, whole words; "_", "-", digits, spaces count as separators).
        A file goes to the FIRST category that matches, so put more specific ones higher. No match -> "Others".
   ADD A SUB-SECTION (filter chips inside every section): add a line to SUBS: {label:"Before mid",keys:["before mid"]}
   TEXT AT THE TOP OF THE VIEWER (syllabus topics etc.): edit notes-info.js only, nothing here.
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
var AUTO_IGNORE_REDUCED_MOTION=true;   // true = strip scrolls even if Windows/phone has "reduce animations" on. false = respect that setting (strip stays still)
var HIGHLIGHT=["(full)"];   // notes whose path contains one of these words are shown coloured (top strip + lists). Add more words to colour more notes
var SUBS=[];   // e.g. [{label:"Khata",keys:["khata"]},{label:"Question",keys:["question"]}]

function rx(keys){return new RegExp("(^|[^a-z])("+keys.map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}).join("|")+")([^a-z]|$)","i")}
CATS.forEach(function(c){c.re=rx(c.keys)});SUBS.forEach(function(s){s.re=rx(s.keys)});
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function hl(p){p=p.toLowerCase();return HIGHLIGHT.some(function(k){return p.indexOf(k.toLowerCase())>=0})}
function catOf(p){for(var i=0;i<CATS.length;i++)if(CATS[i].re.test(p))return CATS[i].id;return OTHERS.id}

var FILES=(window.NOTES_FILES||[]).map(function(f){f.c=catOf(f.p);return f}).sort(function(a,b){return b.t-a.t});
var ALL=CATS.concat([OTHERS]),curCat="",curSub=-1,curTab="files",curExtra=null;

var st=document.createElement("style");
st.textContent=".nbtn{display:flex;align-items:center;gap:14px;width:100%;padding:26px 18px;margin:6px 0 18px;border:0;border-radius:20px;background:linear-gradient(135deg,var(--accent),#8a4dff);color:#fff;font:inherit;font-size:28px;font-weight:800;animation:nglow 2.4s ease-in-out infinite;text-align:left;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.22),0 10px 20px var(--shadow);transition:transform .08s,box-shadow .08s}.nbtn:active{transform:translateY(4px);box-shadow:0 1px 0 rgba(0,0,0,.22)}.nbtn .ni{font-size:40px;background:rgba(255,255,255,.25);border-radius:16px;padding:6px 12px}.nbtn .nt2{flex:1}.nbtn small{display:block;font-size:15px;font-weight:400;opacity:.9}.nbtn .na{font-size:42px;opacity:.95}.nbtn.sm{padding:14px;font-size:20px;margin:14px 0 4px;animation:none}.nbtn.sm .ni{font-size:28px;padding:4px 9px}.nbtn.sm .na{font-size:30px}.nbtn.sm small{font-size:13px}@keyframes nglow{0%,100%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 10px 22px var(--shadow)}50%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 6px var(--shadow),0 10px 28px var(--shadow)}}"+
".nlab{font-size:12px;font-weight:600;color:var(--muted);margin:0 0 4px}.nstrip{scroll-behavior:auto!important;display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin:0 0 8px;scrollbar-width:thin}.nstrip.grid{flex-wrap:wrap;max-height:110px;overflow-x:hidden;overflow-y:auto}.nchip{flex:none;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:8px 12px;border:1px solid var(--line);border-radius:99px;background:var(--panel);color:inherit;text-decoration:none;font-size:13px}.nchip:hover{border-color:var(--accent)}.nchip.hl{background:linear-gradient(135deg,var(--accent),#8a4dff);border-color:transparent;color:#fff;font-weight:700}.nf.hl{background:linear-gradient(135deg,rgba(255,105,180,.16),rgba(138,77,255,.2));border-left:4px solid #8a4dff}.nf.hl b::after{content:'★';margin-left:6px;color:#8a4dff}"+
".nwrap{display:flex;gap:10px;margin-top:10px;align-items:flex-start}.ncats{flex:0 0 34%;display:flex;flex-direction:column;gap:8px}"+
".ncat{padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:inherit;font:inherit;font-weight:600;cursor:pointer;text-align:left}.ncat small{opacity:.7;font-weight:400}.ncat.on{background:var(--accent);border-color:var(--accent);color:var(--onacc)}.ncat.zero{opacity:.45}"+
".nlist{flex:1;min-width:0;max-height:68vh;overflow-y:auto;border:1px solid var(--line);border-radius:12px;padding:6px;background:var(--panel)}"+
".nsylrow{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px}.nsylb{padding:12px 16px;border:2px solid #8a4dff;border-radius:14px;background:var(--panel);color:inherit;font:inherit;font-weight:700;font-size:16px;cursor:pointer}.nsylb span{display:inline-block;transition:transform .2s}.nsylb.on{background:#8a4dff;color:#fff}.nsylb.on span{transform:rotate(180deg)}.nsylbox{background:var(--panel);border:1px solid var(--line);border-left:4px solid #8a4dff;border-radius:12px;padding:10px 14px;margin:0 0 14px;line-height:1.6}.nsylbox.hidden{display:none}.nsylbox ul{margin:6px 0 0;padding-left:20px}#nSyl{margin-bottom:6px}.ntabs{display:flex;gap:6px;margin:0 0 8px}.ntabs button{flex:1;padding:9px 6px;border:1px solid var(--line);border-radius:10px;background:none;color:inherit;font:inherit;font-weight:600;cursor:pointer}.ntabs button.on{background:var(--accent);color:var(--onacc);border-color:var(--accent)}.nsyl{padding:6px 10px;line-height:1.6}.nsyl ul{margin:6px 0 0;padding-left:20px}.nsylbx{background:linear-gradient(135deg,rgba(255,105,180,.10),rgba(138,77,255,.14));border-left:4px solid #8a4dff;border-radius:10px;margin:8px 0}.nchips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}.nchips button{padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer}.nchips button.on{background:var(--accent);color:var(--onacc);border-color:var(--accent)}"+
".nf{display:block;padding:10px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none;border-radius:8px}.nf:last-child{border-bottom:0}.nf:hover{background:var(--line)}.nf b{display:block;word-break:break-word;font-size:14px}.nf small{color:var(--muted);font-size:12px}";
document.head.appendChild(st);

var recent=FILES.slice(0,STRIP_MAX).map(function(f){var n=f.p.split("/").pop().replace(/\.[^.]+$/,"");return'<a class="nchip'+(hl(f.p)?" hl":"")+'" target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(n)+'" title="'+esc(n)+'" href="'+esc(encodeURI(f.p))+'">📄 '+esc(n)+"</a>"}).join("");
$("s1").insertAdjacentHTML("afterbegin",(recent?'<div class="nlab">🕘 Latest notes (tap to open)</div><div class="nstrip'+(STRIP==="grid"?" grid":"")+'">'+recent+"</div>":"")+'<button type="button" class="nbtn" id="nOpen"><span class="ni">📚</span><span class="nt2">Notes by utsob 🐱<small>Browse all notes and syllebus by subject</small></span><span class="na">›</span></button><div id="nSyl"></div>');
// inside Messenger etc. (Android): reading notes works, downloading may not -> warning + browser buttons inside the Notes card
var A=window.APP||{},warn="";
if(A.IAB&&!A.IOS&&A.chromeUrl)warn='<div class="handnote" style="margin-top:8px"><b>📱 Opened inside another app</b><div class="tiny" style="margin:2px 0 6px">You can read your notes here, but <b>downloading</b> can be blocked. To download, open this page in your real browser:</div><div class="frow"><button type="button" class="p" id="nwC">🌐 Open in Chrome</button><button type="button" class="s" id="nwO">🌍 Other browser</button><button type="button" class="s" id="nwL">📋 Copy link</button></div></div>';
$("sp").insertAdjacentHTML("beforebegin",'<div class="card hidden" id="sn"><b>📚 Notes</b>'+warn+'<div class="nwrap"><div class="ncats" id="nCats"></div><div class="nlist" id="nList"></div></div><div style="margin-top:10px"><button class="s" id="nBack">Back</button></div></div>');

function fmtSize(b){return b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB"}
function fmtDate(t){var d=new Date(t);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+", "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
function infoForCat(id){var c=ALL.filter(function(x){return x.id===id})[0];   // syllabus blocks that belong to a subject button (their key equals one of the subject's words, or cat:"law")
 return(window.NOTES_INFO||[]).filter(function(e){return e.cat===id||(c&&c.keys&&e.keys&&e.keys.some(function(k){return c.keys.some(function(ck){return ck.toLowerCase()===k.toLowerCase()})}))})}
function count(id){return FILES.filter(function(f){return f.c===id}).length}

function render(){
 $("nCats").innerHTML=ALL.filter(function(c){return count(c.id)}).map(function(c){var n=count(c.id);
  return'<button type="button" class="ncat'+(c.id===curCat?" on":"")+'" data-c="'+c.id+'">'+c.icon+" "+esc(c.label)+" <small>("+n+")</small></button>"}).join("");
 var list=FILES.filter(function(f){return f.c===curCat&&(curSub<0||SUBS[curSub].re.test(f.p))});
 var chips=SUBS.length?'<div class="nchips"><button type="button" data-s="-1" class="'+(curSub<0?"on":"")+'">All</button>'+SUBS.map(function(s,i){return'<button type="button" data-s="'+i+'" class="'+(i===curSub?"on":"")+'">'+esc(s.label)+"</button>"}).join("")+"</div>":"";
 var ci=infoForCat(curCat);if(curExtra&&ci.indexOf(curExtra)<0)ci=[curExtra].concat(ci);var tabs=ci.length?'<div class="ntabs"><button type="button" data-t="files" class="'+(curTab==="files"?"on":"")+'">📄 Notes ('+count(curCat)+')</button><button type="button" data-t="syl" class="'+(curTab==="syl"?"on":"")+'">📋 Topics</button></div>':"";
 var topics=ci.map(function(e){return'<div class="nsyl nsylbx"><b>📋 '+esc(e.title)+"</b><ul>"+itemsHtml(e.items)+"</ul></div>"}).join("");   // topics are always visible under/over the files; the tab only decides which comes first
 var fh=chips+(list.length?list.map(function(f){
  var parts=f.p.split("/"),name=parts.pop().replace(/\.[^.]+$/,""),sub=parts.slice(1).join(" / ");
  return'<a class="nf'+(hl(f.p)?" hl":"")+'" target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(name)+'" href="'+esc(encodeURI(f.p))+'"><b>📄 '+esc(name)+"</b><small>"+fmtDate(f.t)+" · "+fmtSize(f.s)+(sub?" · "+esc(sub):"")+"</small></a>"}).join("")
  :'<p class="note" style="margin:8px">'+(FILES.length?"No files here yet.":"No notes found. Run update-notes.bat, then reload.")+"</p>");
 $("nList").innerHTML=tabs+(curTab==="syl"?topics+fh:fh+topics)}

$("nOpen").onclick=function(){if(!curCat){var c=ALL.filter(function(c){return count(c.id)})[0];curCat=c?c.id:CATS[0].id}render();show(["sn"])};
$("nBack").onclick=function(){show(["s1"])};
if(warn){$("nwC").onclick=function(){location.href=A.chromeUrl()};$("nwO").onclick=function(){location.href=A.browserUrl()};$("nwL").onclick=function(){A.copyLink(this)}}
// the full-screen "Open this page in your browser" page also gets the Notes button, so notes can be read without leaving
var gate=document.getElementById("iabGate"),gs=gate&&gate.querySelector("#gateSkip");
if(gs&&gs.parentNode.parentNode){var gb=document.createElement("button");gb.type="button";gb.className="nbtn sm";
 gb.innerHTML='<span class="ni">📚</span><span class="nt2">Notes by utsob 🐱<small>Read your notes here, no browser needed</small></span><span class="na">›</span>';
 gs.parentNode.parentNode.insertBefore(gb,gs.parentNode);
 gb.onclick=function(){try{sessionStorage.setItem("iabSkip","1")}catch(x){}gate.remove();$("nOpen").click()}}
$("nCats").onclick=function(e){var b=e.target.closest("button");if(!b)return;var nc=b.getAttribute("data-c");if(nc!==curCat){curExtra=null;if(!infoForCat(nc).length)curTab="files"}curCat=nc;curSub=-1;render()};   // the tab stays (Topics stays Topics) when the subject you open has topics too; a subject without topics opens on Notes
$("nList").onclick=function(e){var b=e.target.closest("button");if(!b)return;var t=b.getAttribute("data-t");if(t){curTab=t;render();return}curSub=+b.getAttribute("data-s");render()};
// ----- auto-scrolling "Latest notes" strip: loops, stops when touched, restarts after AUTO_RESUME_MS -----
function autoScroll(el){
 if(!el||STRIP==="grid"||!AUTO_SPEED||(!AUTO_IGNORE_REDUCED_MOTION&&window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches))return;
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
st2.textContent=".nv{position:fixed;inset:0;z-index:9999;background:#1b1b1b;display:flex;flex-direction:column}.nv.hidden{display:none}.nvh{display:flex;gap:6px;align-items:center;padding:8px;background:#000;color:#fff}.nvh span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.nvh button,.nvh a{padding:8px 12px;border:1px solid #666;border-radius:10px;background:#222;color:#fff;text-decoration:none;font:inherit;font-size:15px;cursor:pointer}.nvb{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y}@media (pointer:coarse){#nvM,#nvP{display:none}}.nvi{width:calc(100% * var(--z,1));margin:0 auto}.nvp{position:relative;background:#fff;margin:0 0 6px;width:100%}.nvp canvas{display:block;width:100%;height:auto}#nvD{background:#8a4dff!important;border-color:#8a4dff!important;font-weight:700}.nvh span{margin-right:2px}.nvl{position:absolute;display:block;cursor:pointer;border-radius:3px}.nvl:hover{background:rgba(138,77,255,.18)}.nvinfo{background:#2b2540;color:#fff;padding:8px 12px;border-bottom:1px solid #444;font-size:14px;line-height:1.45;cursor:pointer}.nvinfo.hidden{display:none}.nvit{display:flex;align-items:center;gap:8px}.nvit b{flex:1}.nva{font-size:18px;transition:transform .2s}.nvinfo.open .nva{transform:rotate(180deg)}.nvib{max-height:3em;overflow:hidden;-webkit-mask-image:linear-gradient(#000 45%,transparent);mask-image:linear-gradient(#000 45%,transparent)}.nvinfo.open .nvib{max-height:42vh;overflow:auto;-webkit-mask-image:none;mask-image:none}.nvib ul{margin:4px 0 0;padding-left:18px}.nvst{font-weight:700;margin-top:6px}.nvm{color:#fff;padding:20px}.nvm a{color:#9cf}";
document.head.appendChild(st2);
var vOv,vTok=0,vZ=1,vRO;
var sc0=document.createElement("script");sc0.src="notes-info.js?v="+Date.now();sc0.onload=buildSyl;document.head.appendChild(sc0);   // text blocks for the viewer (optional file)
function buildSyl(){   // front screen, under the Notes button: one button per topics block; tap = Notes screen opens with those topics first
 var d=$("nSyl"),I=window.NOTES_INFO||[];if(!d)return;if(!I.length){d.innerHTML="";return}
 d.innerHTML='<div class="nlab">📋 Topics (tap to open)</div><div class="nsylrow">'+I.map(function(e,i){return'<button type="button" class="nsylb" data-i="'+i+'">'+esc(e.title)+" <span>›</span></button>"}).join("")+"</div>";
 d.onclick=function(ev){var b=ev.target.closest(".nsylb");if(!b)return;var e=I[+b.getAttribute("data-i")],c=ALL.filter(function(x){return infoForCat(x.id).indexOf(e)>=0})[0];
  curCat=c?c.id:(curCat||CATS[0].id);curExtra=c?null:e;curTab="syl";curSub=-1;render();show(["sn"])}}
/* topics: an item is plain text, or {t:"Heading",sub:[items...]} - sub can hold more headings (any depth). Each depth has its own colour */
function itemsHtml(a,d){d=d||0;return(a||[]).map(function(t){if(t&&typeof t==="object")return'<li class="ntp ntd'+Math.min(d,2)+'"><span class="ntt">'+esc(t.t||"")+"</span>"+((t.sub&&t.sub.length)?'<ul class="nsb">'+itemsHtml(t.sub,d+1)+"</ul>":"")+"</li>";return"<li>"+esc(t)+"</li>"}).join("")}
var stI=document.createElement("style");stI.textContent=".ntp{list-style:none;margin:0}.ntd0{margin:14px 0 4px -18px;padding-top:10px;border-top:1px solid rgba(138,77,255,.3)}ul>.ntd0:first-child{margin-top:2px;padding-top:0;border-top:0}.ntt{font-weight:700}.ntd0>.ntt{color:#8a4dff;font-size:1.04em}.ntd1>.ntt{color:#d6339a}.ntd2>.ntt{color:#0a8f7a}.ntd1,.ntd2{margin-top:6px}.nsb{list-style:none;margin:3px 0 2px 3px!important;padding-left:14px!important;border-left:2px solid rgba(138,77,255,.35)}.nsb .nsb{border-left-color:rgba(214,51,154,.45)}.nsb li{font-size:.95em;padding:1px 0}.nsb li:before{content:'\\203A';color:#ff69b4;font-weight:700;margin-right:7px}.nsb .ntp:before{content:none}.nvib .ntd0{border-top-color:rgba(255,255,255,.25)}.nvib .ntd0>.ntt{color:#c9b3ff}.nvib .ntd1>.ntt{color:#ffb3e1}.nvib .ntd2>.ntt{color:#8fe8d4}.nvib .nsb{border-left-color:rgba(201,179,255,.45)}.nvib .nsb .nsb{border-left-color:rgba(255,179,225,.5)}.nvnav{position:absolute;inset:0;pointer-events:none;z-index:5}.nvpg{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:6px 16px;border-radius:99px;font-size:15px;font-weight:700;pointer-events:auto;cursor:pointer;transition:transform .15s,background .15s}.nvpg.big{transform:translateX(-50%) scale(1.25);background:#8a4dff}.nvtr{position:absolute;right:0;width:30px;pointer-events:none}.nvth{position:absolute;right:0;width:30px;height:60px;pointer-events:auto;touch-action:none;opacity:.4;transition:opacity .25s}.nvth.on{opacity:1}.nvth:after{content:'';position:absolute;right:5px;top:4px;bottom:4px;width:7px;border-radius:7px;background:rgba(138,77,255,.95);box-shadow:0 0 0 1.5px #fff}";document.head.appendChild(stI);
function infoFor(p){return(window.NOTES_INFO||[]).filter(function(e){return e.keys&&e.keys.length&&rx(e.keys).test(p)})}
function viewer(){if(vOv)return vOv;vOv=document.createElement("div");vOv.className="nv hidden";
 vOv.innerHTML='<div class="nvh"><button type="button" id="nvX">✕ Close</button><span id="nvT"></span><button type="button" id="nvM">➖</button><button type="button" id="nvP">➕</button><a id="nvO" target="_blank" rel="noopener">↗ Open</a><a id="nvD" download>⬇ Download</a></div><div class="nvinfo hidden" id="nvInfo"></div><div class="nvb" id="nvB"></div><div class="nvnav" id="nvNav" style="display:none"><div class="nvtr" id="nvTr"><div class="nvth" id="nvTh"></div></div><div class="nvpg" id="nvPg"></div></div>';
 vOv.querySelector("#nvInfo").onclick=function(){this.classList.toggle("open")};
 document.body.appendChild(vOv);
 $("nvX").onclick=function(){$("nvNav").style.display="none";$("nvInfo").className="nvinfo hidden";vTok++;vOv.classList.add("hidden");$("nvB").innerHTML=""};
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
/* page counter + draggable scroll bar (like a phone PDF viewer): "3 / 120" badge at the bottom (tap it to jump to a page) and a purple handle on the right edge (drag it to scroll fast) */
function setupNav(b,host,N){var nav=$("nvNav"),pg=$("nvPg"),tr=$("nvTr"),th=$("nvTh"),drag=false,raf=0,hideT=0,TH=60;
 nav.style.display="";
 function pageNow(){var h=host.children,lim=b.getBoundingClientRect().top+b.clientHeight*.35,lo=0,hi=h.length-1;while(lo<hi){var m=(lo+hi+1)>>1;if(h[m].getBoundingClientRect().top<=lim)lo=m;else hi=m-1}return lo+1}
 function upd(){raf=0;var max=b.scrollHeight-b.clientHeight;tr.style.top=b.offsetTop+"px";tr.style.height=b.clientHeight+"px";
  th.style.display=max>0?"":"none";th.style.top=Math.round((max>0?b.scrollTop/max:0)*Math.max(0,b.clientHeight-TH))+"px";pg.textContent=pageNow()+" / "+N}
 function poke(){th.classList.add("on");clearTimeout(hideT);hideT=setTimeout(function(){if(!drag)th.classList.remove("on")},1400)}
 b.onscroll=function(){if(!raf)raf=requestAnimationFrame(upd);poke()};
 if(vRO)vRO.disconnect();vRO=new ResizeObserver(function(){if(!raf)raf=requestAnimationFrame(upd)});vRO.observe(host);vRO.observe(b);
 th.onpointerdown=function(e){drag=true;th.setPointerCapture(e.pointerId);th.classList.add("on");pg.classList.add("big");e.preventDefault()};
 th.onpointermove=function(e){if(!drag)return;var r=tr.getBoundingClientRect(),f=(e.clientY-r.top-TH/2)/Math.max(1,r.height-TH);f=Math.max(0,Math.min(1,f));b.scrollTop=f*(b.scrollHeight-b.clientHeight)};
 th.onpointerup=th.onpointercancel=function(){drag=false;pg.classList.remove("big");poke()};
 pg.onclick=function(){var v=prompt("Go to page (1 - "+N+")",String(pageNow()));if(v===null)return;var n=parseInt(v,10);if(n>=1&&n<=N)host.children[n-1].scrollIntoView({block:"start"})};
 upd();poke()}
async function openV(path,name){
 var o=viewer(),my=++vTok,b=$("nvB"),url=encodeURI(path);vZ=1;o.classList.remove("hidden");
 $("nvT").textContent=name;$("nvD").href=url;$("nvD").setAttribute("download",name+".pdf");$("nvO").href=url;$("nvO").style.display=navigator.pdfViewerEnabled===true?"":"none";   // "Open" only where the browser can really show PDFs (not phones)
 var inf=infoFor(path),pn=$("nvInfo");
 if(inf.length){pn.className="nvinfo";pn.innerHTML='<div class="nvit"><b>📋 '+esc(inf.length===1?inf[0].title:"Topics")+'</b><span class="nva">▾</span></div><div class="nvib">'+inf.map(function(e){return(inf.length>1?'<div class="nvst">'+esc(e.title)+"</div>":"")+"<ul>"+itemsHtml(e.items)+"</ul>"}).join("")+"</div>"}
 else{pn.className="nvinfo hidden";pn.innerHTML=""}
 b.innerHTML='<p class="nvm">⏳ Loading…</p>';$("nvNav").style.display="none";
 try{var r=await fetch(url);if(!r.ok)throw new Error("x");var doc=await openPdf(await r.arrayBuffer());if(my!==vTok)return;
  var p1=await doc.getPage(1),v1=p1.getViewport({scale:1}),cw=b.clientWidth||360;
  b.innerHTML='<div class="nvi" id="nvI"></div>';var host=$("nvI");vZ=Math.min(1,900/cw);host.style.setProperty("--z",vZ);
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);drawPg(doc,e.target,cw,my).catch(function(){})})},{root:b,rootMargin:"900px 0px"});
  for(var i=1;i<=doc.numPages;i++){var d=document.createElement("div");d.className="nvp";d.setAttribute("data-n",i);d.style.aspectRatio=v1.width+" / "+v1.height;host.appendChild(d);io.observe(d)}setupNav(b,host,doc.numPages)}
 catch(e){console.error("notes viewer:",e);if(my===vTok)b.innerHTML='<p class="nvm">Could not show this file here ('+esc((e&&e.message)||e)+'). <a href="'+esc(url)+'" target="_blank" rel="noopener">Open it directly</a></p>'}}
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a.nchip,a.nf");if(!a||e.ctrlKey||e.metaKey||e.shiftKey)return;
 var p=a.getAttribute("data-p");if(p&&/\.pdf$/i.test(p)){e.preventDefault();openV(p,a.getAttribute("data-n")||"")}});

var _s=show;show=function(ids){_s(ids);$("sn").classList.toggle("hidden",ids.indexOf("sn")<0)};
})();