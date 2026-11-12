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
 '<button class="s" id="vRef" style="margin:0 0 10px">🔄 Refresh visitors</button> <button class="s" id="vMine" style="margin:0 0 10px">📵 Don’t count this device</button>'+
 '<label class="tiny" style="display:flex;align-items:center;gap:8px;margin:0 0 8px"><input type="checkbox" id="vTd" style="width:18px;height:18px;min-width:18px;padding:0;margin:0;flex:none"> Only IDs that visited today</label>'+
 '<table><thead id="vHead"><tr><th data-k="id">ID</th><th data-k="name">Name</th><th data-k="visits">Visits</th><th data-k="devices">Devices</th><th data-k="ts">Last visit</th><th data-k="today">Today</th><th data-k="ai">🤖 AI</th><th data-k="aiToday">🤖 Today</th></tr></thead><tbody id="vRows"></tbody></table>'+
 '<p class="note" id="vNone"></p>'+
 '<div class="tiny" style="margin:12px 0 4px;font-weight:600">Last days</div>'+
 '<table><thead><tr><th>Day</th><th>All visits</th><th>ID visits</th><th>Guest visits</th></tr></thead><tbody id="vDays"></tbody></table>'+
 '<div class="tiny" style="margin:14px 0 4px;font-weight:600">📱 My devices</div><div class="tiny" id="vMyN"></div><table><thead><tr><th>Device</th><th>ID</th><th>Visits</th><th>Last visit</th><th>Mine</th></tr></thead><tbody id="vMy"></tbody></table>'+
 '<div class="tiny" style="margin:14px 0 4px;font-weight:600">⏰ Busy hours (last 14 days, Dhaka time)</div><div id="vHr"></div>'+
 '<p class="tiny" style="margin-top:10px">A visit = one browser opening the site (counted once per tab session). "Devices" = different phones/computers that used that ID. Guest = no ID known. Tick “Mine” for your own devices so they are not counted. Tap a column title to sort, tap an ID to see the days it visited.</p></div>';
ad.appendChild(box);
function $(i){return document.getElementById(i)}
function nameOf(id){try{if(typeof STUDENTS!=="undefined"&&STUDENTS[id])return STUDENTS[id]}catch(e){}return ls("askNm:"+id)||""}
function msg(t){$("vSum").textContent=t}
var TODAY="",R=null,SK="id",SD=1,HIST={},MINE=false;
function mineBtn(){$("vMine").textContent=MINE?"✅ This device is not counted (tap to count again)":"📵 Don’t count this device"}
function renderRows(){
 if(!R)return;var td=(R.days&&R.days[0]&&R.days[0].d===R.today)?R.days[0]:{v:0,g:0},only=$("vTd").checked;
 var a=R.ids.filter(function(o){return!only||o.today>0});
 a.sort(function(x,y){var p,q;if(SK==="name"){p=nameOf(x.id).toLowerCase();q=nameOf(y.id).toLowerCase()}else{p=x[SK];q=y[SK]}
  return(p<q?-1:p>q?1:(x.id<y.id?-1:1))*SD});
 var h=a.map(function(o){return'<tr data-id="'+esc(o.id)+'" style="cursor:pointer"><td>'+esc(o.id)+"</td><td>"+esc(nameOf(o.id))+"</td><td><b>"+o.visits+"</b></td><td>"+o.devices+"</td><td>"+esc(o.last)+"</td><td>"+(o.today?"<b>"+o.today+"</b>":"")+"</td><td>"+(o.ai||"")+"</td><td>"+(o.aiToday?"<b>"+o.aiToday+"</b>":"")+"</td></tr>"}).join("");
 if(!only||td.g>0)h+='<tr><td>👤 Guest</td><td>no ID</td><td><b>'+R.guest.visits+"</b></td><td>"+R.guest.devices+"</td><td>"+esc(R.guest.last)+"</td><td>"+(td.g?"<b>"+td.g+"</b>":"")+"</td><td>"+(R.guest.ai||"")+"</td><td>"+(R.guest.aiToday?"<b>"+R.guest.aiToday+"</b>":"")+"</td></tr>";
 $("vRows").innerHTML=h;$("vNone").textContent=a.length?"":(only?"No student ID has visited today.":"No student ID has visited yet.");
 Array.from($("vHead").querySelectorAll("th")).forEach(function(t){var k=t.getAttribute("data-k");t.style.cursor="pointer";t.textContent=t.textContent.replace(/ [▲▼]$/,"")+(k===SK?(SD>0?" ▲":" ▼"):"")})}
function renderMy(){var a=R.mydevs||[];
 $("vMyN").textContent=a.length?"Devices marked as mine (not counted) or that typed my ID. Untick a device to count it again; tick a stranger's device that is not mine only if you are sure.":"No device yet. Open Admin on your phone/computer once and it is added here.";
 $("vMy").innerHTML=a.map(function(o){return"<tr><td>"+esc(o.dev.slice(0,6))+(o.dev===DEV?" (this one)":"")+"</td><td>"+esc(o.id||"guest")+"</td><td>"+o.visits+"</td><td>"+esc(o.last)+'</td><td><input type="checkbox" data-dev="'+esc(o.dev)+'"'+(o.mine?" checked":"")+' style="width:20px;height:20px;min-width:20px;padding:0;margin:0"></td></tr>'}).join("")}
function renderHours(hs){var mx=Math.max.apply(null,hs.concat([1])),b="",l="";
 hs.forEach(function(n,i){b+='<div title="'+i+':00 – '+n+' visit'+(n===1?"":"s")+'" style="flex:1;min-width:0;height:'+(n?Math.max(3,Math.round(n/mx*100)):0)+'%;background:currentColor;opacity:.55;border-radius:3px 3px 0 0"></div>';l+='<div style="flex:1;text-align:center">'+(i%3===0?i:"")+"</div>"});
 $("vHr").innerHTML='<div style="display:flex;align-items:flex-end;gap:2px;height:70px;border-bottom:1px solid var(--line)">'+b+'</div><div class="tiny" style="display:flex;gap:2px">'+l+"</div>"+(mx>1||hs.some(Boolean)?"":'<div class="tiny">No visits yet.</div>')}
async function loadV(askPin){
 var pin=ss("pin");
 if(!pin){if(!askPin){msg("Press “Refresh visitors” (it asks for the admin PIN).");return}pin=prompt("Admin PIN")||"";if(!pin)return;ss("pin",pin)}
 msg("⏳ Loading…");
 try{
  var r=await (await fetch(SCRIPT_URL+"?"+new URLSearchParams({visits:1,pin:pin,dev:DEV}))).json();
  if(r&&r.error==="pin"){ss("pin",null);ntfOff();msg("Wrong PIN. Press Refresh visitors to try again.");return}
  if(!r||!r.ok){msg("The Apps Script does not have the visitor part yet (Code.gs + New version).");return}
  R=r;HIST={};MINE=!!r.mine;mineBtn();TODAY=r.today;var td=(r.days&&r.days[0]&&r.days[0].d===r.today)?r.days[0]:{v:0,g:0};
  msg("Total visits: "+r.total+" · Today: "+td.v+" visits (🪪 ID "+(td.v-td.g)+" · 👤 guest "+td.g+") from "+(r.todayDevices||0)+" device"+(r.todayDevices===1?"":"s")+" and "+(r.todayIds||0)+" ID"+(r.todayIds===1?"":"s")+" · 🤖 AI today: "+(r.aiToday||0)+" from "+(r.aiUsersToday||0)+" ID"+(r.aiUsersToday===1?"":"s")+" (total "+(r.aiTotal||0)+") · 🧑 My visits (not in the total): "+(r.myVisits||0)+" · All devices: "+r.devices+" · IDs seen: "+r.ids.length+" · Guest visits: "+r.guest.visits+" ("+r.guest.devices+" device"+(r.guest.devices===1?"":"s")+")");
  renderRows();renderMy();renderHours(r.hours||[]);
  if(!ls("mineAuto")&&!MINE){ls("mineAuto","1");setMine(DEV,true)}
  $("vDays").innerHTML=(r.days||[]).map(function(d){return"<tr><td>"+esc(d.d)+"</td><td>"+d.v+"</td><td><b>"+(d.v-d.g)+"</b></td><td>"+d.g+"</td></tr>"}).join("")||'<tr><td colspan="4">No visits yet.</td></tr>';ntfBtn()
 }catch(e){msg("Could not load visitors: "+(e.message||e))}}
$("vTd").onchange=renderRows;
$("vHead").onclick=function(e){var t=e.target.closest("th");if(!t)return;var k=t.getAttribute("data-k");if(k===SK)SD=-SD;else{SK=k;SD=(k==="id"||k==="name")?1:-1}renderRows()};
$("vRows").onclick=async function(e){var tr=e.target.closest("tr[data-id]");if(!tr)return;var nx=tr.nextElementSibling;
 if(nx&&nx.className==="vD"){nx.remove();return}
 var id=tr.getAttribute("data-id"),d=document.createElement("tr");d.className="vD";d.innerHTML='<td colspan="8" class="tiny">⏳ Loading…</td>';tr.after(d);
 try{if(!HIST[id]){var r=await (await fetch(SCRIPT_URL+"?"+new URLSearchParams({visitdays:1,pin:ss("pin")||"",id:id}))).json();
   if(r&&r.error==="pin"){ss("pin",null);ntfOff();d.remove();return}
   if(!r||!r.ok){d.firstChild.textContent="Update Code.gs and deploy a New version.";return}HIST[id]=r.rows}
  d.firstChild.innerHTML=HIST[id].length?"<b>Days (visits · 🤖 AI):</b> "+HIST[id].map(function(o){return esc(o.d)+" (<b>"+o.n+"</b>"+(o.a?" · 🤖 "+o.a:"")+")"}).join(" · "):"No day history yet (it starts from the update)."}
 catch(x){d.firstChild.textContent="Could not load: "+(x.message||x)}};
async function setMine(dev,on){var pin=ss("pin");if(!pin){loadV(true);return}
 try{var r=await (await fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"mydev",pin:pin,dev:dev,on:on})})).json();
  if(r&&r.error==="pin"){ss("pin",null);ntfOff();msg("Wrong PIN. Press Refresh visitors to try again.");return}
  if(r&&r.ok){if(dev===DEV){MINE=!!r.mine;mineBtn()}loadV(false)}else msg("Update Code.gs and deploy a New version.")}catch(e){msg("Could not save: "+(e.message||e))}}
$("vMine").onclick=function(){setMine(DEV,!MINE)};
$("vMy").onchange=function(e){var c=e.target;if(c.getAttribute("data-dev"))setMine(c.getAttribute("data-dev"),c.checked)};
// ----- alert settings: the little 🔔 button is only created AFTER the server accepted the admin PIN, so students never see it -----
var NM=[["off","🔕 Off"],["all","👀 Every visit"],["id","🪪 Only students with an ID"],["new","🆕 Only first-time devices"],["guest","👤 Only guests (no ID)"],["watch","⭐ Only people on my list"]],ntfLoaded=false;
function ntfOff(){var x=$("vNtf");if(x)x.remove();ntfLoaded=false}
function ntfIds(ta){return Array.from(new Set((ta.value.match(/\d+/g)||[]).filter(function(x){return x.length===8})))}
function chanHtml(p,t,note){return'<div style="margin:0 0 12px;padding:8px;border:1px solid var(--line);border-radius:10px"><b class="tiny">'+t+'</b>'+(note?'<div class="tiny" id="'+p+'Note"></div>':'')+
 '<label style="display:flex;align-items:center;gap:8px;margin:8px 0;font-weight:600"><input type="checkbox" id="'+p+'Ord" style="width:20px;height:20px;min-width:20px;padding:0;margin:0;flex:none"> 🧸 New print orders</label>'+
 '<select id="'+p+'Mode" style="display:block;width:100%;margin:8px 0;padding:8px">'+NM.map(function(m){return'<option value="'+m[0]+'">'+m[1]+'</option>'}).join("")+'</select>'+
 '<div class="tiny">IDs on my list (8 digits, one per line):</div><textarea id="'+p+'Ids" rows="3" style="width:100%;margin:6px 0;padding:8px;box-sizing:border-box" placeholder="e.g. 25101003"></textarea><div class="tiny" id="'+p+'Names"></div></div>'}
function ntfBtn(){
 if($("vNtf"))return;var w=document.createElement("div");w.id="vNtf";w.style.cssText="margin-top:10px;text-align:right";
 w.innerHTML='<button type="button" class="s" id="lB" title="Logins" aria-label="Logins" style="padding:2px 8px;font-size:13px;opacity:.5;margin-right:4px">🔑</button><button type="button" class="s" id="nB" title="Alert settings" aria-label="Alert settings" style="padding:2px 8px;font-size:13px;opacity:.5">🔔</button>'+
  '<div id="lP" class="hidden" style="text-align:left;margin-top:8px;padding:10px;border:2px dashed var(--line);border-radius:12px;overflow-x:auto"><div class="tiny" id="lSum"></div>'+
  '<table><thead><tr><th>ID</th><th>Name</th><th>Logins</th></tr></thead><tbody id="lIds"></tbody></table>'+
  '<div class="tiny" style="margin:10px 0 4px;font-weight:600">Latest logins</div>'+
  '<table><thead><tr><th>Time</th><th>ID</th><th>Name</th><th>How</th></tr></thead><tbody id="lRows"></tbody></table></div>'+
  '<div id="nP" class="hidden" style="text-align:left;margin-top:8px;padding:10px;border:2px dashed var(--line);border-radius:12px">'+
  chanHtml("n","📱 ntfy app",false)+chanHtml("t","✈️ Telegram",true)+
  '<button type="button" class="p" id="nSave" style="margin-top:4px">💾 Save</button> <button type="button" class="s" id="nTest" style="margin-top:4px">📨 Test all</button> <button type="button" class="s" id="tTest" style="margin-top:4px">✈️ Test Telegram</button> <span class="tiny" id="nMsg"></span>'+
  '<p class="tiny" style="margin-top:8px">Each app has its own settings, so you can use one, the other, or both. The list is used when “Only people on my list” is chosen (visits and logins).</p></div>';
 $("vSum").parentNode.appendChild(w);
 var P=$("nP"),M=$("nMsg"),CH=["n","t"];
 function names(c){$(c+"Names").textContent=ntfIds($(c+"Ids")).map(function(i){return i+(nameOf(i)?" · "+nameOf(i):"")}).join("  |  ")}
 CH.forEach(function(c){$(c+"Ids").addEventListener("input",function(){names(c)})});
 $("nB").onclick=async function(){P.classList.toggle("hidden");if(P.classList.contains("hidden")||ntfLoaded)return;
  M.textContent="⏳";try{var r=await (await fetch(SCRIPT_URL+"?"+new URLSearchParams({notify:1,pin:ss("pin")||""}))).json();
   if(r&&r.error==="pin"){ss("pin",null);ntfOff();return}
   if(!r||!r.ok){M.textContent="Update Code.gs (alert settings) and deploy a New version.";return}
   var cf={n:r.n||{mode:r.mode,ids:r.ids,orders:r.orders},t:r.t||{mode:"off",ids:[],orders:true}};
   CH.forEach(function(c){var o=cf[c];$(c+"Ord").checked=o.orders!==false;$(c+"Mode").value=o.mode||"off";$(c+"Ids").value=(o.ids||[]).join("\n");names(c)});
   $("tNote").textContent=r.tgReady?"✅ Telegram is connected.":"⚠️ Telegram is not set up yet (run setTelegram in Apps Script).";
   ntfLoaded=true;M.textContent=""}catch(e){M.textContent="Could not load: "+(e.message||e)}};
 $("lB").onclick=async function(){var LP=$("lP");LP.classList.toggle("hidden");if(LP.classList.contains("hidden"))return;
  $("lSum").textContent="⏳ Loading…";
  try{var r=await (await fetch(SCRIPT_URL+"?"+new URLSearchParams({logins:1,pin:ss("pin")||""}))).json();
   if(r&&r.error==="pin"){ss("pin",null);ntfOff();return}
   if(!r||!r.ok){$("lSum").textContent="Update Code.gs (logins part) and deploy a New version.";return}
   $("lSum").textContent="Total logins: "+r.total+" · Different IDs: "+r.ids.length;
   $("lIds").innerHTML=r.ids.map(function(o){return"<tr><td>"+esc(o.id)+"</td><td>"+esc(nameOf(o.id))+"</td><td><b>"+o.n+"</b></td></tr>"}).join("")||'<tr><td colspan="3">No logins yet.</td></tr>';
   $("lRows").innerHTML=r.rows.map(function(o){return"<tr><td>"+esc(o.t)+"</td><td>"+esc(o.id)+"</td><td>"+esc(nameOf(o.id))+"</td><td>"+esc(o.via)+"</td></tr>"}).join("")||'<tr><td colspan="4">No logins yet.</td></tr>'}
  catch(e){$("lSum").textContent="Could not load: "+(e.message||e)}};
 function testAlert(only){return async function(){M.textContent="⏳ Sending…";
  try{var r=await (await fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"ntfytest",pin:ss("pin")||"",only:only})})).json();
   if(r&&r.error==="pin"){ss("pin",null);ntfOff();return}
   if(!r||!r.ok){M.textContent="Update Code.gs (ntfy test) and deploy a New version.";return}
   M.textContent=r.res.join(" · ")}catch(e){M.textContent="Could not test: "+(e.message||e)}}}
 $("nTest").onclick=testAlert("");$("tTest").onclick=testAlert("tg");
 $("nSave").onclick=async function(){
  var bad=[];CH.forEach(function(c){bad=bad.concat(($(c+"Ids").value.match(/\d+/g)||[]).filter(function(x){return x.length!==8}))});if(bad.length){M.textContent="IDs have 8 digits: "+bad.join(", ");return}
  function cfg(c){return{orders:$(c+"Ord").checked,mode:$(c+"Mode").value,ids:ntfIds($(c+"Ids"))}}
  M.textContent="⏳ Saving…";try{var r=await (await fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify({action:"notify",pin:ss("pin")||"",n:cfg("n"),t:cfg("t")})})).json();
   if(r&&r.error==="pin"){ss("pin",null);ntfOff();return}
   M.textContent=r&&r.ok?"✅ Saved":"Could not save (update Code.gs and deploy a New version)"}catch(e){M.textContent="Could not save: "+(e.message||e)}}}
$("vRef").onclick=function(){loadV(true)};
function maybe(){if(location.hash==="#admin")setTimeout(function(){loadV(false)},900)}
window.addEventListener("hashchange",maybe);maybe();
})();