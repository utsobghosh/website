// docx-pdf.js: "Download as PDF" for Word files (cover pages, uploaded .docx) and for photos. Loaded AFTER app.js.
// How: the Word file is drawn on the page (docx-preview), each page is photographed (html2canvas) and put in a PDF.
// Note: the PDF pages are pictures, so text in them cannot be selected/copied. Works for .docx only (not old .doc / PowerPoint).
(function(){
function b64Blob(b64,mime){var s=atob(b64),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Blob([u],{type:mime||"application/octet-stream"})}
async function docxPages(blob){
 if(!window.html2canvas)await addScript(H2C);
 var host=document.createElement("div");host.style.cssText="position:fixed;left:0;top:0;width:900px;z-index:-1;pointer-events:none";document.body.appendChild(host);
 try{
  await docx.renderAsync(blob,host,null,{className:"docx",inWrapper:true,ignoreLastRenderedPageBreak:true});
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  var secs=host.querySelectorAll("section.docx");if(!secs.length)throw new Error("Could not read this Word file.");
  var cs=[];for(var i=0;i<secs.length;i++)cs.push(await html2canvas(secs[i],{scale:2,backgroundColor:"#fff",logging:false,useCORS:true}));
  return cs}
 finally{host.remove()}}
async function docxToPdf(blob){
 var cs=await docxPages(blob);await needPdfLib();var out=await PDFLib.PDFDocument.create();
 for(var i=0;i<cs.length;i++){var c=cs[i],
  by=Uint8Array.from(atob(c.toDataURL("image/jpeg",.9).split(",")[1]),function(x){return x.charCodeAt(0)}),
  im=await out.embedJpg(by),W=595.28,H=W*c.height/c.width,pg=out.addPage([W,H]);
  pg.drawImage(im,{x:0,y:0,width:W,height:H})}
 return new File([await out.save()],"file.pdf",{type:"application/pdf"})}
// Word -> photo(s): one JPG per page
async function saveJpgs(blob,base){var cs=await docxPages(blob);
 for(var i=0;i<cs.length;i++){var b=await new Promise(function(r){cs[i].toBlob(r,"image/jpeg",.92)});
  await save(b,base+(cs.length>1?"_page"+(i+1):"")+".jpg");if(i<cs.length-1)await sleep(900)}}
function oops(id,e){say(id,"Could not make the PDF here: "+((e&&e.message)||e)+". Try opening this page in your browser.")}
async function run(btn,errId,job){var t=btn.textContent;btn.disabled=true;btn.textContent="⏳ Making PDF…";say(errId,"");
 try{await job();btn.textContent="✅ Downloaded. Look in your Downloads folder (or the Files app)";setTimeout(function(){btn.textContent=t},2500)}
 catch(e){btn.textContent=t;oops(errId,e)}finally{btn.disabled=false}}

// ----- Preview page: cover page (Word) or photo -> PDF -----
$("dlPdf").onclick=function(){run(this,"errS3",async function(){
 var o=cur.opt,f,name;
 if(o.img){f=await photosToPdf([new File([imgBlob(cur.tab.key)],cur.tab.file,{type:"image/jpeg"})]);name=cur.tab.file.replace(/\.[A-Za-z0-9]+$/,"")+".pdf"}
 else{f=await docxToPdf(await buildDocx([{id:cur.id,name:cur.name,section:cur.section,copies:1}]));name="Math_Cover_Page_"+cur.id+".pdf"}
 await save(f,name)})};

$("dlJpg").onclick=function(){run(this,"errS3",async function(){await saveJpgs(await buildDocx([{id:cur.id,name:cur.name,section:cur.section,copies:1}]),"Math_Cover_Page_"+cur.id)})};
var _sh=show;show=function(ids){_sh(ids);if(ids[0]==="s3")$("dlJpg").classList.toggle("hidden",!!(cur.opt&&cur.opt.img))};   // photos are already photos

// ----- Upload page: conversions depend on what was uploaded -----
// photo -> PDF | PDF -> photo(s) | Word -> PDF or photo(s) | PowerPoint -> none
function upKind(){var n=cur.file&&cur.file.name||"";
 return /\.docx$/i.test(n)?"docx":/\.pdf$/i.test(n)?"pdf":/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(n)?"img":""}
function upFile(){return b64Blob(cur.file.b64,cur.file.mime)}
function upBase(){return cur.file.name.replace(/\.[A-Za-z0-9]+$/,"")}
async function pdfToJpgs(blob,base){
 var doc=await openPdf(await blob.arrayBuffer()),n=Math.min(doc.numPages,30);
 for(var i=1;i<=n;i++){var pg=await doc.getPage(i),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:Math.min(3,1600/v0.width)}),c=document.createElement("canvas");
  c.width=Math.round(v.width);c.height=Math.round(v.height);var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
  await pg.render({canvasContext:x,viewport:v}).promise;
  var b=await new Promise(function(r){c.toBlob(r,"image/jpeg",.92)});
  await save(b,base+(doc.numPages>1?"_page"+i:"")+".jpg");if(i<n)await sleep(900)}
 if(doc.numPages>30)say("errSu","Only the first 30 pages were saved as photos.")}
// ----- Upload page: extra buttons -----
function upd(){var k=upKind(),multi=!!(cur.photos&&cur.photos.length>1);   // several photos are already one PDF: no photo button
 var a=$("suDlPdf"),b=$("suDlJpg");
 if(a)a.classList.toggle("hidden",!(k==="docx"||k==="img"));
 if(b)b.classList.toggle("hidden",!(k==="docx"||(k==="pdf"&&!multi)))}
function addBtns(){var d=$("suDl");if(!d||$("suDlPdf"))return;
 d.insertAdjacentHTML("afterend",'<button type="button" class="s wide hidden" id="suDlPdf">📄 Download as PDF</button><button type="button" class="s wide hidden" id="suDlJpg">🖼️ Download as photo</button>');
 $("suDlJpg").onclick=function(){run(this,"errSu",async function(){if(!cur.file)return;var k=upKind();if(k==="docx")await saveJpgs(upFile(),upBase());else if(k==="pdf")await pdfToJpgs(upFile(),upBase())})};
 $("suDlPdf").onclick=function(){run(this,"errSu",async function(){
  if(!cur.file)return;var k=upKind(),f;
  if(k==="docx")f=await docxToPdf(upFile());else if(k==="img")f=await photosToPdf([new File([upFile()],cur.file.name,{type:cur.file.mime||"image/jpeg"})]);else return;
  await save(f,upBase()+".pdf")})}}
var _rr=renderUpload;renderUpload=function(){_rr.apply(this,arguments);addBtns();upd()};
var _ru=readUpload;readUpload=async function(){var r=await _ru.apply(this,arguments);upd();return r};
// safety net: whichever path loaded the file (picker, drag and drop, photos), keep the buttons in step with the upload card
var _sb=$("suBody"),_busy=false;
if(_sb)new MutationObserver(function(){if(_busy)return;_busy=true;setTimeout(function(){_busy=false;addBtns();upd()},50)}).observe(_sb,{childList:true,subtree:true});
})();
