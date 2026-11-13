/* viewer-mode.js : the second ("view only") PIN. Loaded LAST in index.html. Asks the server which role the PIN has (admin / viewer);
   a viewer sees the admin page but no editing buttons. The real protection is on the server: it refuses every change for the viewer PIN. */
(function(){
var ss=function(k,v){try{if(v===undefined)return sessionStorage.getItem(k)||"";if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v)}catch(e){return""}};
var HIDE='#vMine,[id^="vMy"],#lB,#nB,#lP,#nP';
function apply(){var v=ss("role")==="viewer";document.documentElement.classList.toggle("viewer",v);
 if(v)document.querySelectorAll(HIDE).forEach(function(e){e.style.setProperty("display","none","important")})}
function check(){var p=ss("pin");if(!p){ss("role",null);apply();return}
 fetch(window.SCRIPT_URL+"?role=1&pin="+encodeURIComponent(p)).then(function(r){return r.json()}).then(function(d){
  var old=ss("role");ss("role",d&&d.role?d.role:null);apply();if(old!==ss("role"))window.dispatchEvent(new Event("rolechange"))}).catch(function(){})}
try{var _si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_si.apply(this,arguments);if(k==="pin"&&this===sessionStorage)setTimeout(check,50)}}catch(e){}
new MutationObserver(function(){if(ss("role")==="viewer")apply()}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("DOMContentLoaded",check);check();
})();
