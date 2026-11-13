/* notes-admin.js : the ADMIN dialogs of the Notes page: 🗂 Sort board (drag files between subjects, copy, archive, hide), 🔗 All Drive links, 👁 Show / hide subjects.
   Loaded AFTER notes.js (see the loader list at the bottom of index.html). notes.js only calls boardDlg / drvDlg / visDlg, which live here.
   How it reaches notes.js: notes.js publishes the few names this file needs as window.__notesCtx; the "with" line below makes them available by their normal names,
   so the code reads exactly like it did inside notes.js. */
(function(){
var C=window.__notesCtx;if(!C)return;
var boardDlg,drvDlg,visDlg;
with(C){
function boardDlg(sid,xid){
 var k=sid+"|"+xid,SELB={},LAST="",COPY=0,KEY=function(f){return f.cl?f.p+"@@"+f.cpTo:f.p},coarse=window.matchMedia&&matchMedia("(pointer:coarse)").matches;
 var ov=modal('<b>🗂 Sort board</b> <span class="tiny">Drag a box around files (like on a desktop), Ctrl/Shift+click, or tap files; then drag them or tap a folder title. 📦 Archive = keep but out of subjects · 🚫 Hidden = removed from the site (bring back here).</span><div id="edBd" style="flex:1;overflow:auto;position:relative;margin-top:6px;user-select:none"></div><div class="edfoot"><button type="button" class="p" data-m="x">Done</button><button type="button" class="s" data-m="all">☑ Select all</button><button type="button" class="s" data-m="clr">Clear selection</button><button type="button" class="s" data-m="cp">📑 Copy mode: off</button><span class="tiny" id="edBn"></span></div>',function(a,ov,b){
  if(a==="clr"){SELB={};draw();return}
  if(a==="all"){FILES.filter(function(f){return f.fk===k}).forEach(function(f){SELB[KEY(f)]=1});draw();return}
  if(a==="cp"){COPY=COPY?0:1;b.textContent="📑 Copy mode: "+(COPY?"ON (drop = copy, keeps the original)":"off");return}
  if(a.indexOf("to:")===0){var ps=Object.keys(SELB);if(ps.length)go(ps,a.slice(3),COPY)}});
 var bx=ov.firstChild;bx.style.cssText+=";width:97vw;max-width:none;height:94vh;max-height:94vh;display:flex;flex-direction:column;box-sizing:border-box";
 function go(ps,t,cp){var add=[],rm=[],mv=[],isSj=ALL.some(function(c){return c.id===t});
  ps.forEach(function(key){var q=key.split("@@"),p=q[0],f=FILES.filter(function(x){return x.p===p&&!x.cl})[0];if(!f)return;
   if(q[1]){rm.push([p,q[1]]);if(isSj&&t!==f.c)add.push([p,t]);return}
   if(cp&&isSj){if(t!==f.c)add.push([p,t]);return}mv.push(p)});
  var pr=(add.length||rm.length)?cfgSave(function(n){n.cp=n.cp||{};rm.forEach(function(r){n.cp[r[0]]=(n.cp[r[0]]||[]).filter(function(x){return x!==r[1]});if(!n.cp[r[0]].length)delete n.cp[r[0]]});add.forEach(function(r){var a=n.cp[r[0]]=n.cp[r[0]]||[];if(a.indexOf(r[1])<0)a.push(r[1])})}):Promise.resolve();
  mv.forEach(function(p){pr=pr.then(function(){var f=fileOf(p);if(!f)return;var un=f.hd?metaSet("__fhide:"+p,{tg:""}):Promise.resolve();
   return un.then(function(){if(t==="hide")return metaSet("__fhide:"+p,{tg:"1"});if(t==="arc")return metaSet(p,{ar:1});return metaSet(p,{sj:t,ar:""})})})});
  pr.then(function(){SELB={};FILES.forEach(eff);refreshAll();draw()})}
 var D=ov.querySelector("#edBd");
 D.addEventListener("click",function(e){if(Date.now()-NOCLK<400)return;var c=e.target.closest("[data-fp]");if(!c)return;var p=c.getAttribute("data-fp");
  if(e.shiftKey&&LAST){var cs=[].slice.call(D.querySelectorAll("[data-fp]")).map(function(x){return x.getAttribute("data-fp")}),i=cs.indexOf(LAST),j=cs.indexOf(p);if(i>=0&&j>=0)cs.slice(Math.min(i,j),Math.max(i,j)+1).forEach(function(q){SELB[q]=1})}
  else if(e.ctrlKey||e.metaKey||coarse){if(SELB[p])delete SELB[p];else SELB[p]=1}
  else{var only=SELB[p]&&Object.keys(SELB).length===1;SELB={};if(!only)SELB[p]=1}
  LAST=p;draw()});
 // pointer-based drag (mouse / pen): works the same every time, no browser drag-and-drop
 var dg=null,NOCLK=0,hz=null;
 function recolor(){D.querySelectorAll("[data-fp]").forEach(function(x){x.style.background=SELB[x.getAttribute("data-fp")]?"#ffd1e3":"rgba(0,0,0,.05)"})}
 function zoneAt(e){var el=document.elementFromPoint(e.clientX,e.clientY);return el&&el.closest?el.closest("[data-dz]"):null}
 D.addEventListener("pointerdown",function(e){if(e.pointerType==="touch"||e.button!==0)return;var c=e.target.closest("[data-fp]");if(!c)return;dg={p:c.getAttribute("data-fp"),x:e.clientX,y:e.clientY,on:0,g:null}});
 function mv(e){if(!document.body.contains(ov)){fin(1);return}if(!dg)return;
  if(!dg.on){if(Math.abs(e.clientX-dg.x)+Math.abs(e.clientY-dg.y)<6)return;dg.on=1;if(!SELB[dg.p]){SELB={};SELB[dg.p]=1;recolor()}
   dg.g=document.createElement("div");dg.g.textContent="📄 "+Object.keys(SELB).length+" file(s)";dg.g.style.cssText="position:fixed;z-index:99999;pointer-events:none;background:#d6336c;color:#fff;font:600 12px system-ui;padding:4px 8px;border-radius:8px;opacity:.9";document.body.appendChild(dg.g)}
  dg.g.style.left=(e.clientX+10)+"px";dg.g.style.top=(e.clientY+10)+"px";
  var z=zoneAt(e);if(hz&&hz!==z)hz.style.outline="";if(z)z.style.outline="3px dashed #d6336c";hz=z}
 function fin(cancel,e){document.removeEventListener("pointermove",mv);document.removeEventListener("pointerup",up);document.removeEventListener("pointercancel",up);if(hz){hz.style.outline="";hz=null}if(dg&&dg.g)dg.g.remove();dg=null}
 function up(e){var d=dg,z=d&&d.on&&e&&e.type==="pointerup"?zoneAt(e):null;fin(0,e);if(d&&d.on){NOCLK=Date.now();if(z){var ps=Object.keys(SELB);if(ps.length)go(ps,z.getAttribute("data-dz"),COPY||e.altKey)}}
  document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up);document.addEventListener("pointercancel",up)}
 document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up);document.addEventListener("pointercancel",up);
 // rubber-band selection (mouse / pen) starting on empty space
 var mq=null,sx=0,sy=0,base={};
 D.addEventListener("pointerdown",function(e){if(e.pointerType==="touch"||e.button!==0||e.target.closest("[data-fp],button"))return;
  var r=D.getBoundingClientRect();if(e.clientX>r.left+D.clientWidth)return;   // scrollbar
  sx=e.clientX;sy=e.clientY;base=(e.ctrlKey||e.shiftKey||e.metaKey)?JSON.parse(JSON.stringify(SELB)):{};
  mq=document.createElement("div");mq.style.cssText="position:fixed;z-index:99999;border:1.5px solid #d6336c;background:rgba(214,51,108,.15);pointer-events:none";document.body.appendChild(mq);
  try{D.setPointerCapture(e.pointerId)}catch(x){}});
 D.addEventListener("pointermove",function(e){if(!mq)return;var l=Math.min(sx,e.clientX),t=Math.min(sy,e.clientY),w=Math.abs(e.clientX-sx),h=Math.abs(e.clientY-sy);
  mq.style.left=l+"px";mq.style.top=t+"px";mq.style.width=w+"px";mq.style.height=h+"px";
  D.querySelectorAll("[data-fp]").forEach(function(c){var r=c.getBoundingClientRect(),p=c.getAttribute("data-fp"),hit=!(r.right<l||r.left>l+w||r.bottom<t||r.top>t+h);
   if(hit)SELB[p]=1;else if(!base[p])delete SELB[p];c.style.background=SELB[p]?"#ffd1e3":"rgba(0,0,0,.05)"})});
 function endMq(){if(!mq)return;mq.remove();mq=null;draw()}
 D.addEventListener("pointerup",endMq);D.addEventListener("pointercancel",endMq);
 function draw(){var fl=FILES.filter(function(f){return f.fk===k}),box={};
  fl.forEach(function(f){var g=f.hd?"hide":f.ar?"arc":f.c;(box[g]=box[g]||[]).push(f)});
  var cols=ALL.map(function(c){return{id:c.id,t:c.icon+" "+c.label}}).concat([{id:"arc",t:"📦 Archive"},{id:"hide",t:"🚫 Hidden"}]);
  D.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;align-items:start;min-height:100%">'+cols.map(function(c){var L=box[c.id]||[];
   return'<div data-dz="'+c.id+'" style="border:2px solid rgba(0,0,0,.15);border-radius:4px 14px 10px 10px;padding:5px;min-height:60px"><button type="button" class="s" data-m="to:'+c.id+'" style="width:100%;margin-bottom:3px;padding:4px 6px;font-size:13px">'+esc(c.t)+" ("+L.length+')</button>'+L.map(function(f){return'<div data-fp="'+esc(KEY(f))+'" style="font-size:12px;padding:2px 4px;margin:2px 0;border-radius:6px;cursor:grab;touch-action:pan-y;background:'+(SELB[KEY(f)]?"#ffd1e3":"rgba(0,0,0,.05)")+'">'+(f.cl?"📑 ":"")+esc(f.nm)+"</div>"}).join("")+"</div>"}).join("")+"</div>";
  var n=Object.keys(SELB).length,el=ov.querySelector("#edBn");if(el)el.textContent=n?n+" selected":""}
 draw()}
function drvDlg(){
 var open={};
 var ov=modal('<b>🔗 All Drive links</b><div class="tiny">Every Drive folder the site imports, from every subject. Each shows where its files ended up. Open “Review” to move a file to the subject you want.</div><div id="edDl"></div><div class="edfoot"><button type="button" class="s" data-m="new">➕ Add Drive folder (auto-sort)</button><button type="button" class="p" data-m="x">Done</button></div>',function(a,ov,b){
  if(a==="new"){ov.remove();curCat=OTHERS.id;curTab="files";render();linkDlg();return}
  var p=a.split(":");
  if(p[0]==="rv"){boardDlg(p[1],p[2]);return}
  if(p[0]==="op"){var keep=curCat;curCat=p[2];lkAct(p[1]+":"+p[3]);curCat=keep;setTimeout(draw,500);setTimeout(draw,2500)}});
 ov.addEventListener("change",function(e){var t=e.target;if(t.tagName!=="SELECT")return;metaSet(t.getAttribute("data-p"),{sj:t.value}).then(function(){draw()})});
 function draw(){var h="";
  Object.keys(CFG.src||{}).forEach(function(sid){(CFG.src[sid]||[]).forEach(function(x,i){
   var k=sid+"|"+x.id,fl=FILES.filter(function(f){return f.fk===k}),cnt={};fl.forEach(function(f){var l=labelOf(f.c)||"?";cnt[l]=(cnt[l]||0)+1});
   h+='<div style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;margin:8px 0"><div><b>📥 '+esc(x.t||IMPNAME[x.id]||"Drive folder")+'</b> <small>added under “'+esc(labelOf(sid)||"a removed subject")+'” · '+esc(IMP_ST[x.id]||"loading…")+'</small></div>'
   +'<div class="tiny"><a href="'+esc(x.u||"#")+'" target="_blank" rel="noopener">'+esc((x.u||"").slice(0,70))+'</a></div>'
   +'<div class="tiny">Files went to: '+(Object.keys(cnt).map(function(l){return esc(l)+" "+cnt[l]}).join(" · ")||"none yet")+'</div>'
   +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="s" data-m="op:srcE:'+sid+':'+i+'">✏️ Edit link</button><button type="button" class="s" data-m="op:srcN:'+sid+':'+i+'">🔤 Sort by name: '+["off","into subjects","into tabs"][x.an||0]+'</button><button type="button" class="s" data-m="op:srcR:'+sid+':'+i+'">🔄 Reload</button><button type="button" class="s" data-m="rv:'+sid+':'+x.id+'">🔎 Review ('+fl.length+')</button><button type="button" class="s" data-m="op:srcD:'+sid+':'+i+'">🗑 Remove link</button></div>';
   if(open[k])h+='<div style="margin-top:6px">'+fl.slice(0,80).map(function(f){return'<div style="display:flex;gap:6px;align-items:center;padding:3px 0"><span style="flex:1;font-size:13px">'+esc(f.nm)+'</span><select data-p="'+esc(f.p)+'">'+ALL.map(function(c){return'<option value="'+c.id+'"'+(c.id===f.c?" selected":"")+'>'+esc(c.label)+"</option>"}).join("")+"</select></div>"}).join("")+'</div>';
   h+="</div>"})});
  ov.querySelector("#edDl").innerHTML=h||'<div class="tiny">No Drive links are stored. (Links that were archived earlier are gone only if you removed them here.)</div>'}
 draw()}
function visDlg(){
 var ov=modal('<b>👁 Show / hide subjects</b><div class="tiny">Hidden subjects disappear for visitors. You can show them again here any time. Nothing is deleted.</div><div id="edVl"></div><div class="edfoot"><button type="button" class="p" data-m="x">Done</button></div>',function(a,ov,b){
  if(a.indexOf("t:")!==0)return;var id=a.slice(2),m=META["__hide:"+id],hid=!!(m&&m.tg);b.disabled=true;
  metaSet("__hide:"+id,{tg:hid?"":"1"}).then(function(){buildAll();render();draw()})});
 function draw(){var it=CATS.map(function(c){return{id:c.id,icon:c.icon,label:c.label}});
  Object.keys(META).forEach(function(k){if(k.indexOf("__subj:")===0&&META[k]&&META[k].tg){var a=String(META[k].tg).split("|");it.push({id:k.slice(7),icon:a[0]||"📘",label:a[1]||k.slice(7)})}});
  ov.querySelector("#edVl").innerHTML=it.map(function(x){var m=META["__hide:"+x.id],hid=!!(m&&m.tg);
   return'<div style="display:flex;gap:8px;align-items:center;padding:6px 0"><span style="flex:1;opacity:'+(hid?.5:1)+'">'+x.icon+" "+esc(x.label)+(hid?" (hidden)":"")+'</span><button type="button" class="s" data-m="t:'+x.id+'">'+(hid?"👁 Show":"🙈 Hide")+"</button></div>"}).join("")}
 draw()}
}
window.__notesAdmin={boardDlg:boardDlg,drvDlg:drvDlg,visDlg:visDlg};
})();
