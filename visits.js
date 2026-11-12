/* visits.js : counts visits and shows them in the Admin page (who = ID or guest). Loaded by index.html AFTER the other scripts.
   - Every browser gets a random device code (localStorage "visitDev"). One visit is counted per browser tab session.
   - Who: the ID the student typed (Ask-bear "askId" or the print form "me"). No ID known = guest.
   - Your own visits are NOT counted (when the admin PIN is open in this tab, or the page is #admin).
   - Needs the Apps Script part: Code-visits.gs. Admin panel appears at the bottom of the Admin page. */
(function(){
if(typeof SCRIPT_URL==="undefined"||!SCRIPT_URL)return;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}return null}
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v)}catch(e){}return null}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var DEV=ls("visitDev");
if(!/^[a-z0-9]{10,24}$/.test(DEV||"")){DEV=(Math.random().toString(36).slice(2)+Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g,"").slice(0,16);ls("visitDev",DEV)}
function myId(){var v=ls("askId")||"";if(/^\d{8}$/.test(v))return v;
 try{var m=JSON.parse(ls("me")||"null");if(m&&/^\d{8}$/.test(String(m.id)))return String(m.id)}catch(e){}return ""}
function send(id,add){try{fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"visit",dev:DEV,id:id,add:add?1:0})}).catch(function(){})}catch(e){}}

// ----- counting -----
var isAdmin=function(){return location.hash==="#admin"||!!ss("pin")};
if(!isAdmin()&&ss("visitSent")!=="1"){var id0=myId();ss("visitSent","1");ss("visitId",id0);send(id0,1)}
// the ID is often typed later in the same visit: tell the sheet once (does not count a second visit)
setInterval(function(){if(isAdmin()||ss("visitSent")!=="1")return;var id=myId();if(id&&id!==ss("visitId")){ss("visitId",id);send(id,0)}},15000);

// ----- admin panel -----
var ad=document.getElementById("admin");if(!ad)return;
var box=document.createElement("div");
box.innerHTML='<h2 class="h2">👀 Visitors</h2><div class="card" style="overflow-x:auto">'+
 '<div id="vSum" class="tiny" style="margin:0 0 8px"></div>'+
 '<button class="s" id="vRef" style="margin:0 0 10px">🔄 Refresh visitors</button>'+
 '<table><thead><tr><th>ID</th><th>Name</th><th>Visits</th><th>Devices</th><th>Last visit</th><th>Today</th></tr></thead><tbody id="vRows"></tbody></table>'+
 '<p class="note" id="vNone"></p>'+
 '<div class="tiny" style="margin:12px 0 4px;font-weight:600">Last days</div>'+
 '<table><thead><tr><th>Day</th><th>All visits</th><th>ID visits</th><th>Guest visits</th></tr></thead><tbody id="vDays"></tbody></table>'+
 '<p class="tiny" style="margin-top:10px">A visit = one browser opening the site (counted once per tab session). "Devices" = different phones/computers that used that ID. Guest = no ID known.</p></div>';
ad.appendChild(box);
function $(i){return document.getElementById(i)}
function nameOf(id){try{if(typeof STUDENTS!=="undefined"&&STUDENTS[id])return STUDENTS[id]}catch(e){}return ls("askNm:"+id)||""}
function msg(t){$("vSum").textContent=t}
var TODAY="";
function isToday(ts){try{return!!ts&&new Date(ts).toLocaleDateString("en-CA",{timeZone:"Asia/Dhaka"})===TODAY}catch(e){return false}}
async function loadV(askPin){
 var pin=ss("pin");
 if(!pin){if(!askPin){msg("Press “Refresh visitors” (it asks for the admin PIN).");return}pin=prompt("Admin PIN")||"";if(!pin)return;ss("pin",pin)}
 msg("⏳ Loading…");
 try{
  var r=await (await fetch(SCRIPT_URL+"?"+new URLSearchParams({visits:1,pin:pin}))).json();
  if(r&&r.error==="pin"){ss("pin",null);msg("Wrong PIN. Press Refresh visitors to try again.");return}
  if(!r||!r.ok){msg("The Apps Script does not have the visitor part yet (Code-visits.gs + New version).");return}
  TODAY=r.today;var td=(r.days&&r.days[0]&&r.days[0].d===r.today)?r.days[0]:{v:0,g:0};
  msg("Total visits: "+r.total+" · Today: "+td.v+" (🪪 ID "+(td.v-td.g)+" · 👤 guest "+td.g+")"+" · Different devices: "+r.devices+" · IDs seen: "+r.ids.length+" · Guest visits: "+r.guest.visits+" ("+r.guest.devices+" device"+(r.guest.devices===1?"":"s")+")");
  var h=r.ids.map(function(o){return"<tr><td>"+esc(o.id)+"</td><td>"+esc(nameOf(o.id))+"</td><td><b>"+o.visits+"</b></td><td>"+o.devices+"</td><td>"+esc(o.last)+"</td><td>"+(isToday(o.ts)?"✅":"")+"</td></tr>"}).join("");
  h+='<tr><td>👤 Guest</td><td>no ID</td><td><b>'+r.guest.visits+"</b></td><td>"+r.guest.devices+"</td><td>"+esc(r.guest.last)+"</td><td>"+(isToday(r.guest.ts)?"✅":"")+"</td></tr>";
  $("vRows").innerHTML=h;$("vNone").textContent=r.ids.length?"":"No student ID has visited yet.";
  $("vDays").innerHTML=(r.days||[]).map(function(d){return"<tr><td>"+esc(d.d)+"</td><td>"+d.v+"</td><td><b>"+(d.v-d.g)+"</b></td><td>"+d.g+"</td></tr>"}).join("")||'<tr><td colspan="4">No visits yet.</td></tr>'
 }catch(e){msg("Could not load visitors: "+(e.message||e))}}
$("vRef").onclick=function(){loadV(true)};
function maybe(){if(location.hash==="#admin")setTimeout(function(){loadV(false)},900)}
window.addEventListener("hashchange",maybe);maybe();
})();