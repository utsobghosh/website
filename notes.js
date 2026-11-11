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
function catOf(p){var L=(ALL&&ALL.length)?ALL:CATS;for(var i=0;i<L.length;i++)if(L[i].re&&L[i].re.test(p))return L[i].id;return OTHERS.id}

/* PRIORITY FILE NAMES (Drive or Notes folder):  priority_subject_name.pdf   e.g.  2_dsa_prev que.pdf
   - the number = priority (1 = most important, shown first). The subject word (dsa, oop, eee, law, math) puts it in that subject. Priority and subject are NOT part of the shown name.
   - "2_prev que.pdf" (no subject) also works: shown as "prev que", subject found from the folder/name as before. No leading number = old behaviour (nothing changes). */
var PRIORITY_COLORS={"-2":"#111827","-1":"#7f0000","0":"#d81b60","1":"#e53935","2":"#fb8c00","3":"#43a047","4":"#1e88e5","5":"#8e24aa"};   // lower number = more important (-2, -1, 0, 1, 2 …). Numbers below -2 / above 5 use the nearest colour
function parseName(p){var b0=p.split("/").pop(),pn0=/^pin_/i.test(b0);if(pn0)p=p.slice(0,p.length-b0.length)+b0.replace(/^pin_/i,"");var r=parseName0(p);r.pn=pn0;return r}
function parseName0(p){var b=p.split("/").pop().replace(/\.[^.]+$/,""),m=/^(-?\d+)_(.+)$/.exec(b);if(!m)return{nm:b,pr:null,sj:""};
 var rest=m[2],k=rest.indexOf("_"),sj="",nm=rest;if(k>0&&k<rest.length-1){sj=rest.slice(0,k).trim().toLowerCase();nm=rest.slice(k+1)}
 return{nm:nm.trim()||b,pr:+m[1],sj:sj}}
function catFor(f){if(f.sj)for(var i=0;i<CATS.length;i++){var c=CATS[i];if(c.id===f.sj||c.keys.some(function(k){return k.toLowerCase()===f.sj}))return c.id}return catOf(f.p)}
function hp(f){return f.pr!=null}
function pcol(n){var k=Object.keys(PRIORITY_COLORS).map(Number).sort(function(a,b){return a-b});return PRIORITY_COLORS[Math.max(k[0],Math.min(k[k.length-1],n))]}
function prc(f){return hp(f)?" pr":(hl(f.p)?" hl":"")}
function prs(f,fs){var st=(hp(f)?"--pc:"+pcol(f.pr)+";":"")+(fs?"font-size:"+fs+"px;":"");return(st?' style="'+st+'"':"")+(hp(f)?' data-pr="'+f.pr+'"':"")}
function cfs(n){return Math.max(9,Math.min(13,Math.round(345/Math.max(1,n.length)*2)/2))}   // long name -> smaller text (13px down to 9px) so it fits the button
var META={};try{META=JSON.parse(localStorage.getItem("notesMeta")||"{}")||{}}catch(e){}   // pin / subject / archive choices made on the website (saved in the Google Sheet tab FileMeta)
var ARCHIVE={icon:"🗄️",label:"Archive"};   // name of the archive button / tab
var FILES=(window.NOTES_FILES||[]).map(function(f){var pn=parseName(f.p);f.nm=pn.nm;f.pr=pn.pr;f.sj=pn.sj;f.pn=pn.pn;f.c=catFor(f);return f}).sort(function(a,b){function k(f){return hp(f)?f.pr:hl(f.p)?1:1e9}return (k(a)-k(b))||(hp(b)-hp(a))||(b.t-a.t)});   // (full) notes count as priority 1: -2, -1, 0 come before them, 2, 3… after; the rest newest first   // coloured (purple) notes first, then newest first
var TOPICS={},INFO0=null,CFG={};try{TOPICS=JSON.parse(localStorage.getItem("notesTopics")||"{}")||{}}catch(e){}CFG=parseCfg(TOPICS.cfg);   // topics typed on the website (saved in the Google Sheet tab Topics)
var ALL=[],curCat="",curSub=-1,curTab="files",curExtra=null,q="";
function eff(f){var m=META[f.p]||{},sj=m.sj&&ALL.some(function(c){return c.id===m.sj})?m.sj:"";f.c=sj||(f.fc&&ALL.some(function(c){return c.id===f.fc})?(f.an===1&&catFor(f)!==OTHERS.id?catFor(f):f.fc):catFor(f));if(!ALL.some(function(c){return c.id===f.c}))f.c=OTHERS.id;f.pinned=(m.pin===1||m.pin==="1")?true:(m.pin===0||m.pin==="0")?false:!!f.pn;f.ar=m.ar===1||m.ar==="1";f.tg=m.tg?String(m.tg).split("|").filter(Boolean):[];if(f.x&&f.at){var pp=f.p.split("/");if(pp.length>=4){var at=cleanTag(pp[2]);if(at&&f.tg.indexOf(at)<0)f.tg.push(at)}}if(f.x&&f.an===2&&f.fc){var m2=catFor(f);if(m2!==OTHERS.id&&m2!==f.fc){var l2=ALL.filter(function(c){return c.id===m2})[0],tn=cleanTag(l2?l2.label:m2);if(tn&&f.tg.indexOf(tn)<0)f.tg.push(tn)}}}   // imported Drive folder: each first-level sub-folder becomes a tab automatically
function buildAll(){   // subjects = built-in ones (except removed) + ones added on the website (saved as __subj:<id> = icon|name|word|word…) + Others
 var base=CATS.filter(function(c){var m=META["__hide:"+c.id];return!(m&&m.tg)}),extra=[];
 Object.keys(META).forEach(function(k){if(k.indexOf("__subj:")!==0||!META[k]||!META[k].tg)return;var a=String(META[k].tg).split("|"),id=k.slice(7),o={id:id,icon:a[0]||"📘",label:a[1]||id,keys:a.slice(2).filter(Boolean),custom:1};o.re=o.keys.length?rx(o.keys):null;extra.push(o)});
 ALL=base.concat(extra,[OTHERS]);applyOrder();applyLabels()}
buildAll();FILES.forEach(eff);
function org(){try{return!!sessionStorage.getItem("pin")&&sessionStorage.getItem("orgHide")!=="1"}catch(e){return false}}
function viewable(p){return /\.(pdf|jpe?g|png|webp|gif)$/i.test(p)}
function arCount(id){return FILES.filter(function(f){return f.ar&&(!id||f.c===id)}).length}

var st=document.createElement("style");
st.textContent=".nbtn{display:flex;align-items:center;gap:14px;width:100%;padding:26px 18px;margin:6px 0 18px;border:0;border-radius:20px;background:linear-gradient(135deg,var(--accent),var(--accent2,#8a4dff));color:#fff;font:inherit;font-size:28px;font-weight:800;animation:nglow 2.4s ease-in-out infinite;text-align:left;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.22),0 10px 20px var(--shadow);transition:transform .08s,box-shadow .08s}.nbtn:active{transform:translateY(4px);box-shadow:0 1px 0 rgba(0,0,0,.22)}.nbtn .ni{font-size:40px;background:rgba(255,255,255,.25);border-radius:16px;padding:6px 12px}.nbtn .nt2{flex:1}.nbtn small{display:block;font-size:15px;font-weight:400;opacity:.9}.nbtn .na{font-size:42px;opacity:.95}.nbtn.sm{padding:14px;font-size:20px;margin:14px 0 4px;animation:none}.nbtn.sm .ni{font-size:28px;padding:4px 9px}.nbtn.sm .na{font-size:30px}.nbtn.sm small{font-size:13px}@keyframes nglow{0%,100%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 10px 22px var(--shadow)}50%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 6px var(--shadow),0 10px 28px var(--shadow)}}"+
".nlab{font-size:12px;font-weight:600;color:var(--muted);margin:0 0 4px}.nstrip{scroll-behavior:auto!important;display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin:0 0 8px;scrollbar-width:thin}.nstrip.grid{flex-wrap:wrap;max-height:110px;overflow-x:hidden;overflow-y:auto}.nchip{flex:none;max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:7px 11px;border:1px solid var(--line);border-radius:99px;background:var(--panel);color:inherit;text-decoration:none;font-size:12px}.nchip:hover{border-color:var(--accent)}.nchip.hl{background:linear-gradient(135deg,var(--accent),var(--accent2,#8a4dff));border-color:transparent;color:#fff;font-weight:700}.nf.hl{background:linear-gradient(135deg,color-mix(in srgb,var(--accent3,#ff69b4) 16%,transparent),color-mix(in srgb,var(--accent2,#8a4dff) 20%,transparent));border-left:4px solid var(--accent2,#8a4dff)}.nf.hl b::after{content:'★';margin-left:6px;color:var(--accent2,#8a4dff)}"+
".nwrap{display:flex;gap:10px;margin-top:10px;align-items:flex-start}.ncats{flex:0 0 34%;display:flex;flex-direction:column;gap:8px}"+
".ncat{padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:inherit;font:inherit;font-weight:600;cursor:pointer;text-align:left}.ncat small{opacity:.7;font-weight:400}.nci{font-style:normal}.ncat.on{background:var(--accent);border-color:var(--accent);color:var(--onacc)}.ncat.zero{opacity:.45}"+
".nlist{flex:1;min-width:0;max-height:none;overflow:visible;border:1px solid var(--line);border-radius:12px;padding:6px;background:var(--panel)}"+
".nsylrow{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px}.nsylb{padding:12px 16px;border:2px solid var(--accent2,#8a4dff);border-radius:14px;background:var(--panel);color:inherit;font:inherit;font-weight:700;font-size:16px;cursor:pointer}.nsylb span{display:inline-block;transition:transform .2s}.nsylb.on{background:var(--accent2,#8a4dff);color:#fff}.nsylb.on span{transform:rotate(180deg)}.nsylbox{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent2,#8a4dff);border-radius:12px;padding:10px 14px;margin:0 0 14px;line-height:1.6}.nsylbox.hidden{display:none}.nsylbox ul{margin:6px 0 0;padding-left:20px}#nSyl{margin-bottom:6px}.ntabs{display:flex;gap:6px;margin:0 0 8px}.ntabs button{flex:1;padding:9px 6px;border:1px solid var(--line);border-radius:10px;background:none;color:inherit;font:inherit;font-weight:600;cursor:pointer}.ntabs button.on{background:var(--accent);color:var(--onacc);border-color:var(--accent)}.nsyl{padding:6px 10px;line-height:1.6}.nsyl ul{margin:6px 0 0;padding-left:20px}.nsylbx{background:linear-gradient(135deg,color-mix(in srgb,var(--accent3,#ff69b4) 10%,transparent),color-mix(in srgb,var(--accent2,#8a4dff) 14%,transparent));border-left:4px solid var(--accent2,#8a4dff);border-radius:10px;margin:8px 0}.nchips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}.nchips button{padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer}.nchips button.on{background:var(--accent);color:var(--onacc);border-color:var(--accent)}"+
".nf{display:block;padding:10px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none;border-radius:8px}.nf:last-child{border-bottom:0}.nf:hover{background:var(--line)}.nf b{display:block;word-break:break-word;font-size:14px}.nf small{color:var(--muted);font-size:12px}"+ ".nf{border-bottom:0}.nfw{border-bottom:1px solid var(--line);padding-bottom:8px}.nfw:last-child{border-bottom:0}.nfb{display:flex;gap:6px;padding:0 6px}.nfa{flex:1 1 0;min-width:0;box-sizing:border-box;text-align:center;padding:8px 4px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);font:inherit;font-size:12.5px;font-weight:600;text-decoration:none;cursor:pointer;white-space:nowrap;margin:0;box-shadow:none}.nfa:active{background:var(--line)}";
document.head.appendChild(st);var stPr=document.createElement("style");stPr.textContent=".nchip.pr{background:var(--pc);border-color:transparent;color:#fff;font-weight:700}.nf.pr{background:color-mix(in srgb,var(--pc) 14%,transparent);border-left:4px solid var(--pc)}.nf.pr b::after{content:'#'attr(data-pr);margin-left:8px;padding:1px 7px;border-radius:99px;background:var(--pc);color:#fff;font-size:11px;font-weight:700;vertical-align:middle}";document.head.appendChild(stPr);

var stT=document.createElement("style");stT.textContent=".ntabs{flex-wrap:wrap}.ntabs button{min-width:30%}";document.head.appendChild(stT);var stO=document.createElement("style");stO.textContent=".nf{border-bottom:0;position:relative;padding-right:32px;background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:10px}.nf:after{content:'›';position:absolute;right:11px;top:50%;transform:translateY(-52%);font-size:26px;line-height:1;color:var(--accent2,#8a4dff);opacity:.85}.nfw{position:relative;border:2px solid color-mix(in srgb,var(--accent) 42%,var(--line));border-radius:16px;margin:0 0 10px;padding:6px;background:var(--panel)}.nfw:last-child{margin-bottom:2px}.nfw.org .nf{padding-right:46px}.nfw.org .nf:after{right:46px}.nfb{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:6px;padding:6px 0 0}.nfa.nfv{background:var(--accent);border-color:var(--accent);color:var(--onacc,#fff)}.nfm{position:absolute;right:8px;top:8px;z-index:2;width:30px;height:30px;padding:0;margin:0;border:0;border-radius:50%;background:var(--panel);color:var(--text);font-size:20px;line-height:1;cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,.25)}.ncat{border:2px solid color-mix(in srgb,var(--accent) 38%,var(--line))!important}.ncat.on{border-color:var(--accent)!important}.npw{position:relative;margin:0 0 6px}.npin{display:flex;align-items:center;gap:10px;box-sizing:border-box;width:100%;padding:9px 12px;border:2px solid var(--accent2,#8a4dff);border-radius:16px;background:var(--panel);color:var(--text);text-decoration:none;box-shadow:0 3px 0 color-mix(in srgb,var(--accent2,#8a4dff) 45%,transparent);cursor:pointer}.npin:active{transform:translateY(2px);box-shadow:none}.npin .ni{font-size:20px}.npin .nt2{flex:1;min-width:0;display:block}.npin .nt2 b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14.5px}.npin .nt2 small{display:block;font-size:11px;font-weight:400;color:var(--muted)}.npin .na{font-size:24px;opacity:.7}.npw.org .npin{padding-right:46px}.nmore{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;padding:0;margin:0;border:0;background:none;color:var(--muted);font-size:22px;line-height:1;cursor:pointer;box-shadow:none}.norg{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:8px 0;padding:7px 10px;border:1px dashed var(--accent2,#8a4dff);border-radius:12px;background:color-mix(in srgb,var(--accent2,#8a4dff) 12%,var(--panel));font-size:12.5px}.norg button{flex:none;padding:5px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);font:inherit;font-size:12px;cursor:pointer;margin:0;box-shadow:none}.nmenu{position:fixed;z-index:10010;width:min(290px,calc(100vw - 16px));box-sizing:border-box;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.3);padding:6px;font-size:14px}.nmenu .mh{display:block;padding:6px 10px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nmenu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;padding:10px 12px;border-radius:9px;cursor:pointer;margin:0;box-shadow:none;transform:none}.nmenu button:hover,.nmenu button:active{background:var(--line)}.nmenu button.cur{font-weight:700}.nmenu button small{margin-left:auto;color:var(--muted);font-weight:400}";document.head.appendChild(stO);
function stripHtml(){return FILES.filter(function(f){return!f.ar}).slice(0,STRIP_MAX).map(function(f){var n=f.nm;return'<a class="nchip'+prc(f)+'"'+prs(f,cfs(n))+' target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(n)+'" title="'+esc(n)+'" href="'+esc(f.id?"#":encodeURI(f.p))+'">'+(isImg(f.p)?"🖼️":"📄")+' '+esc(n)+"</a>"}).join("")}
function stripBox(){var r=stripHtml();return r?'<div class="nlab">🕘 Latest notes (tap to open)</div><div class="nstrip'+(STRIP==="grid"?" grid":"")+'">'+r+"</div>":""}
$("s1").insertAdjacentHTML("afterbegin",'<div id="nStripBox">'+stripBox()+'</div><div id="nPins"></div>'+'<button type="button" class="nbtn" id="nOpen"><span class="ni">📚</span><span class="nt2">Notes by utsob 🐱<small>Browse all notes and syllebus by subject</small></span><span class="na">›</span></button><div id="nSyl"></div><div id="nOrg"></div>');
// inside Messenger etc. (Android): reading notes works, downloading may not -> warning + browser buttons inside the Notes card
var A=window.APP||{},warn="";
if(A.IAB&&!A.IOS&&A.chromeUrl)warn='<div class="handnote" style="margin-top:8px"><b>📱 Opened inside another app</b><div class="tiny" style="margin:2px 0 6px">You can read your notes here, but <b>downloading</b> can be blocked. To download, open this page in your real browser:</div><div class="frow"><button type="button" class="p" id="nwC">🌐 Open in Chrome</button><button type="button" class="s" id="nwO">🌍 Other browser</button><button type="button" class="s" id="nwL">📋 Copy link</button></div></div>';
$("sp").insertAdjacentHTML("beforebegin",'<div class="card hidden" id="sn"><div class="nhead"><button class="s" id="nBack">← Back</button><b>📚 Notes</b></div>'+warn+'<input type="search" id="nSearch" class="nsrch" placeholder="🔍 Search all notes…" autocomplete="off"><div class="nwrap"><div class="ncats" id="nCats"></div><div class="nlist" id="nList"></div></div></div>');

function fmtSize(b){return b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB"}
function fmtDate(t){var d=new Date(t);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+", "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
function infoForCat(id){var c=ALL.filter(function(x){return x.id===id})[0];   // syllabus blocks that belong to a subject button (their key equals one of the subject's words, or cat:"law")
 return(window.NOTES_INFO||[]).filter(function(e){return e.cat===id||(c&&c.keys&&e.keys&&e.keys.some(function(k){return c.keys.some(function(ck){return ck.toLowerCase()===k.toLowerCase()})}))})}
function cleanTag(s){return String(s||"").replace(/[|\r\n]/g," ").replace(/\s+/g," ").trim().slice(0,24)}
function tagsOf(id){var o=[];FILES.forEach(function(f){if(f.c===id&&!f.ar)f.tg.forEach(function(t){if(o.indexOf(t)<0)o.push(t)})});return o.sort()}   // custom tabs of one subject (made from the tabs given to its files)
function allTags(){var o=[];FILES.forEach(function(f){f.tg.forEach(function(t){if(o.indexOf(t)<0)o.push(t)})});return o.sort()}
function tgCount(id,t){return FILES.filter(function(f){return f.c===id&&!f.ar&&f.tg.indexOf(t)>=0}).length}
function applyLabels(){ALL.forEach(function(c){if(c.l0==null){c.l0=c.label;c.i0=c.icon}var m=META["__label:"+c.id],s=(CFG.st||{})[c.id]||{};c.label=s.n||((m&&m.tg)?m.tg:c.l0);c.icon=s.i||c.i0;c.co=s.c||"";if(c.re0===undefined)c.re0=c.re||null;var ex=(s.k||[]).filter(Boolean);c.re=ex.length?rx((c.keys||[]).concat(ex)):c.re0})}   // name / icon / colour set on the website
function renameTab(from,to){var p=Promise.resolve();FILES.filter(function(f){return f.tg.indexOf(from)>=0}).forEach(function(f){p=p.then(function(){var nt=f.tg.map(function(t){return t===from?to:t}).filter(function(t,i,a){return a.indexOf(t)===i});return metaSet(f.p,{tg:nt.join("|")})})});return p}
function orgBar(){if(!org())return"";var c=ALL.filter(function(x){return x.id===curCat})[0],h=[];
 if(c&&curCat!=="__ar"){h.push('<button type="button" class="s" data-ren="sj">✏️ Edit subject</button>');
  h.push('<button type="button" class="s" data-ren="topics">📝 Edit topics &amp; table</button>');
  h.push('<button type="button" class="s" data-ren="lnk">🔗 Add link / Drive folder</button>');
  if(curTab.indexOf("tg:")===0)h.push('<button type="button" class="s" data-ren="tab">✏️ Rename tab “'+esc(curTab.slice(3))+'”</button>');
  if(c.id!==OTHERS.id)h.push('<button type="button" class="s" data-ren="del">🗑 Remove “'+esc(c.label)+'”</button>')}
 h.push('<button type="button" class="s" data-ren="add">➕ Add subject</button>');h.push('<button type="button" class="s" data-ren="ord">↕ Reorder subjects</button>');h.push('<button type="button" class="s" data-ren="sel">'+(SELMODE?"✖ Done selecting":"☑️ Select multiple files")+"</button>");h.push('<button type="button" class="s" data-ren="onew">'+(ONLYNEW?"👁 Show organized files too":"🙈 Hide files already in a tab")+"</button>");
 var hid=CATS.filter(function(x){var m=META["__hide:"+x.id];return m&&m.tg});
 if(hid.length)h.push('<button type="button" class="s" data-ren="res">↩ Restore removed ('+hid.length+')</button>');
 return'<div style="margin:0 0 8px;display:flex;gap:6px;flex-wrap:wrap">'+h.join("")+"</div>"+(SELMODE?bulkBar():"")}
function orgAct(a){var c=ALL.filter(function(x){return x.id===curCat})[0];
 if(a==="sj"&&c){subjDlg(c);return}if(a==="add"){subjDlg(null);return}if(a==="lnk"){linkDlg();return}if(a==="ord"){ordDlg();return}if(/^(lk|src)[EDRTN]:/.test(a)){lkAct(a);return}if(a==="sel"){SELMODE=!SELMODE;SEL={};render();return}if(a==="onew"){ONLYNEW=!ONLYNEW;render();return}if(/^bk:/.test(a)){bulkAct(a);return}
 if(a==="topics"){topicEditor();return}
 if(a==="sj"&&c){var n1=prompt("New name for this subject (leave empty = original name)",c.label);if(n1===null)return;n1=cleanTag(n1);metaSet("__label:"+curCat,{tg:n1===c.l0?"":n1})}
 else if(a==="tab"){var from=curTab.slice(3),n2=cleanTag(prompt("New name for this tab",from)||"");if(!n2||n2===from)return;curTab="tg:"+n2;renameTab(from,n2)}
 else if(a==="add"){var nm=cleanTag(prompt("Name of the new subject (example: Physics)")||"");if(!nm)return;
  var ic=(prompt("An emoji for it (optional)","📘")||"📘").replace(/\|/g,"").trim().slice(0,6)||"📘";
  var ks=(prompt("Words in the file names that belong to it, separated by commas (optional, example: phy, physics).\nYou can also move files here by hand with ⋮.","")||"").split(",").map(function(k){return cleanTag(k).toLowerCase()}).filter(Boolean).slice(0,6),id="c"+Math.random().toString(36).slice(2,8);
  metaSet("__subj:"+id,{tg:[ic,nm].concat(ks).join("|")}).then(function(){if(ALL.some(function(x){return x.id===id})){curCat=id;curTab="files";curSub=-1;render()}})}
 else if(a==="del"&&c){if(!confirm("Remove the subject “"+c.label+"”?\nNo file is deleted: its files move to Others (or to a matching subject)."))return;
  metaSet(c.custom?"__subj:"+c.id:"__hide:"+c.id,{tg:c.custom?"":"1"}).then(function(){curTab="files";render()})}
 else if(a==="res"){var p=Promise.resolve();CATS.forEach(function(x){var m=META["__hide:"+x.id];if(m&&m.tg)p=p.then(function(){return metaSet("__hide:"+x.id,{tg:""})})});p.then(render)}}
function count(id){return FILES.filter(function(f){return f.c===id&&!f.ar}).length}

function render(){
 buildAll();applyLabels();
 if(curCat&&curCat!=="__ar"&&!ALL.some(function(c){return c.id===curCat})){var fc0=ALL.filter(function(c){return count(c.id)})[0];curCat=fc0?fc0.id:""}
 if(curTab.indexOf("tg:")===0&&tagsOf(curCat).indexOf(curTab.slice(3))<0)curTab="files";
 if(!arCount()){if(curCat==="__ar"){var fc=ALL.filter(function(c){return count(c.id)})[0];if(fc)curCat=fc.id}if(curTab==="arch")curTab="files"}
 $("nCats").innerHTML=ALL.filter(function(c){return count(c.id)||arCount(c.id)||(org()&&c.custom)||hasLk(c.id)}).map(function(c){var n=count(c.id);
  return'<button type="button" class="ncat'+(c.id===curCat&&!q?" on":"")+'"'+(c.co?' style="--sc:'+esc(c.co)+'"':"")+' data-c="'+c.id+'">'+'<i class=\"nci\">'+c.icon+"</i> "+esc(c.label)+" <small>("+n+")</small></button>"}).join("")+(arCount()?'<button type="button" class="ncat'+("__ar"===curCat&&!q?" on":"")+'" data-c="__ar"><i class="nci">'+ARCHIVE.icon+"</i> "+ARCHIVE.label+" <small>("+arCount()+")</small></button>":"");
 var qw=q.split(/\s+/).filter(Boolean),list=q?FILES.filter(function(f){var p=f.p.toLowerCase();return qw.every(function(w){return p.indexOf(w)>=0})}).sort(function(a,b){return (a.ar?1:0)-(b.ar?1:0)}):(curCat==="__ar"?FILES.filter(function(f){return f.ar}):FILES.filter(function(f){return f.c===curCat&&(curTab==="arch"?f.ar:!f.ar)&&(curTab.indexOf("tg:")!==0||f.tg.indexOf(curTab.slice(3))>=0)&&(curSub<0||SUBS[curSub].re.test(f.p))&&!(ONLYNEW&&curTab==="files"&&org()&&f.tg.length)}));
 var chips=SUBS.length?'<div class="nchips"><button type="button" data-s="-1" class="'+(curSub<0?"on":"")+'">All</button>'+SUBS.map(function(s,i){return'<button type="button" data-s="'+i+'" class="'+(i===curSub?"on":"")+'">'+esc(s.label)+"</button>"}).join("")+"</div>":"";
 var ci=infoForCat(curCat);if(curExtra&&ci.indexOf(curExtra)<0)ci=[curExtra].concat(ci);var arN=curCat==="__ar"?0:arCount(curCat),tgs=curCat==="__ar"?[]:tagsOf(curCat),tabs=(curCat!=="__ar"&&(ci.length||arN||tgs.length))?'<div class="ntabs"><button type="button" data-t="files" class="'+(curTab==="files"?"on":"")+'">📄 Notes ('+count(curCat)+')</button>'+(ci.length?'<button type="button" data-t="syl" class="'+(curTab==="syl"?"on":"")+'">📋 Topics</button>':"")+(ci.some(function(e){return e.tab})?'<button type="button" data-t="cx" class="'+(curTab==="cx"?"on":"")+'">⏱️ '+cxLabel(ci)+'</button>':"")+(arN?'<button type="button" data-t="arch" class="'+(curTab==="arch"?"on":"")+'">'+ARCHIVE.icon+" "+ARCHIVE.label+" ("+arN+")</button>":"")+tgs.map(function(t){return'<button type="button" data-t="tg:'+esc(t)+'" class="'+(curTab==="tg:"+t?"on":"")+'">🏷️ '+esc(t)+" ("+tgCount(curCat,t)+")</button>"}).join("")+"</div>":"";
  var box=function(e){return'<div class="nsyl nsylbx"><b>'+(e.tab?"⏱️ ":"📋 ")+esc(e.title)+"</b>"+cpBtn('data-cpi="'+(window.NOTES_INFO||[]).indexOf(e)+'"')+bodyHtml(e)+"</div>"},topics=ci.filter(function(e){return!e.tab}).map(box).join(""),cxb=ci.filter(function(e){return e.tab}).map(box).join("");   // topics are always visible under/over the files; the tab only decides which comes first
 LISTP=list.map(function(f){return f.p});var fh=chips+(list.length?list.map(rowHtml).join("")
  :'<p class="note" style="margin:8px">'+(q?"No notes match your search 🔍":(curTab==="arch"||curCat==="__ar")?"Nothing in the "+ARCHIVE.label+" yet.":FILES.length?"No files here yet.":"No notes found. Run update-notes.bat, then reload.")+"</p>");
 if(ED&&!q&&ED.id===curCat){$("nList").innerHTML=edHtml();return}
 $("nList").innerHTML=q?fh:orgBar()+tabs+((curCat==="__ar"||curTab==="cx")?"":linksHtml(curCat))+(curTab==="cx"?cxb:curTab==="syl"?topics+fh:(curTab==="arch"||curCat==="__ar"||curTab.indexOf("tg:")===0)?fh:fh+topics)}

function rowHtml(f){
 var parts=f.p.split("/"),name=(parts.pop(),f.nm),sub=parts.slice(1).join(" / "),o=org();
 var dUrl=f.id?"https://drive.google.com/file/d/"+encodeURIComponent(f.id)+"/view":encodeURI(f.p),dlUrl=f.id?"https://drive.google.com/uc?export=download&id="+encodeURIComponent(f.id):encodeURI(f.p),absUrl=f.id?dUrl:new URL(encodeURI(f.p),document.baseURI).href;
 return'<div class="nfw'+(o?" org":"")+(o&&f.tg.length&&curTab.indexOf("tg:")!==0&&curCat!=="__ar"?" ndone":"")+'">'+(o?(SELMODE?'<button type="button" class="nfm nsel" data-sel="'+esc(f.p)+'">'+(SEL[f.p]?"✅":"☐")+"</button>":'<button type="button" class="nfm" data-mp="'+esc(f.p)+'" title="Organize this file">⋮</button>'):"")+
  '<a class="nf'+prc(f)+'"'+prs(f)+' target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(name)+'" href="'+esc(f.id?"#":encodeURI(f.p))+'"><b>'+(isImg(f.p)?"🖼️":"📄")+" "+esc(name)+(f.pinned?" 📌":"")+"</b><small>"+fmtDate(f.t)+" · "+fmtSize(f.s)+(sub?" · "+esc(sub):"")+(q?" · "+esc(ALL.filter(function(x){return x.id===f.c})[0].label):"")+(f.ar?" · "+ARCHIVE.icon+" "+ARCHIVE.label:"")+(curTab.indexOf("tg:")!==0?(f.tg.length?" · "+(o?"✅ in tab: ":"🏷️ ")+esc(f.tg.join(", ")):(o&&!q&&curCat!=="__ar"?" · ⬜ no tab yet":"")):"")+"</small></a>"+
  '<div class="nfb">'+(viewable(f.p)?'<a class="nfa nfv" target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(name)+'" href="'+esc(f.id?"#":encodeURI(f.p))+'">📖 View here</a>':"")+'<a class="nfa" target="_blank" rel="noopener" href="'+esc(dUrl)+'">↗ New tab</a><a class="nfa" href="'+esc(dlUrl)+'" download="'+esc(name)+'"'+(f.id?' target="_blank" rel="noopener"':"")+'>⬇ Download</a><button type="button" class="nfa" data-cp="'+esc(absUrl)+'">🔗 Copy link</button></div></div>'}
function renderPins(){   // pinned files: smaller buttons above the big "Notes by utsob" button
 var box=$("nPins");if(!box)return;var o=org();
 var h=FILES.filter(function(f){return f.pinned&&!f.ar}).map(function(f){var nm=f.nm;
  return'<div class="npw'+(o?" org":"")+'"><a class="npin'+prc(f)+'"'+prs(f)+' target="_blank" rel="noopener" data-p="'+esc(f.p)+'" data-n="'+esc(nm)+'" title="'+esc(nm)+'" href="'+esc(f.id?"#":encodeURI(f.p))+'"><span class="ni">📌</span><span class="nt2"><b>'+esc(nm)+"</b><small>"+(viewable(f.p)?"tap to read here":"tap to open")+'</small></span><span class="na">›</span></a>'+(o?'<button type="button" class="nmore" data-mp="'+esc(f.p)+'" title="Organize this file">⋮</button>':"")+"</div>"}).join("");
 box.innerHTML=h?'<div class="nlab">📌 Pinned</div>'+h:""}
function renderOrg(){var b=$("nOrg");if(!b)return;var has=false;try{has=!!sessionStorage.getItem("pin")}catch(e){}
 if(!has){b.innerHTML="";return}var on=org();
 b.innerHTML='<div class="norg"><span>🛠 <b>Organize</b> '+(on?"is on: tap ⋮ on a file to pin it, move it to a subject or archive it":"is hidden")+'</span><button type="button" id="nOrgT">'+(on?"Hide":"Show")+"</button></div>"}
function refreshAll(){renderPins();renderOrg();var sn=$("sn");if(sn&&!sn.classList.contains("hidden"))render()}
function rebuildStrip(){var b=$("nStripBox");if(!b)return;b.innerHTML=stripBox();autoScroll(document.querySelector(".nstrip"))}
// ----- ORGANIZE MENU (only after the admin PIN was typed in this browser tab) -----
var menuEl=null;
function closeMenu(){if(menuEl){menuEl.remove();menuEl=null}}
function fileOf(p){return FILES.filter(function(f){return f.p===p})[0]}
function labelOf(id){var c=ALL.filter(function(x){return x.id===id})[0];return c?c.label:""}
function metaSet(p,patch){   // shows the change at once, then saves it in the sheet; if saving fails the change is undone
 var old=META[p]?JSON.parse(JSON.stringify(META[p])):null,cur=META[p]||(META[p]={});
 Object.keys(patch).forEach(function(k){cur[k]=patch[k]});
 if(Object.keys(cur).every(function(k){return cur[k]===""||cur[k]==null}))delete META[p];
 if(p.indexOf("__")===0){buildAll();FILES.forEach(eff)}else{var f=fileOf(p);if(f)eff(f)}rebuildStrip();refreshAll();
 var pin="";try{pin=sessionStorage.getItem("pin")||""}catch(e){}
 return fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"meta",pin:pin,path:p,set:patch})}).then(function(r){return r.json()}).then(function(r){
  if(r&&r.ok){try{localStorage.setItem("notesMeta",JSON.stringify(META))}catch(e){}return}
  throw new Error(r&&r.error==="pin"?"the admin PIN is wrong":r&&r.error==="action"?"the Apps Script does not have the organize part yet (Code-meta.gs)":(r&&r.error)||"no answer")
 }).catch(function(e){
  if(old)META[p]=old;else delete META[p];if(p.indexOf("__")===0){buildAll();FILES.forEach(eff)}else{var ff=fileOf(p);if(ff)eff(ff)}
  if(/PIN/.test(e.message)){try{sessionStorage.removeItem("pin")}catch(x){}}
  rebuildStrip();refreshAll();alert("Could not save: "+(e&&e.message||e))})}
function openMenu(btn){
 var p=btn.getAttribute("data-mp"),f=fileOf(p);if(!f)return;closeMenu();
 var m=document.createElement("div");m.className="nmenu";menuEl=m;
 function main(){m.innerHTML='<span class="mh">'+esc(f.nm)+'</span>'+
  '<button type="button" data-a="pin">📌 '+(f.pinned?"Unpin from the front page":"Pin on the front page")+'</button>'+
  '<button type="button" data-a="move">📂 Move to a subject…<small>'+esc(labelOf(f.c))+'</small></button>'+
  '<button type="button" data-a="tabs">🏷️ Tabs…<small>'+esc(f.tg.join(", "))+'</small></button>'+
  '<button type="button" data-a="arc">'+ARCHIVE.icon+" "+(f.ar?"Take out of the "+ARCHIVE.label:"Move to the "+ARCHIVE.label)+"</button>"}
 var tl=[];function tabsMenu(){tl=allTags();m.innerHTML='<span class="mh">Show “'+esc(f.nm)+'” in tab…</span>'+tl.map(function(t,i){var on=f.tg.indexOf(t)>=0;return'<button type="button" data-tg="'+i+'" class="'+(on?"cur":"")+'">🏷️ '+esc(t)+(on?"<small>✓ on</small>":"")+"</button>"}).join("")+'<button type="button" data-a="newtab">➕ New tab…<small>your own name</small></button><button type="button" data-a="back">← Back</button>'}
 function subjects(){m.innerHTML='<span class="mh">Move “'+esc(f.nm)+'” to…</span>'+ALL.map(function(c){return'<button type="button" data-sj="'+c.id+'" class="'+(c.id===f.c?"cur":"")+'">'+c.icon+" "+esc(c.label)+(c.id===f.c?"<small>✓ now</small>":"")+"</button>"}).join("")+'<button type="button" data-sj="">✨ Automatic<small>from the file name</small></button><button type="button" data-a="back">← Back</button>'}
 m.onclick=function(e){var b=e.target.closest("button");if(!b)return;var a=b.getAttribute("data-a"),sj=b.getAttribute("data-sj"),tgi=b.getAttribute("data-tg");
  if(a==="pin"){closeMenu();metaSet(p,{pin:f.pinned?(f.pn?0:""):1})}
  else if(a==="move"){subjects();place()}
  else if(a==="tabs"){tabsMenu();place()}
  else if(a==="newtab"){var nn=cleanTag(prompt("Name of the new tab (for example: Question)")||"");closeMenu();if(nn&&f.tg.indexOf(nn)<0)metaSet(p,{tg:f.tg.concat(nn).join("|")})}
  else if(tgi!==null){closeMenu();var t=tl[+tgi],has=f.tg.indexOf(t)>=0;if(t)metaSet(p,{tg:(has?f.tg.filter(function(x){return x!==t}):f.tg.concat(t)).join("|")})}
  else if(a==="back"){main();place()}
  else if(a==="arc"){closeMenu();metaSet(p,{ar:f.ar?"":1})}
  else if(sj!==null){closeMenu();metaSet(p,{sj:sj})}};
 function place(){var r=btn.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight,x=Math.max(8,Math.min(innerWidth-w-8,r.right-w)),y=r.bottom+4;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-4);m.style.left=x+"px";m.style.top=y+"px"}
 main();document.body.appendChild(m);place()}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-mp]");if(b){e.preventDefault();e.stopPropagation();openMenu(b);return}
 if(e.target.id==="nOrgT"){try{sessionStorage.setItem("orgHide",org()?"1":"0")}catch(x){}refreshAll()}},true);
document.addEventListener("pointerdown",function(e){if(menuEl&&!(e.target.closest&&(e.target.closest(".nmenu")||e.target.closest("[data-mp]"))))closeMenu()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeMenu()});
window.addEventListener("hashchange",function(){setTimeout(refreshAll,0)});window.addEventListener("pageshow",function(){refreshAll()});
// ----- the pin / subject / archive choices of everybody, from the Google Sheet (the saved copy is used first) -----
function fetchMeta(){
 if(typeof SCRIPT_URL==="undefined"||!SCRIPT_URL)return;var c=window.AbortController?new AbortController():null,t=setTimeout(function(){if(c)c.abort()},9000);
 fetch(SCRIPT_URL+"?meta=1",c?{signal:c.signal}:{}).then(function(r){return r.json()}).then(function(d){
  clearTimeout(t);if(!d||!d.ok||!d.items)return;var same=JSON.stringify(d.items)===JSON.stringify(META);META=d.items;
  try{localStorage.setItem("notesMeta",JSON.stringify(META))}catch(e){}
  if(same)return;buildAll();FILES.forEach(eff);rebuildStrip();refreshAll()}).catch(function(){})}
renderPins();renderOrg();fetchMeta();fetchTopics();
$("nSearch").oninput=function(){q=this.value.trim().toLowerCase();render()};
$("nOpen").onclick=function(){if(!curCat){var c=ALL.filter(function(c){return count(c.id)})[0];curCat=c?c.id:CATS[0].id}render();show(["sn"])};
$("nBack").onclick=function(){show(["s1"])};
if(warn){$("nwC").onclick=function(){location.href=A.chromeUrl()};$("nwO").onclick=function(){location.href=A.browserUrl()};$("nwL").onclick=function(){A.copyLink(this)}}
// the full-screen "Open this page in your browser" page also gets the Notes button, so notes can be read without leaving
var gate=document.getElementById("iabGate"),gs=gate&&gate.querySelector("#gateSkip");
if(gs&&gs.parentNode.parentNode){var gb=document.createElement("button");gb.type="button";gb.className="nbtn sm";
 gb.innerHTML='<span class="ni">📚</span><span class="nt2">Notes by utsob 🐱<small>Read your notes here, no browser needed</small></span><span class="na">›</span>';
 gs.parentNode.parentNode.insertBefore(gb,gs.parentNode);
 gb.onclick=function(){try{sessionStorage.setItem("iabSkip","1")}catch(x){}gate.remove();$("nOpen").click()}}
$("nCats").onclick=function(e){var b=e.target.closest("button");if(!b)return;var nc=b.getAttribute("data-c");if(nc!==curCat){curExtra=null;if(!infoForCat(nc).length)curTab="files";if(nc==="__ar")curTab="files"}curCat=nc;curSub=-1;q="";var si=$("nSearch");if(si)si.value="";render()};   // the tab stays (Topics stays Topics) when the subject you open has topics too; a subject without topics opens on Notes
$("nList").onclick=function(e){var b=e.target.closest("button");if(!b)return;var rn=b.getAttribute("data-ren");if(rn){orgAct(rn);return}var t=b.getAttribute("data-t");if(t){curTab=t;render();return}var sv=b.getAttribute("data-s");if(sv===null)return;curSub=+sv;render()};
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
  (function tick(ts){if(!el.isConnected)return;if(!paused){pos+=AUTO_SPEED*(last?Math.min(ts-last,50):16)/16;if(pos>=period)pos-=period;el.scrollLeft=pos}last=ts;requestAnimationFrame(tick)})(0)}}
autoScroll(document.querySelector(".nstrip"));

// ----- PDFs open inside the app (phones/GitHub download PDFs instead of showing them). Other file types open normally. -----
var st2=document.createElement("style");
st2.textContent=".nv{position:fixed;inset:0;z-index:9999;background:#1b1b1b;display:flex;flex-direction:column}.nv.hidden{display:none}.nvh{display:flex;gap:6px;align-items:center;padding:8px;background:#000;color:#fff}.nvh span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.nvh button,.nvh a{padding:8px 12px;border:1px solid #666;border-radius:10px;background:#222;color:#fff;text-decoration:none;font:inherit;font-size:15px;cursor:pointer}.nvb{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior:contain}@media (pointer:coarse){#nvM,#nvP{display:none}}.nvi{width:calc(100% * var(--z,1));margin:0 auto}.nvp{position:relative;background:#fff;margin:0 0 6px;width:100%;contain:layout paint}.nvp canvas{display:block;width:100%;height:auto}#nvD{background:var(--accent2,#8a4dff)!important;border-color:var(--accent2,#8a4dff)!important;font-weight:700}.nvh span{margin-right:2px}.nvopen{cursor:pointer}.nvp:not(.rdy){background:#ececf1}.nvp:not(.rdy)::before{content:'🧸 Page ' attr(data-n) ' · loading…';position:absolute;left:0;right:0;top:30%;text-align:center;color:#7a7a8c;font:600 15px/1.3 system-ui,sans-serif}.nvh button .nl,.nvh a .nl{font-size:15px}.nvmenu{position:fixed;z-index:10002;min-width:210px;background:#2b2540;border:1px solid #666;border-radius:12px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.5)}.nvmenu a{display:block;padding:12px;border-radius:8px;color:#fff;text-decoration:none;font-size:15px}.nvmenu a:active{background:#443a66}.nvmenu a.dis{opacity:.55}@media (max-width:300px){.nvgo .nl{display:none}}.ldsc{position:relative;width:280px;height:92px;margin:0 auto 6px}.ldsc:after{content:'';position:absolute;left:0;right:0;bottom:2px;height:3px;border-radius:2px;background:rgba(255,255,255,.22)}.ldwk{position:absolute;left:0;bottom:5px;animation:ldwk 4s ease-in-out infinite}.ldbb{position:relative;font-size:42px;line-height:1;animation:ldbob .42s ease-in-out infinite alternate}.ldbr{display:inline-block;animation:ldfl 4s steps(1,end) infinite}.ldnt{position:absolute;left:26px;top:-6px;font-size:22px;animation:ldnt 4s ease-in-out infinite}.ldpile{position:absolute;right:6px;bottom:5px;width:44px;height:30px}.ldpile i{position:absolute;left:0;width:44px;height:7px;border-radius:2px;background:#fff;box-shadow:inset 0 -2px 0 rgba(0,0,0,.18);opacity:0}.ldpile i:nth-child(1){bottom:0;animation:ldp1 12s linear infinite}.ldpile i:nth-child(2){bottom:8px;animation:ldp2 12s linear infinite}.ldpile i:nth-child(3){bottom:16px;animation:ldp3 12s linear infinite}@keyframes ldwk{0%{transform:translateX(0)}55%,64%{transform:translateX(170px)}100%{transform:translateX(0)}}@keyframes ldbob{from{transform:translateY(0) rotate(-4deg)}to{transform:translateY(-5px) rotate(4deg)}}@keyframes ldfl{0%,64.9%{transform:scaleX(1)}65%,100%{transform:scaleX(-1)}}@keyframes ldnt{0%{opacity:0;transform:translate(0,0) rotate(0) scale(.3)}6%,55%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}62%{opacity:1;transform:translate(44px,30px) rotate(14deg) scale(.6)}64%,100%{opacity:0;transform:translate(44px,30px) rotate(14deg) scale(.6)}}@keyframes ldp1{0%,20.8%{opacity:0;transform:translateY(-8px)}22%,96%{opacity:1;transform:translateY(0)}99%,100%{opacity:0;transform:translateY(0)}}@keyframes ldp2{0%,54%{opacity:0;transform:translateY(-8px) rotate(-2deg)}55.5%,96%{opacity:1;transform:translateY(0) rotate(-2deg)}99%,100%{opacity:0;transform:translateY(0) rotate(-2deg)}}@keyframes ldp3{0%,87.5%{opacity:0;transform:translateY(-8px) rotate(2deg)}89%,96%{opacity:1;transform:translateY(0) rotate(2deg)}99%,100%{opacity:0;transform:translateY(0) rotate(2deg)}}@media (prefers-reduced-motion:reduce){.ldsc *{animation:none!important}.ldpile i{opacity:1!important}.ldnt{opacity:0}}.nvgo{display:inline-block;margin-top:16px;padding:12px 18px;border-radius:14px;background:var(--accent2,#8a4dff);color:#fff;text-decoration:none;font-size:16px;font-weight:600}.nvl{position:absolute;display:block;cursor:pointer;border-radius:3px}.nvl:hover{background:color-mix(in srgb,var(--accent2,#8a4dff) 18%,transparent)}.nvinfo{background:#2b2540;color:#fff;padding:8px 12px;border-bottom:1px solid #444;font-size:14px;line-height:1.45;cursor:pointer}.nvinfo.hidden{display:none}.nvit{display:flex;align-items:center;gap:8px}.nvit b{flex:1}.nva{font-size:18px;transition:transform .2s}.nvinfo.open .nva{transform:rotate(180deg)}.nvib{max-height:3em;overflow:hidden;-webkit-mask-image:linear-gradient(#000 45%,transparent);mask-image:linear-gradient(#000 45%,transparent)}.nvinfo.open .nvib{max-height:42vh;overflow:auto;-webkit-mask-image:none;mask-image:none}.nvib ul{margin:4px 0 0;padding-left:18px}.nvst{font-weight:700;margin-top:6px}.nvm{color:#fff;padding:20px}.nvm a{color:#9cf}";
document.head.appendChild(st2);
var vOv,vTok=0,vZ=1,vRO;
function loadInfo(n){var s=document.createElement("script");s.src="notes-info.js?v="+(window.__V||Date.now())+(n?"&r="+n:"");s.onload=function(){if(!INFO0&&window.NOTES_INFO&&window.NOTES_INFO.length)INFO0=JSON.parse(JSON.stringify(window.NOTES_INFO));applyTopics();buildSyl();if(!(window.NOTES_INFO||[]).length&&n<3)setTimeout(function(){loadInfo(n+1)},1500)};s.onerror=function(){if(n<3)setTimeout(function(){loadInfo(n+1)},1500)};document.head.appendChild(s)}loadInfo(0);   // text blocks for the viewer (optional file)
/* ===== TOPICS TYPED ON THE WEBSITE =====
   Plain text, one topic per line, 2 spaces = one level deeper ("- " at the start of a line is allowed and ignored). A line that has lines under it becomes a heading.
   A subject that has typed topics shows them INSTEAD of the topics from notes-info.js (its quiz questions and the Complexity tab stay). "Back to original" removes the typed topics. */
function parseTopics(txt){var root={c:[]},st=[{d:-1,n:root}];
 String(txt||"").split(/\r?\n/).forEach(function(line){if(!line.trim())return;var m=/^[ \t]*/.exec(line)[0].replace(/\t/g,"  ").length,t=line.trim().replace(/^[-\u2022*]\s+/,"").trim();if(!t)return;
  var d=Math.floor(m/2);while(st.length>1&&st[st.length-1].d>=d)st.pop();var n={t:t,c:[]};st[st.length-1].n.c.push(n);st.push({d:d,n:n})});
 function conv(l){return l.map(function(n){return n.c.length?{t:n.t,sub:conv(n.c)}:n.t})}return conv(root.c)}
function applyTopics(){if(!INFO0)return;var I=JSON.parse(JSON.stringify(INFO0));
 Object.keys(TOPICS).forEach(function(id){var txt=TOPICS[id],c=ALL.filter(function(x){return x.id===id})[0];if(!txt||!c)return;
  var ob=I.filter(function(e){return!e.tab&&(e.cat===id||(c.keys&&e.keys&&e.keys.some(function(k){return c.keys.some(function(ck){return ck.toLowerCase()===k.toLowerCase()})})))}),first=ob[0],quiz=[];
  ob.forEach(function(e){if(e.quiz)quiz=quiz.concat(e.quiz)});
  var at=first?I.slice(0,I.indexOf(first)).filter(function(e){return ob.indexOf(e)<0}).length:I.length;
  I=I.filter(function(e){return ob.indexOf(e)<0});
  I.splice(at,0,{cat:id,keys:(first&&first.keys)||(c.keys&&c.keys.length?c.keys:undefined),title:c.label+" topics",items:parseTopics(txt),quiz:quiz.length?quiz:undefined})});
 applyTables(I);window.NOTES_INFO=I}
function fetchTopics(){if(typeof SCRIPT_URL==="undefined"||!SCRIPT_URL)return;
 fetch(SCRIPT_URL+"?topics=1").then(function(r){return r.json()}).then(function(d){if(!d||!d.ok||!d.items)return;var same=JSON.stringify(d.items)===JSON.stringify(TOPICS);TOPICS=d.items;CFG=parseCfg(TOPICS.cfg);
  try{localStorage.setItem("notesTopics",JSON.stringify(TOPICS))}catch(e){}if(same)return;applyTopics();buildSyl();buildAll();FILES.forEach(eff);syncSources();refreshAll()}).catch(function(){})}
function topicsText(id){if(TOPICS[id])return TOPICS[id];var bl=infoForCat(id).filter(function(e){return!e.tab&&e.items});
 if(!bl.length)return"";if(bl.length===1)return itemsTxt(bl[0].items,0);return bl.map(function(e){return e.title+"\n"+itemsTxt(e.items,1)}).join("\n")}
function topicsSave(id,txt){var pin="";try{pin=sessionStorage.getItem("pin")||""}catch(e){}
 var old=TOPICS[id];if(txt)TOPICS[id]=txt;else delete TOPICS[id];CFG=parseCfg(TOPICS.cfg);applyTopics();buildSyl();render();
 return fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"topics",pin:pin,subject:id,text:txt})}).then(function(r){return r.json()}).then(function(r){
  if(r&&r.ok){try{localStorage.setItem("notesTopics",JSON.stringify(TOPICS))}catch(e){}return}
  throw new Error(r&&r.error==="pin"?"the admin PIN is wrong":r&&r.error==="action"?"the Apps Script does not have the topics part yet (update Code.gs)":(r&&r.error)||"no answer")
 }).catch(function(e){if(old!==undefined)TOPICS[id]=old;else delete TOPICS[id];CFG=parseCfg(TOPICS.cfg);applyTopics();buildSyl();render();alert("Could not save: "+(e&&e.message||e))})}
function topicEditorText(){var id=curCat,c=ALL.filter(function(x){return x.id===id})[0];if(!c||id==="__ar")return;
 var ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;z-index:10005;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:10px";
 ov.innerHTML='<div style="background:var(--panel,#fff);color:inherit;border-radius:16px;padding:14px;width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 30px rgba(0,0,0,.4)"><b>📝 Topics of “'+esc(c.label)+'”</b><div class="tiny" style="margin:0">One topic per line. Select some lines and press <b>⇥ Indent</b> to put them under the line above. A line with lines under it becomes a heading.</div><textarea id="teTx" spellcheck="false" style="width:100%;flex:1;min-height:45vh;font:inherit;font-size:15px;line-height:1.5;padding:8px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;box-sizing:border-box"></textarea><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="s" data-te="sec">➕ Section</button><button type="button" class="s" data-te="sub">➕ Under this line</button><button type="button" class="s" data-te="in">⇥ Indent</button><button type="button" class="s" data-te="out">⇤ Outdent</button><button type="button" class="p" data-te="save">💾 Save</button><button type="button" class="s" data-te="cancel">Cancel</button><button type="button" class="s" data-te="reset">↺ Back to original</button></div></div>';
 var ta=ov.querySelector("#teTx");ta.value=topicsText(id);document.body.appendChild(ov);
 function lines(f){var v=ta.value,s0=ta.selectionStart,e0=ta.selectionEnd;if(e0>s0&&v.charAt(e0-1)==="\n")e0--;var a=v.lastIndexOf("\n",s0-1)+1,b=v.indexOf("\n",e0);if(b<0)b=v.length;
  var blk=v.slice(a,b).split("\n").map(f).join("\n");ta.value=v.slice(0,a)+blk+v.slice(b);ta.selectionStart=a;ta.selectionEnd=a+blk.length;ta.focus()}
 function addLine(child){   // new line after the section the cursor is in (child=false) or as the last item under the cursor line (child=true); the new text is selected, just type
  var v=ta.value,L=v.split("\n"),idx=v.slice(0,ta.selectionStart).split("\n").length-1;function ind(l){return/^ */.exec(l)[0].length}
  if(!v.trim()){ta.value="New section";ta.setSelectionRange(0,11);ta.focus();return}
  var base=child?ind(L[idx]):0,j=idx+1;while(j<L.length&&(!L[j].trim()||ind(L[j])>base))j++;while(j>idx+1&&!L[j-1].trim())j--;
  var sp=child?ind(L[idx])+2:0,txt=child?"New item":"New section",pad=new Array(sp+1).join(" ");L.splice(j,0,pad+txt);
  var off=0;for(var i=0;i<j;i++)off+=L[i].length+1;ta.value=L.join("\n");ta.setSelectionRange(off+sp,off+sp+txt.length);ta.focus()}
 ov.onclick=function(e){var b=e.target.closest("button"),a=b&&b.getAttribute("data-te");if(!a)return;
  if(a==="sec"||a==="sub")addLine(a==="sub");
  else if(a==="in")lines(function(l){return l.trim()?"  "+l:l});
  else if(a==="out")lines(function(l){return l.replace(/^( {1,2}|\t)/,"")});
  else if(a==="cancel")ov.remove();
  else if(a==="save"){var t=ta.value.trim();if(!t&&!confirm("The box is empty: go back to the original topics?"))return;ov.remove();topicsSave(id,t)}
  else if(a==="reset"){if(!confirm("Go back to the original topics of this subject?"))return;ov.remove();topicsSave(id,"")}}}
/* ===== VISUAL EDITOR (only after the admin PIN was typed): topics tree, table, subject name/icon/colour/order, links, Drive folder import =====
   Saved in the Google Sheet tab "Topics" (no new Apps Script part needed for this):
     <subject>        topics text (as before)        <subject>_tbl  the table (JSON)        cfg  names/icons/colours/order/links/folders (JSON)
   Drive folder import needs Code-folders.gs (see README-folders.txt). */
function parseCfg(s){try{var o=JSON.parse(s||"{}");return o&&typeof o==="object"?o:{}}catch(e){return{}}}
function jcopy(o){return JSON.parse(JSON.stringify(o))}
function hostOf(u){try{return new URL(u).hostname.replace(/^www\./,"")}catch(e){return u}}
function driveId(u){var m=/^https?:\/\/(?:drive|docs)\.google\.com\/.*?(?:\/folders\/|\/file\/d\/|\/d\/|[?&]id=)([\w-]{15,})/i.exec(String(u||""));return m?m[1]:""}
function hasLk(id){return((CFG.lk||{})[id]||[]).length||((CFG.src||{})[id]||[]).length}
function applyOrder(){var o=(CFG&&CFG.ord)||[];if(!o.length)return;
 var oth=ALL.filter(function(c){return c.id===OTHERS.id}),rest=ALL.filter(function(c){return c.id!==OTHERS.id}).map(function(c,i){var k=o.indexOf(c.id);return{c:c,k:k<0?1000+i:k}}).sort(function(a,b){return a.k-b.k}).map(function(x){return x.c});
 ALL=rest.concat(oth)}
function cxLabel(ci){var t=ci.filter(function(e){return e.tab})[0];return String(t&&t.lbl?t.lbl:"Complexity").slice(0,18)}
function sortFiles(){FILES.sort(function(a,b){function k(f){return hp(f)?f.pr:hl(f.p)?1:1e9}return(k(a)-k(b))||(hp(b)-hp(a))||(b.t-a.t)})}
function cfgSave(mut){var n=jcopy(CFG||{});n.st=n.st||{};n.lk=n.lk||{};n.src=n.src||{};mut(n);var j=JSON.stringify(n);
 if(j.length>19000){alert("Too much custom data (limit reached). Remove some links first.");return Promise.resolve()}
 var p=topicsSave("cfg",j);buildAll();FILES.forEach(eff);syncSources();refreshAll();return p}

/* ----- small pop-up helper ----- */
function modal(h,on){var ov=document.createElement("div");ov.className="edmo";ov.innerHTML='<div class="edbx">'+h+"</div>";document.body.appendChild(ov);
 ov.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-m]");if(!b)return;var a=b.getAttribute("data-m");if(a==="x"){ov.remove();return}on(a,ov,b)});return ov}

/* ----- subject: name, icon, colour (and a link when creating) ----- */
var EMO=["📘","📕","📗","🧮","☕","⚡","⚖️","➗","🧪","🧬","🌍","💻","📐","🎨","📜","🧠","🗂️","⭐"];
function addLinkTo(n,sid,u){var d=driveId(u);if(d){var L=n.src[sid]=n.src[sid]||[];if(!L.some(function(x){return x.id===d}))L.push({id:d,u:u,t:"Drive folder"})}
 else{(n.lk[sid]=n.lk[sid]||[]).push({u:u,t:hostOf(u),i:"🔗"})}}
function subjDlg(c){var isNew=!c,ic=isNew?"📘":c.icon,nm=isNew?"":c.label,co=isNew?"":(c.co||""),ks=(c&&c.custom)?(c.keys||[]).join(", "):"",hasSt=!isNew&&(CFG.st||{})[c.id];
 var ov=modal('<b>'+(isNew?"➕ New subject":"✏️ Edit “"+esc(c.label)+"”")+'</b>'+
  '<label>Name<input id="edN" class="edin" maxlength="24" value="'+esc(nm)+'" placeholder="Example: Physics"></label>'+
  '<label>Icon<input id="edI" class="edin" maxlength="6" value="'+esc(ic)+'"></label><div class="edemo">'+EMO.map(function(e){return'<button type="button" data-m="emo" data-e="'+e+'">'+e+"</button>"}).join("")+"</div>"+
  '<label>Colour <input id="edC" type="color" value="'+(co||"#8a4dff")+'"><span style="font-weight:400"><input type="checkbox" id="edC0"'+(co?"":" checked")+'> default colour</span></label>'+
  ((isNew||c.custom)?'<label>Words in file names that belong here (optional, comma separated)<input id="edK" class="edin" value="'+esc(ks)+'" placeholder="phy, physics"></label>':"")+(!isNew&&!c.custom&&c.id!==OTHERS.id?'<label>Extra words to find in file names (optional, comma separated)<input id="edX" class="edin" value="'+esc((((CFG.st||{})[c.id]||{}).k||[]).join(", "))+'" placeholder="'+esc((c.keys||[]).join(", "))+'"></label><div class="tiny">Already found: '+esc((c.keys||[]).join(", "))+"</div>":"")+
  (isNew?'<label>Link (optional): a Drive folder imports its files, any other link becomes a button<input id="edU" class="edin" inputmode="url" placeholder="https://drive.google.com/drive/folders/…"></label>':"")+
  '<div class="edfoot"><button type="button" class="p" data-m="ok">💾 Save</button><button type="button" class="s" data-m="x">Cancel</button>'+(hasSt?'<button type="button" class="s" data-m="rs">↺ Default look</button>':"")+"</div>",
 function(a,ov,b){var g=function(i){return ov.querySelector("#"+i)};
  if(a==="emo"){g("edI").value=b.getAttribute("data-e");return}
  if(a==="rs"){ov.remove();cfgSave(function(n){delete n.st[c.id]});return}
  if(a!=="ok")return;
  var nm2=cleanTag(g("edN").value);if(!nm2){alert("Please type a name.");return}
  var ic2=(g("edI").value||"").replace(/\|/g,"").trim().slice(0,6)||"📘",co2=g("edC0").checked?"":g("edC").value,
   ks2=g("edK")?g("edK").value.split(",").map(function(k){return cleanTag(k).toLowerCase()}).filter(Boolean).slice(0,6):[],u=g("edU")?g("edU").value.trim():"";
  if(u&&!/^https?:\/\//i.test(u)){alert("The link must start with https://");return}
  ov.remove();
  if(isNew){var id="c"+Math.random().toString(36).slice(2,8);
   metaSet("__subj:"+id,{tg:[ic2,nm2].concat(ks2).join("|")}).then(function(){if(!ALL.some(function(x){return x.id===id}))return;
    if(co2||u)cfgSave(function(n){if(co2)n.st[id]={c:co2};if(u)addLinkTo(n,id,u)});
    curCat=id;curTab="files";curSub=-1;render()})}
  else{if(c.custom)metaSet("__subj:"+c.id,{tg:[ic2,nm2].concat(ks2).join("|")});
   var kx=g("edX")?g("edX").value.split(",").map(function(k){return cleanTag(k).toLowerCase()}).filter(Boolean).slice(0,12):[];cfgSave(function(n){n.st[c.id]={i:ic2,n:nm2,c:co2};if(kx.length)n.st[c.id].k=kx})}});
 ov.querySelector("#edC").oninput=function(){ov.querySelector("#edC0").checked=false}}

/* ----- reorder subjects ----- */
function ordDlg(){var ids=ALL.filter(function(c){return c.id!==OTHERS.id}).map(function(c){return c.id});
 function draw(){ov.querySelector("#edOl").innerHTML=ids.map(function(id,i){var c=ALL.filter(function(x){return x.id===id})[0];return'<div class="edor"><span>'+c.icon+" "+esc(c.label)+'</span><button type="button" class="edb" data-m="u:'+i+'">↑</button><button type="button" class="edb" data-m="d:'+i+'">↓</button></div>'}).join("")}
 var ov=modal('<b>↕ Reorder subjects</b><div class="tiny">Use the arrows. “Others” and “Archive” always stay at the end.</div><div id="edOl"></div><div class="edfoot"><button type="button" class="p" data-m="ok">💾 Save</button><button type="button" class="s" data-m="x">Cancel</button><button type="button" class="s" data-m="rs">↺ Original order</button></div>',function(a,ov){
  var p=a.split(":"),i=+p[1];
  if(p[0]==="u"&&i>0){ids.splice(i-1,0,ids.splice(i,1)[0]);draw()}
  else if(p[0]==="d"&&i<ids.length-1){ids.splice(i+1,0,ids.splice(i,1)[0]);draw()}
  else if(a==="ok"){ov.remove();cfgSave(function(n){n.ord=ids})}
  else if(a==="rs"){ov.remove();cfgSave(function(n){delete n.ord})}});draw()}

/* ----- links (buttons) and Drive folders of a subject ----- */
function linksHtml(id){var L=((CFG.lk||{})[id]||[]).filter(function(l){return/^https?:\/\//i.test(l.u)}),S=(CFG.src||{})[id]||[],o=org();if(!L.length&&!(o&&S.length))return"";
 var h=L.map(function(l,i){return'<span class="nlkw"><a class="nlk" target="_blank" rel="noopener" href="'+esc(l.u)+'">'+esc(l.i||"🔗")+" "+esc(l.t)+"</a>"+(o?'<button type="button" class="nlkb" data-ren="lkE:'+i+'" title="Edit">✏️</button><button type="button" class="nlkb" data-ren="lkD:'+i+'" title="Remove">🗑</button>':"")+"</span>"}).join("");
 var s=o?S.map(function(x,i){return'<div class="tiny nsrc">📥 <a href="'+esc(x.u||"#")+'" target="_blank" rel="noopener">'+esc(x.t||"Drive folder")+"</a> · "+esc(IMP_ST[x.id]||"loading…")+' <button type="button" class="nlkb" data-ren="srcT:'+i+'" title="Make a tab for each sub-folder">🏷️ Sub-folder tabs: '+(x.at?"ON":"off")+'</button><button type="button" class="nlkb" data-ren="srcN:'+i+'" title="Put files in subjects or tabs by their file name">🔤 Sort by name: '+["off","into subjects","into tabs"][x.an||0]+'</button><button type="button" class="nlkb" data-ren="srcR:'+i+'" title="Reload">🔄</button><button type="button" class="nlkb" data-ren="srcD:'+i+'" title="Stop importing">🗑</button></div>'}).join(""):"";
 return(h?'<div class="nlks">'+h+"</div>":"")+s}
function linkDlg(ei){var id=curCat,c=ALL.filter(function(x){return x.id===id})[0];if(!c||id==="__ar")return;var cur=ei!=null?((CFG.lk||{})[id]||[])[ei]:null;
 var ov=modal('<b>🔗 '+(cur?"Edit link":"Add a link to “"+esc(c.label)+"”")+'</b>'+
  '<label>Link (https://…)<input id="lkU" class="edin" inputmode="url" value="'+esc(cur?cur.u:"")+'" placeholder="https://drive.google.com/drive/folders/…"></label>'+
  '<label>Button name (optional)<input id="lkT" class="edin" maxlength="40" value="'+esc(cur?cur.t:"")+'"></label>'+
  '<label>Icon<input id="lkI" class="edin" maxlength="6" value="'+esc(cur?cur.i||"🔗":"🔗")+'"></label>'+
  '<div class="tiny"><b>Save as button</b> = a button that opens the link (works for any link).<br><b>Import</b> = a public Google Drive folder/file: its PDFs appear as normal notes in this subject (needs Code-folders.gs in your Apps Script).</div>'+
  '<div class="edfoot"><button type="button" class="p" data-m="btn">🔗 Save as button</button>'+(cur?"":'<button type="button" class="s" data-m="imp">📥 Import Drive folder / file</button>')+'<button type="button" class="s" data-m="x">Cancel</button></div>',
 function(a,ov){var u=ov.querySelector("#lkU").value.trim(),t=ov.querySelector("#lkT").value.trim().slice(0,40),i=ov.querySelector("#lkI").value.trim().slice(0,6)||"🔗";
  if(!/^https?:\/\//i.test(u)){alert("Please paste a full link starting with https://");return}
  if(a==="imp"){var d=driveId(u);if(!d){alert("That is not a Google Drive folder/file link. Use “Save as button” instead.");return}
   ov.remove();cfgSave(function(n){var L=n.src[id]=n.src[id]||[];if(!L.some(function(x){return x.id===d}))L.push({id:d,u:u,t:t||"Drive folder"})});return}
  ov.remove();cfgSave(function(n){var L=n.lk[id]=n.lk[id]||[],o={u:u,t:t||hostOf(u),i:i};if(cur)L[ei]=o;else L.push(o)})})}
function lkAct(a){var p=a.split(":"),op=p[0],i=+p[1],id=curCat;
 if(op==="lkE")linkDlg(i);
 else if(op==="lkD"){if(confirm("Remove this link?"))cfgSave(function(n){(n.lk[id]||[]).splice(i,1)})}
 else if(op==="srcD"){if(confirm("Stop importing this folder? (Nothing is deleted from Drive.)"))cfgSave(function(n){(n.src[id]||[]).splice(i,1)})}
 else if(op==="srcT"){var s0=((CFG.src||{})[id]||[])[i];if(!s0)return;var on=s0.at?0:1,k0=id+"|"+s0.id;cfgSave(function(n){var z=(n.src[id]||[])[i];if(z){if(on)z.at=1;else delete z.at}});FILES.forEach(function(f){if(f.fk===k0)f.at=on});FILES.forEach(eff);refreshAll()}
 else if(op==="srcN"){var s1=((CFG.src||{})[id]||[])[i];if(!s1)return;var nv=((+s1.an||0)+1)%3,k1=id+"|"+s1.id;cfgSave(function(n){var z=(n.src[id]||[])[i];if(z){if(nv)z.an=nv;else delete z.an}});FILES.forEach(function(f){if(f.fk===k1)f.an=nv});FILES.forEach(eff);refreshAll()}
 else if(op==="srcR"){var s=((CFG.src||{})[id]||[])[i];if(!s)return;var k=id+"|"+s.id;try{localStorage.removeItem("notesImp:"+s.id)}catch(e){}
  FILES=FILES.filter(function(f){return f.fk!==k});IMP_ST[s.id]="loading…";impLoad({sid:id,id:s.id,t:s.t,at:s.at,an:s.an},k);refreshAll()}}

/* ----- Drive folders imported as notes (Apps Script: ?folder=ID lists the files, ?dfile=ID sends one file) ----- */
var IMP_ST={},IMPQ={};
function syncSources(){var want={};Object.keys((CFG&&CFG.src)||{}).forEach(function(sid){(CFG.src[sid]||[]).forEach(function(s){if(s&&s.id)want[sid+"|"+s.id]={sid:sid,id:s.id,t:s.t,at:s.at,an:s.an}})});
 var n0=FILES.length;FILES=FILES.filter(function(f){return!f.fk||want[f.fk]});
 Object.keys(want).forEach(function(k){if(!FILES.some(function(f){return f.fk===k})&&!IMPQ[k]&&!IMP_ST[want[k].id])impLoad(want[k],k)});
 if(FILES.length!==n0){FILES.forEach(eff);rebuildStrip();renderPins();refreshAll()}}
function impAdd(w,k,list){FILES=FILES.filter(function(f){return f.fk!==k});
 (list||[]).forEach(function(x){var f={p:"Drive/"+x.p,id:x.id,t:x.t||0,s:x.s||0,m:x.m,x:1,fk:k,fc:w.sid,at:w.at?1:0,an:+w.an||0},pn=parseName(f.p);f.nm=pn.nm;f.pr=pn.pr;f.sj=pn.sj;f.pn=pn.pn;f.c=catFor(f);FILES.push(f)});
 sortFiles();FILES.forEach(eff);rebuildStrip();renderPins();refreshAll()}
function impLoad(w,k){IMPQ[k]=1;
 try{var ca=JSON.parse(localStorage.getItem("notesImp:"+w.id)||"null");if(ca&&ca.files){impAdd(w,k,ca.files);IMP_ST[w.id]=ca.files.length+" files (saved copy)"}}catch(e){}
 if(typeof SCRIPT_URL==="undefined"||!SCRIPT_URL){IMPQ[k]=0;return}
 var ct=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ct)ct.abort()},30000);
 fetch(SCRIPT_URL+"?folder="+encodeURIComponent(w.id),ct?{signal:ct.signal}:{}).then(function(r){return r.json()}).then(function(r){clearTimeout(tm);IMPQ[k]=0;
  if(!r||!r.ok){IMP_ST[w.id]=r&&r.error==="private"?"⚠️ not shared as “anyone with the link”":(r&&r.error)?"⚠️ "+r.error:"⚠️ Apps Script has no folder part yet (Code-folders.gs)";refreshAll();return}
  try{localStorage.setItem("notesImp:"+w.id,JSON.stringify({files:r.files}))}catch(e){}
  impAdd(w,k,r.files);IMP_ST[w.id]=r.files.length+" files";refreshAll()}).catch(function(){clearTimeout(tm);IMPQ[k]=0;if(!IMP_ST[w.id])IMP_ST[w.id]="⚠️ could not load (offline or Apps Script not updated)";refreshAll()})}

/* ----- the visual topics editor: edit inside the real topics look ----- */
var ED=null;
function parseTree(txt){var root={c:[]},st=[{d:-1,n:root}];
 String(txt||"").split(/\r?\n/).forEach(function(line){if(!line.trim())return;var m=/^[ \t]*/.exec(line)[0].replace(/\t/g,"  ").length,t=line.trim().replace(/^[-\u2022*]\s+/,"").trim();if(!t)return;
  var d=Math.floor(m/2);while(st.length>1&&st[st.length-1].d>=d)st.pop();var n={t:t,c:[]};st[st.length-1].n.c.push(n);st.push({d:d,n:n})});return root.c}
function trTxt(a,d){var out=[],pad=new Array(d*2+1).join(" ");
 a.forEach(function(n){var t=String(n.t||"").replace(/\s+/g," ").trim();if(!t){if(n.c.length){var s0=trTxt(n.c,d);if(s0)out.push(s0)}return}out.push(pad+t);if(n.c.length){var s=trTxt(n.c,d+1);if(s)out.push(s)}});return out.join("\n")}
function edTable(id){var b=infoForCat(id).filter(function(e){return e.tab&&e.table})[0];
 if(b)return{title:b.title||"Table",note:b.note||"",head:(b.head||["Name","Time complexity"]).slice(),rows:jcopy(b.table)};
 return{title:"Table",note:"",head:["Name","Value"],rows:[]}}
function edStart(){var id=curCat,c=ALL.filter(function(x){return x.id===id})[0];if(!c||id==="__ar")return;
 var t=parseTree(topicsText(id));ED={id:id,tab:"t",W:t,t0:trTxt(parseTree(topicsText(id)),0),T:edTable(id),tdirty:false,sel:null};curTab="syl";curSub=-1;q="";var si=$("nSearch");if(si)si.value="";render()}
function edDirty(){return ED&&(trTxt(ED.W,0)!==ED.t0||ED.tdirty)}
function edList(p){var l=ED.W;p.forEach(function(j){l=l[j].c});return l}
function edAt(k){var p=String(k).split(".").map(Number),i=p.pop(),l=edList(p);return{list:l,i:i,node:l[i],par:p}}
function trHtml(a,path,d){return a.map(function(n,i){var p=path.concat(i),k=p.join("."),sel=ED.sel===k,hd=n.c.length>0;
 return'<li class="'+(hd?"ntp ntd"+Math.min(d,2):"")+(sel?" sel":"")+'"><span class="'+(hd?"ntt ":"")+'edt" contenteditable="plaintext-only" spellcheck="false" data-k="'+k+'">'+esc(n.t)+"</span>"+
  '<div class="edc"><button type="button" class="edb" data-ed="up:'+k+'">↑ Up</button><button type="button" class="edb" data-ed="dn:'+k+'">↓ Down</button><button type="button" class="edb" data-ed="out:'+k+'">← Out</button><button type="button" class="edb" data-ed="in:'+k+'">→ In</button><button type="button" class="edb" data-ed="add:'+k+'">＋ Below</button><button type="button" class="edb" data-ed="sub:'+k+'">＋ Inside</button><button type="button" class="edb" data-ed="del:'+k+'">🗑</button></div>'+
  (hd?'<ul class="nsb">'+trHtml(n.c,p,d+1)+"</ul>":"")+"</li>"}).join("")}
function tblHtml(){var T=ED.T,h='<div class="edtb"><label>Table title<input class="edin" data-tf="title" value="'+esc(T.title)+'"></label><label>Note under the title (optional)<input class="edin" data-tf="note" value="'+esc(T.note)+'"></label>';
 h+='<div class="ntwrap"><table class="ntbl"><tr>'+T.head.map(function(x,j){return'<th><input class="edin edth" data-th="'+j+'" value="'+esc(x)+'"></th>'}).join("")+"<th></th></tr>";
 T.rows.forEach(function(r,i){var ctl='<td class="edrc"><button type="button" class="edb" data-ed="ru:'+i+'">↑</button><button type="button" class="edb" data-ed="rd:'+i+'">↓</button><button type="button" class="edb" data-ed="rx:'+i+'">🗑</button></td>';
  if(Array.isArray(r))h+="<tr>"+T.head.map(function(_,j){return'<td><input class="edin" data-tc="'+i+"."+j+'" value="'+esc(r[j]==null?"":r[j])+'"></td>'}).join("")+ctl+"</tr>";
  else h+='<tr class="nth"><td colspan="'+T.head.length+'"><input class="edin" data-tc="'+i+'.0" value="'+esc(r.h||"")+'" placeholder="Heading row"></td>'+ctl+"</tr>"});
 return h+'</table></div><div class="edfoot"><button type="button" class="edb" data-ed="tadd">＋ Row</button><button type="button" class="edb" data-ed="thd">＋ Heading row</button><button type="button" class="edb" data-ed="tcol">＋ Column</button><button type="button" class="edb" data-ed="tdc">− Last column</button></div></div>'}
function edHtml(){var c=ALL.filter(function(x){return x.id===ED.id})[0]||{label:""};
 var body=ED.tab==="t"?'<div class="tiny edhelp">Tap any line to type in it. Buttons appear under the line you tapped. <b>Enter</b> = new line below · <b>Tab</b> / <b>Shift+Tab</b> = move in / out · a line with lines inside it becomes a heading.</div><div class="nsyl nsylbx"><b>📋 '+esc(c.label)+' topics</b>'+(ED.W.length?"<ul>"+trHtml(ED.W,[],0)+"</ul>":'<p class="note">No topics yet. Press “＋ Add section”.</p>')+'</div><div class="edfoot"><button type="button" class="edb" data-ed="addsec">＋ Add section</button></div>':tblHtml();
 return'<div class="edbar"><b>✏️ Editing '+esc(c.label)+'</b><button type="button" class="p" data-ed="save">💾 Save</button><button type="button" class="s" data-ed="cancel">✖ Cancel</button></div>'+
  '<div class="ntabs"><button type="button" data-ed="tab:t" class="'+(ED.tab==="t"?"on":"")+'">📋 Topics</button><button type="button" data-ed="tab:x" class="'+(ED.tab==="x"?"on":"")+'">⏱️ Table</button></div>'+body+
  '<div class="edfoot"><button type="button" class="s" data-ed="text">📄 Text mode</button><button type="button" class="s" data-ed="reset">↺ Back to original</button></div>'}
function edRender(fk){var y=window.pageYOffset;$("nList").innerHTML=edHtml();window.scrollTo(0,y);
 if(fk){var el=$("nList").querySelector('[data-k="'+fk+'"]');if(el){el.focus();try{var s=window.getSelection(),r=document.createRange();r.selectNodeContents(el);r.collapse(false);s.removeAllRanges();s.addRange(r)}catch(e){}}}}
function edOp(op,k){var r=edAt(k),L=r.list,i=r.i,n=r.node,nk=k;if(!n)return;
 if(op==="up"&&i>0){L.splice(i-1,0,L.splice(i,1)[0]);nk=r.par.concat(i-1).join(".")}
 else if(op==="dn"&&i<L.length-1){L.splice(i+1,0,L.splice(i,1)[0]);nk=r.par.concat(i+1).join(".")}
 else if(op==="in"&&i>0){L.splice(i,1);var pv=L[i-1];pv.c.push(n);nk=r.par.concat(i-1,pv.c.length-1).join(".")}
 else if(op==="out"&&r.par.length){var pk=r.par.slice(),pi=pk.pop(),gl=edList(pk);L.splice(i,1);gl.splice(pi+1,0,n);nk=pk.concat(pi+1).join(".")}
 else if(op==="add"){L.splice(i+1,0,{t:"",c:[]});nk=r.par.concat(i+1).join(".")}
 else if(op==="sub"){n.c.push({t:"",c:[]});nk=k+"."+(n.c.length-1)}
 else if(op==="del"){if(n.c.length&&!confirm("Delete this line and the "+n.c.length+" line(s) inside it?"))return;L.splice(i,1);nk=null}
 else return;
 ED.sel=nk;edRender(nk)}
function edSave(){var id=ED.id,txt=trTxt(ED.W,0),chg=txt!==ED.t0,td=ED.tdirty,T=ED.T;
 if(!txt&&ED.t0&&!confirm("All topics are empty: go back to the original topics?"))return;
 var tj=td?((T.rows.length||T.note.trim())?JSON.stringify({title:T.title.trim()||"Table",note:T.note.trim(),head:T.head,rows:T.rows}):""):"";
 ED=null;var p=Promise.resolve();
 if(chg)p=topicsSave(id,txt);
 if(td)p=p.then(function(){return topicsSave(id+"_tbl",tj)});
 if(!chg&&!td)render()}
function edCancel(){if(edDirty()&&!confirm("Throw away your changes?"))return;ED=null;render()}
$("nList").addEventListener("focusin",function(e){var t=e.target;if(!ED||!t.classList||!t.classList.contains("edt"))return;ED.sel=t.getAttribute("data-k");
 $("nList").querySelectorAll("li.sel").forEach(function(x){x.classList.remove("sel")});var li=t.closest("li");if(li)li.classList.add("sel")});
$("nList").addEventListener("input",function(e){if(!ED)return;var t=e.target;
 if(t.classList.contains("edt")){var r=edAt(t.getAttribute("data-k"));if(r.node)r.node.t=t.textContent.replace(/\s+/g," ")}
 else if(t.hasAttribute("data-tf")){ED.T[t.getAttribute("data-tf")]=t.value;ED.tdirty=true}
 else if(t.hasAttribute("data-th")){ED.T.head[+t.getAttribute("data-th")]=t.value;ED.tdirty=true}
 else if(t.hasAttribute("data-tc")){var a=t.getAttribute("data-tc").split("."),row=ED.T.rows[+a[0]];if(row&&!Array.isArray(row))row.h=t.value;else if(row)row[+a[1]]=t.value;ED.tdirty=true}});
$("nList").addEventListener("keydown",function(e){if(!ED||e.isComposing||!e.target.classList||!e.target.classList.contains("edt"))return;var k=e.target.getAttribute("data-k");
 if(e.key==="Enter"){e.preventDefault();edOp("add",k)}
 else if(e.key==="Tab"){e.preventDefault();edOp(e.shiftKey?"out":"in",k)}
 else if(e.key==="Backspace"&&!e.target.textContent){var r=edAt(k);if(r.node&&!r.node.c.length){e.preventDefault();edOp("del",k)}}});
$("nList").addEventListener("paste",function(e){if(!ED||!e.target.classList||!e.target.classList.contains("edt"))return;e.preventDefault();
 var tx=(e.clipboardData||window.clipboardData).getData("text")||"",ls=tx.split(/\r?\n/).map(function(s){return s.replace(/^\s*[-\u2022*]\s+/,"").trim()}).filter(Boolean);if(!ls.length)return;
 var k=e.target.getAttribute("data-k");document.execCommand("insertText",false,ls[0]);
 if(ls.length>1){var r=edAt(k);r.node.t=e.target.textContent.replace(/\s+/g," ");ls.slice(1).forEach(function(s,j){r.list.splice(r.i+1+j,0,{t:s,c:[]})});ED.sel=r.par.concat(r.i+ls.length-1).join(".");edRender(ED.sel)}});
$("nList").addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-ed]");if(!b||!ED)return;var p=b.getAttribute("data-ed").split(":"),op=p[0],k=p[1],T=ED.T,i=+k;
 if(op==="save"){edSave();return}if(op==="cancel"){edCancel();return}
 if(op==="tab"){ED.tab=k;edRender();return}
 if(op==="addsec"){ED.W.push({t:"",c:[]});ED.sel=String(ED.W.length-1);edRender(ED.sel);return}
 if(op==="text"){if(edDirty()&&!confirm("Leave this editor? Unsaved changes are lost."))return;ED=null;render();topicEditorText();return}
 if(op==="reset"){if(!confirm("Go back to the ORIGINAL topics and table of this subject?"))return;var id=ED.id,hasT=!!TOPICS[id+"_tbl"];ED=null;topicsSave(id,"");if(hasT)topicsSave(id+"_tbl","");return}
 if(/^(up|dn|out|in|add|sub|del)$/.test(op)){edOp(op,k);return}
 if(op==="ru"&&i>0)T.rows.splice(i-1,0,T.rows.splice(i,1)[0]);
 else if(op==="rd"&&i<T.rows.length-1)T.rows.splice(i+1,0,T.rows.splice(i,1)[0]);
 else if(op==="rx"){T.rows.splice(i,1)}
 else if(op==="tadd"){T.rows.push(T.head.map(function(){return""}))}
 else if(op==="thd"){T.rows.push({h:""})}
 else if(op==="tcol"){T.head.push("Column");T.rows.forEach(function(r){if(Array.isArray(r))r.push("")})}
 else if(op==="tdc"){if(T.head.length<2)return;T.head.pop();T.rows.forEach(function(r){if(Array.isArray(r))r.pop()})}
 else return;
 ED.tdirty=true;edRender()});
function applyTables(I){Object.keys(TOPICS).forEach(function(k){if(!/_tbl$/.test(k))return;var id=k.slice(0,-4),c=ALL.filter(function(x){return x.id===id})[0],j;if(!c)return;
 try{j=JSON.parse(TOPICS[k])}catch(e){return}if(!j||!j.rows)return;
 var tb=I.filter(function(e){return e.tab&&(e.cat===id||(c.keys&&e.keys&&e.keys.some(function(kk){return c.keys.some(function(ck){return ck.toLowerCase()===kk.toLowerCase()})})))})[0];
 if(tb){tb.title=j.title||tb.title;tb.note=j.note;tb.head=j.head;tb.table=j.rows;tb.lbl=j.title}
 else I.push({cat:id,keys:(c.keys&&c.keys.length)?c.keys:undefined,tab:"cx",title:j.title||"Table",lbl:j.title||"Table",note:j.note,head:j.head,table:j.rows})})}
var stE=document.createElement("style");stE.textContent=`
.edmo{position:fixed;inset:0;z-index:10005;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:10px}
.edbx{background:var(--panel,#fff);color:inherit;border-radius:16px;padding:14px;width:min(520px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.edbx label{display:flex;flex-direction:column;gap:3px;font-size:13px;font-weight:600}
.edin{font:inherit;font-size:15px;padding:8px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;box-sizing:border-box;width:100%}
.edfoot{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.edemo{display:flex;flex-wrap:wrap;gap:4px}.edemo button{font-size:20px;padding:2px 6px;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer}
.edbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px;margin:0 0 8px;border-radius:12px;background:var(--panel);border:2px solid var(--accent2,#8a4dff)}.edbar b{flex:1;min-width:120px}
.edt{display:inline-block;min-width:60px;max-width:100%;padding:2px 6px;border-radius:6px;outline:1px dashed color-mix(in srgb,var(--accent2,#8a4dff) 55%,transparent);word-break:break-word}
.edt:focus{outline:2px solid var(--accent2,#8a4dff);background:color-mix(in srgb,var(--accent2,#8a4dff) 10%,transparent)}.edt:empty:before{content:"Type here…";opacity:.45}
.edc{display:none;flex-wrap:wrap;gap:4px;margin:4px 0 6px}li.sel>.edc{display:flex}
.edb{padding:5px 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:inherit;font:inherit;font-size:13px;cursor:pointer}
.edor{display:flex;gap:6px;align-items:center;padding:4px 0}.edor span{flex:1}.edrc{white-space:nowrap}.edth{font-weight:700}.edhelp{margin:0 0 8px}.edtb label{display:flex;flex-direction:column;gap:3px;font-size:13px;font-weight:600;margin:0 0 8px}
.ncat[style*="--sc"]{border-color:var(--sc)!important}.ncat.on[style*="--sc"]{background:var(--sc)!important;color:#fff!important}
.nlks{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}.nlkw{display:inline-flex;align-items:center;gap:2px}
.nlk{display:inline-block;padding:8px 12px;border:2px solid var(--accent2,#8a4dff);border-radius:12px;background:var(--panel);color:inherit;text-decoration:none;font-weight:600;font-size:14px}
.nlkb{border:0;background:transparent;font-size:15px;padding:4px;cursor:pointer}.nsrc{margin:0 0 6px}`;
document.head.appendChild(stE);
/* ===== SELECT MANY FILES (admin PIN): tick files, then move / tab / pin / archive them all at once ===== */
var SELMODE=false,SEL={},LISTP=[],ONLYNEW=false;
function selPaths(){return Object.keys(SEL).filter(function(p){return fileOf(p)})}
function bulkBar(){var n=selPaths().length,ar=curCat==="__ar"||curTab==="arch";
 return'<div class="nbulk"><b>☑️ '+n+' selected</b><button type="button" class="edb" data-ren="bk:all">Select all here</button><button type="button" class="edb" data-ren="bk:none">Clear</button>'+
  (n?'<button type="button" class="edb" data-ren="bk:move">📂 Move to subject…</button><button type="button" class="edb" data-ren="bk:tab">🏷️ Add to tab…</button><button type="button" class="edb" data-ren="bk:pin">📌 Pin</button><button type="button" class="edb" data-ren="bk:arc">'+(ar?"↩ Take out of the Archive":"🗄️ Archive")+"</button>":"")+"</div>"}
function bulkRun(fn){var ps=selPaths(),pr=Promise.resolve(),t=document.createElement("div");t.className="nbtoast";document.body.appendChild(t);
 ps.forEach(function(p,i){pr=pr.then(function(){t.textContent="⏳ Saving "+(i+1)+" / "+ps.length+"…";var f=fileOf(p);if(!f)return;var pt=fn(f);return Object.keys(pt).length?metaSet(p,pt):0})});
 return pr.then(function(){t.remove();SEL={};render()},function(){t.remove();render()})}
function bulkAct(a){var op=a.slice(3),y=window.pageYOffset,n=selPaths().length;
 if(op==="all"){LISTP.forEach(function(p){SEL[p]=1});render();window.scrollTo(0,y);return}
 if(op==="none"){SEL={};render();window.scrollTo(0,y);return}
 if(!n)return;
 if(op==="pin"){bulkRun(function(){return{pin:1}});return}
 if(op==="arc"){var un=curCat==="__ar"||curTab==="arch";bulkRun(function(){return{ar:un?"":1}});return}
 if(op==="move"){modal('<b>📂 Move '+n+' file(s) to…</b>'+ALL.map(function(c){return'<button type="button" class="edb edwide" data-m="sj:'+c.id+'">'+c.icon+" "+esc(c.label)+"</button>"}).join("")+'<button type="button" class="edb edwide" data-m="sj:">✨ Automatic (from the file name)</button><div class="edfoot"><button type="button" class="s" data-m="x">Cancel</button></div>',function(a2,ov){ov.remove();var sj=a2.slice(3);bulkRun(function(){return{sj:sj}})});return}
 if(op==="tab"){var tl=allTags();modal('<b>🏷️ Add '+n+' file(s) to tab…</b>'+tl.map(function(t,i){return'<button type="button" class="edb edwide" data-m="tg:'+i+'">🏷️ '+esc(t)+"</button>"}).join("")+'<button type="button" class="edb edwide" data-m="new">➕ New tab…</button><div class="edfoot"><button type="button" class="s" data-m="x">Cancel</button></div>',function(a2,ov){var t=a2==="new"?cleanTag(prompt("Name of the new tab (for example: Question)")||""):tl[+a2.slice(3)];ov.remove();if(!t)return;bulkRun(function(f){return f.tg.indexOf(t)>=0?{}:{tg:f.tg.concat(t).join("|")}})});return}}
$("nList").addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-sel]");if(!b)return;e.preventDefault();var p=b.getAttribute("data-sel"),y=window.pageYOffset;if(SEL[p])delete SEL[p];else SEL[p]=1;render();window.scrollTo(0,y)});
var stB=document.createElement("style");stB.textContent=".nbulk{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px;padding:8px;border:2px solid var(--accent2,#8a4dff);border-radius:12px;position:sticky;top:0;z-index:25;background:var(--panel)}.nbulk b{flex:1 0 100%}.edwide{width:100%;text-align:left;padding:10px}.nfw.ndone{opacity:.55}.nsel{font-size:22px!important;width:36px!important;height:36px!important}.nbtoast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:10010;background:#2b2540;color:#fff;padding:10px 16px;border-radius:99px;font-weight:700}";document.head.appendChild(stB);

function topicEditor(){edStart()}
syncSources();

function buildSyl(){   // front screen, under the Notes button: one button per topics block; tap = Notes screen opens with those topics first
 var d=$("nSyl"),I=window.NOTES_INFO||[];if(!d){setTimeout(buildSyl,500);return}if(!I.length){d.innerHTML="";return}
 var seen={},L=[];I.forEach(function(e,i){var k=String((e.keys||[e.title])[0]).toLowerCase(),j=seen[k];if(j===undefined){seen[k]=L.length;L.push(i)}else if(/topics/i.test(e.title)&&!/topics/i.test(I[L[j]].title))L[j]=i});   // one button per subject (blocks with the same first key share a button; the Notes screen still shows all of them)
 d.innerHTML='<div class="nlab">📋 Topics (tap to open)</div><div class="nsylrow">'+L.map(function(i){return'<button type="button" class="nsylb" data-i="'+i+'">'+esc(String(I[i].title).replace(/\s*topics?\s*$/i,"")||I[i].title)+" <span>›</span></button>"}).join("")+"</div>";
 d.onclick=function(ev){var b=ev.target.closest(".nsylb");if(!b)return;var e=I[+b.getAttribute("data-i")],c=ALL.filter(function(x){return infoForCat(x.id).indexOf(e)>=0})[0];
  curCat=c?c.id:(curCat||CATS[0].id);curExtra=c?null:e;curTab=e.tab||"syl";curSub=-1;render();show(["sn"])}}
/* topics: an item is plain text, or {t:"Heading",sub:[items...]} - sub can hold more headings (any depth). Each depth has its own colour */
function tableHtml(e){var h=e.head||["Name","Time complexity"];
 return(e.note?'<div class="ntnote">'+esc(e.note)+"</div>":"")+'<div class="ntwrap"><table class="ntbl"><tr>'+h.map(function(x){return"<th>"+esc(x)+"</th>"}).join("")+"</tr>"+e.table.map(function(r){
  if(r&&!Array.isArray(r))return'<tr class="nth"><td colspan="'+h.length+'">'+esc(r.h)+"</td></tr>";
  return"<tr>"+r.map(function(c){return"<td>"+esc(c)+"</td>"}).join("")+"</tr>"}).join("")+"</table></div>"}
function bodyHtml(e){return e.table?tableHtml(e):"<ul>"+itemsHtml(e.items)+"</ul>"}
function itemsHtml(a,d){d=d||0;return(a||[]).map(function(t){if(t&&typeof t==="object")return'<li class="ntp ntd'+Math.min(d,2)+'"><span class="ntt">'+esc(t.t||"")+"</span>"+((t.sub&&t.sub.length)?'<ul class="nsb">'+itemsHtml(t.sub,d+1)+"</ul>":"")+"</li>";return"<li>"+esc(t)+"</li>"}).join("")}
/* small copy button for topics: copies the topics as plain text (title, headings, indented items). */
function itemsTxt(a,d){d=d||0;var p=new Array(d+1).join("  ");return(a||[]).map(function(t){if(t&&typeof t==="object")return p+(t.t||"")+((t.sub&&t.sub.length)?"\n"+itemsTxt(t.sub,d+1):"");return p+"- "+t}).join("\n")}
function infoTxt(e){var b=e.table?e.table.map(function(r){return Array.isArray(r)?r.join(": "):(r&&r.h)||""}).join("\n"):itemsTxt(e.items);return(e.title||"")+"\n"+(e.note?e.note+"\n":"")+b}
function cpBtn(attr){return'<button type="button" class="ncp" '+attr+' title="Copy" aria-label="Copy topics">📋 Copy</button>'}
function cpText(txt){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(txt);return new Promise(function(ok,no){var ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-999px;top:0;opacity:0";document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand("copy")?ok():no()}catch(x){no(x)}ta.remove()})}
document.addEventListener("click",function(ev){var b=ev.target.closest&&ev.target.closest(".ncp");if(!b)return;ev.stopPropagation();ev.preventDefault();   // capture phase: the tap must not also open/close the panel or change the list
 var I=window.NOTES_INFO||[],list=b.hasAttribute("data-cpv")?(window.__nvInf||[]):[I[+b.getAttribute("data-cpi")]].filter(Boolean);
 cpText(list.map(infoTxt).join("\n\n")).then(function(){b.textContent="✅ Copied"},function(){b.textContent="⚠️ Failed"}).then(function(){setTimeout(function(){b.textContent="📋 Copy"},1300)})},true);
var stC=document.createElement("style");stC.textContent=".ncp{float:right;margin:0 0 0 8px;padding:1px 8px;font-size:12px;white-space:nowrap;line-height:1.4;border:1px solid var(--accent2,#8a4dff);border-radius:8px;background:transparent;color:inherit;cursor:pointer;opacity:.75}.ncp:hover,.ncp:active{opacity:1}.nvit .ncp{float:none;margin:0;border-color:rgba(255,255,255,.5);color:#fff}";document.head.appendChild(stC);
var stI=document.createElement("style");stI.textContent=".ntp{list-style:none;margin:0}.ntd0{margin:14px 0 4px -18px;padding-top:10px;border-top:1px solid color-mix(in srgb,var(--accent2,#8a4dff) 30%,transparent)}ul>.ntd0:first-child{margin-top:2px;padding-top:0;border-top:0}.ntt{font-weight:700}.ntd0>.ntt{color:var(--accent2,#8a4dff);font-size:1.04em}.ntd1>.ntt{color:#d6339a}.ntd2>.ntt{color:#0a8f7a}.ntd1,.ntd2{margin-top:6px}.nsb{list-style:none;margin:3px 0 2px 3px!important;padding-left:14px!important;border-left:2px solid color-mix(in srgb,var(--accent2,#8a4dff) 35%,transparent)}.nsb .nsb{border-left-color:rgba(214,51,154,.45)}.nsb li{font-size:.95em;padding:1px 0}.nsb li:before{content:'\\203A';color:#ff69b4;font-weight:700;margin-right:7px}.nsb .ntp:before{content:none}.nvib .ntd0{border-top-color:rgba(255,255,255,.25)}.nvib .ntd0>.ntt{color:#c9b3ff}.nvib .ntd1>.ntt{color:#ffb3e1}.nvib .ntd2>.ntt{color:#8fe8d4}.nvib .nsb{border-left-color:rgba(201,179,255,.45)}.nvib .nsb .nsb{border-left-color:rgba(255,179,225,.5)}.nvnav{position:absolute;inset:0;pointer-events:none;z-index:5}.nvpg{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(43,37,64,.92);border:2px solid var(--accent3,#ff9acb);color:#fff;padding:4px 14px;border-radius:99px;font-size:15px;font-weight:700;pointer-events:auto;cursor:pointer;transition:transform .15s,background .15s}.nvpg.nvbig{transform:translateX(-50%) scale(1.25);background:linear-gradient(135deg,#ff86bd,var(--accent2,#8a4dff))}.nvtr{position:absolute;right:0;width:30px;pointer-events:none}.nvth{position:absolute;right:0;width:30px;height:60px;pointer-events:auto;touch-action:none;opacity:.4;transition:opacity .25s}.nvth.on{opacity:1}.nvth{background:url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2030%2060%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%270%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23ff9acb%27%2F%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23b58cff%27%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%27M4%2012%20L5%201%20L14%208%20Z%27%20fill%3D%27url%28%23g%29%27%20stroke%3D%27%23fff%27%20stroke-width%3D%271.5%27%20stroke-linejoin%3D%27round%27%2F%3E%3Cpath%20d%3D%27M26%2012%20L25%201%20L16%208%20Z%27%20fill%3D%27url%28%23g%29%27%20stroke%3D%27%23fff%27%20stroke-width%3D%271.5%27%20stroke-linejoin%3D%27round%27%2F%3E%3Crect%20x%3D%272%27%20y%3D%276%27%20width%3D%2726%27%20height%3D%2752%27%20rx%3D%2713%27%20fill%3D%27url%28%23g%29%27%20stroke%3D%27%23fff%27%20stroke-width%3D%272%27%2F%3E%3Cpath%20d%3D%27M7%2010.5%20L7.6%205%20L12%208.4%20Z%27%20fill%3D%27%23ffd1e6%27%2F%3E%3Cpath%20d%3D%27M23%2010.5%20L22.4%205%20L18%208.4%20Z%27%20fill%3D%27%23ffd1e6%27%2F%3E%3Cellipse%20cx%3D%2710%27%20cy%3D%2725%27%20rx%3D%272.2%27%20ry%3D%273%27%20fill%3D%27%234a2c5a%27%2F%3E%3Cellipse%20cx%3D%2720%27%20cy%3D%2725%27%20rx%3D%272.2%27%20ry%3D%273%27%20fill%3D%27%234a2c5a%27%2F%3E%3Ccircle%20cx%3D%279.3%27%20cy%3D%2723.8%27%20r%3D%27.9%27%20fill%3D%27%23fff%27%2F%3E%3Ccircle%20cx%3D%2719.3%27%20cy%3D%2723.8%27%20r%3D%27.9%27%20fill%3D%27%23fff%27%2F%3E%3Cellipse%20cx%3D%276.3%27%20cy%3D%2731.5%27%20rx%3D%273%27%20ry%3D%272%27%20fill%3D%27%23ff5fa8%27%20opacity%3D%27.6%27%2F%3E%3Cellipse%20cx%3D%2723.7%27%20cy%3D%2731.5%27%20rx%3D%273%27%20ry%3D%272%27%20fill%3D%27%23ff5fa8%27%20opacity%3D%27.6%27%2F%3E%3Cpath%20d%3D%27M12%2031%20Q13.5%2034%2015%2031%20Q16.5%2034%2018%2031%27%20fill%3D%27none%27%20stroke%3D%27%234a2c5a%27%20stroke-width%3D%271.3%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M15%2051%20C9%2047.5%209%2042%2012%2041.5%20C13.5%2041.3%2014.6%2042.2%2015%2043.2%20C15.4%2042.2%2016.5%2041.3%2018%2041.5%20C21%2042%2021%2047.5%2015%2051%20Z%27%20fill%3D%27%23fff%27%20opacity%3D%27.92%27%2F%3E%3C%2Fsvg%3E') no-repeat center/contain;filter:drop-shadow(0 2px 6px color-mix(in srgb,var(--accent3,#ff69b4) 60%,transparent));transition:opacity .25s,transform .2s}.nvth:hover{opacity:1;transform:scale(1.08)}.nvth.on{animation:nvwig .5s ease-in-out infinite alternate}@keyframes nvwig{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}.nvth:after,.nvth:before{content:none!important}.nvtr:before{content:'';position:absolute;right:10px;top:0;bottom:0;width:10px;border-radius:99px;background:color-mix(in srgb,var(--accent3,#ff9acb) 16%,transparent)}.nvb::-webkit-scrollbar:vertical{width:0}.nvb::-webkit-scrollbar:horizontal{height:12px}.nvb::-webkit-scrollbar-track{background:color-mix(in srgb,var(--accent3,#ff9acb) 10%,transparent)}.nvb::-webkit-scrollbar-thumb{background:linear-gradient(90deg,var(--accent3,#ff9acb),#b58cff);border-radius:99px;border:2px solid #1b1b1b}.nvb::-webkit-scrollbar-corner{background:transparent}";document.head.appendChild(stI);
/* mobile fix: bigger Topics panel in the viewer. Portrait: opens tall. Landscape: opens as a left column using the full height. */
var stM=document.createElement("style");stM.textContent=".nvinfo{font-size:16px;line-height:1.5}@media (orientation:portrait){.nv:has(.nvinfo.open) .nvinfo{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;border-bottom:0}.nv:has(.nvinfo.open) .nvb,.nv:has(.nvinfo.open) .nvnav{display:none!important}.nvinfo.open .nvib{max-height:none;overflow:visible}.nvinfo.open .nvit{position:sticky;top:-8px;background:#2b2540;padding:6px 0;margin-top:-8px}}@media (orientation:landscape) and (max-height:600px){.nv{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr)}.nvh{grid-column:1/-1;grid-row:1}.nvinfo{grid-column:1/-1;grid-row:2}.nvb{grid-column:1/-1;grid-row:3;min-height:0}.nv:has(.nvinfo.open){grid-template-columns:42% minmax(0,1fr)}.nv:has(.nvinfo.open) .nvinfo{grid-column:1;grid-row:2/4;overflow:auto;-webkit-overflow-scrolling:touch;border-bottom:0;border-right:1px solid #444}.nv:has(.nvinfo.open) .nvb{grid-column:2;grid-row:2/4}.nvinfo.open .nvib{max-height:none;overflow:visible}}";document.head.appendChild(stM);
var stN=document.createElement("style");stN.textContent="@media (orientation:portrait){.nwrap{flex-direction:column;gap:8px}.ncats{flex:none;width:100%;flex-direction:row;gap:5px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}.ncat{flex:1 1 0;min-width:0;white-space:nowrap;padding:7px 2px;display:flex;flex-direction:column;align-items:center;gap:1px;text-align:center;font-size:12px;line-height:1.25}.ncat .nci{font-size:17px;line-height:1.2}.ncat small{font-size:10px}.nlist{width:100%;max-height:none;overflow:visible}}";document.head.appendChild(stN);
var stS=document.createElement("style");stS.textContent="@media (orientation:landscape){.nwrap{align-items:stretch}.nlist{max-height:none;overflow:visible}}@media (orientation:landscape){#sn:not(.hidden){display:grid;grid-template-columns:30% minmax(0,1fr);column-gap:10px;align-items:stretch}#sn>*{grid-column:1/-1}#sn .nwrap{display:contents}#sn .ncats{grid-column:1;width:auto;flex:none;margin-top:10px}#sn .nlist{grid-column:2;margin-top:10px}}.nhead{display:contents}.nhead button{position:sticky;top:8px;z-index:20;justify-self:start;width:auto;margin:0 10px 6px 0;box-shadow:0 2px 8px rgba(0,0,0,.2)}@media (max-width:900px){.nsb{padding-left:8px!important;margin-left:0!important}.nsb li:before{margin-right:4px}.ntd1,.ntd2{margin-top:4px}}";document.head.appendChild(stS);   // phones: tall topics list + less nesting indent

function infoFor(p){return(window.NOTES_INFO||[]).filter(function(e){return e.keys&&e.keys.length&&rx(e.keys).test(p)})}
/* used by the bear quiz (kawaii-extras.js): which topics are open right now? viewer open = that note's topics; Notes screen open = the chosen subject's topics; else null */
window.__notesCtx=function(){if(vOv&&!vOv.classList.contains("hidden"))return{viewer:true,blocks:window.__nvInf||[],label:($("nvT")||{}).textContent||""};
 var sn=$("sn");if(sn&&!sn.classList.contains("hidden")&&curCat){var ci=infoForCat(curCat);if(curExtra&&ci.indexOf(curExtra)<0)ci=[curExtra].concat(ci);var c=ALL.filter(function(x){return x.id===curCat})[0];return{blocks:ci,label:c?c.label:""}}return null};
var stL=document.createElement("style");stL.textContent=".nsrch{width:100%;box-sizing:border-box;margin:10px 0 0;padding:11px 14px;border:2px solid var(--line);border-radius:14px;background:var(--panel);color:inherit;font:inherit;font-size:15px;outline:0}.nsrch:focus{border-color:var(--accent2,#8a4dff)}.nvld{display:flex;flex-direction:column;align-items:center;gap:6px;padding:48px 16px;color:#fff;text-align:center}.nvld .bb{font-size:56px;line-height:1;animation:nvhp .7s ease-in-out infinite}.nvld .sh{width:36px;height:7px;border-radius:50%;background:rgba(255,255,255,.28);animation:nvsh .7s ease-in-out infinite}.nvld .tx{font-weight:700;font-size:18px;margin-top:10px}.nvld .d{animation:nvdt 1.2s infinite}.nvld .d:nth-child(2){animation-delay:.2s}.nvld .d:nth-child(3){animation-delay:.4s}.nvld .sp{letter-spacing:6px;animation:nvsp 1.6s ease-in-out infinite}.nvld small{opacity:.6;font-size:12px}@keyframes nvhp{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-22px) rotate(6deg)}}@keyframes nvsh{0%,100%{transform:scale(1)}50%{transform:scale(.55);opacity:.5}}@keyframes nvdt{0%,60%,100%{opacity:.2}30%{opacity:1}}@keyframes nvsp{0%,100%{opacity:.35}50%{opacity:1}}";document.head.appendChild(stL);
var stO=document.createElement("style");stO.textContent=".nv .nvinfo.open{position:absolute!important;left:0;right:0;z-index:5;max-height:60vh!important;overflow:auto!important;flex:none!important;border:0!important;border-bottom:3px solid var(--accent2,#8a4dff)!important;box-shadow:0 14px 28px rgba(0,0,0,.55)}.nv:has(.nvinfo.open){grid-template-columns:minmax(0,1fr)!important}.nv:has(.nvinfo.open) .nvb{display:block!important;grid-column:1/-1!important;grid-row:3!important}.nvinfo.open .nvib{max-height:none!important}";document.head.appendChild(stO);   // Topics: opens as a drop-down OVER the file (never squeezes it into a left column)
/* ===== study buddy: tiny bear at the bottom-left edge of the viewer. No timer. Cheers at 25% / 60% / the end, tap it for a cute message. ===== */
var budSeen={},budT=0,BUD_MSG=["Study time! 📖","Drink some water 💧","You're doing great 🌸","One page at a time 🌷","Stretch a little 🧘","I'm proud of you 🧸"];
var stB=document.createElement("style");stB.textContent=".nvbud{position:absolute;left:4px;bottom:4px;z-index:6;display:flex;align-items:center;gap:4px;pointer-events:none}.nvbe{position:relative;pointer-events:auto;cursor:pointer;font-size:20px;line-height:1;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(43,37,64,.75);animation:nvbr 3.2s ease-in-out infinite;-webkit-tap-highlight-color:transparent}.nvbe.hop{animation:nvbh .6s ease}.nvbm{font-size:12px;line-height:1.3;max-width:58vw;padding:4px 9px;border-radius:12px;background:#fff;color:#3a2b5c;opacity:0;transform:translateX(-6px);transition:opacity .25s,transform .25s}.nvbm.on{opacity:1;transform:none}@keyframes nvbr{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}@keyframes nvbh{0%,100%{transform:translateY(0)}30%{transform:translateY(-9px)}60%{transform:translateY(0)}80%{transform:translateY(-3px)}}@media (min-width:700px){.nvbe{font-size:26px;width:38px;height:38px}.nvbm{font-size:14px}}";document.head.appendChild(stB);
function budSay(t,hop){var m=$("nvBm"),e=$("nvBe");if(!m)return;m.textContent=t;m.classList.add("on");clearTimeout(budT);budT=setTimeout(function(){m.classList.remove("on")},3200);
 if(hop){e.classList.remove("hop");void e.offsetWidth;e.classList.add("hop")}}
function budWatch(vb){var bq=0;vb.addEventListener("scroll",function(){if(bq)return;bq=setTimeout(function(){bq=0;bw()},300)},{passive:true});function bw(){var max=vb.scrollHeight-vb.clientHeight;if(max<300)return;var p=vb.scrollTop/max;
 if(p>=.98&&!budSeen.e){budSeen.e=1;budSay("You finished it! 🎉",1)}else if(p>=.6&&!budSeen.m){budSeen.m=1;budSay("Over halfway! 🌷",1)}else if(p>=.25&&!budSeen.q){budSeen.q=1;budSay("Nice start 🍀",1)}}}
function viewer(){if(vOv)return vOv;vOv=document.createElement("div");vOv.className="nv hidden";
 vOv.innerHTML='<div class="nvh"><button type="button" id="nvX">✕<span class="nl"> Close</span></button><span id="nvT"></span><button type="button" id="nvF">⛶<span class="nl"> Full screen</span></button><button type="button" id="nvM">➖</button><button type="button" id="nvP">➕</button><a id="nvOp" class="nvopen" role="button" style="display:none"></a><span style="display:none"><a id="nvO" target="_blank" rel="noopener"></a></span><a id="nvD" download>⬇<span class="nl"> Download</span></a></div><div class="nvinfo hidden" id="nvInfo"></div><div class="nvb" id="nvB"></div><div class="nvnav" id="nvNav" style="display:none"><div class="nvtr" id="nvTr"><div class="nvth" id="nvTh"></div></div><div class="nvpg" id="nvPg"></div></div>';
 vOv.querySelector("#nvInfo").onclick=function(){this.classList.toggle("open")};
 vOv.insertAdjacentHTML("beforeend",'<div class="nvbud"><span class="nvbe" id="nvBe">🧸</span><span class="nvbm" id="nvBm"></span></div>');
 vOv.querySelector("#nvBe").onclick=function(){budSay((window.bearPick&&window.bearPick("study"))||BUD_MSG[Math.floor(Math.random()*BUD_MSG.length)],1)};
 vOv.querySelector("#nvBe").insertAdjacentHTML("afterend",'<span class="askb" id="nvAsk" role="button" title="Chat with the AI bear">💬 Ask AI</span>');vOv.querySelector("#nvAsk").onclick=function(e){e.stopPropagation();if(window.__askOpen)window.__askOpen()};   /* tiny ask badge on the viewer bear */
 document.body.appendChild(vOv);
 $("nvX").onclick=function(){try{if(document.fullscreenElement)document.exitFullscreen().catch(function(){})}catch(x){}$("nvNav").style.display="none";$("nvInfo").className="nvinfo hidden";vTok++;if(vIO)vIO.disconnect();document.documentElement.style.overflow="";vOv.classList.add("hidden");$("nvB").innerHTML=""};
 var vb=$("nvB"),pz=null;budWatch(vb);
 function zoomTo(z,mx,my){var i=$("nvI");if(!i)return;var br=vb.getBoundingClientRect(),cx=br.left+mx,cy=br.top+my,h=i.getBoundingClientRect(),fx=(cx-h.left)/h.width,fy=(cy-h.top)/h.height;   // the point under your fingers stays under your fingers
  vZ=Math.max(.3,Math.min(3,z));i.style.setProperty("--z",vZ);var n=i.getBoundingClientRect();vb.scrollLeft+=n.left+fx*n.width-cx;vb.scrollTop+=n.top+fy*n.height-cy}
 function zoom(f){zoomTo(vZ*f,vb.clientWidth/2,vb.clientHeight/2)}   // keeps the middle of the screen in place
 function dist(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)}
 /* pinch: while two fingers are down the page is moved/scaled with a GPU transform (smooth, follows your fingers: zoom + two-finger drag); real size is applied once when you lift */
 function pzDraw(){var p=pz;if(!p)return;p.raf=0;p.i.style.transform="translate("+(p.cx-p.h.left-p.s*(p.mx-p.h.left))+"px,"+(p.cy-p.h.top-p.s*(p.my-p.h.top))+"px) scale("+p.s+")"}
 function pzEnd(e){var p=pz;if(!p||(e.touches&&e.touches.length>=2))return;pz=null;if(p.raf)cancelAnimationFrame(p.raf);var i=p.i,fx=(p.mx-p.h.left)/p.h.width,fy=(p.my-p.h.top)/p.h.height;
  i.style.transform="";i.style.willChange="";vb.style.overflow="";vb.__pin=0;if(vb.__sc)vb.__sc();
  vZ=Math.max(.3,Math.min(3,p.z*p.s));i.style.setProperty("--z",vZ);var n=i.getBoundingClientRect();
  vb.scrollLeft+=n.left+fx*n.width-p.cx;vb.scrollTop+=n.top+fy*n.height-p.cy}
 vb.addEventListener("touchstart",function(e){if(e.touches.length!==2||pz)return;var i=$("nvI");if(!i)return;var t=e.touches,mx=(t[0].clientX+t[1].clientX)/2,my=(t[0].clientY+t[1].clientY)/2;
  pz={i:i,d:dist(t),z:vZ,s:1,mx:mx,my:my,cx:mx,cy:my,h:i.getBoundingClientRect(),raf:0};vb.__pin=1;document.querySelectorAll("#nvI .nvp").forEach(function(d){if(d.__task){try{d.__task.cancel()}catch(x){}}});vb.style.overflow="hidden";i.style.transformOrigin="0 0";i.style.willChange="transform"},{passive:true});   // overflow hidden = the browser can't scroll by itself while you pinch
 vb.addEventListener("touchmove",function(e){if(!pz||e.touches.length!==2)return;e.preventDefault();var t=e.touches;
  pz.s=Math.max(.3/pz.z,Math.min(3/pz.z,dist(t)/pz.d));pz.cx=(t[0].clientX+t[1].clientX)/2;pz.cy=(t[0].clientY+t[1].clientY)/2;if(!pz.raf)pz.raf=requestAnimationFrame(pzDraw)},{passive:false});
 vb.addEventListener("touchend",pzEnd);vb.addEventListener("touchcancel",pzEnd);
 vb.addEventListener("wheel",function(e){if(!e.ctrlKey)return;e.preventDefault();var r=vb.getBoundingClientRect();zoomTo(vZ*Math.exp(-e.deltaY/300),e.clientX-r.left,e.clientY-r.top)},{passive:false});
 function fsLab(){var x=!!document.fullscreenElement;$("nvF").innerHTML=(x?"🗗":"⛶")+'<span class="nl">'+(x?" Exit full screen":" Full screen")+"</span>"}
 $("nvF").onclick=function(){try{if(document.fullscreenElement)document.exitFullscreen();else goFS()}catch(x){}};
 document.addEventListener("fullscreenchange",fsLab);if(!document.fullscreenEnabled)$("nvF").style.display="none";fsLab();
 $("nvM").onclick=function(){zoom(1/1.25)};$("nvP").onclick=function(){zoom(1.25)};
 document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!vOv.classList.contains("hidden"))$("nvX").click()});
 return vOv}
var vIO=null,vDoc=null;
var stP=document.createElement("style");stP.textContent=".nvth{filter:none}.nvth.on{animation:none}.nvbe{animation:none}.nvbe.hop{animation:nvbh .6s ease}.nvb{overflow-anchor:none}@media (max-width:560px){.nvh{flex-wrap:wrap;gap:4px;padding:6px}.nvh button,.nvh a{padding:6px 8px;font-size:12px;white-space:nowrap;border-radius:8px}.nvh span{order:9;flex:1 1 100%;font-size:11px;opacity:.85;text-align:center}}@media (max-width:350px){.nvh button,.nvh a{padding:5px 6px;font-size:11px}}.nvp{margin:0 0 .5%}";document.head.appendChild(stP);   /* lighter: no always-running animations / shadows */
function undraw(d){d.__want=0;if(d.__task){try{d.__task.cancel()}catch(e){}d.__task=null}var c=d.querySelector("canvas");if(c){c.width=c.height=0}d.textContent="";d.classList.remove("rdy");d.__done=0;d.__lo=0;d.__links=0}   /* frees the page picture (memory) when it is far from the screen */
async function drawPg(doc,d,cw,my,hi){var pg=await doc.getPage(+d.getAttribute("data-n"));if(my!==vTok||!d.__want)return;
 var v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:Math.min(cw*Math.min(window.devicePixelRatio||1,2)*(hi?1.4:.6),1500)/v0.width}),c=document.createElement("canvas");   // hi=false: quick small picture while scrolling; hi=true: sharp picture once scrolling stops
 c.width=Math.round(v.width);c.height=Math.round(v.height);var x=c.getContext("2d",{alpha:false});x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
 var t=pg.render({canvasContext:x,viewport:v});d.__task=t;d.__hiR=hi;
 try{await t.promise}catch(er){c.width=c.height=0;return}
 d.__task=null;if(my!==vTok||!d.__want){c.width=c.height=0;return}
 var old=d.querySelector("canvas");d.appendChild(c);if(old){old.width=old.height=0;old.remove()}d.classList.add("rdy");d.__done=1;d.__lo=hi?0:1;
 if(!d.__links){d.__links=1;try{var an=await pg.getAnnotations();if(my!==vTok||!d.__want)return;   // clickable links of the PDF: laid over the picture
  an.forEach(function(a){if(a.subtype!=="Link"||!a.rect)return;
   var r=v0.convertToViewportRectangle(a.rect),l=document.createElement("a");l.className="nvl";
   l.style.cssText="left:"+Math.min(r[0],r[2])/v0.width*100+"%;top:"+Math.min(r[1],r[3])/v0.height*100+"%;width:"+Math.abs(r[2]-r[0])/v0.width*100+"%;height:"+Math.abs(r[3]-r[1])/v0.height*100+"%";
   if(a.url&&/^(https?:|mailto:)/i.test(a.url)){l.href=a.url;l.target="_blank";l.rel="noopener noreferrer"}
   else if(a.dest){l.href="#";l.onclick=function(e){e.preventDefault();goDest(doc,a.dest,d.parentNode)}}
   else return;
   d.appendChild(l)})}catch(er){}}
 try{pg.cleanup()}catch(er){}}
async function goDest(doc,dest,host){try{if(typeof dest==="string")dest=await doc.getDestination(dest);if(!dest)return;
 var i=(dest[0]&&typeof dest[0]==="object")?await doc.getPageIndex(dest[0]):dest[0],t=host.children[i];if(t)t.scrollIntoView({block:"start"})}catch(e){}}
/* page counter + draggable scroll bar (like a phone PDF viewer): "3 / 120" badge at the bottom (tap it to jump to a page) and a purple handle on the right edge (drag it to scroll fast) */
function setupNav(b,host,N){var nav=$("nvNav"),pg=$("nvPg"),tr=$("nvTr"),th=$("nvTh"),drag=false,raf=0,hideT=0,TH=60;
 nav.style.display="";
 function pageNow(){var h=host.children,lim=b.getBoundingClientRect().top+b.clientHeight*.35,lo=0,hi=h.length-1;while(lo<hi){var m=(lo+hi+1)>>1;if(h[m].getBoundingClientRect().top<=lim)lo=m;else hi=m-1}return lo+1}
 function upd(){raf=0;var max=b.scrollHeight-b.clientHeight;tr.style.top=b.offsetTop+"px";tr.style.height=b.clientHeight+"px";
  th.style.display=max>0?"":"none";th.style.top=Math.round((max>0?b.scrollTop/max:0)*Math.max(0,b.clientHeight-TH))+"px";pg.textContent=pageNow()+" / "+N}
 function poke(){if(!th.classList.contains("on"))th.classList.add("on");clearTimeout(hideT);hideT=setTimeout(function(){if(!drag)th.classList.remove("on")},1400)}
 b.onscroll=function(){if(!raf)raf=requestAnimationFrame(upd);poke();if(b.__sc)b.__sc()};
 if(vRO)vRO.disconnect();vRO=new ResizeObserver(function(){if(!raf)raf=requestAnimationFrame(upd)});vRO.observe(host);vRO.observe(b);
 th.onpointerdown=function(e){drag=true;th.setPointerCapture(e.pointerId);th.classList.add("on");pg.classList.add("nvbig");e.preventDefault()};
 th.onpointermove=function(e){if(!drag)return;var r=tr.getBoundingClientRect(),f=(e.clientY-r.top-TH/2)/Math.max(1,r.height-TH);f=Math.max(0,Math.min(1,f));b.scrollTop=f*(b.scrollHeight-b.clientHeight)};
 th.onpointerup=th.onpointercancel=function(){drag=false;pg.classList.remove("nvbig");poke()};
 pg.onclick=function(){var v=prompt("Go to page (1 - "+N+")",String(pageNow()));if(v===null)return;var n=parseInt(v,10);if(n>=1&&n<=N)host.children[n-1].scrollIntoView({block:"start"})};
 upd();poke()}
function isImg(p){return /\.(jpe?g|png|webp|gif)$/i.test(p)}
async function getBuf(path,url){   // Drive files come through the Apps Script (base64); GitHub files by normal fetch
 var f=FILES.filter(function(x){return x.p===path})[0];
 if(!f||!f.id){var r0=await fetch(url);if(!r0.ok)throw new Error("x");return await r0.arrayBuffer()}
 var r=await fetch((f.x?SCRIPT_URL+"?dfile=":window.DRIVE_URL+"?id=")+encodeURIComponent(f.id)),t=(await r.text()).trim();
 if(!t||t==="denied"||t.length<50)throw new Error("Drive file not available");
 var s=atob(t),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
 var bu=URL.createObjectURL(new Blob([u],{type:f.m||"application/pdf"}));$("nvD").href=bu;$("nvO").href=bu;$("nvD").style.visibility=$("nvO").style.visibility="";return u.buffer}
var LD_SCENE='<div class="ldsc"><div class="ldpile"><i></i><i></i><i></i></div><div class="ldwk"><div class="ldbb"><span class="ldbr">🧸</span><span class="ldnt">📄</span></div></div></div>';
/* Open button: Drive link and/or the browser's own viewer. 2 choices = small menu, 1 choice = direct link, none = hidden (e.g. Android + GitHub file) */
function openOpts(path){var f=FILES.filter(function(x){return x.p===path})[0],d=f&&f.id?"https://drive.google.com/file/d/"+encodeURIComponent(f.id)+"/view":"";return{drive:d,br:isImg(path)||navigator.pdfViewerEnabled===true}}
function brHref(o){var a=$("nvO");return(o.drive&&a.style.visibility==="hidden")?"":a.href}   /* Drive file: the browser copy exists only after the download finished */
function setOpen(a,path){if(!a)return;var o=openOpts(path),n=(o.drive?1:0)+(o.br?1:0),om=$("nvMenu");if(om)om.remove();
 a.removeAttribute("href");a.removeAttribute("target");a.onclick=null;a.style.display=n?"":"none";if(!n)return;
 if(n===2){a.innerHTML='↗<span class="nl"> Open</span> ▾';a.title="Open";a.onclick=function(e){e.preventDefault();toggleMenu(a,path)};return}
 a.target="_blank";a.rel="noopener";
 if(o.drive){a.innerHTML='☁️<span class="nl"> Open in Drive</span>';a.title="Open in Drive";a.href=o.drive}
 else{a.innerHTML='↗<span class="nl"> Open</span>';a.title="Open";a.href=$("nvO").href}}
function toggleMenu(a,path){var m=$("nvMenu");if(m){var same=m.__a===a;m.remove();if(same)return}
 var o=openOpts(path),h=brHref(o),r=a.getBoundingClientRect();
 m=document.createElement("div");m.id="nvMenu";m.className="nvmenu";m.__a=a;m.style.left=Math.max(8,Math.min(r.left,innerWidth-230))+"px";m.style.top=Math.round(r.bottom+6)+"px";
 m.innerHTML='<a href="'+esc(o.drive)+'" target="_blank" rel="noopener">☁️ Open via Drive link</a>'+(h?'<a href="'+esc(h)+'" target="_blank" rel="noopener">🌐 Open in browser</a>':'<a class="dis">⏳ Open in browser (still loading…)</a>');
 m.onclick=function(e){var t=e.target.closest("a");if(!t)return;if(t.classList.contains("dis")){e.preventDefault();return}setTimeout(function(){m.remove()},50)};
 vOv.appendChild(m)}
document.addEventListener("click",function(e){var m=$("nvMenu");if(m&&!(e.target.closest&&e.target.closest(".nvopen,#nvMenu")))m.remove()});
function goFS(){var d=document.documentElement;try{if(!document.fullscreenElement&&d.requestFullscreen)d.requestFullscreen().catch(function(){var f=$("nvF");if(f)f.textContent="Press F11 for full screen"})}catch(x){}}
async function openV(path,name){budSeen={};clearTimeout(budT);
 var o=viewer(),my=++vTok,b=$("nvB"),url=encodeURI(path);vZ=1;o.classList.remove("hidden");document.documentElement.style.overflow="hidden";
 goFS();   // full screen: hides the browser tabs/address bar (not on iPhone Safari)
 $("nvT").textContent=name;$("nvD").href=url;$("nvD").setAttribute("download",name+(isImg(path)?path.slice(path.lastIndexOf(".")):".pdf"));$("nvO").href=url;$("nvO").style.display=(isImg(path)||navigator.pdfViewerEnabled===true)?"":"none";$("nvD").style.visibility=$("nvO").style.visibility=FILES.some(function(x){return x.p===path&&x.id})?"hidden":"";   // Drive files have no real link until they are downloaded: buttons appear when ready   // "Open" only where the browser can really show PDFs (not phones)
 var inf=infoFor(path),pn=$("nvInfo");
 window.__nvInf=inf;if(inf.length){pn.className="nvinfo";pn.innerHTML='<div class="nvit"><b>📋 '+esc(inf.length===1?inf[0].title:"Topics")+'</b>'+cpBtn('data-cpv="1"')+'<span class="nva">▾</span></div><div class="nvib">'+inf.map(function(e){return(inf.length>1?'<div class="nvst">'+esc(e.title)+"</div>":"")+bodyHtml(e)}).join("")+"</div>"}
 else{pn.className="nvinfo hidden";pn.innerHTML=""}
 b.innerHTML='<div class="nvld">'+LD_SCENE+'<div class="tx">Bear is fetching your notes<span class="d">.</span><span class="d">.</span><span class="d">.</span></div><a class="nvgo nvopen" role="button" style="display:none"></a></div>';setOpen(b.querySelector(".nvopen"),path);setOpen($("nvOp"),path);$("nvNav").style.display="none";
 try{var buf=await getBuf(path,url);
  if(isImg(path)){if(my!==vTok)return;b.innerHTML='<div class="nvi" id="nvI"><div class="nvp"><img alt="" style="display:block;width:100%;height:auto" src="'+esc($("nvD").href)+'"></div></div>';return}
  var doc=await openPdf(buf);if(my!==vTok)return;
  var p1=await doc.getPage(1),v1=p1.getViewport({scale:1}),cw=b.clientWidth||360;
  b.innerHTML='<div class="nvi" id="nvI"></div>';var host=$("nvI");vZ=Math.min(1,900/cw);host.style.setProperty("--z",vZ);
  if(vIO)vIO.disconnect();if(vDoc&&vDoc!==doc){try{vDoc.destroy()}catch(er){}}vDoc=doc;
  var want=[],busy=false,tm=0,pl=0,vq=0,lastTop=b.scrollTop,dir=1,lastSc=0,vel=0,sT=b.scrollTop,sTm=Date.now();
  function pump(){clearTimeout(tm);tm=0;if(busy||my!==vTok||b.__pin)return;var br=b.getBoundingClientRect(),cy=br.top+br.height/2,idle=Date.now()-lastSc>=130,best=null,bd=1e9,miss=false;if(!idle&&vel>1.1)return;   /* flinging fast: nothing is drawn, so the scroll stays smooth; pages show "loading" text and are drawn when it slows down */
   if(b.scrollTop!==lastTop){dir=b.scrollTop>lastTop?1:-1;lastTop=b.scrollTop}
   want.forEach(function(e){if(e.__rend)return;var m=!e.__done;if(!m&&!(idle&&e.__lo))return;if(miss&&!m)return;   // 1) pages with no picture yet, 2) when scrolling has stopped: make quick pictures sharp
    var r=e.getBoundingClientRect();if(!idle&&(r.bottom<br.top||r.top>br.bottom))return;var dd=r.top+r.height/2-cy;   /* while moving: only pages that are on screen */dd=(dd*dir>=0?dd*dir:-dd*dir*1.8);   // on screen first, then ahead in scroll direction, then behind
    if(m&&!miss){miss=true;bd=1e9}if(dd<bd){bd=dd;best=e}});
   if(!best)return;busy=true;best.__rend=1;
   drawPg(doc,best,cw,my,idle).catch(function(){}).then(function(){best.__rend=0;busy=false;if(my===vTok)pump()})}
  b.__sc=function(){lastSc=Date.now();if(!vq)vq=requestAnimationFrame(function(){vq=0;var n=Date.now(),dt=n-sTm,y=b.scrollTop;if(dt>0)vel=vel*.6+Math.abs(y-sT)/dt*.4;sT=y;sTm=n});clearTimeout(tm);tm=setTimeout(pump,150);if(!pl)pl=setTimeout(function(){pl=0;pump()},220);want.forEach(function(e){if(e.__rend&&e.__hiR&&e.__task){try{e.__task.cancel()}catch(x){}}})};   // scrolling stopped -> sharpen
  var io=vIO=new IntersectionObserver(function(es){es.forEach(function(e){var d=e.target;
   if(e.isIntersecting){if(!d.__want){d.__want=1;want.push(d)}}
   else if(d.__want){want=want.filter(function(x){return x!==d});undraw(d)}});pump()},{root:b,rootMargin:"120% 0px"});
  for(var i=1;i<=doc.numPages;i++){var d=document.createElement("div");d.className="nvp";d.setAttribute("data-n",i);d.style.aspectRatio=v1.width+" / "+v1.height;host.appendChild(d);io.observe(d)}
  (async function(){var ch=host.children;   // every page gets its REAL size (page 1 may differ); pages above the screen keep your place
   for(var i=2;i<=doc.numPages;i++){if(my!==vTok)return;while(Date.now()-lastSc<250&&my===vTok)await new Promise(function(r){setTimeout(r,150)});
    try{var pg=await doc.getPage(i),vp=pg.getViewport({scale:1}),el=ch[i-1];if(!el)continue;var ar=vp.width+" / "+vp.height;
     if(el.style.aspectRatio!==ar){var r0=el.getBoundingClientRect(),up=r0.bottom<=b.getBoundingClientRect().top;el.style.aspectRatio=ar;if(up)b.scrollTop+=el.getBoundingClientRect().height-r0.height}
     pg.cleanup()}catch(er){}
    if(i%4===0)await new Promise(function(r){setTimeout(r,25)})}})();
  setupNav(b,host,doc.numPages)}
 catch(e){console.error("notes viewer:",e);if(my===vTok)b.innerHTML='<p class="nvm">Could not show this file here ('+esc((e&&e.message)||e)+'). <a href="'+esc(url)+'" target="_blank" rel="noopener">Open it directly</a></p>'}}
window.__nvOpen=function(){return!!vOv&&!vOv.classList.contains("hidden")};
window.__testLoading=function(){var o=viewer(),b=$("nvB"),f=FILES.filter(function(x){return x.id})[0]||FILES[0],path=f?f.p:"";   /* admin test button: shows the loading screen only, it never finishes (press Close) */
 vTok++;o.classList.remove("hidden");document.documentElement.style.overflow="hidden";
 $("nvT").textContent="🧪 Loading screen test";$("nvD").style.visibility="hidden";$("nvO").href=path?encodeURI(path):"#";$("nvO").style.visibility=(f&&f.id)?"hidden":"";
 $("nvInfo").className="nvinfo hidden";$("nvInfo").innerHTML="";$("nvNav").style.display="none";
 b.innerHTML='<div class="nvld">'+LD_SCENE+'<div class="tx">Bear is fetching your notes<span class="d">.</span><span class="d">.</span><span class="d">.</span></div><a class="nvgo nvopen" role="button" style="display:none"></a></div>';
 setOpen(b.querySelector(".nvopen"),path);setOpen($("nvOp"),path)};
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button[data-cp]");if(!b)return;var u=b.getAttribute("data-cp"),t=b.textContent;   /* copy the file link */
  function ok(){b.textContent="✓ Copied";setTimeout(function(){b.textContent=t},1600)}
  function fb(){var x=document.createElement("textarea");x.value=u;x.style.cssText="position:fixed;opacity:0";document.body.appendChild(x);x.select();try{document.execCommand("copy");ok()}catch(er){b.textContent="Copy failed"}x.remove()}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(ok,fb);else fb()});
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a.nchip,a.nf,a.nfv,a.npin");if(!a||e.ctrlKey||e.metaKey||e.shiftKey)return;
 var p=a.getAttribute("data-p");if(p&&/\.(pdf|jpe?g|png|webp|gif)$/i.test(p)){e.preventDefault();openV(p,a.getAttribute("data-n")||"")}});

var _s=show;show=function(ids){_s(ids);if(ids.indexOf("s1")>=0){renderPins();renderOrg()}$("sn").classList.toggle("hidden",ids.indexOf("sn")<0)};
})();
/* keeps the second gradient colour (--accent2) and pink accent (--accent3) in step with the chosen theme, even if another file forgets to set them */
(function(){var s=document.documentElement.style,busy=false;
 function put(n,v){if(s.getPropertyValue(n)!==v)s.setProperty(n,v)}
 function sync(){if(busy)return;busy=true;
  try{var a=(s.getPropertyValue("--accent")||"").trim(),m=/^#([0-9a-f]{6})$/i.exec(a);
   if(m){var def=(typeof THEME_COLOR==="string"?THEME_COLOR:"#D8BBFF").toLowerCase();
    if(a.toLowerCase()===def){s.removeProperty("--accent2");s.removeProperty("--accent3")}
    else{var c=[1,3,5].map(function(i){return parseInt(a.slice(i,i+2),16)}),dark=matchMedia("(prefers-color-scheme: dark)").matches;
     put("--accent2",dark?a:"rgb("+c.map(function(v){return Math.round(v*.72)}).join(",")+")");put("--accent3",a)}}}catch(e){}
  busy=false}
 sync();new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:["style"]})})();

var stT=document.createElement("style");stT.textContent=".ntwrap{overflow-x:auto}.ntbl{width:100%;border-collapse:collapse;font-size:.95em}.ntbl th,.ntbl td{padding:6px 8px;border-bottom:1px solid rgba(128,128,128,.3);text-align:left;vertical-align:top}.ntbl th{color:var(--accent2,#8a4dff)}.ntbl td:last-child{font-weight:700;white-space:nowrap}.ntbl .nth td{font-weight:700;color:#d6339a;padding-top:12px;white-space:normal}.ntnote{font-size:.9em;opacity:.8;margin:2px 0 6px}";document.head.appendChild(stT);