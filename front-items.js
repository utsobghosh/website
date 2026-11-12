/* front-items.js : the list on the front screen ("Which file do you want?") can be edited from the website, and cover pages can have text boxes.
   Loaded by index.html BEFORE app.js. Needs the Apps Script part Code-front.gs (shared list + student names).
   - Admin: on the front screen press "✏️ Edit list" (asks the admin PIN) > "➕ Add to list" > pick a file from your Drive folder.
       Cover page = a Word (.docx) file with fields written like {{Teacher}} {{Course}} {{Name}} {{ID}} {{Section}} {{Date}}.
       Every field becomes a text box. Name / ID / Section / Date fill themselves; the student can still change everything.
       Plain file = anything else (PDF, photo…), the student taps it and it downloads.
   - Name lookup: when a student types an ID that is not in STUDENTS, the name is looked up in the Google Sheet (tab "Names", filled
     by everyone who types their name once). */
(function(){
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}return null}

// ===== cover page fields: {{Field}} inside a Word file (works even when Word split the text into pieces) =====
var NAMEK={name:1,studentname:1,fullname:1,yourname:1,nameofstudent:1,nameofthestudent:1},
    IDK={id:1,reg:1,regno:1,registration:1,registrationno:1,registrationnumber:1,regnumber:1,studentid:1,roll:1,rollno:1,idno:1,idnumber:1},
    SECK={section:1,sec:1},DATEK={date:1,submissiondate:1,dateofsubmission:1,submitdate:1};
function nk(k){return String(k).toLowerCase().replace(/[^a-z0-9]/g,"")}
function role(k){k=nk(k);return NAMEK[k]?"name":IDK[k]?"id":SECK[k]?"sec":DATEK[k]?"date":""}
function label(k){k=String(k).replace(/[_-]+/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").trim();return k.charAt(0).toUpperCase()+k.slice(1)}
var PRE="\\{\\{\\s*([^{}]+?)\\s*\\}\\}";
function paras(xml,fn){return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g,fn)}
function texts(p){var ts=[],re=/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g,m,txt="";
 while((m=re.exec(p))){ts.push({s:m.index,e:re.lastIndex,o:m[1],t:m[2],c:m[3],st:txt.length});txt+=m[2]}return{ts:ts,txt:txt}}
function keyOf(m){return m.replace(/&amp;/g,"&").trim()}
function scan(xml){var keys=[],seen={};
 paras(xml,function(p){var r=texts(p);if(r.txt.indexOf("{{")<0)return p;var re=new RegExp(PRE,"g"),m;
  while((m=re.exec(r.txt))){var k=keyOf(m[1]),n=nk(k);if(n&&!seen[n]){seen[n]=1;keys.push(k)}}return p});
 return keys}
function fill(xml,get){   // get(key) -> text to put in
 return paras(xml,function(p){var r=texts(p);if(r.txt.indexOf("{{")<0)return p;
  var re=new RegExp(PRE,"g"),m,spans=[];
  while((m=re.exec(r.txt))){var v=get(keyOf(m[1]));if(v!=null)spans.push({a:m.index,b:m.index+m[0].length,v:esc(v)})}
  if(!spans.length||!r.ts.length)return p;
  var out=r.ts.map(function(){return""}),ti=0,i,j;
  for(i=0;i<r.txt.length;i++){
   while(ti<r.ts.length-1&&i>=r.ts[ti+1].st)ti++;
   var sp=null;for(j=0;j<spans.length;j++)if(i>=spans[j].a&&i<spans[j].b){sp=spans[j];break}
   if(sp){if(i===sp.a)out[ti]+=sp.v}else out[ti]+=r.txt.charAt(i)}
  var res="",pos=0;
  r.ts.forEach(function(t,k){res+=p.slice(pos,t.s)+t.o.replace(/^<w:t(?: [^>]*)?>/,'<w:t xml:space="preserve">')+out[k]+t.c;pos=t.e});
  return res+p.slice(pos)})}
window.CoverFields={nk:nk,role:role,label:label,scan:scan,fill:fill};

// ===== the shared front list =====
var KEY="frontCache",RAW=[],TPL={};
function items(){return RAW}
async function once(){var c=new AbortController(),t=setTimeout(function(){c.abort()},12000);
 try{var r=await fetch(SCRIPT_URL+"?front=1",{signal:c.signal}),d=await r.json();if(!d||!d.ok||!Array.isArray(d.items))throw new Error("no front part");return d.items}
 finally{clearTimeout(t)}}
var LAY={order:[],hide:[]},BASE=null;   // LAY = order of the ids + hidden ids, shared by everybody (Code-layout.gs)
try{var l0=JSON.parse(ls("frontLayout")||"null");if(l0&&Array.isArray(l0.order)&&Array.isArray(l0.hide))LAY=l0}catch(e){}
function apply(list){
 RAW=list;
 if(!BASE)BASE=OPTIONS.filter(function(o){return!o.dyn&&!o.upload});   // the lines written in index.html
 var ups=OPTIONS.filter(function(o){return o.upload}),
 dyn=list.map(function(x){return{id:"f-"+x.id,fid:x.id,dyn:1,kind:x.kind==="cover"?"cover":"file",title:x.title,desc:x.desc||"",pages:1,did:x.did,fname:x.fname||"",mime:x.mime||"",fields:x.fields||[]}}),
 all=dyn.concat(BASE),pos={},hide={};
 LAY.order.forEach(function(id,i){pos[id]=i});LAY.hide.forEach(function(id){hide[id]=1});
 var has=function(o){return Object.prototype.hasOwnProperty.call(pos,o.id)};
 all=all.filter(function(o){return!has(o)}).concat(all.filter(has).sort(function(a,b){return pos[a.id]-pos[b.id]}));   // new files (not ordered yet) first
 all.forEach(function(o){if(hide[o.id])o.hid=1;else delete o.hid});   // hid = hidden from students (stays in OPTIONS so old orders still match)
 OPTIONS.length=0;Array.prototype.push.apply(OPTIONS,ups.concat(all.filter(function(o){return!o.hid}),all.filter(function(o){return o.hid})));
 if(window.__renderOpts)window.__renderOpts()}
async function onceLay(){var c=new AbortController(),t=setTimeout(function(){c.abort()},12000);
 try{var r=await fetch(SCRIPT_URL+"?layout=1",{signal:c.signal}),d=await r.json();
  return d&&d.ok&&Array.isArray(d.order)&&Array.isArray(d.hide)?{order:d.order,hide:d.hide}:null}
 catch(e){return null}finally{clearTimeout(t)}}
async function load(){var pause=[1500,4000,8000];
 for(var i=0;i<=pause.length;i++){try{var rs=await Promise.all([once(),onceLay()]),it=rs[0];if(rs[1]){LAY=rs[1];ls("frontLayout",JSON.stringify(LAY))}ls(KEY,JSON.stringify(it));apply(it);return it}catch(e){if(i<pause.length)await sleep(pause[i])}}
 return null}
if(typeof SCRIPT_URL!=="undefined"&&SCRIPT_URL){
 try{var c0=JSON.parse(ls(KEY)||"null");apply(Array.isArray(c0)?c0:[])}catch(e){}   // last list known: shows at once
 window.__frontReady=Promise.race([load(),sleep(3500)])}

// ===== Drive file -> base64 (same way notes.js reads Drive files) =====
async function b64(id){var r=await fetch(window.DRIVE_URL+"?id="+encodeURIComponent(id)),t=(await r.text()).trim();
 if(!t||t==="denied"||t.length<50)throw new Error("Drive file not available (is it shared as anyone with the link?)");return t}
function bytes(t){var s=atob(t),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
window.__frontTpl=async function(o){if(o.tpl)return o.tpl;if(!TPL[o.did])TPL[o.did]=b64(o.did).catch(function(e){delete TPL[o.did];throw e});o.tpl=await TPL[o.did];return o.tpl};
window.__frontDl=async function(o,b){var t=b&&b.innerHTML;
 try{if(b)b.disabled=true;var u=bytes(await b64(o.did));
  var ex=(/\.[A-Za-z0-9]{1,5}$/.exec(o.fname||"")||[""])[0]||({"application/pdf":".pdf","image/jpeg":".jpg","image/png":".png","image/webp":".webp","application/vnd.openxmlformats-officedocument.wordprocessingml.document":".docx","application/vnd.openxmlformats-officedocument.presentationml.presentation":".pptx"})[o.mime]||"";
  await save(new Blob([u],{type:o.mime||"application/octet-stream"}),(String(o.title).replace(/[\\\/:*?"<>|]+/g," ").trim()||"file")+ex);
  if(b)b.innerHTML='<span class="tx">✅ '+esc(o.title)+'<small>Downloaded. Look in your Downloads folder (or the Files app)</small></span>';
  setTimeout(function(){if(b){b.innerHTML=t;b.disabled=false}},2500)}
 catch(e){if(b){b.innerHTML=t;b.disabled=false}
  if(confirm("Could not download it here ("+(e.message||e)+"). Open it in Google Drive instead?"))window.open("https://drive.google.com/file/d/"+encodeURIComponent(o.did)+"/view","_blank")}};

// ===== text boxes of a cover page (on the "About you" card) =====
function today(){try{return new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}catch(e){return""}}
window.__frontFields=function(o){
 var c=document.getElementById("dynFields");
 if(!c){var ex=document.getElementById("extra");if(!ex)return;c=document.createElement("div");c.id="dynFields";ex.parentNode.insertBefore(c,ex.nextSibling)}
 c.innerHTML="";if(!o||o.kind!=="cover")return;
 var saved={},seen={};try{saved=JSON.parse(ls("dynv")||"{}")||{}}catch(e){}
 (o.fields||[]).forEach(function(k){var n=nk(k),r=role(k);if(!n||seen[n]||r==="name"||r==="id"||r==="sec")return;seen[n]=1;
  var v=r==="date"?today():(saved[o.id+":"+n]||"");
  c.insertAdjacentHTML("beforeend",'<label for="dv_'+n+'">'+esc(label(k))+'</label><input id="dv_'+n+'" data-k="'+n+'" value="'+esc(v)+'" autocomplete="off">')})};
window.__frontCollect=function(o){var v={},saved={};try{saved=JSON.parse(ls("dynv")||"{}")||{}}catch(e){}
 [].forEach.call(document.querySelectorAll("#dynFields input[data-k]"),function(i){var n=i.getAttribute("data-k");v[n]=i.value.trim();if(role(n)!=="date")saved[o.id+":"+n]=v[n]});
 ls("dynv",JSON.stringify(saved));return v};
// values go into the printing note ("Fields: Teacher=…; Course=…") so the admin sees them and can rebuild the file
window.__frontFv=function(o,vals){var out=[];(o.fields||[]).forEach(function(k){var n=nk(k);if(vals&&vals[n]&&role(k)!=="name"&&role(k)!=="id"&&role(k)!=="sec")out.push(label(k)+"="+vals[n])});return out.join("; ")};
window.__frontParse=function(o,note){var m=/^Fields: (.*?)(?: · |$)/.exec(String(note||"")),v={};if(!m)return v;
 m[1].split("; ").forEach(function(p){var i=p.indexOf("=");if(i>0)v[nk(p.slice(0,i))]=p.slice(i+1)});return v};

// ===== names of students who are not in the STUDENTS list =====
function nmCache(){try{return JSON.parse(ls("nmCache")||"{}")||{}}catch(e){return{}}}
async function lookup(id){var c=nmCache();if(c[id])return c[id];
 try{var r=await (await fetch(SCRIPT_URL+"?nm="+id)).json();if(r&&r.ok&&r.name){c[id]=r.name;ls("nmCache",JSON.stringify(c));return r.name}}catch(e){}return""}
window.__frontSaveName=function(id,name){
 if(typeof SCRIPT_URL==="undefined"||!SCRIPT_URL||!/^\d{8}$/.test(id)||!name||name==="-"||(typeof STUDENTS!=="undefined"&&STUDENTS[id]))return;
 var c=nmCache();if(c[id]===name)return;c[id]=name;ls("nmCache",JSON.stringify(c));
 try{fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"name",id:id,name:name})}).catch(function(){})}catch(e){}};
(function(){var s=document.getElementById("sid"),n=document.getElementById("sname");if(!s||!n)return;
 s.addEventListener("input",function(){var id=s.value.trim();if(!/^\d{8}$/.test(id)||(typeof STUDENTS!=="undefined"&&STUDENTS[id]))return;
  lookup(id).then(function(nm){if(nm&&s.value.trim()===id&&!n.value.trim())n.value=nm})})})();

// ===== admin: edit the list =====
var adm=false;
function pin(){var p="";try{p=sessionStorage.getItem("pin")||""}catch(e){}
 if(!p){p=prompt("Admin PIN")||"";if(p){try{sessionStorage.setItem("pin",p)}catch(e){}}}return p}
async function send(op,extra){var p=pin();if(!p)return false;var body={action:"front",pin:p,op:op};for(var k in extra)body[k]=extra[k];
 try{var r=await (await fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify(body)})).json();
  if(r&&r.error==="pin"){try{sessionStorage.removeItem("pin")}catch(e){}alert("Wrong PIN");return false}
  if(!r||!r.ok){alert("The Apps Script does not have the front-list part yet (Code-front.gs + New version).");return false}
  var it=await once();ls(KEY,JSON.stringify(it));apply(it);return true}
 catch(e){alert("Could not save: "+(e.message||e));return false}}
function btn(t,fn,cls){var b=document.createElement("button");b.type="button";b.className=cls||"s";b.textContent=t;b.style.cssText="padding:4px 10px;margin:0";b.onclick=fn;return b}
function modal(html){var m=document.createElement("div");m.className="modal";m.innerHTML='<div class="mbox" style="max-height:88vh;overflow:auto;width:100%;max-width:460px;text-align:left">'+html+"</div>";document.body.appendChild(m);return m}
function guessMime(n){n=String(n).toLowerCase();return /\.pdf$/.test(n)?"application/pdf":/\.jpe?g$/.test(n)?"image/jpeg":/\.png$/.test(n)?"image/png":/\.webp$/.test(n)?"image/webp":/\.docx$/.test(n)?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":/\.pptx$/.test(n)?"application/vnd.openxmlformats-officedocument.presentationml.presentation":""}
function openAdd(){
 var files=(window.NOTES_FILES||[]).filter(function(f){return f.id}),ch=null,
 m=modal('<h3 style="margin:0 0 8px">➕ Add to the front list</h3><input id="faQ" placeholder="🔍 search your Drive files" autocomplete="off"><div id="faL" style="max-height:36vh;overflow:auto;margin:8px 0"></div><input id="faLink" placeholder="…or paste a Drive link / file ID" autocomplete="off"><div id="faE" class="errmsg"></div><div style="margin-top:10px"><button class="p" id="faGo" type="button">Next</button> <button class="s" id="faX" type="button">Cancel</button></div>'),
 $=function(i){return m.querySelector("#"+i)};
 function list(){var q=$("faQ").value.toLowerCase().trim();
  $("faL").innerHTML=files.filter(function(f){return!q||f.p.toLowerCase().indexOf(q)>=0}).slice(0,40).map(function(f,i){return'<button type="button" class="opt" data-i="'+files.indexOf(f)+'" style="margin-top:4px;padding:8px 10px">'+esc(f.p.split("/").pop())+"</button>"}).join("")||'<p class="tiny">No Drive files found (the Drive list may still be loading). You can paste a link below.</p>'}
 list();$("faQ").oninput=list;$("faX").onclick=function(){m.remove()};
 $("faL").onclick=function(e){var b=e.target.closest("button[data-i]");if(!b)return;var f=files[+b.getAttribute("data-i")];ch={id:f.id,name:f.p.split("/").pop()};
  [].forEach.call($("faL").querySelectorAll("button"),function(x){x.style.outline=""});b.style.outline="2px solid var(--accent,#8a4dff)";$("faLink").value=""};
 $("faGo").onclick=function(){var l=$("faLink").value.trim();if(l){var mm=/[-\w]{25,}/.exec(l);if(!mm){$("faE").textContent="That does not look like a Drive link.";return}ch={id:mm[0],name:""}}
  if(!ch){$("faE").textContent="Pick a file first.";return}step2(m,ch)}}
async function step2(m,ch){
 var box=m.querySelector(".mbox");box.innerHTML='<p class="note">⏳ Reading the file…</p>';
 var isDocx=false,fields=[],err="";
 try{var z=await JSZip.loadAsync(await b64(ch.id),{base64:true}),f=z.file("word/document.xml");
  if(f){isDocx=true;fields=scan(await f.async("string"))}}
 catch(e){err=e&&e.message||""}
 var nm0=ch.name.replace(/\.[A-Za-z0-9]+$/,""),ext=(/\.[A-Za-z0-9]+$/.exec(ch.name)||[isDocx?".docx":""])[0];
 box.innerHTML='<h3 style="margin:0 0 6px">'+esc(ch.name||"Drive file")+'</h3>'+
  (err&&!isDocx?'<p class="tiny">'+esc(err)+'</p>':"")+
  '<label>Type</label><select id="fkind" style="width:100%;padding:10px"><option value="cover"'+(isDocx?" selected":"")+'>📝 Cover page (Word file with {{fields}})</option><option value="file"'+(isDocx?"":" selected")+'>📎 Plain file (student downloads it)</option></select>'+
  '<div id="finfo" class="tiny" style="margin:6px 0"></div>'+
  '<label>Title</label><input id="ftitle" value="'+esc(nm0)+'"><label>Small text under it</label><input id="fdesc" placeholder="e.g. CSE 201 · Teacher name">'+
  '<div style="margin-top:10px"><button class="p" id="fsave" type="button">Save</button> <button class="s" id="fx" type="button">Cancel</button></div>';
 var $=function(i){return box.querySelector("#"+i)};
 function info(){$("finfo").innerHTML=$("fkind").value==="cover"?(!isDocx?"⚠️ This is not a Word (.docx) file, so it cannot be a cover page.":fields.length?"Text boxes: <b>"+fields.map(function(k){return esc(label(k))}).join(", ")+"</b>"+(fields.some(function(k){return role(k)==="name"||role(k)==="id"})?"":" (no {{Name}} / {{ID}} found, those will not fill)"):"⚠️ No {{fields}} found in the file, it will be used as is."):""}
 info();$("fkind").onchange=info;$("fx").onclick=function(){m.remove()};
 $("fsave").onclick=async function(){var k=$("fkind").value,t=$("ftitle").value.trim();if(!t){$("ftitle").focus();return}
  if(k==="cover"&&!isDocx){info();return}
  var item={id:"n"+Date.now().toString(36),title:t.slice(0,80),desc:$("fdesc").value.trim().slice(0,120),kind:k,did:ch.id,fname:(nm0&&ext?nm0+ext:t+ext).slice(0,120),mime:guessMime(ext),fields:k==="cover"?fields:[]};
  this.disabled=true;this.textContent="Saving…";if(await send("set",{item:item}))m.remove();else{this.disabled=false;this.textContent="Save"}}}
// ----- order / hide (shared layout) -----
function visIds(){return OPTIONS.filter(function(o){return!o.upload&&!o.hid}).map(function(o){return o.id})}
function hidIds(){return OPTIONS.filter(function(o){return o.hid}).map(function(o){return o.id})}
async function saveLay(order,hide){var p=pin();if(!p)return false;var old=LAY;LAY={order:order,hide:hide};ls("frontLayout",JSON.stringify(LAY));apply(RAW);   // shows at once, undone if saving fails
 try{var r=await (await fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"layout",pin:p,order:order,hide:hide})})).json();
  if(r&&r.error==="pin"){try{sessionStorage.removeItem("pin")}catch(e){}throw new Error("Wrong PIN")}
  if(!r||!r.ok)throw new Error("The Apps Script does not have the layout part yet (Code-layout.gs + New version)");return true}
 catch(e){LAY=old;ls("frontLayout",JSON.stringify(LAY));apply(RAW);alert("Could not save: "+(e&&e.message||e));return false}}
function move(id,dir){var ids=visIds(),i=ids.indexOf(id),j=i+dir;if(i<0||j<0||j>=ids.length)return;var t=ids[i];ids[i]=ids[j];ids[j]=t;saveLay(ids.concat(hidIds()),hidIds())}
function hideOpt(id){var h=hidIds();if(h.indexOf(id)<0)h.push(id);saveLay(visIds().concat(h),h)}
function openHidden(){var hs=OPTIONS.filter(function(o){return o.hid}),m=modal('<h3 style="margin:0 0 8px">👁 Hidden from students</h3><div id="hL"></div><div style="margin-top:10px"><button class="s" id="hX" type="button">Close</button></div>'),L=m.querySelector("#hL");
 hs.forEach(function(o){var r=document.createElement("div");r.style.cssText="display:flex;gap:8px;align-items:center;justify-content:space-between;margin:6px 0";
  var t=document.createElement("span");t.textContent=o.title;r.appendChild(t);
  r.appendChild(btn("↩ Show again",async function(){var h=hidIds().filter(function(i){return i!==o.id});if(await saveLay(visIds().concat(h),h))m.remove()}));L.appendChild(r)});
 m.querySelector("#hX").onclick=function(){m.remove()}}
// "Edit list" only appears after the admin page was opened in this tab (the PIN is then remembered); it re-checks when you come back
window.addEventListener("hashchange",function(){if(window.__renderOpts)window.__renderOpts()});
window.__frontAdmin=function(box){
 var hp="";try{hp=sessionStorage.getItem("pin")||""}catch(e){}
 if(!adm&&!hp)return;
 var bar=document.createElement("div");bar.style.cssText="margin:8px 0 0;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end";
 bar.appendChild(btn(adm?"✔ Done editing":"✏️ Edit list",function(){if(!adm&&!pin())return;adm=!adm;window.__renderOpts()}));
 if(adm){bar.insertBefore(btn("➕ Add to list",openAdd,"p"),bar.firstChild);
  var hidden=OPTIONS.filter(function(o){return o.hid});
  if(hidden.length)bar.insertBefore(btn("👁 Hidden ("+hidden.length+")",openHidden),bar.children[1]);
  [].forEach.call(box.querySelectorAll("button.opt[data-oid]"),function(b){
   var id=b.getAttribute("data-oid"),o=OPTIONS.filter(function(r){return r.id===id})[0];if(!o)return;
   var x=o.dyn?RAW.filter(function(r){return"f-"+r.id===id})[0]:null,ids=visIds(),i=ids.indexOf(id);
   var d=document.createElement("div");d.style.cssText="display:flex;gap:6px;margin:4px 0 0;justify-content:flex-end;flex-wrap:wrap";
   var up=btn("↑",function(){move(id,-1)}),dn=btn("↓",function(){move(id,1)});up.disabled=i<=0;dn.disabled=i<0||i>=ids.length-1;
   d.appendChild(up);d.appendChild(dn);
   if(x)d.appendChild(btn("✏️ Rename",function(){var t=prompt("Title",x.title);if(t===null)return;var s=prompt("Small text",x.desc||"");if(s===null)return;var n={};for(var k in x)n[k]=x[k];n.title=t.trim()||x.title;n.desc=s.trim();send("set",{item:n})}));
   d.appendChild(btn("✕ Remove",function(){
    if(x){if(confirm("Remove “"+o.title+"” from the front list? (The Drive file stays.)"))send("del",{id:x.id})}
    else if(confirm("Hide “"+o.title+"” from students? (You can bring it back with the 👁 Hidden button. Old orders are not touched.)"))hideOpt(id)}));
   b.parentNode.insertBefore(d,b.nextSibling)})}
 box.appendChild(bar)};
})();