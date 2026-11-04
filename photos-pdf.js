// photos-pdf.js: the "Photos -> PDF" tool. Loaded AFTER app.js (it uses app.js helpers like $, say, save, photosToPdf, loadImg, isImgFile, show).
window.__assetsReady.then(function(){
var A=window.APP,$=A.$,say=A.say,save=A.save,openPdf=A.openPdf,needPdfLib=A.needPdfLib,photosToPdf=A.photosToPdf,photoJpeg=A.photoJpeg,isImgFile=A.isImgFile,loadImg=A.loadImg,startUpload=A.startUpload,buildDocx=A.buildDocx,imgBlob=A.imgBlob,addScript=A.addScript,sleep=A.sleep,bearReact=A.bearReact,guideSteps=A.guideSteps,copyLink=A.copyLink,chromeUrl=A.chromeUrl,browserUrl=A.browserUrl,IAB=A.IAB,IOS=A.IOS,H2C=A.H2C,PHOTO_MAX=A.PHOTO_MAX,cur=A.cur,show=A.show;
// ----- Photos -> PDF tool (Download only tab): pick photos, put them in order, download ONE pdf -----
var PP=[],ppUrls=[];
function ppRender(){
 ppUrls.forEach(function(u){URL.revokeObjectURL(u)});ppUrls=PP.map(function(f){return URL.createObjectURL(f)});
 $("ppGrid").innerHTML=PP.map(function(f,i){return'<div class="pph"><span class="pn">'+(i+1)+'</span><img alt="Photo '+(i+1)+'" src="'+ppUrls[i]+'"><div class="pb"><button type="button" class="s" data-pm="'+i+'"'+(i===0?" disabled":"")+'>◀</button><button type="button" class="s" data-pp="'+i+'"'+(i===PP.length-1?" disabled":"")+'>▶</button><button type="button" class="s danger" data-px="'+i+'">✕</button></div></div>'}).join("");
 $("ppInfo").textContent=PP.length?PP.length+" photo"+(PP.length>1?"s":"")+" → "+PP.length+" page"+(PP.length>1?"s":"")+". Use ◀ ▶ to change the order, ✕ to remove, tap a photo to see it bigger.":"";
 $("ppDl").disabled=!PP.length;$("ppDl").textContent="📥 Download PDF"+(PP.length?" ("+PP.length+" page"+(PP.length>1?"s":"")+")":"")}
async function ppAddFiles(fs){
 fs=Array.prototype.slice.call(fs);if(!fs.length)return;say("errPp","");$("ppOk").classList.add("hidden");
 var bad=[],full=false;$("ppBusy").textContent="⏳ Adding…";
 for(var i=0;i<fs.length;i++){var f=fs[i];
  if(!isImgFile(f)){bad.push(f.name||"file");continue}
  if(PP.length>=PHOTO_MAX){full=true;break}
  try{var r=await loadImg(f);URL.revokeObjectURL(r.url);PP.push(f)}catch(e){bad.push(f.name||"photo")}}
 $("ppBusy").textContent="";
 if(bad.length)say("errPp","Could not use: "+bad.join(", ")+". Only photos (JPG, PNG…) work here. For iPhone HEIC photos, use Take a photo or open this page in Safari.");
 else if(full)say("errPp","Only "+PHOTO_MAX+" photos fit in one PDF.");
 ppRender()}
$("ppAdd").onchange=function(){var fs=Array.prototype.slice.call(this.files);this.value="";ppAddFiles(fs)};
$("ppCam").onchange=function(){var fs=Array.prototype.slice.call(this.files);this.value="";ppAddFiles(fs)};
$("ppGrid").addEventListener("click",function(e){var t=e.target,m=t.getAttribute("data-pm"),p=t.getAttribute("data-pp"),x=t.getAttribute("data-px");$("ppOk").classList.add("hidden");
 if(m!==null){m=+m;if(m>0){var a=PP[m];PP[m]=PP[m-1];PP[m-1]=a;ppRender()}}
 else if(p!==null){p=+p;if(p<PP.length-1){var b=PP[p];PP[p]=PP[p+1];PP[p+1]=b;ppRender()}}
 else if(x!==null){PP.splice(+x,1);ppRender()}});
$("ppDl").onclick=async function(){
 if(!PP.length)return;var b=this;b.disabled=true;b.textContent="⏳ Making your PDF…";say("errPp","");
 try{var f=await photosToPdf(PP),d=new Date(),z=function(n){return(n<10?"0":"")+n};
  await save(f,"Photos_"+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+"-"+z(d.getHours())+z(d.getMinutes())+".pdf");
  $("ppOk").classList.remove("hidden");bearReact("cheer")}
 catch(e){say("errPp",e&&e.message==="blocked"?"Could not load the PDF maker here. Open this page in your browser and try again.":(e&&e.message)||"Could not make the PDF. Try fewer photos.")}
 finally{ppRender()}};
$("ppOpen").onclick=function(){PP=[];$("ppOk").classList.add("hidden");say("errPp","");ppRender();show(["sp"]);needPdfLib().catch(function(){})};
$("ppBack").onclick=function(){show(["s1"])};
$("ppHelp").innerHTML+=guideSteps()+'<div class="frow">'+(IAB&&!IOS?'<button type="button" class="p" id="ppChrome">🌐 Open in Chrome</button><button type="button" class="s" id="ppOther">🌍 Other browser</button>':'')+'<button type="button" class="s" id="ppCopy">📋 Copy link</button></div>';
$("ppCopy").onclick=function(){copyLink(this)};if($("ppChrome"))$("ppChrome").onclick=function(){location.href=chromeUrl()};if($("ppOther"))$("ppOther").onclick=function(){location.href=browserUrl()};
if(IAB&&!IOS)$("ppHelp").open=true;
window.ppAddFiles=ppAddFiles;   // app.js drop handler calls this
});
