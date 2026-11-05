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

var recent=FILES.slice(0,STRIP_MAX).map(function(f){var n=f.p.split("/").pop().replace(/\.[^.]+$/,"");return'<a class="nchip" target="_blank" rel="noopener" title="'+esc(n)+'" href="'+esc(encodeURI(f.p))+'">📄 '+esc(n)+"</a>"}).join("");
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
  return'<a class="nf" target="_blank" rel="noopener" href="'+esc(encodeURI(f.p))+'"><b>📄 '+esc(name)+"</b><small>"+fmtDate(f.t)+" · "+fmtSize(f.s)+(sub?" · "+esc(sub):"")+"</small></a>"}).join("")
  :'<p class="note" style="margin:8px">'+(FILES.length?"No files here yet.":"No notes found. Run update-notes.bat, then reload.")+"</p>")}

$("nOpen").onclick=function(){if(!curCat){var c=ALL.filter(function(c){return count(c.id)})[0];curCat=c?c.id:CATS[0].id}render();show(["sn"])};
$("nBack").onclick=function(){show(["s1"])};
$("nCats").onclick=function(e){var b=e.target.closest("button");if(!b)return;curCat=b.getAttribute("data-c");curSub=-1;render()};
$("nList").onclick=function(e){var b=e.target.closest("button");if(!b)return;curSub=+b.getAttribute("data-s");render()};
var _s=show;show=function(ids){_s(ids);$("sn").classList.toggle("hidden",ids.indexOf("sn")<0)};
})();