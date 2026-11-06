/* drive-notes.js : adds the notes uploaded to Google Drive to the Notes list. Loaded BEFORE notes.js (see index.html).
   Drive folder -> Apps Script (web app) -> this list. Files in Notes/ on GitHub still work; same path = Drive version wins.
   If Drive is slow/offline (6s) the GitHub list is used alone. */
window.DRIVE_URL="https://script.google.com/macros/s/AKfycbwWIdE7fnx2ebVUTLmC76zijR3QKW48tIjQsTk1wzfevQzpwYJ35gb52lMLhNaTA2-F/exec";
window.__driveReady=(async function(){
 try{
  var c=new AbortController(),t=setTimeout(function(){c.abort()},6000);
  var r=await fetch(window.DRIVE_URL,{signal:c.signal});clearTimeout(t);
  var d=await r.json();if(!Array.isArray(d))return;
  var have={};d.forEach(function(f){have[f.p]=1});
  window.NOTES_FILES=d.concat((window.NOTES_FILES||[]).filter(function(f){return!have[f.p]}));
 }catch(e){console.warn("Drive list not loaded:",e)}
})();