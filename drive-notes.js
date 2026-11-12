/* drive-notes.js : adds the notes uploaded to Google Drive to the Notes list. Started EARLY by index.html (before the pictures finish loading).
   Drive folder -> Apps Script (web app) -> this list. Files in Notes/ on GitHub still work; same path = Drive version wins.
   The request starts the moment this file loads; index.html calls __driveMerge() right after notes-list.js, which waits for the request
   (6 s at most, counted from the start) and merges the two lists.
   NEW: if Drive is slow or fails, it keeps TRYING in the background (5 tries, growing pauses, also when the phone comes back online
   or the tab is opened again). The last good list is saved in the browser, so files show up at once next time. When the live list
   arrives late, notes.js (window.__driveLate) adds the files to the page by itself: no refresh needed.
   If every try fails, a small yellow bar says so, with a "Try again" button (nobody is left guessing why files are missing). */
window.DRIVE_URL="https://script.google.com/macros/s/AKfycbwWIdE7fnx2ebVUTLmC76zijR3QKW48tIjQsTk1wzfevQzpwYJ35gb52lMLhNaTA2-F/exec";
(function(){
var KEY="driveListCache",live=null,appliedSig="",state="loading",running=false,lastOk=0,banner=null,merged=false;
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function readCache(){try{var c=JSON.parse(localStorage.getItem(KEY)||"null");return c&&Array.isArray(c.l)&&c.l.length?c.l:null}catch(e){return null}}
function writeCache(l){try{localStorage.setItem(KEY,JSON.stringify({t:Date.now(),l:l}))}catch(e){}}
async function once(){
 var c=new AbortController(),t=setTimeout(function(){c.abort()},15000);   // Apps Script can take a few seconds to wake up
 try{var r=await fetch(window.DRIVE_URL,{signal:c.signal});if(!r.ok)throw new Error("http "+r.status);
  var d=await r.json();if(!Array.isArray(d))throw new Error("bad data");return d}
 finally{clearTimeout(t)}}
async function loop(){
 if(running)return live;running=true;state="loading";var pause=[1500,3000,6000,10000];
 for(var i=0;i<=pause.length;i++){
  try{var d=await once();live=d;state="ok";lastOk=Date.now();running=false;writeCache(d);hideBanner();window.__driveCheck();return d}
  catch(e){console.warn("Drive list, try "+(i+1)+" failed:",e);if(i<pause.length)await sleep(pause[i])}}
 state="failed";running=false;showBanner();return null}

// ----- the yellow "could not load" bar -----
function hideBanner(){if(banner){banner.remove();banner=null}}
function showBanner(){
 if(banner)return;if(!document.body){setTimeout(showBanner,500);return}
 var d=document.createElement("div");d.setAttribute("role","status");
 d.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:99998;background:#fff3cd;color:#5b4400;border:2px solid #f5a524;border-radius:12px;padding:10px 12px;font:600 14px system-ui,sans-serif;display:flex;gap:8px;align-items:center;flex-wrap:wrap";
 var s=document.createElement("span");s.style.flex="1 1 200px";s.textContent="☁️ Couldn't load the notes from Drive, so some files may be missing.";
 var b=document.createElement("button");b.textContent="Try again";b.style.cssText="padding:6px 12px;border-radius:8px;border:1px solid #f5a524;background:#fff;color:#5b4400;font:inherit;cursor:pointer";
 b.onclick=function(){b.textContent="Trying…";b.disabled=true;loop().then(function(){if(state==="failed"){b.textContent="Try again";b.disabled=false}})};
 var x=document.createElement("button");x.textContent="✕";x.setAttribute("aria-label","Close");x.style.cssText="padding:6px 10px;border-radius:8px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer";x.onclick=hideBanner;
 d.appendChild(s);d.appendChild(b);d.appendChild(x);document.body.appendChild(d);banner=d}

// ----- retry when the phone gets internet again or the tab is opened again -----
window.addEventListener("online",function(){if(state==="failed")loop()});
document.addEventListener("visibilitychange",function(){
 if(document.visibilityState!=="visible"||running)return;
 if(state==="failed"||(state==="ok"&&Date.now()-lastOk>10*60*1000))loop()});

// ----- start now; the page waits at most 6 s for it, then uses the saved list (if any) and the live one is added later -----
var first=loop();
window.__driveReady=Promise.race([first,sleep(6000).then(function(){return live||readCache()})]);

// index.html calls this right after notes-list.js (before notes.js builds the list)
window.__driveMerge=function(){return window.__driveReady.then(function(d){
 d=live||d;if(merged||!d)return;merged=true;appliedSig=JSON.stringify(d);
 d.forEach(function(f){f.dv=1});   // dv = came from Drive (notes.js replaces these when a newer list arrives)
 var have={};d.forEach(function(f){have[f.p]=1});
 window.NOTES_FILES=d.concat((window.NOTES_FILES||[]).filter(function(f){return!have[f.p]}));
})};

// the live list arrived after the page was built (or differs from the saved one): notes.js adds it live
window.__driveCheck=function(){
 if(!live||!window.__driveLate)return;
 var sig=JSON.stringify(live);if(sig===appliedSig)return;
 appliedSig=sig;merged=true;window.__driveLate(live)};
})();