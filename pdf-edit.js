// pdf-edit.js: "Edit a PDF" tool = see every page, remove pages, add pages (from another PDF or photos) anywhere. Download the result or send it to print.
// Loaded AFTER app.js (uses its helpers: $, say, show, save, openPdf, needPdfLib, photoJpeg, isImgFile, startUpload, bearReact).
(function(){
var PE=[],SRC=[],peAt=0,peName="file",peView=-1,peTok=0,PE_MAX=300;
var st=document.createElement("style");
st.textContent=".peg{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin:10px 0}"+
".pet{position:relative;border:1px solid #ccc;border-radius:10px;padding:6px;text-align:center;background:#fff;color:#222}"+
".pet canvas,.pet img{width:100%;height:auto;display:block;border-radius:4px;cursor:zoom-in;min-height:60px}"+
".pet.rm canvas,.pet.rm img{opacity:.25;filter:grayscale(1)}"+
".pet .pn{position:absolute;top:2px;left:2px;background:#222;color:#fff;border-radius:8px;font-size:12px;padding:1px 7px;z-index:1}"+
".pet.rm .pn{background:#c0392b}"+
".pet .pb{display:flex;gap:4px;margin-top:6px}.pet .pb button{flex:1;margin:0;padding:4px 0;min-height:36px}"+
".peov{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px}"+
".peov .st{overflow:auto;max-width:100%;max-height:78vh}.peov .st canvas,.peov .st img{max-width:100%;max-height:76vh;background:#fff;display:block;margin:auto}"+
".peov .rw{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center;color:#fff}.peov .rw button{margin:0}";
document.head.appendChild(st);

function isPdf(f){return /pdf/i.test(f.type||"")||/\.pdf$/i.test(f.name||"")}
function kept(){return PE.filter(function(x){return !x.rm}).length}
function busy(t){$("peBusy").textContent=t}

async function peDraw(it,cv,w){
 var pg=await SRC[it.s].doc.getPage(it.i+1),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:w/v0.width});
 cv.width=Math.round(v.width);cv.height=Math.round(v.height);
 var x=cv.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);
 await pg.render({canvasContext:x,viewport:v}).promise}

async function peThumbs(){
 for(var k=0;k<PE.length;k++){var it=PE[k];
  if(it.img||it.done)continue;it.done=true;
  try{await peDraw(it,it.el,220)}catch(e){}}}

function peRender(){
 $("pePick").classList.toggle("hidden",!!PE.length);$("peBody").classList.toggle("hidden",!PE.length);$("peOk").classList.add("hidden");
 var g=$("peGrid");g.innerHTML="";var n=0;
 PE.forEach(function(it,k){
  if(!it.el){if(it.img){it.el=new Image();it.el.alt="Photo";it.el.src=it.url}else it.el=document.createElement("canvas")}
  it.el.onclick=function(){peOpenView(k)};
  var d=document.createElement("div");d.className="pet"+(it.rm?" rm":"");
  var b=document.createElement("span");b.className="pn";b.textContent=it.rm?"✕":String(++n);d.appendChild(b);d.appendChild(it.el);
  var r=document.createElement("div");r.className="pb";
  r.innerHTML='<button type="button" class="s danger" data-r="'+k+'" title="'+(it.rm?"Put this page back":"Remove this page")+'">'+(it.rm?"↩":"✕")+'</button><button type="button" class="s" data-a="'+k+'" title="Add pages after this one">＋</button>';
  d.appendChild(r);g.appendChild(d)});
 var k2=kept(),rm=PE.length-k2;
 $("peInfo").textContent=PE.length?k2+" page"+(k2===1?"":"s")+" will be in your PDF"+(rm?" ("+rm+" removed)":"")+". ✕ removes a page (↩ brings it back), ＋ adds pages after it, tap a page to see it bigger.":"";
 $("peDl").disabled=$("pePrint").disabled=!k2;
 peThumbs()}

async function peInsert(fs,at){
 fs=Array.prototype.slice.call(fs);if(!fs.length)return;say("errPe","");busy("⏳ Adding…");
 var bad=[],add=[];
 for(var i=0;i<fs.length;i++){var f=fs[i];
  try{
   if(isPdf(f)){var buf=await f.arrayBuffer(),doc=await openPdf(buf),si=SRC.push({buf:buf,doc:doc})-1;for(var k=0;k<doc.numPages;k++)add.push({s:si,i:k})}
   else if(isImgFile(f))add.push({img:f,url:URL.createObjectURL(f)});
   else bad.push(f.name||"file")}
  catch(e){bad.push(f.name||"file")}}
 var cut=false;if(PE.length+add.length>PE_MAX){add=add.slice(0,Math.max(0,PE_MAX-PE.length));cut=true}
 PE.splice.apply(PE,[at,0].concat(add));busy("");peRender();
 if(bad.length)say("errPe","Could not use: "+bad.join(", ")+". Only PDF files and photos work here (a PDF locked with a password cannot be opened).");
 else if(cut)say("errPe","Only "+PE_MAX+" pages fit. Extra pages were not added.")}

async function peOpenFile(f){
 if(!f)return;if(!isPdf(f)){say("errPe","Please choose a PDF file.");return}
 PE.forEach(function(x){if(x.url)URL.revokeObjectURL(x.url)});PE=[];SRC=[];peName=(f.name||"file").replace(/\.pdf$/i,"");
 await peInsert([f],0)}

// ----- big preview of one page -----
function peOv(){var o=$("peov");if(o)return o;
 o=document.createElement("div");o.id="peov";o.className="peov hidden";
 o.innerHTML='<div class="st" id="peSt"></div><div class="rw"><button type="button" class="s" id="pePrev">◀</button><span id="peLab"></span><button type="button" class="s" id="peNext">▶</button><button type="button" class="s danger" id="peRm"></button><button type="button" class="p" id="peClose">Close</button></div>';
 document.body.appendChild(o);
 $("peClose").onclick=function(){o.classList.add("hidden");peView=-1};
 o.addEventListener("click",function(e){if(e.target===o)$("peClose").click()});
 $("pePrev").onclick=function(){if(peView>0)peOpenView(peView-1)};
 $("peNext").onclick=function(){if(peView<PE.length-1)peOpenView(peView+1)};
 $("peRm").onclick=function(){PE[peView].rm=!PE[peView].rm;peRender();peOpenView(peView)};
 return o}
async function peOpenView(k){
 var o=peOv(),it=PE[k],tok=++peTok;peView=k;o.classList.remove("hidden");
 $("peLab").textContent="Page "+(k+1)+" of "+PE.length+(it.rm?" (removed)":"");
 $("peRm").textContent=it.rm?"↩ Put back":"✕ Remove this page";
 $("pePrev").disabled=k===0;$("peNext").disabled=k===PE.length-1;
 var s=$("peSt");s.innerHTML="";
 if(it.img){var im=new Image();im.src=it.url;s.appendChild(im);return}
 var cv=document.createElement("canvas");s.appendChild(cv);
 try{await peDraw(it,cv,900)}catch(e){if(tok===peTok)s.textContent="Could not show this page."}}

// ----- make the new PDF -----
async function peBuild(){
 await needPdfLib();var out=await PDFLib.PDFDocument.create(),cache={};
 for(var k=0;k<PE.length;k++){var it=PE[k];if(it.rm)continue;
  if(it.img){var p=await photoJpeg(it.img),land=p.w>p.h*1.05,PW=land?841.89:595.28,PH=land?595.28:841.89,M=18,sc=Math.min((PW-2*M)/p.w,(PH-2*M)/p.h),dw=p.w*sc,dh=p.h*sc,im=await out.embedJpg(p.bytes),pg=out.addPage([PW,PH]);
   pg.drawImage(im,{x:(PW-dw)/2,y:(PH-dh)/2,width:dw,height:dh})}
  else{var lib=cache[it.s]||(cache[it.s]=await PDFLib.PDFDocument.load(SRC[it.s].buf,{ignoreEncryption:true})),cp=await out.copyPages(lib,[it.i]);out.addPage(cp[0])}}
 return new File([await out.save()],peName+"-edited.pdf",{type:"application/pdf"})}

// ----- buttons -----
$("peOpen").onclick=function(){PE.forEach(function(x){if(x.url)URL.revokeObjectURL(x.url)});PE=[];SRC=[];say("errPe","");busy("");peRender();show(["se"]);$("peFile").click();needPdfLib().catch(function(){})};
$("peBack").onclick=function(){show(["s1"])};
$("peFile").onchange=function(){var f=this.files[0];this.value="";peOpenFile(f)};
$("peIns").onchange=function(){var fs=Array.prototype.slice.call(this.files);this.value="";peInsert(fs,peAt)};
$("peGrid").addEventListener("click",function(e){var t=e.target.closest("button");if(!t)return;
 var r=t.getAttribute("data-r"),a=t.getAttribute("data-a");
 if(r!==null){PE[+r].rm=!PE[+r].rm;peRender()}
 else if(a!==null){peAt=+a+1;$("peIns").click()}});
$("peStart").onclick=function(){peAt=0;$("peIns").click()};
$("peDl").onclick=async function(){var b=this;b.disabled=true;b.textContent="⏳ Making your PDF…";say("errPe","");
 try{var f=await peBuild();await save(f,f.name);$("peOk").classList.remove("hidden");bearReact("cheer")}
 catch(e){say("errPe",e&&e.message==="blocked"?"Could not load the PDF maker here. Open this page in your browser and try again.":(e&&e.message)||"Could not make the PDF.")}
 finally{b.textContent="📥 Download PDF";b.disabled=!kept()}};
$("pePrint").onclick=async function(){var b=this;b.disabled=true;say("errPe","");
 try{var f=await peBuild();await startUpload(f)}catch(e){say("errPe",(e&&e.message)||"Could not make the PDF.")}
 finally{b.disabled=!kept()}};

// Photos -> PDF: tapping its button on the first screen also opens the photo picker straight away
if($("ppOpen"))$("ppOpen").addEventListener("click",function(){if($("ppAdd"))$("ppAdd").click()});
// show() must also hide/show this card
var _s=show;show=function(ids){_s(ids);$("se").classList.toggle("hidden",ids.indexOf("se")<0)};

// drop on this page: first drop opens the PDF, later drops add pages at the end
window.peDrop=async function(fs){
 if(!PE.length){var f=fs.filter(isPdf)[0];if(f)return peOpenFile(f);say("errPe","Drop a PDF file first.");return}
 await peInsert(fs,PE.length)};
})();
