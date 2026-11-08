/* drive-notes.js : adds the notes uploaded to Google Drive to the Notes list. Started EARLY by index.html (before the pictures finish loading).
   Drive folder -> Apps Script (web app) -> this list. Files in Notes/ on GitHub still work; same path = Drive version wins.
   The request starts the moment this file loads; index.html calls __driveMerge() right after notes-list.js, which waits for the request
   (6 s at most, counted from the start) and merges the two lists. If Drive is slow/offline the GitHub list is used alone. */
window.DRIVE_URL="https://script.google.com/macros/s/AKfycbwWIdE7fnx2ebVUTLmC76zijR3QKW48tIjQsTk1wzfevQzpwYJ35gb52lMLhNaTA2-F/exec";
window.__driveReady=(async function(){
 try{
  var c=new AbortController(),t=setTimeout(function(){c.abort()},6000);
  var r=await fetch(window.DRIVE_URL,{signal:c.signal});clearTimeout(t);
  var d=await r.json();return Array.isArray(d)?d:null;
 }catch(e){console.warn("Drive list not loaded:",e);return null}
})();
var __driveMerged=false;
window.__driveMerge=function(){return window.__driveReady.then(function(d){
 if(__driveMerged||!d)return;__driveMerged=true;
 var have={};d.forEach(function(f){have[f.p]=1});
 window.NOTES_FILES=d.concat((window.NOTES_FILES||[]).filter(function(f){return!have[f.p]}));
})};