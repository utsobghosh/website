/* ===== Loads the pictures and the Word template, then starts the page =====
   They are separate files next to index.html (see ASSET_FILES in index.html), so this code stays small. */
var IMAGES={},THUMBS={},TEMPLATE_DOCX="",ASSET_ERRORS=[];
window.__assetsReady=(function(){
 function mimeOf(f){return /\.png$/i.test(f)?"image/png":/\.webp$/i.test(f)?"image/webp":/\.docx$/i.test(f)?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"image/jpeg"}
 function getBlob(file,n){var c=window.AbortController?new AbortController():null,t=setTimeout(function(){if(c)c.abort()},15000);   // a stuck download is stopped after 15 s and tried once more
  return fetch(file,c?{signal:c.signal}:{}).then(function(r){if(!r.ok)throw new Error(r.status);return r.blob()}).then(function(b){clearTimeout(t);return b},function(e){clearTimeout(t);if(n>0)return getBlob(file,n-1);throw e})}
 function runQ(fs,n){var i=0;function w(){if(i>=fs.length)return Promise.resolve();return fs[i++]().then(w)}var ws=[];for(var k=0;k<n;k++)ws.push(w());return Promise.all(ws)}   // 4 downloads at a time: lighter for weak phones
 function dataUrl(file){return getBlob(file,1).then(function(b){return new Promise(function(res,rej){var f=new FileReader();f.onload=function(){res(String(f.result))};f.onerror=function(){rej(new Error("read"))};f.readAsDataURL(new Blob([b],{type:mimeOf(file)}))})})}
 var v=(typeof ASSET_VERSION!=="undefined"&&ASSET_VERSION)?"?v="+encodeURIComponent(ASSET_VERSION):"",jobs=[],F=ASSET_FILES||{};
 function job(file,put){jobs.push(function(){return dataUrl(file+v).then(put).catch(function(){ASSET_ERRORS.push(file)})})}
 if(F.template)job(F.template,function(d){TEMPLATE_DOCX=d.split(",")[1]});
 Object.keys(F.images||{}).forEach(function(k){job(F.images[k],function(d){IMAGES[k]=d})});
 Object.keys(F.thumbs||{}).forEach(function(k){job(F.thumbs[k],function(d){THUMBS[k]=d})});
 return Promise.race([runQ(jobs,4),new Promise(function(r){setTimeout(r,25000)})]).then(function(){   // the page always starts (after 25 s at the latest)
  if(!ASSET_ERRORS.length)return;
  var d=document.createElement("div");d.style.cssText="position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#fff3cd;color:#5b4400;border:2px solid #f5a524;border-radius:12px;padding:10px 12px;font:600 14px system-ui,sans-serif";
  d.textContent="⚠️ Some pictures or files could not load ("+ASSET_ERRORS.join(", ")+"). If you opened this page from your computer, open the website link instead.";
  var x=document.createElement("button");x.textContent="✕";x.style.cssText="margin-left:8px";x.onclick=function(){d.remove()};d.appendChild(x);document.body.appendChild(d)})})();

/* ===== Main code. You do not need to edit anything below. ===== */
window.__assetsReady.then(function(){
var $=function(i){return document.getElementById(i)};
function buzz(p){if(VIBRATE_ON&&navigator.vibrate){try{navigator.vibrate(p)}catch(e){}}}
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("button,.opt,.tab");if(t&&!t.disabled)buzz(BUTTON_BUZZ_MS)});   // buttons buzz, typing boxes do not
var cur={opt:null,id:"",name:""},mode="print";

// ----- Settings applied to the page -----
document.title=PAGE_TITLE;
$("confirm").textContent="🖨️ Confirm and send to "+OWNER_NAME+" to print";
document.querySelector("#student h1").textContent=PAGE_TITLE;
document.querySelector("#student .sub").textContent=SUBTITLE;
$("copies").max=MAX_COPIES;
var calm=matchMedia("(prefers-reduced-motion: reduce)").matches||!EFFECTS_ON;
if(!calm){var fl=document.createElement("div");fl.className="floaties";fl.setAttribute("aria-hidden","true");
 for(var q=0;q<9;q++){var sp=document.createElement("span");sp.textContent=FLOATING_EMOJIS[q%FLOATING_EMOJIS.length];sp.style.left=(q*11+4)+"%";sp.style.animationDuration=(24+(q*3)%12)+"s";sp.style.animationDelay="-"+((q*5)%25)+"s";fl.appendChild(sp)}
 document.body.insertBefore(fl,document.body.firstChild)}


// ----- Date text like "11 Feb, 2026 8:11:34 PM" -----
function nowStr(){var d=new Date(),m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()],h=d.getHours()%12||12,z=function(n){return(n<10?"0":"")+n};
 return d.getDate()+" "+m+", "+d.getFullYear()+" "+h+":"+z(d.getMinutes())+":"+z(d.getSeconds())+" "+(d.getHours()<12?"AM":"PM")}
// ----- Red flash + shake when something is wrong -----
function flashBad(el){if(typeof bearReact==="function")bearReact("sad");el.classList.remove("bad");void el.offsetWidth;el.classList.add("bad");setTimeout(function(){el.classList.remove("bad")},1400)}
function say(id,msg,el){var m=$(id);m.textContent=msg||"";m.classList.toggle("hidden",!msg);if(msg)flashBad(el||m)}

// ----- Sparkle effects -----
var sparkLive=0;   // sparks alive: while dragging, skip new ones when too many are on screen (less lag)
function sparkleBurst(x,y,n,spread,ring){
 if(!ring&&sparkLive>=28)return;
 var cols=sparkCols();
 if(ring){var r=document.createElement("span");r.className="ring";r.style.left=x+"px";r.style.top=y+"px";document.body.appendChild(r);setTimeout(r.remove.bind(r),1400)}
 for(var i=0;i<n;i++){var s=document.createElement("span"),a=Math.random()*6.283,d=(60+Math.random()*140)*spread;
  s.className="spark";s.textContent=i%3?"✦":"✧";
  s.style.cssText="left:"+x+"px;top:"+y+"px;--dx:"+Math.cos(a)*d+"px;--dy:"+Math.sin(a)*d+"px;font-size:"+(16+Math.random()*18)+"px;color:"+cols[i%cols.length]+";animation-delay:"+Math.random()*.15+"s";
  document.body.appendChild(s);sparkLive++;setTimeout(function(el){sparkLive--;el.remove()},2200,s)}}
function celebrate(){
 if(calm)return;
 var b=$("banner").getBoundingClientRect(),x=b.width?b.left+b.width/2:innerWidth/2,y=b.width?b.top+b.height/2:innerHeight/3;
 sparkleBurst(x,y,40,1,true);
 setTimeout(function(){sparkleBurst(innerWidth*.2,innerHeight*.3,22,1,false)},250);
 setTimeout(function(){sparkleBurst(innerWidth*.8,innerHeight*.35,22,1,false)},450);
 for(var i=0;i<28;i++){var c=document.createElement("span");c.className="confetti";c.textContent=CONFETTI_EMOJIS[i%CONFETTI_EMOJIS.length];c.style.left=Math.random()*100+"vw";c.style.animationDelay=Math.random()*.6+"s";c.style.fontSize=16+Math.random()*16+"px";document.body.appendChild(c);setTimeout(c.remove.bind(c),3200)}}
if(TAP_SPARKLES&&!calm)document.addEventListener("pointerdown",function(e){if(window.__nvOpen&&window.__nvOpen())return;sparkleBurst(e.clientX,e.pointerType==="touch"?e.clientY-52:e.clientY,10,1,false)});

// ----- Small sparkle trail while sliding a finger (also while scrolling) or dragging the mouse -----
var trailLast=null;
function sparkCols(){var a=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()||THEME_COLOR,d=getComputedStyle(document.documentElement).getPropertyValue("--accentD").trim()||a;return[d,"#ffc93c","#4db8ff",a]};
function trailSpark(x,y){
 var t=document.createElement("span");t.className="tspark";t.textContent=Math.random()<.6?"✦":"✧";
 t.style.cssText="left:"+(x+Math.random()*10-5)+"px;top:"+(y+Math.random()*10-5)+"px;font-size:"+(11+Math.random()*8)+"px;color:"+sparkCols()[Math.floor(Math.random()*4)]+";--tx:"+(Math.random()*24-12)+"px;--ty:"+(8+Math.random()*16)+"px";
 document.body.appendChild(t);setTimeout(t.remove.bind(t),1400)}
function trailMove(x,y){
 if(dragging||(window.__nvOpen&&window.__nvOpen()))return;   // no trail while the PDF viewer is open (it makes scrolling lag)
 if(trailLast&&Math.hypot(x-trailLast[0],y-trailLast[1])<12)return;
 trailLast=[x,y];trailSpark(x,y)}
if(TRAIL_SPARKLES&&!calm){
 document.addEventListener("touchstart",function(){trailLast=null},{passive:true});
 document.addEventListener("touchmove",function(e){var t=e.touches[0];if(t)trailMove(t.clientX,t.clientY)},{passive:true});
 document.addEventListener("pointermove",function(e){if(e.pointerType==="mouse"&&e.buttons===1)trailMove(e.clientX,e.clientY)});
}

// ----- Teddy bear helper: walks to the thing you should press, points at it, and does random things -----
var tapN=0,tapT=null,bear=null,lastX=null,lastY=null,guideTimer=null,moveTimer=null,lastTarget=null,busyAct=false,cheering=false,BW=84,BH=92,hintOn=false,hintTimer=null,wx=0,wy=0,dragging=false,drag=null,holdUntil=0,trailT=0;
var BEAR_SVG='<svg viewBox="0 0 100 110">' +
  '<ellipse cx="50" cy="106" rx="26" ry="3.5" fill="rgba(0,0,0,.18)"/>' +
  '<g id="bearHop"><g id="bearBreath"><g id="bearBody">' +
  '<path class="of" id="ofCape" d="M30 62Q6 92 16 106L84 106Q94 92 70 62Z" style="fill:var(--accent);stroke:rgba(0,0,0,.25)"/>' +
  '<ellipse cx="33" cy="98" rx="12" ry="9" style="fill:var(--fur2)"/><ellipse cx="67" cy="98" rx="12" ry="9" style="fill:var(--fur2)"/>' +
  '<ellipse cx="33" cy="100" rx="6.5" ry="4.5" style="fill:var(--ear)"/><ellipse cx="67" cy="100" rx="6.5" ry="4.5" style="fill:var(--ear)"/>' +
  '<ellipse cx="50" cy="80" rx="28" ry="25" style="fill:var(--fur)"/><ellipse cx="50" cy="84" rx="16" ry="16" style="fill:var(--muz)"/>' +
  '<g class="armWrap" id="armL" style="transform-origin:27px 66px"><g class="armPoke"><rect x="20" y="62" width="14" height="29" rx="7" style="fill:var(--fur2)"/><circle cx="27" cy="88" r="6.5" style="fill:var(--ear)"/></g></g>' +
  '<g class="armWrap" id="armR" style="transform-origin:73px 66px"><g class="armPoke"><rect x="66" y="62" width="14" height="29" rx="7" style="fill:var(--fur2)"/><circle cx="73" cy="88" r="6.5" style="fill:var(--ear)"/></g></g>' +
  '<g id="earsBear"><circle cx="24" cy="20" r="11" style="fill:var(--fur2)"/><circle cx="24" cy="20" r="6" style="fill:var(--ear)"/><circle cx="76" cy="20" r="11" style="fill:var(--fur2)"/><circle cx="76" cy="20" r="6" style="fill:var(--ear)"/></g>' +
  '<g id="earsCat"><polygon points="13,32 17,2 42,18" style="fill:var(--fur)"/><polygon points="19,26 21,10 33,19" style="fill:var(--ear)"/><polygon points="87,32 83,2 58,18" style="fill:var(--fur)"/><polygon points="81,26 79,10 67,19" style="fill:var(--ear)"/></g>' +
  '<g id="earsBunny"><ellipse cx="34" cy="2" rx="8" ry="20" transform="rotate(-8 34 2)" style="fill:var(--fur)"/><ellipse cx="34" cy="2" rx="4" ry="14" transform="rotate(-8 34 2)" style="fill:var(--ear)"/><ellipse cx="66" cy="2" rx="8" ry="20" transform="rotate(8 66 2)" style="fill:var(--fur)"/><ellipse cx="66" cy="2" rx="4" ry="14" transform="rotate(8 66 2)" style="fill:var(--ear)"/></g>' +
  '<circle cx="50" cy="40" r="28" style="fill:var(--fur)"/><ellipse cx="50" cy="50" rx="14" ry="11" style="fill:var(--muz)"/>' +
  '<g class="pp"><ellipse cx="38" cy="35" rx="7.5" ry="9" transform="rotate(20 38 35)" fill="#2d2d33"/><ellipse cx="62" cy="35" rx="7.5" ry="9" transform="rotate(-20 62 35)" fill="#2d2d33"/></g>' +
  '<ellipse cx="50" cy="44" rx="5" ry="3.5" style="fill:var(--nose)"/><path d="M50 47.5V51" stroke="#3b2a22" stroke-width="1.8" stroke-linecap="round"/>' +
  '<path id="mouthSmile" d="M43 52Q50 58 57 52" stroke="#3b2a22" stroke-width="2" fill="none" stroke-linecap="round"/>' +
  '<path id="mouthSad" d="M43 57Q50 51 57 57" stroke="#3b2a22" stroke-width="2" fill="none" stroke-linecap="round"/>' +
  '<ellipse id="mouthOpen" cx="50" cy="55" rx="5" ry="4.5" fill="#7a2f2f"/>' +
  '<g id="whisk" stroke="#8d8279" stroke-width="1.2" stroke-linecap="round"><path d="M36 48L22 45M36 51L22 53M64 48L78 45M64 51L78 53"/></g>' +
  '<g class="eye"><g class="pup"><ellipse cx="38" cy="35" rx="3.4" ry="4.2" fill="#2b1d17"/><circle cx="39" cy="33.5" r="1.1" fill="#fff"/></g></g>' +
  '<g class="eye"><g class="pup"><ellipse cx="62" cy="35" rx="3.4" ry="4.2" fill="#2b1d17"/><circle cx="63" cy="33.5" r="1.1" fill="#fff"/></g></g>' +
  '<path d="M50 68L36 60V76Z" style="fill:var(--accent)" stroke="rgba(0,0,0,.25)"/><path d="M50 68L64 60V76Z" style="fill:var(--accent)" stroke="rgba(0,0,0,.25)"/><circle cx="50" cy="68" r="4" style="fill:var(--accent)" stroke="rgba(0,0,0,.25)"/>' +
  '<g class="of" id="ofShades"><rect x="28" y="28" width="19" height="13" rx="5.5" fill="#1b1b22"/><rect x="53" y="28" width="19" height="13" rx="5.5" fill="#1b1b22"/><rect x="46" y="32" width="8" height="3" fill="#1b1b22"/><path d="M31 31L36 31M56 31L61 31" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-linecap="round"/></g>' +
  '<g class="of" id="ofCap"><path d="M26 28Q26 8 50 8Q74 8 74 28Z" style="fill:var(--accent);stroke:rgba(0,0,0,.25)"/><path d="M62 27Q86 24 92 33Q76 37 62 33Z" style="fill:var(--accent);stroke:rgba(0,0,0,.25)"/><circle cx="50" cy="8" r="2.6" fill="rgba(0,0,0,.25)"/></g>' +
  '<g class="of" id="ofCrown"><path d="M36 15L38 1L45 9L50 -2L55 9L62 1L64 15Z" fill="#ffc93c" stroke="#d9a21a"/><circle cx="50" cy="8" r="1.8" fill="#ff6b6b"/><circle cx="41" cy="11" r="1.4" fill="#4db8ff"/><circle cx="59" cy="11" r="1.4" fill="#4db8ff"/></g>' +
  '<g class="of" id="ofBow"><path d="M70 14L56 6V22Z" fill="#ff6fa8" stroke="rgba(0,0,0,.25)"/><path d="M70 14L84 6V22Z" fill="#ff6fa8" stroke="rgba(0,0,0,.25)"/><circle cx="70" cy="14" r="4.5" fill="#ff9cc6" stroke="rgba(0,0,0,.25)"/></g>' +
  '<g class="of" id="ofFlowers"><path d="M30 16Q50 2 70 16" fill="none" stroke="#6fbf73" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="13" r="5" fill="#ff9cc6"/><circle cx="34" cy="13" r="2" fill="#ffd966"/><circle cx="50" cy="8" r="5.5" fill="#ffffff" stroke="rgba(0,0,0,.15)"/><circle cx="50" cy="8" r="2.2" fill="#ffd966"/><circle cx="66" cy="13" r="5" fill="#ffb86b"/><circle cx="66" cy="13" r="2" fill="#fff3c4"/></g>' +
  '<g class="of" id="ofScarf"><path d="M27 66Q50 78 73 66L75 74Q50 88 25 74Z" fill="#ff7a90" stroke="rgba(0,0,0,.25)"/><path d="M62 76L67 96L77 92L72 74Z" fill="#ff9aaa" stroke="rgba(0,0,0,.25)"/></g>' +
  '<g class="of" id="ofGlasses"><circle cx="38" cy="35" r="9" fill="rgba(255,255,255,.2)" stroke="#5a3d7a" stroke-width="2"/><circle cx="62" cy="35" r="9" fill="rgba(255,255,255,.2)" stroke="#5a3d7a" stroke-width="2"/><path d="M47 35H53M29 33L22 30M71 33L78 30" stroke="#5a3d7a" stroke-width="2" stroke-linecap="round"/></g>' +
  '<g class="of" id="ofPhones"><path d="M18 40Q18 4 50 4Q82 4 82 40" fill="none" stroke="#ff86bd" stroke-width="5" stroke-linecap="round"/><rect x="11" y="32" width="11" height="17" rx="5.5" fill="#ff86bd" stroke="rgba(0,0,0,.25)"/><rect x="78" y="32" width="11" height="17" rx="5.5" fill="#ff86bd" stroke="rgba(0,0,0,.25)"/></g>' +
  '<g class="of" id="ofSleep"><path d="M27 26Q30 4 58 -2Q78 -6 90 8Q72 6 73 26Z" fill="#6c7dff" stroke="rgba(0,0,0,.25)"/><rect x="25" y="23" width="50" height="8" rx="4" fill="#fff" stroke="rgba(0,0,0,.15)"/><circle cx="90" cy="9" r="5.5" fill="#fff" stroke="rgba(0,0,0,.15)"/></g>' +
  '</g></g></g></svg>';
function vis(id){return!$(id).classList.contains("hidden")}
function bearTarget(){   // what should be pressed next?
 if(vis("admin"))return"hide";
 if(vis("s3"))return{el:$("dlPrev"),point:true};
 if(vis("s2")){if(!$("sid").value.trim())return{el:$("sid"),point:true};if(!$("sname").value.trim())return{el:$("sname"),point:true};return{el:$("next"),point:true}}
 if(vis("s1"))return{el:document.querySelector("#opts .opt"),point:true};
 if(vis("c1")){if($("banner").className.indexOf("shine")>-1)return{el:$("banner"),point:false};if(!$("cid").value.trim())return{el:$("cid"),point:true};if(!$("clist").children.length)return{el:$("find"),point:true}}
 return null}
function guide(d){if(!bear)return;clearTimeout(guideTimer);guideTimer=setTimeout(runGuide,d||0)}
function clearGlow(){if(lastTarget){lastTarget.classList.remove("bear-target");lastTarget=null}}
function runGuide(){
 if(dragging)return;
 var t=bearTarget();clearGlow();
 if(t==="hide"){bear.style.display="none";return}
 bear.style.display="";
 if(window.__askBarOpen&&lastX!==null)return;   // AI bar is open: the bear stays where it is
 var x,y,tx=null,ty=null;
 if(t&&t.el){if(t.point?!hintOn:!cheering)t=null;else{var q=t.el.getBoundingClientRect();if(q.bottom<0||q.top>innerHeight)t=null}}   // off screen: never scroll the page
 else t=null;
 if(t){
  var r=t.el.getBoundingClientRect();
  x=r.right-BW+10;y=r.top-BH+8;if(y<6)y=r.bottom-8;           // stand on top of it (or under it if no room)
  x=Math.max(6,Math.min(innerWidth-BW-6,x));y=Math.max(6,Math.min(innerHeight-BH-6,y));
  if(t.point){t.el.classList.add("bear-target");lastTarget=t.el;tx=r.width<260?r.left+r.width/2:x+BW/2-80;ty=r.top+r.height/2}
 }else{x=wx;y=wy}                                              // playing around
 if(lastX===null||Math.abs(x-lastX)>2||Math.abs(y-lastY)>2){var wd=lastX===null?3.5:Math.max(1.6,Math.min(8,Math.hypot(x-lastX,y-lastY)/60));bear.style.transitionDuration=wd+"s";bear.classList.add("moving");clearTimeout(moveTimer);moveTimer=setTimeout(function(){bear.classList.remove("moving")},wd*1000+80)}   // slow walk: ~60px/s
 bear.style.left=x+"px";bear.style.top=y+"px";lastX=x;lastY=y;
 var L=$("armL"),R=$("armR");bear.classList.remove("pointL","pointR");
 if(cheering){L.style.transform="rotate(160deg)";R.style.transform="rotate(-160deg)";return}
 L.style.transform="rotate(0deg)";R.style.transform="rotate(0deg)";
 if(tx!==null){var left=tx<x+BW/2,sx=x+(left?27:73)/100*BW,sy=y+66/110*BH,deg=Math.atan2(-(tx-sx),ty-sy)*180/Math.PI;
  (left?L:R).style.transform="rotate("+deg+"deg)";bear.classList.add(left?"pointL":"pointR")}}

// Pointing is only a side task: the bear plays around, and every so often walks to the next button for a few seconds.
function pickSpot(){var sp=[[10,innerHeight-BH-10],[innerWidth-BW-10,innerHeight-BH-10],[innerWidth-BW-10,innerHeight*.45],[10,innerHeight*.5],[innerWidth*.5-BW/2,innerHeight-BH-10],[innerWidth-BW-10,innerHeight*.25]],c=sp[Math.floor(Math.random()*sp.length)];wx=c[0];wy=c[1]}
function startHintCycle(delay){return;   /* pointing at buttons is OFF (remove this "return;" to turn it back on) */

 clearTimeout(hintTimer);
 hintTimer=setTimeout(function(){
  var t=bearTarget();
  if(cheering||dragging||!t||t==="hide"||!t.point){startHintCycle(8000);return}
  hintOn=true;guide(0);
  hintTimer=setTimeout(function(){hintOn=false;guide(0);startHintCycle(12000)},5500)},delay)}
function bearStep(){hintOn=false;if(bear){guide(250);startHintCycle(3500)}}
var DUR={jump:800,wiggle:850,spin:950,wave:1900,dance:2500,cheer:2500,shake:550,flip:900,bounce:900,sway:2300,heart:2100,shy:1400,kick:3600,photo:3800,talk:3200,read:5600,snack:3900,music:4300,sleep:5000};
function hearts(){var r=bear.getBoundingClientRect();for(var i=0;i<6;i++)(function(i){setTimeout(function(){var t=document.createElement("span");t.className="petstar";t.textContent=["💖","💗","💕"][i%3];t.style.cssText="left:"+(r.left+16+Math.random()*(BW-32))+"px;top:"+(r.top+4)+"px;--dx:"+(Math.random()*40-20)+"px";document.body.appendChild(t);setTimeout(t.remove.bind(t),1800)},i*220)})(i)}
var PHRASES=["Hi Utsob! 👋","Study hard! 📚","You can do it! 💪","Drink some water 💧","I'm hungry… 🍙","Let's go! ✨","Good job! 🌟","Don't fall asleep 😴","Exam soon… 😳","Take a little break ☕"];
function bprop(txt,x,y,cls,ms,extra){var p=document.createElement("span");p.className="bprop "+cls;p.textContent=txt;p.style.cssText="left:"+x+"px;top:"+y+"px;"+(extra||"");document.body.appendChild(p);setTimeout(p.remove.bind(p),ms)}
function bsay(txt,ms){var r=bear.getBoundingClientRect(),b=document.createElement("div");b.className="bsay";b.textContent=txt;b.style.left=Math.max(8,Math.min(innerWidth-168,r.left+BW/2-80))+"px";b.style.top=Math.max(6,r.top-36)+"px";document.body.appendChild(b);setTimeout(b.remove.bind(b),ms)}
function extras(n){   // extra props / effects for the new bear moves
 if(!bear)return;var r=bear.getBoundingClientRect();if(r.right<20||r.left>innerWidth-20)return;
 var d=r.left>innerWidth/2?-1:1,fx=r.left+BW/2,fy=r.top+BH-26,pick=function(a){return a[Math.floor(Math.random()*a.length)]};
 if(n==="heart")hearts();
 else if(n==="kick")setTimeout(function(){bprop("⚽",fx+d*22,fy,"ball",3200,"--d:"+d)},700);
 else if(n==="photo"){bprop("📸",fx+d*26,r.top+44,"cam",3700);setTimeout(function(){var f=document.createElement("div");f.className="bflash";f.style.cssText="left:"+(fx+d*26)+"px;top:"+(r.top+56)+"px";document.body.appendChild(f);setTimeout(f.remove.bind(f),1000)},1800)}
 else if(n==="talk"){bear.classList.add("happy");bsay(pick(PHRASES),2800);setTimeout(function(){if(!cheering)bear.classList.remove("happy")},2800)}
 else if(n==="read")bprop("📖",fx-12,r.top+56,"book",5600);
 else if(n==="snack"){bear.classList.add("happy");bprop(pick(["🍙","🧋","🍓","🍪","🍡"]),fx-10,r.top+54,"munch",3800);setTimeout(function(){if(!cheering)bear.classList.remove("happy")},3800)}
 else if(n==="music"){for(var i=0;i<6;i++)(function(i){setTimeout(function(){bprop(pick(["🎵","🎶"]),fx-10+Math.random()*24,r.top+4,"note",2600,"--dx:"+(Math.random()*50-25)+"px")},i*650)})(i)}
 else if(n==="sleep"){bear.classList.add("petting");bprop("💤",fx+12,r.top+2,"zzz",4800);setTimeout(function(){bear.classList.remove("petting")},4900)}}
function act(name){if(busyAct||!bear)return;extras(name);busyAct=true;bear.classList.add("a-"+name);setTimeout(function(){bear.classList.remove("a-"+name);busyAct=false},DUR[name])}
function randomAct(){if(!bear||bear.style.display==="none"||cheering||dragging||busyAct||bear.classList.contains("moving")||window.__bearTalking)return;
 var pointing=bear.classList.contains("pointL")||bear.classList.contains("pointR"),list=pointing?["jump","wiggle"]:["jump","wiggle","wave","dance","bounce","sway","heart","shy","kick","photo","read","snack","music","sleep"];
 var nx;do{nx=list[Math.floor(Math.random()*list.length)]}while(nx===window.__lastAct&&list.length>1);window.__lastAct=nx;act(nx)}
function bearReact(kind){
 if(!bear)return;busyAct=false;
 if(kind==="cheer"){cheering=true;bear.classList.add("happy");act("cheer");guide(0);
  setTimeout(function(){var r=bear.getBoundingClientRect();if(!calm)sparkleBurst(r.left+r.width/2,r.top+r.height/2,16,.6,false)},1300);
  setTimeout(function(){cheering=false;bear.classList.remove("happy");guide(0)},2800)}
 else{bear.classList.add("sad");act("shake");setTimeout(function(){bear.classList.remove("sad")},1500)}}

// ----- Bear looks: colors + outfits, petting, eyes -----
var SKINS=[
 {fur:"#b98558",fur2:"#a8734f",muz:"#f1d7b5",ear:"#e8b98f",nose:"#3b2a22",cls:""},                 // classic teddy
 {fur:"#8a5a44",fur2:"#6f4533",muz:"#e9cfb4",ear:"#d9a98a",nose:"#2e1d17",cls:""},                 // mocha
 {fur:"#efdcc0",fur2:"#dcc3a0",muz:"#fff4e2",ear:"#f2c9b0",nose:"#5a4636",cls:""},                 // cream
 {fur:"#f6f4ee",fur2:"#2d2d33",muz:"#ffffff",ear:"#55555c",nose:"#1b1b1f",cls:"sk-panda"},          // panda
 {fur:"#7f9cf5",fur2:"#6a86df",muz:"#dfe7ff",ear:"#b8c8ff",nose:"#2a3466",cls:""},                 // blueberry
 {fur:"#7fd1b0",fur2:"#68bb9a",muz:"#e1f7ee",ear:"#b5ead6",nose:"#245443",cls:""},                 // mint
 {fur:"#f7f4f2",fur2:"#e6e0dc",muz:"#ffffff",ear:"#f2b6c0",nose:"#e48a98",cls:"sk-cat"},           // white cat
 {fur:"#e9e0f5",fur2:"#d6c8ea",muz:"#ffffff",ear:"#f0b9d0",nose:"#b85c7e",cls:"sk-bunny"},          // bunny
 {fur:"#ff9fb7",fur2:"#f27d9b",muz:"#ffe3ea",ear:"#ffc2d1",nose:"#b83a5c",cls:""},                 // strawberry
 {fur:"#ffd66b",fur2:"#f2bf45",muz:"#fff1c4",ear:"#ffe39a",nose:"#8a5a14",cls:""},                 // sunny
 {fur:"#cdb4f6",fur2:"#b79be6",muz:"#f1e9ff",ear:"#e0cffa",nose:"#5b3f8f",cls:""},                 // lavender
 {fur:"#4b3f72",fur2:"#3a3059",muz:"#e8d8ff",ear:"#ff8fc7",nose:"#ff5fa8",cls:"sk-bunny"},         // midnight bunny
 {fur:"#ffe4ec",fur2:"#f5c7d4",muz:"#ffffff",ear:"#ffb3c8",nose:"#ff7aa0",cls:"sk-cat"},           // pink kitty
 {fur:"#3a3a45",fur2:"#2b2b34",muz:"#6b6b7a",ear:"#ff9bb8",nose:"#ff7aa0",cls:"sk-cat"}            // shadow cat
];
var OUTFITS=["cap","shades","cape","crown","bow","flowers","scarf","glasses","headphones",""],look={skin:0,outfit:""},petInt=null,gazeOn=false,gazeT=null;
function isNight(){if(!NIGHT_MODE_ON)return false;var h=new Date().getHours();return NIGHT_FROM>NIGHT_TO?(h>=NIGHT_FROM||h<NIGHT_TO):(h>=NIGHT_FROM&&h<NIGHT_TO)}
function applyLook(){
 if(!bear)return;var sk=SKINS[look.skin];
 ["fur","fur2","muz","ear","nose"].forEach(function(k){bear.style.setProperty("--"+k,sk[k])});
 SKINS.forEach(function(x){if(x.cls)bear.classList.remove(x.cls)});if(sk.cls)bear.classList.add(sk.cls);
 ["cap","shades","cape","crown","bow","flowers","scarf","glasses","headphones","sleep"].forEach(function(o){bear.classList.remove("of-"+o)});
 var of=isNight()?"sleep":look.outfit;if(of)bear.classList.add("of-"+of);
 try{localStorage.setItem("bearLook",JSON.stringify(look))}catch(e){}}
function puff(){var r=bear.getBoundingClientRect();if(!calm)sparkleBurst(r.left+BW/2,r.top+BH/2,8,.7,false)}
function changeLook(poof,random){
 if(!bear)return;
 var i=look.skin,o=look.outfit;
 if(random||isNight()||Math.random()<.5){do{i=Math.floor(Math.random()*SKINS.length)}while(i===look.skin)}
 if(random){do{o=OUTFITS[Math.floor(Math.random()*OUTFITS.length)]}while(o===look.outfit)}
 else o=OUTFITS[(OUTFITS.indexOf(look.outfit)+1)%OUTFITS.length];
 if(!poof){look={skin:i,outfit:o};applyLook();return}
 ALL_ACTS.forEach(function(c){bear.classList.remove(c)});
 busyAct=true;bear.classList.add("a-morph");
 setTimeout(function(){puff();look={skin:i,outfit:o};applyLook()},330);     // swap happens while the bear is tiny and flashing
 setTimeout(function(){bear.classList.remove("a-morph");busyAct=false},720)}
function floatStar(x,y){
 var t=document.createElement("span");t.className="petstar";t.textContent=["⭐","✦","✨"][Math.floor(Math.random()*3)];
 t.style.cssText="left:"+x+"px;top:"+y+"px;--dx:"+(Math.random()*30-15)+"px";document.body.appendChild(t);setTimeout(t.remove.bind(t),1800)}
function startPet(){
 bear.classList.add("petting");clearInterval(petInt);
 petInt=setInterval(function(){var r=bear.getBoundingClientRect();floatStar(r.left+14+Math.random()*(BW-28),r.top+6)},240)}
function endPet(){bear.classList.remove("petting");clearInterval(petInt)}
function gazeTo(x,y){
 if(!bear||dragging||bear.classList.contains("petting"))return;
 var r=bear.getBoundingClientRect(),dx=x-(r.left+BW/2),dy=y-(r.top+BH*.35),d=Math.hypot(dx,dy)||1,k=Math.min(1,d/160);
 bear.style.setProperty("--gx",(dx/d*2.8*k)+"px");bear.style.setProperty("--gy",(dy/d*2.2*k)+"px")}
function gazeReset(){if(bear){bear.style.setProperty("--gx","0px");bear.style.setProperty("--gy","0px")}}
if(BEAR_ON){
 bear=document.createElement("div");bear.id="bear";bear.setAttribute("aria-hidden","true");bear.innerHTML=BEAR_SVG;
 wx=innerWidth-BW-10;wy=innerHeight-BH-10;bear.style.top=wy+"px";document.body.appendChild(bear);
 // Pick the bear up and move it. Hold without moving = pet it (keep holding 2s and it changes look). A quick tap = a trick, and the tap still presses what is under the bear.
 var ALL_ACTS=["a-jump","a-wiggle","a-spin","a-wave","a-dance","a-cheer","a-shake","a-flip","a-bounce","a-sway","a-heart","a-shy","a-kick","a-photo","a-talk","a-read","a-snack","a-music","a-sleep"];
 function startHold(){
  dragging=true;cheering=false;hintOn=false;busyAct=false;clearTimeout(hintTimer);clearGlow();
  ALL_ACTS.forEach(function(c){bear.classList.remove(c)});bear.classList.remove("moving","pointL","pointR");bear.classList.add("held","happy");
  $("armL").style.transform="rotate(150deg)";$("armR").style.transform="rotate(-150deg)";
  var r=bear.getBoundingClientRect();if(!calm)sparkleBurst(r.left+BW/2,r.top+BH/2,12,1,true)}
 function drop(){
  if(lastX!==null){bear.style.left=lastX+"px";bear.style.top=lastY+"px"}
  dragging=false;bear.classList.remove("held","happy");
  var r=bear.getBoundingClientRect();wx=r.left;wy=r.top;lastX=wx;lastY=wy;holdUntil=Date.now()+30000;
  $("armL").style.transform="rotate(0deg)";$("armR").style.transform="rotate(0deg)";
  busyAct=false;act("jump");if(!calm)sparkleBurst(r.left+BW/2,r.top+BH/2,16,1.1,true);startHintCycle(9000)}
 bear.addEventListener("contextmenu",function(e){e.preventDefault()});
 bear.addEventListener("pointerdown",function(e){
  e.preventDefault();var r=bear.getBoundingClientRect();
  var d=drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,moved:false,pet:false};
  try{bear.setPointerCapture(e.pointerId)}catch(err){}
  d.petT=setTimeout(function(){if(drag===d&&!d.moved){d.pet=true;startPet()}},350);
  d.lookT=setTimeout(function again(){if(drag===d&&d.pet&&!d.moved){changeLook(true,false);d.lookT=setTimeout(again,1500)}},900)});
 bear.addEventListener("pointermove",function(e){
  if(!drag||e.pointerId!==drag.id)return;
  if(!drag.moved){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<7)return;drag.moved=true;clearTimeout(drag.petT);clearTimeout(drag.lookT);if(drag.pet)endPet();startHold()}
  var x=Math.max(2,Math.min(innerWidth-BW-2,e.clientX-drag.ox)),y=Math.max(2,Math.min(innerHeight-BH-2,e.clientY-drag.oy));
  lastX=x;lastY=y;if(!drag.raf){var dd=drag;dd.raf=requestAnimationFrame(function(){dd.raf=0;bear.style.left=lastX+"px";bear.style.top=lastY+"px"})}   // move once per frame, not on every touch event
  var now=Date.now();if(now-trailT>110&&!calm){trailT=now;sparkleBurst(x+BW/2,y+BH/2,2,.9,false)}});
 function endDrag(e){
  if(!drag||e.pointerId!==drag.id)return;var d=drag;drag=null;clearTimeout(d.petT);clearTimeout(d.lookT);
  try{bear.releasePointerCapture(e.pointerId)}catch(err){}
  if(d.pet){endPet();busyAct=false;act("wiggle");return}
  if(d.moved){drop();return}
  bear.style.pointerEvents="none";var el=document.elementFromPoint(e.clientX,e.clientY);bear.style.pointerEvents="";
  var t=el&&el.closest?el.closest("button,input,a,label,select,textarea"):null;
  if(t){t.click();if(t.focus)t.focus()}
  tapN++;clearTimeout(tapT);tapT=setTimeout(function(){tapN=0},1100);
   busyAct=false;
   if(tapN>=3){tapN=0;changeLook(true,false)}                    // tap 3 times quickly = new look
   else act(["jump","wiggle","spin","wave"][Math.floor(Math.random()*4)])}
 bear.addEventListener("pointerup",endDrag);bear.addEventListener("pointercancel",endDrag);

 (function loop(){setTimeout(function(){randomAct();loop()},7000+Math.random()*6000)})();   // a new move every ~2-4 s (was 4-9 s)
 window.addEventListener("resize",function(){guide(200)});window.addEventListener("scroll",function(){guide(250)},{passive:true});
 ["sid","sname","cid"].forEach(function(id){$(id).addEventListener("input",bearStep)});
 ["pointerdown","keydown"].forEach(function(ev){document.addEventListener(ev,function(){if(hintOn){hintOn=false;guide(0);startHintCycle(9000)}})});
 (function wloop(){setTimeout(function(){if(!hintOn&&!cheering&&!dragging&&!busyAct&&!window.__bearTalking&&!window.__askBarOpen&&!bear.classList.contains("moving")&&Date.now()>holdUntil&&bear.style.display!=="none"){pickSpot();guide(0)}wloop()},14000+Math.random()*8000)})();
 new MutationObserver(bearStep).observe($("clist"),{childList:true});
 new MutationObserver(bearStep).observe($("banner"),{attributes:true,attributeFilter:["class"]});
}

// ----- Start-up for looks, eyes and the night sky -----
if(bear){
 try{var sv=JSON.parse(localStorage.getItem("bearLook")||"null");if(sv&&SKINS[sv.skin]&&OUTFITS.indexOf(sv.outfit)>-1)look=sv}catch(e){}
 applyLook();
 if(BEAR_AUTO_CHANGE)(function auto(){setTimeout(function(){if(!dragging&&!bear.classList.contains("petting")&&bear.style.display!=="none")changeLook(true,true);auto()},BEAR_CHANGE_MIN*1000+Math.random()*(BEAR_CHANGE_MAX-BEAR_CHANGE_MIN)*1000)})();
 // eyes follow your finger only some of the time (about 1 touch in 2), plus a random glance now and then
 function pt(e){var t=e.touches&&e.touches[0]?e.touches[0]:e;return[t.clientX,t.clientY]}
 function gazeStart(e){gazeOn=Math.random()<.5;clearTimeout(gazeT);if(gazeOn){var q=pt(e);gazeTo(q[0],q[1])}}
 function gazeMove(e){if(gazeOn){var q=pt(e);gazeTo(q[0],q[1])}}
 function gazeEnd(){clearTimeout(gazeT);gazeT=setTimeout(function(){gazeOn=false;gazeReset()},1200)}
 document.addEventListener("touchstart",gazeStart,{passive:true});document.addEventListener("touchmove",gazeMove,{passive:true});document.addEventListener("touchend",gazeEnd,{passive:true});
 document.addEventListener("pointerdown",function(e){if(e.pointerType==="mouse")gazeStart(e)});
 document.addEventListener("pointermove",function(e){if(e.pointerType==="mouse"&&e.buttons===1)gazeMove(e)});
 document.addEventListener("pointerup",function(e){if(e.pointerType==="mouse")gazeEnd()});
 (function glance(){setTimeout(function(){if(!gazeOn&&!dragging&&!bear.classList.contains("petting")){bear.style.setProperty("--gx",(Math.random()*5.6-2.8)+"px");bear.style.setProperty("--gy",(Math.random()*3-1)+"px");setTimeout(gazeReset,900)}glance()},6000+Math.random()*5000)})();
}
function updateSky(){
 var on=isNight(),sk=$("sky");document.body.classList.toggle("night",on);
 if(on&&!sk){
  sk=document.createElement("div");sk.id="sky";sk.setAttribute("aria-hidden","true");
  var h='<div class="moonbadge"><svg viewBox="0 0 40 40"><path d="M24 3A17 17 0 1 0 37 27A14 14 0 0 1 24 3Z" fill="#ffe9a8"/></svg></div>';
  for(var i=0;i<16;i++)h+='<span class="star" style="left:'+(Math.random()*96)+'%;top:'+(Math.random()*42)+'%;font-size:'+(9+Math.random()*8)+'px;color:'+(i%2?"#ffc93c":"#7c5cff")+';animation-delay:-'+(Math.random()*2.6)+'s">'+(i%3?"✦":"★")+'</span>';
  sk.innerHTML=h;document.body.insertBefore(sk,document.body.firstChild)}
 if(!on&&sk)sk.remove();
 applyLook()}
updateSky();setInterval(updateSky,300000);

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

// Builds a real Word file from your own template: one page per person (repeated per copy).
async function buildDocx(list){
 var zip=await JSZip.loadAsync(TEMPLATE_DOCX,{base64:true});
 var xml=await zip.file("word/document.xml").async("string");
 var a=xml.indexOf("<w:body>")+8,b=xml.indexOf("<w:sectPr");
 var head=xml.slice(0,a),block=xml.slice(a,b).replace("<w:t>A</w:t>","<w:t>{{SEC}}</w:t>"),tail=xml.slice(b),pages=[];
 list.forEach(function(o){for(var c=0;c<(+o.copies||1);c++)pages.push(o)});
 var out=pages.map(function(o,i){
  var blk=block.replace("{{NAME}}",function(){return esc(o.name)}).replace("{{REG}}",function(){return esc(o.id)}).replace("{{SEC}}",function(){return esc(o.section||"A")});
  if(i<pages.length-1){var k=blk.lastIndexOf("</w:p>");blk=blk.slice(0,k)+'<w:r><w:br w:type="page"/></w:r>'+blk.slice(k)}
  return blk}).join("");
 zip.file("word/document.xml",head+out+tail);
 return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
var UA=navigator.userAgent||"",IOS=/iPhone|iPad|iPod/i.test(UA),IAB=/FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|Snapchat|TikTok|WhatsApp|Telegram|Twitter|LinkedInApp|MicroMessenger|; wv\)/i.test(UA)||(IOS&&!/Safari\//i.test(UA));   // IAB = page is open inside another app (Messenger etc.)
async function save(blob,name){
  if(IAB&&navigator.canShare&&window.File){try{var f=new File([blob],name,{type:blob.type||"application/octet-stream"});
    if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==="AbortError")return}}   // share sheet lets them save to Files / Drive
  var u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},2000);if(IAB)setTimeout(iabSheet,1500)}
function optOf(t){var i;t=baseOpt(t);if(isUp(t))for(i=0;i<OPTIONS.length;i++)if(OPTIONS[i].upload)return OPTIONS[i];for(i=0;i<OPTIONS.length;i++)if(OPTIONS[i].title===t)return OPTIONS[i];for(i=0;i<OPTIONS.length;i++)if(String(t).indexOf(OPTIONS[i].title)===0)return OPTIONS[i];for(i=0;i<OPTIONS.length;i++)if(!OPTIONS[i].img)return OPTIONS[i];return OPTIONS[0]}   // order text -> option (unknown/old title -> the Word cover page)
function tabOf(o,t){t=baseOpt(t);var a=o.tabs||[];for(var i=0;i<a.length;i++)if(String(t).indexOf(a[i].label)>=0)return a[i];return a[0]}   // order text -> which tab/picture
function imgBlob(k){var b=atob(IMAGES[k].split(",")[1]),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Blob([u],{type:"image/jpeg"})}
if(IAB&&!IOS){$("iab").classList.remove("hidden");
  $("iab").innerHTML='<b>📱 You opened this inside Messenger (or another app).</b><div class="tiny" style="margin-top:2px">Its built-in browser can block downloads and the file picker. Open it in your real browser:</div>'+guideSteps()+
   '<div class="frow">'+(IOS?'<button type="button" class="s" id="iabGc">🌐 Chrome app (if you have it)</button>':'<button type="button" class="p" id="iabOpen">🌐 Open in Chrome</button><button type="button" class="s" id="iabOpen2">🌍 Other browser</button>')+'<button type="button" class="s" id="iabCopy">📋 Copy link</button></div>';
  if($("iabOpen"))$("iabOpen").onclick=function(){location.href=chromeUrl()};
  if($("iabOpen2"))$("iabOpen2").onclick=function(){location.href=browserUrl()};
  if($("iabGc"))$("iabGc").onclick=function(){location.href=iosChromeUrl()};
  $("iabCopy").onclick=function(){copyLink(this)}}
// ----- Step-by-step help for people stuck inside Messenger -----
function browserUrl(){return "intent://"+location.host+location.pathname+location.search+"#Intent;scheme=https;action=android.intent.action.VIEW;end"}   // any browser (Android shows a chooser)
function iosChromeUrl(){return "googlechromes://"+location.host+location.pathname+location.search}                                              // iPhone: only works if the Chrome app is installed
function guideSteps(){
  if(!IAB)return'<ol class="gsteps"><li>Is this page open inside an app (Messenger, Facebook…)? Tap <b>⋮</b> or <b>•••</b> and choose <b>Open in browser</b>.</li><li>Or tap <b>📋 Copy link</b>, then paste it in Chrome / Safari.</li></ol>';
  return IOS?
   '<ol class="gsteps"><li>Tap <b>•••</b> (or the <b>compass / share icon</b>) in a corner of this screen.</li><li>Choose <b>Open in Safari</b> (or “Open in Browser”).</li><li>Now download or upload there. It works.</li></ol>'
  :'<ol class="gsteps"><li>Tap <b>🌐 Open in Chrome</b> below.</li><li>Nothing happened? Tap <b>⋮</b> (top right) and choose <b>Open in Chrome</b> or <b>Open in browser</b>.</li><li>Still stuck? Tap <b>📋 Copy link</b>, open Chrome yourself and paste it in the address bar.</li></ol>'}
function showCopied(host,l,done){
  var n=host.nextElementSibling;if(!n||!n.classList.contains("gcopied")){n=document.createElement("div");n.className="gcopied";host.parentNode.insertBefore(n,host.nextSibling)}
  n.innerHTML='<b>'+(done?"✅ Link copied! Now:":"Press and hold the link below, tap Copy. Then:")+'</b><ol class="gsteps"><li>Open <b>'+(IOS?"Safari":"Chrome")+'</b> (your normal browser app, not Messenger).</li><li>Tap the <b>address bar</b> at the top.</li><li>Press and hold, tap <b>Paste</b>, then <b>Go</b>.</li></ol><input readonly value="'+esc(l)+'" onfocus="this.select()" onclick="this.select()">';
  if(!done){try{var i=n.querySelector("input");i.select();if(document.execCommand("copy"))n.querySelector("b").textContent="✅ Link copied! Now:"}catch(e){}}}
function iabSheet(){   // Android only: shown after a download in Messenger, because it often swallows downloads without any message
  if(!IAB||IOS)return;var sh=document.getElementById("iabSheet");if(sh){sh.classList.remove("hidden");return}
  sh=document.createElement("div");sh.id="iabSheet";
  sh.innerHTML='<button type="button" class="s" id="isX" style="float:right;margin:0;padding:2px 12px;min-height:34px">✕</button><b>📥 Download did not start?</b><p class="note" style="margin:4px 0 0">Messenger often blocks downloads. Open this page in your browser, then press the download button again.</p>'+guideSteps()+
   '<div class="frow">'+(IOS?'<button type="button" class="s" id="isGc">🌐 Chrome app (if you have it)</button>':'<button type="button" class="p" id="isOpen">🌐 Open in Chrome</button><button type="button" class="s" id="isOpen2">🌍 Other browser</button>')+'<button type="button" class="s" id="isCopy">📋 Copy link</button></div>';
  document.body.appendChild(sh);
  $("isX").onclick=function(){sh.classList.add("hidden")};
  if($("isOpen"))$("isOpen").onclick=function(){location.href=chromeUrl()};if($("isOpen2"))$("isOpen2").onclick=function(){location.href=browserUrl()};if($("isGc"))$("isGc").onclick=function(){location.href=iosChromeUrl()};
  $("isCopy").onclick=function(){copyLink(this)}}
// small closed "Download not working?" box under a download button (only inside Messenger / other apps)
function addDlHelp(after){
  if(!IAB||!after||!after.parentNode)return;var nx=after.nextElementSibling;if(nx&&nx.classList.contains("dlhelp"))return;
  var d=document.createElement("details");d.className="uphelp dlhelp";
  d.innerHTML='<summary>😕 Download not working?</summary><p class="note" style="margin:6px 0 0">Messenger can block downloads. Open this page in your browser and try again.</p>'+guideSteps()+'<div class="frow">'+(IOS?'<button type="button" class="s" data-x="gc">🌐 Chrome app (if you have it)</button>':'<button type="button" class="p" data-x="c">🌐 Open in Chrome</button><button type="button" class="s" data-x="o">🌍 Other browser</button>')+'<button type="button" class="s" data-x="cp">📋 Copy link</button></div>';
  d.addEventListener("click",function(e){var x=e.target.getAttribute&&e.target.getAttribute("data-x");if(!x)return;if(x==="c")location.href=chromeUrl();else if(x==="o")location.href=browserUrl();else if(x==="gc")location.href=iosChromeUrl();else if(x==="cp")copyLink(e.target)});
  after.parentNode.insertBefore(d,after.nextSibling)}
addDlHelp($("dlOk"));addDlHelp($("dlPrev"));addDlHelp($("ppOk"));
// ----- Opened inside Messenger / another app? Send people to a real browser (uploads and downloads work best there) -----
// Android: we try to jump to Chrome automatically (once). iPhone: apps cannot force this, so a full screen tells them to tap ••• > Open in Safari.
// A full-screen "Open in your browser" page stays until they leave or press "Continue here anyway".
function chromeUrl(){return "intent://"+location.host+location.pathname+location.search+"#Intent;scheme=https;package=com.android.chrome;end"}
if(IAB&&!IOS&&!sessionStorage.getItem("iabSkip")){   // iPhone: uploads and downloads work inside Messenger, so no full-screen warning there
  var g=document.createElement("div");g.id="iabGate";g.style.cssText="position:fixed;inset:0;z-index:10001;background:var(--bg,#fff);color:inherit;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto";
  g.innerHTML='<div class="card" style="max-width:440px"><div style="font-size:42px;text-align:center">🌐</div><b style="font-size:19px;display:block;text-align:center">Open this page in your browser</b><p class="note" style="text-align:center;margin:6px 0 0">Messenger’s built-in browser can’t save files or open the file picker.</p>'+guideSteps()+
   '<div class="frow">'+(IOS?'<button type="button" class="s" id="gateGc">🌐 Chrome app (if you have it)</button>':'<button type="button" class="p" id="gateOpen">🌐 Open in Chrome</button><button type="button" class="s" id="gateOpen2">🌍 Other browser</button>')+'<button type="button" class="s" id="gateCopy">📋 Copy link</button></div>'+
   '<p class="tiny" style="margin-top:14px;text-align:center"><a href="#" id="gateSkip">Continue here anyway</a></p></div>';
  document.body.appendChild(g);
  if($("gateOpen"))$("gateOpen").onclick=function(){location.href=chromeUrl()};
  if($("gateOpen2"))$("gateOpen2").onclick=function(){location.href=browserUrl()};
  if($("gateGc"))$("gateGc").onclick=function(){location.href=iosChromeUrl()};
  $("gateCopy").onclick=function(){copyLink(this)};
  $("gateSkip").onclick=function(e){e.preventDefault();try{sessionStorage.setItem("iabSkip","1")}catch(x){}g.remove()};
  if(!IOS&&!sessionStorage.getItem("iabTried")){try{sessionStorage.setItem("iabTried","1")}catch(x){}setTimeout(function(){location.href=chromeUrl()},400)}}
async function dlFile(o,rec,tab){if(o.upload){   // uploaded file: fetch it from Drive through the Google script and save it
  var fid=driveIdOf(rec.option),fn=dispOpt(rec.option).replace(/^Upload:\s*/,"");
  try{if(!fid)throw new Error("no file link");
   var r=await get({file:fid,pin:pin()});if(r&&r.error==="pin"){sessionStorage.removeItem("pin");throw new Error("wrong PIN")}
   if(!r||!r.ok||!r.data)throw new Error((r&&r.error)||"not found");
   var bs=atob(r.data),u8=new Uint8Array(bs.length);for(var q=0;q<bs.length;q++)u8[q]=bs.charCodeAt(q);
   await save(new Blob([u8],{type:r.mime||"application/octet-stream"}),(rec.id&&rec.id!=="-"?rec.id+"_":"")+fn)}
  catch(e){var lk=linkOf(rec.option);if(lk&&confirm("Could not download it here ("+(e.message||e)+"). Open it in Google Drive instead?"))window.open(lk,"_blank")}
  return}if(o.img)save(imgBlob(tab.key),tab.file);else save(await buildDocx([rec]),"Math_Cover_Page_"+rec.id+".docx")}
function renderPic(){$("stage").innerHTML='<div class="tabs" style="margin:0 0 10px">'+cur.opt.tabs.map(function(t,i){return '<button class="tab'+(t===cur.tab?' on':'')+'" data-t="'+i+'">'+esc(t.label)+'</button>'}).join("")+'</div><img src="'+IMAGES[cur.tab.key]+'" alt="'+esc(cur.opt.title+" - "+cur.tab.label)+'" style="display:block;width:100%;height:auto">';
 Array.prototype.forEach.call($("stage").querySelectorAll("[data-t]"),function(bt){bt.onclick=function(){cur.tab=cur.opt.tabs[+bt.getAttribute("data-t")];renderPic()}})}
function fileWord(o){return o&&o.img?"photo":"docs file"}
function show(ids){["s1","su","sp","s2","s3","c1"].forEach(function(i){$(i).classList.toggle("hidden",ids.indexOf(i)<0)})}
function fit(){var w=$("stage").querySelector(".docx-wrapper");if(!w)return;w.style.zoom=1;var sec=w.querySelector("section.docx");if(!sec)return;w.style.zoom=Math.min(1,($("stage").clientWidth-4)/(sec.offsetWidth+4))}
window.addEventListener("resize",fit);

var optN=0;OPTIONS.forEach(function(o){if(o.upload)return;var n=optN++,b=document.createElement("button");b.className="opt";b.innerHTML='<img class="thumb" data-t="'+esc(o.id)+'" alt="" hidden><span class="tx"><b class="n">'+(n+1)+'.</b> '+esc(o.title)+'<small>'+esc(o.desc)+'</small></span>';
 b.onclick=function(){cur.opt=o;cur.tab=o.tabs?o.tabs[0]:null;cur.file=null;cur.pages=1;$("note").value="";if(o.img&&mode==="dl"){cur.skip=true;proceed("-","-");return}   // photo + Download only: no personal info needed -> skip "About you"
  cur.skip=false;
  show(["s2"]);$("sid").focus()};$("opts").appendChild(b)});
$("back1").onclick=function(){show([cur.opt&&cur.opt.upload?"su":"s1"])};
$("suBack").onclick=function(){show(["s1"])};
$("suNext").onclick=function(){if(!cur.file){say("errSu","Please choose your file first.");return}say("errSu","");show(["s2"]);$("sid").focus()};$("back2").onclick=function(){show([cur.skip?"s1":"s2"])};
// ----- ID + name step: both boxes always shown, mismatch warning at the end -----
function same(a,b){return String(a).replace(/\s+/g," ").trim().toLowerCase()===String(b).replace(/\s+/g," ").trim().toLowerCase()}
function findIdByName(n){for(var k in STUDENTS)if(same(STUDENTS[k],n))return k;return null}
function goNext(el){el.focus({preventScroll:true})}   // moves to the next box
// while typing, keep the whole form at the top of the visible area so the next boxes stay in view
var kbpad=document.createElement("div");kbpad.style.cssText="height:0;pointer-events:none";document.body.appendChild(kbpad);   // empty space under the page so it CAN scroll up when the keyboard is open
var focusCard=null;
function placeCard(){if(!focusCard)return;var y=focusCard.getBoundingClientRect().top+(window.pageYOffset||0)-10;window.scrollTo({top:Math.max(0,y),behavior:"auto"})}
document.addEventListener("focusin",function(e){var t=e.target;if(!t||t.tagName!=="INPUT")return;var card=t.closest(".card");if(!card)return;
 focusCard=card;kbpad.style.height="85vh";
 [0,120,300,550,900,1400].forEach(function(d){setTimeout(placeCard,d)})});          // tries again while the keyboard is still sliding up
if(window.visualViewport)visualViewport.addEventListener("resize",placeCard);window.addEventListener("resize",placeCard);   // and again whenever the keyboard changes the screen size
document.addEventListener("focusout",function(){setTimeout(function(){if(!document.activeElement||document.activeElement.tagName!=="INPUT"){focusCard=null;kbpad.style.height="0"}},300)});
$("ssec").addEventListener("input",function(){$("mism").classList.add("hidden");say("errS2","");secTouched=this.value!==autoSec});
$("ssec").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();goNext($("sname"))}});
var secTouched=false,autoSec="",acceptedName="",acceptedSec="",autoName="",nameTouched=false,sidDone=false,choices={},IDLEN=Math.max.apply(null,Object.keys(STUDENTS).map(function(k){return k.length}).concat([0]));
$("sname").addEventListener("input",function(){nameTouched=this.value!==autoName;say("errS2","");$("mism").classList.add("hidden")});
$("sid").addEventListener("input",function(){var id=this.value.trim(),n=STUDENTS[id]||"";say("errS2","");$("mism").classList.add("hidden");
 if(!nameTouched||$("sname").value===autoName){$("sname").value=n;autoName=n;nameTouched=false}      // fills the known name (still editable)
 var ns=STUDENTS[id]?LIST_SECTION:"";                                                       // listed students are in the list section; others type theirs
 if(!secTouched||$("ssec").value===autoSec){$("ssec").value=ns;autoSec=ns;secTouched=false}
 if(IDLEN&&id.length<IDLEN)sidDone=false;
 if(IDLEN&&id.length>=IDLEN&&!sidDone){sidDone=true;goNext($("sname"))}});
$("sid").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();goNext($("sname"))}});
$("sname").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();$("sname").blur();$("next").click()}});
async function proceed(id,name){
  $("mism").classList.add("hidden");cur.id=id;cur.name=name;cur.section=cur.skip?"-":$("ssec").value.trim().toUpperCase();if(!cur.skip){try{localStorage.setItem("me",JSON.stringify({id:id,name:name,sec:cur.section}))}catch(e){}}
  /* Download only on a photo: nothing is saved about the person */
  show(["s3"]);$("stage").innerHTML='<p class="note" style="padding:16px">Loading preview…</p>';
  $("dlMain").textContent="📥 Download "+fileWord(cur.opt);$("dlPrev").textContent="📥 Download "+fileWord(cur.opt);$("warnDl").textContent="📥 No, just download the "+fileWord(cur.opt);
  if(cur.opt.img){renderPic();return}
  try{var blob=await buildDocx([{id:id,name:name,section:cur.section,copies:1}]);$("stage").innerHTML="";
   await docx.renderAsync(blob,$("stage"),null,{className:"docx",inWrapper:true,ignoreLastRenderedPageBreak:true});fit()}
  catch(e){$("stage").innerHTML='<p class="note" style="padding:16px">Preview could not load ('+esc(e.message||e)+'). You can still send it to print.</p>'}}
function warn(msg,a,b){choices={a:a,b:b};var m=$("mism");m.className="banner err";
  m.innerHTML="<div>⚠️ "+esc(msg)+'</div><div style="margin-top:8px"><button class="p" style="margin:0 6px 6px 0" data-k="a">'+esc(a.label)+'</button><button class="s" style="margin:0 0 6px 0" data-k="b">'+esc(b.label)+"</button></div>";
  flashBad(m);m.scrollIntoView({block:"center",behavior:"smooth"})}
$("mism").addEventListener("click",function(e){var k=e.target.getAttribute("data-k");if(!k)return;var c=choices[k];
  if(c.sec!==undefined){$("ssec").value=c.sec;acceptedSec=c.id+"|"+c.sec}                                   // section choice
  else{$("sid").value=c.id;$("sname").value=c.name;autoName=STUDENTS[c.id]||"";nameTouched=!same(autoName,c.name);acceptedName=c.id+"|"+c.name.toLowerCase()}   // name / ID choice
  $("next").click()});                                                                                         // check everything again (a section warning may come next)
// ----- ID list: a small scrolling frame under the ID box to pick from (typing still works) -----
function renderSugg(){var q=$("sid").value.trim(),b=$("sugg");
  var ks=Object.keys(STUDENTS).filter(function(k){return k.indexOf(q)>-1});
  if(document.activeElement!==$("sid")||!ks.length||(STUDENTS[q]&&ks.length===1)){b.classList.add("hidden");return}
  b.innerHTML=ks.map(function(k){return'<button type="button" data-i="'+k+'"><b>'+k+'</b> <small>'+esc(STUDENTS[k])+"</small></button>"}).join("");b.classList.remove("hidden");suggHint(b)}
/* phones hide scrollbars until you scroll: when the list is longer than its box, it bounces down a little and back (small, again and again after a short pause) until the person touches it */
var suggRun=0;
function suggHint(b){if(b.scrollHeight<=b.clientHeight+2)return;
 if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 var id=++suggRun,touched=false,amp=Math.min(14,b.scrollHeight-b.clientHeight);
 function stop(){touched=true}
 ["touchstart","wheel","pointerdown"].forEach(function(ev){b.addEventListener(ev,stop,{passive:true,once:true})});
 function bounce(){if(id!==suggRun||touched||b.classList.contains("hidden")||b.scrollTop>0)return;
  var t0=performance.now(),D=900;
  (function step(now){if(id!==suggRun||touched){return}
   var t=Math.min(1,(now-t0)/D);
   b.scrollTop=amp*Math.exp(-2.6*t)*Math.abs(Math.sin(t*Math.PI*2.5));   // down, back, smaller down, back
   if(t<1)requestAnimationFrame(step);else{b.scrollTop=0;setTimeout(bounce,1800)}})(t0)}
 setTimeout(bounce,1200)}
$("sid").addEventListener("focus",renderSugg);$("sid").addEventListener("input",renderSugg);
$("sid").addEventListener("blur",function(){setTimeout(function(){$("sugg").classList.add("hidden")},200)});
$("sugg").addEventListener("pointerdown",function(e){e.preventDefault()});     // keeps the keyboard open while you scroll the list
$("sugg").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var k=b.getAttribute("data-i");
  $("sid").value=k;$("sname").value=STUDENTS[k];$("ssec").value=LIST_SECTION;autoName=STUDENTS[k];autoSec=LIST_SECTION;nameTouched=secTouched=false;sidDone=true;
  $("mism").classList.add("hidden");say("errS2","");$("sugg").classList.add("hidden");if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()});
// ----- Remember me: the phone keeps your last ID, name and section -----
try{var me=JSON.parse(localStorage.getItem("me")||"null");if(me&&me.id){$("sid").value=me.id;$("sname").value=me.name||"";$("ssec").value=me.sec||"";
  autoName=STUDENTS[me.id]||"";nameTouched=$("sname").value!==autoName;autoSec=STUDENTS[me.id]?LIST_SECTION:"";secTouched=$("ssec").value!==autoSec;sidDone=true;
  if(!sessionStorage.getItem("myid"))sessionStorage.setItem("myid",me.id)}}catch(e){}
$("forget").onclick=function(e){e.preventDefault();try{localStorage.removeItem("me")}catch(x){}["sid","sname","ssec"].forEach(function(i){$(i).value=""});autoName=autoSec="";nameTouched=secTouched=sidDone=false;$("mism").classList.add("hidden");$("sid").focus()};
$("next").onclick=function(){
  var id=$("sid").value.trim(),name=$("sname").value.trim();
  if(!id){say("errS2","Please type your registration number.",$("sid"));$("sid").focus();return}
  if(!name){say("errS2","Please type your full name.",$("sname"));goNext($("sname"));return}
  var secNow=$("ssec").value.trim();if(!secNow){say("errS2","Please type your section.",$("ssec"));goNext($("ssec"));return}
  say("errS2","");
  var idName=STUDENTS[id],nameId=findIdByName(name),skipName=acceptedName===id+"|"+name.toLowerCase();
  if(!skipName&&idName&&!same(idName,name)){
   if(nameId&&nameId!==id)return warn("The name “"+name+"” is ID "+nameId+" in our list, but you typed ID "+id+" ("+idName+"). Which one is right?",{label:"Keep ID "+id+" ("+idName+")",id:id,name:idName},{label:"Keep name "+STUDENTS[nameId]+" (ID "+nameId+")",id:nameId,name:STUDENTS[nameId]});
   return warn("ID "+id+" is “"+idName+"” in our list, but you typed “"+name+"”. Which one do you want to keep?",{label:"Keep “"+idName+"”",id:id,name:idName},{label:"Keep “"+name+"”",id:id,name:name})}
  if(!skipName&&!idName&&nameId)return warn("“"+name+"” is ID "+nameId+" in our list, but you typed ID "+id+". Which one do you want to keep?",{label:"Keep ID "+nameId,id:nameId,name:STUDENTS[nameId]},{label:"Keep ID "+id,id:id,name:name});
  var sec=secNow.toUpperCase();$("ssec").value=sec;
  if(idName&&sec!==LIST_SECTION&&acceptedSec!==id+"|"+sec)return warn("ID "+id+" is on our Section "+LIST_SECTION+" list, but you typed Section "+sec+". Which one do you want to keep?",{label:"Keep Section "+LIST_SECTION,id:id,sec:LIST_SECTION},{label:"Keep Section "+sec,id:id,sec:sec});
  if(cur.opt.upload){cur.id=id;cur.name=idName||name;cur.section=sec;try{localStorage.setItem("me",JSON.stringify({id:cur.id,name:cur.name,sec:sec}))}catch(e){}openWarn();return}
  proceed(id,idName||name)};
var PRICE=PRICE_PER_PAGE;
function money(o,n,pg){return Math.round(PRICE*(pg||o.pages||1)*n*100)/100}
// ----- Uploaded files (friends upload their own file to be printed) -----
var NOTESEP=" ✎ ";   // an order text is  "<option> | <drive link> ✎ <printing instructions>"  (link and instructions are optional)
function baseOpt(t){return String(t).split(NOTESEP)[0]}
function noteOf(t){return String(t).split(NOTESEP).slice(1).join(NOTESEP).trim()}
function isUp(t){return String(t).indexOf("Upload:")===0}
function dispOpt(t){return baseOpt(t).split("|")[0].replace(/ \(\d+ pages?\)\s*$/,"").trim()}                                   // text without the Drive link
function linkOf(t){var m=baseOpt(t).split("|")[1];m=m&&m.trim();return /^https:\/\/(drive|docs)\.google\.com\//.test(m||"")?m:""}   // only Google Drive links are trusted
function pgOf(t){var m=/\((\d+) pages?\)/.exec(baseOpt(t));return m?+m[1]:1}
function priceTxt(o){if(isUp(o.option)&&!/\(\d+ pages?\)/.test(baseOpt(o.option)))return "—";return money(optOf(o.option),+o.copies||1,pgOf(o.option))+" "+CURRENCY}   // admin: no price when an uploaded file's page count is unknown
function optCell(t){var u=linkOf(t),pm=/\((\d+) pages?\)/.exec(baseOpt(t));return esc(dispOpt(t))+(pm&&+pm[1]>1?' <small>· '+pm[1]+' pages</small>':"")+(u?' <a href="'+esc(u)+'" target="_blank" rel="noopener">🔗 open</a>':"")+(noteOf(t)?'<br><small>📝 '+esc(noteOf(t))+'</small>':"")}
var H2C="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";   // turns the first page of a Word file into a small picture for Print status
var pdfDoc=null,pdfPg=1,upUrl=null,PDFJS="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/";
// ----- small pictures so a file can be recognised without reading its name -----
function thumbSrc(o){var F=(typeof ASSET_FILES!=="undefined"&&ASSET_FILES)||{},v=(typeof ASSET_VERSION!=="undefined"&&ASSET_VERSION)?"?v="+encodeURIComponent(ASSET_VERSION):"";
 return(typeof THUMBS!=="undefined"&&THUMBS[o.id])||(o.tabs&&typeof IMAGES!=="undefined"&&IMAGES[o.tabs[0].key])||(F.thumbs&&F.thumbs[o.id]&&F.thumbs[o.id]+v)||(o.tabs&&F.images&&F.images[o.tabs[0].key]&&F.images[o.tabs[0].key]+v)||""}   // if the downloaded copy is missing (opened from a computer folder, slow phone...), the picture file is simply used as a normal <img>
function fillThumbs(){var im=document.querySelectorAll("img.thumb[data-t]");for(var i=0;i<im.length;i++){var o=null;for(var k=0;k<OPTIONS.length;k++)if(OPTIONS[k].id===im[i].getAttribute("data-t"))o=OPTIONS[k];var u=o?thumbSrc(o):"";if(u){im[i].onerror=function(){this.hidden=true};im[i].src=u;im[i].hidden=false}}}
if(document.readyState==="complete")fillThumbs();else window.addEventListener("load",fillThumbs);
function driveIdOf(t){var m=/\/d\/([\w-]+)/.exec(linkOf(t));return m?m[1]:""}
function thumbOf(t){var m=baseOpt(t).split("|")[2];m=m&&m.trim();return /^[\w-]{10,}$/.test(m||"")?m:driveIdOf(t)}   // Drive id of the small preview picture; if there is none (PowerPoint, old Word...) Google Drive makes the picture of the original file
var thumbCache={};
function extIcon(t){var n=dispOpt(t);return /\.pdf\b/i.test(n)?"📕":/\.docx?\b/i.test(n)?"📘":/\.pptx?\b/i.test(n)?"📊":/\.(jpe?g|png|webp|gif)\b/i.test(n)?"🖼️":"📝"}
function thumbHtml(t){if(isUp(t)){var f=thumbOf(t);return thumbCache[f]?'<img class="thumb up" alt="" src="'+thumbCache[f]+'">':'<span class="thumb emo up" data-pv="'+esc(f)+'">'+extIcon(t)+'</span>'}var u=thumbSrc(optOf(t));return u?'<img class="thumb" alt="" src="'+u+'">':'<span class="thumb emo">📄</span>'}
// the preview picture of an uploaded file comes from the Google script and only to the student who owns the order
async function loadThumbs(){var id=$("cid").value.trim();if(!id)return;
 var els=document.querySelectorAll("#clist [data-pv]");
 for(var i=0;i<els.length;i++){var f=els[i].getAttribute("data-pv");if(!f||thumbCache[f]!==undefined)continue;thumbCache[f]=false;
  try{var r=await get({thumb:f,id:id});if(r&&r.ok&&r.data){thumbCache[f]=r.data;Array.prototype.forEach.call(document.querySelectorAll('#clist [data-pv="'+f+'"]'),function(e){var im=document.createElement("img");im.className="thumb up";im.alt="";im.src=r.data;e.replaceWith(im)})}else delete thumbCache[f]}catch(e){delete thumbCache[f]}}}
new MutationObserver(function(){loadThumbs()}).observe($("clist"),{childList:true});
function sizeTxt(b){return b>1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB"}
function copyLink(b){var t=b.textContent,l=location.href.split("#")[0],host=b.closest(".frow")||b.parentNode;
 function ok(){b.textContent="✅ Link copied";setTimeout(function(){b.textContent=t},3000);showCopied(host,l,true)}
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(l).then(ok,function(){showCopied(host,l,false)});else showCopied(host,l,false)}
// PDF preview + exact page count (the pdf.js tool is loaded only when someone picks a PDF)
function workerOk(url){return new Promise(function(res){var w;try{w=new Worker(url)}catch(e){return res(false)}
 var t=setTimeout(function(){try{w.terminate()}catch(x){}res(true)},300);w.onerror=function(){clearTimeout(t);try{w.terminate()}catch(x){}res(false)}})}
function loadPdfJs(){return new Promise(function(res,rej){
 if(window.pdfjsLib)return res(window.pdfjsLib);
 var s=document.createElement("script"),t=setTimeout(function(){rej(new Error("slow"))},9000);
 s.src=PDFJS+"pdf.min.js";
 s.onload=async function(){clearTimeout(t);try{
   var u=URL.createObjectURL(new Blob(['importScripts("'+PDFJS+'pdf.worker.min.js");'],{type:"text/javascript"}));
   window.pdfjsLib.GlobalWorkerOptions.workerSrc=u;
   if(location.protocol==="file:"||!(await workerOk(u)))await addScript(PDFJS+"pdf.worker.min.js");   // some browsers cannot start the helper: run it on the page instead
   res(window.pdfjsLib)}catch(e){rej(e)}};
 s.onerror=function(){clearTimeout(t);rej(new Error("blocked"))};document.head.appendChild(s)})}
function addScript(u){return new Promise(function(res,rej){var s=document.createElement("script");s.src=u;s.onload=res;s.onerror=function(){rej(new Error("blocked"))};document.head.appendChild(s)})}
async function openPdf(buf){var lib=await loadPdfJs();return await lib.getDocument({data:buf.slice()}).promise}
async function renderPdfPage(n){
 if(!pdfDoc)return;pdfPg=Math.max(1,Math.min(pdfDoc.numPages,n));
 var pg=await pdfDoc.getPage(pdfPg),host=$("upThumb"),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.min(host.clientWidth||300,560),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:w/v0.width*dpr}),cv=document.createElement("canvas");
 cv.width=vp.width;cv.height=vp.height;cv.style.width=(vp.width/dpr)+"px";
 await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;
 host.innerHTML="";host.appendChild(cv);$("upPgLbl").textContent="Page "+pdfPg+" of "+pdfDoc.numPages;$("upPrevB").disabled=pdfPg<=1;$("upNextB").disabled=pdfPg>=pdfDoc.numPages}
// Word / PowerPoint files: the page (or slide) count is written inside the file
async function guessOfficePages(f){
 try{if(typeof JSZip==="undefined"||!/\.(docx|pptx)$/i.test(f.name))return 0;
  var z=await JSZip.loadAsync(f),x=z.file("docProps/app.xml");if(!x)return 0;
  var t=await x.async("string"),m=/<Pages>(\d+)<\/Pages>/.exec(t)||/<Slides>(\d+)<\/Slides>/.exec(t);return m?+m[1]:0}catch(e){return 0}}
// Photos: turn any photo (HEIC, WebP, big camera photos) into a normal smaller JPG so it uploads fast
function loadImg(f){return new Promise(function(res,rej){var u=URL.createObjectURL(f),i=new Image();i.onload=function(){res({img:i,url:u})};i.onerror=function(){URL.revokeObjectURL(u);rej(new Error("This photo type can't be opened here. Please choose a JPG or PNG, or use Take a photo."))};i.src=u})}
async function normalizeImage(f){
 var ext=(f.name.split(".").pop()||"").toLowerCase();
 if((ext==="jpg"||ext==="jpeg"||ext==="png")&&f.size<=1500000)return f;
 var r=await loadImg(f),im=r.img,w=im.naturalWidth,h=im.naturalHeight,k=Math.min(1,2400/Math.max(w,h)),c=document.createElement("canvas");
 c.width=Math.round(w*k);c.height=Math.round(h*k);var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(r.url);
 var blob=await new Promise(function(res){c.toBlob(res,"image/jpeg",.88)});if(!blob)throw new Error("Could not prepare the photo. Please try another one.");
 return new File([blob],(f.name.replace(/\.[^.]+$/,"")||"photo")+".jpg",{type:"image/jpeg"})}
function smallData(src,w,h){var k=Math.min(1,640/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(src,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.65)}
async function imgSmall(f){var r=await loadImg(f);try{return smallData(r.img,r.img.naturalWidth,r.img.naturalHeight)}finally{URL.revokeObjectURL(r.url)}}
async function pdfSmall(){var pg=await pdfDoc.getPage(1),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:Math.min(2,640/v0.width)}),c=document.createElement("canvas");c.width=v.width;c.height=v.height;var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:v}).promise;return c.toDataURL("image/jpeg",.65)}
async function docSmall(sec,pageH){if(!window.html2canvas)await addScript(H2C);var o={scale:Math.min(1,640/sec.offsetWidth),backgroundColor:"#fff",logging:false,useCORS:true};if(pageH)o.height=Math.min(pageH,sec.scrollHeight||pageH);var c=await html2canvas(sec,o);return c.toDataURL("image/jpeg",.65)}
// ----- PowerPoint / Word preview helpers: one slide (or page) at a time, with arrows and a zoom button -----
var PEMU=9525;
function px1(el,tag){return el?el.getElementsByTagName(tag)[0]||null:null}
function pat(el,n,d){return el&&el.getAttribute(n)!==null?el.getAttribute(n):d}
function pathJoin(base,t){if(t.charAt(0)==="/")return t.slice(1);var o=base.split("/").slice(0,-1).concat(t.split("/")),r=[];o.forEach(function(s){if(s==="..")r.pop();else if(s&&s!==".")r.push(s)});return r.join("/")}
async function pxml(z,p){var f=z.file(p);return f?new DOMParser().parseFromString(await f.async("string"),"application/xml"):null}
async function relMap(z,part){var i=part.lastIndexOf("/"),r=await pxml(z,part.slice(0,i+1)+"_rels/"+part.slice(i+1)+".rels"),m={};if(r)Array.prototype.forEach.call(r.getElementsByTagName("Relationship"),function(e){m[e.getAttribute("Id")]=pathJoin(part,e.getAttribute("Target"))});return m}
async function loadPptx(f){
  var z=await JSZip.loadAsync(f),pr=await pxml(z,"ppt/presentation.xml");if(!pr)throw new Error("not a pptx");
  var sz=px1(pr,"p:sldSz"),rels=await relMap(z,"ppt/presentation.xml"),ids=Array.prototype.map.call(pr.getElementsByTagName("p:sldId"),function(e){return rels[e.getAttribute("r:id")]}).filter(Boolean),th="";
  var tf=z.file("docProps/thumbnail.jpeg")||z.file("docProps/thumbnail.jpg");   // PowerPoint / Google Slides keep a small picture of slide 1 inside the file
  if(tf){try{var b=await tf.async("base64");if(b.length<250000)th="data:image/jpeg;base64,"+b}catch(e){}}
  return{z:z,W:+pat(sz,"cx",9144000),H:+pat(sz,"cy",5143500),slides:ids,thumb:th,lay:{}}}
function xfrmOf(sp){var s=px1(sp,"p:spPr"),x=s&&Array.prototype.filter.call(s.children,function(c){return c.nodeName==="a:xfrm"})[0];if(!x)return null;var o=px1(x,"a:off"),e=px1(x,"a:ext");return o&&e?{x:+o.getAttribute("x"),y:+o.getAttribute("y"),w:+e.getAttribute("cx"),h:+e.getAttribute("cy")}:null}
function phOf(sp){return px1(px1(px1(sp,"p:nvSpPr"),"p:nvPr"),"p:ph")}
function findPh(doc,ph){if(!doc||!ph)return null;var idx=pat(ph,"idx",null),ty=pat(ph,"type","body"),all=doc.getElementsByTagName("p:sp");
  for(var i=0;i<all.length;i++){var q=phOf(all[i]);if(!q)continue;var qi=pat(q,"idx",null),qt=pat(q,"type","body");
   if((idx!==null&&qi===idx)||(idx===null&&(qt===ty||(/title/i.test(qt)&&/title/i.test(ty))))){var b=xfrmOf(all[i]);if(b)return b}}return null}
function bgOf(doc){var bg=px1(doc,"p:bg"),c=bg&&px1(px1(bg,"a:solidFill"),"a:srgbClr");return c?"#"+c.getAttribute("val"):""}
function isDark(c){if(!/^#[0-9a-f]{6}$/i.test(c))return false;var n=parseInt(c.slice(1),16);return(0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))<110}
async function buildPptSlide(P,i){
  var path=P.slides[i],doc=await pxml(P.z,path),rels=await relMap(P.z,path),lp="",k,mp="";
  for(k in rels)if(/slideLayouts\//.test(rels[k]))lp=rels[k];
  var lay=lp?await pxml(P.z,lp):null;
  if(lp){var lr=await relMap(P.z,lp);for(k in lr)if(/slideMasters\//.test(lr[k]))mp=lr[k]}
  var mas=mp?await pxml(P.z,mp):null,tS=+pat(px1(px1(px1(mas,"p:titleStyle"),"a:lvl1pPr"),"a:defRPr"),"sz",0),bS=+pat(px1(px1(px1(mas,"p:bodyStyle"),"a:lvl1pPr"),"a:defRPr"),"sz",0),bg=bgOf(doc)||bgOf(lay)||bgOf(mas)||"#ffffff",dark=isDark(bg);
  var d=document.createElement("div");d.className="pslide";d.style.cssText="position:relative;overflow:hidden;flex:none;font-family:Calibri,Arial,sans-serif;width:"+P.W/PEMU+"px;height:"+P.H/PEMU+"px;background:"+bg;
  async function walk(tree){
   for(var n=0;n<tree.children.length;n++){var c=tree.children[n],nm=c.nodeName;
    if(nm==="p:grpSp"){await walk(c);continue}
    if(nm==="p:sp"||nm==="p:pic"||nm==="p:graphicFrame"){
     var ph=nm==="p:sp"?phOf(c):null,box=nm==="p:graphicFrame"?(function(){var x=px1(c,"p:xfrm"),o=px1(x,"a:off"),e=px1(x,"a:ext");return o&&e?{x:+o.getAttribute("x"),y:+o.getAttribute("y"),w:+e.getAttribute("cx"),h:+e.getAttribute("cy")}:null})():xfrmOf(c)||(ph&&(findPh(lay,ph)||findPh(mas,ph)));
     if(!box)continue;
     var el=document.createElement("div");el.style.cssText="position:absolute;box-sizing:border-box;overflow:hidden;left:"+box.x/PEMU+"px;top:"+box.y/PEMU+"px;width:"+box.w/PEMU+"px;height:"+box.h/PEMU+"px";
     if(nm==="p:pic"){
      var bl=px1(c,"a:blip"),tg=bl&&rels[bl.getAttribute("r:embed")],ex=tg&&(tg.split(".").pop()||"").toLowerCase(),mt={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",svg:"image/svg+xml"}[ex];
      if(!mt||!P.z.file(tg))continue;
      var bb=await P.z.file(tg).async("uint8array"),im=document.createElement("img");im.src=URL.createObjectURL(new Blob([bb],{type:mt}));im.style.cssText="width:100%;height:100%;object-fit:fill;display:block";el.appendChild(im);d.appendChild(el);continue}
     if(nm==="p:graphicFrame"){el.style.cssText+=";border:1px dashed #999;display:flex;align-items:center;justify-content:center;color:#666;font-size:20px";el.textContent="📊 table / chart";d.appendChild(el);continue}
     var sp=px1(c,"p:spPr"),fl=sp&&Array.prototype.filter.call(sp.children,function(q){return q.nodeName==="a:solidFill"})[0],fc=fl&&px1(fl,"a:srgbClr");if(fc)el.style.background="#"+fc.getAttribute("val");
     var ty=ph?pat(ph,"type","body"):"",ps=c.getElementsByTagName("a:p"),bp=px1(c,"a:bodyPr"),anc=pat(bp,"anchor","t"),any=false,col=document.createElement("div");
     col.style.cssText="display:flex;flex-direction:column;height:100%;justify-content:"+(anc==="ctr"||/ctrTitle|subTitle/.test(ty)?"center":anc==="b"?"flex-end":"flex-start")+";padding:7px 10px";
     for(var q=0;q<ps.length;q++){var p=ps[q],txt="",rp=null;
      for(var r=0;r<p.children.length;r++){var ch=p.children[r];
       if(ch.nodeName==="a:r"||ch.nodeName==="a:fld"){var t=px1(ch,"a:t");if(t)txt+=t.textContent;if(!rp)rp=px1(ch,"a:rPr")}else if(ch.nodeName==="a:br")txt+="\n"}
      var pp=px1(p,"a:pPr"),epr=px1(p,"a:endParaRPr"),rr=rp||epr;
      if(!txt.trim()){var e0=document.createElement("div");e0.style.height=((+pat(rr,"sz",1800))/100*1.33*1.2)+"px";col.appendChild(e0);continue}
      any=true;
      var sz=+pat(rr,"sz",/title/i.test(ty)?(tS||(ty==="ctrTitle"?4400:4000)):ty==="subTitle"?2400:ph?(bS||1800):1800)/100*96/72,
          clr=px1(px1(rr,"a:solidFill"),"a:srgbClr"),al=pat(pp,"algn",/ctrTitle|subTitle/.test(ty)?"ctr":"l"),bu=(pp&&px1(pp,"a:buChar"))||(ph&&(ty===""||ty==="body")&&!(pp&&px1(pp,"a:buNone"))),pe=document.createElement("div");
      pe.style.cssText="font-size:"+sz+"px;line-height:1.2;white-space:pre-wrap;overflow-wrap:anywhere;text-align:"+({ctr:"center",r:"right",just:"justify"}[al]||"left")+";font-weight:"+(pat(rr,"b","0")==="1"||/title/i.test(ty)?"700":"400")+";font-style:"+(pat(rr,"i","0")==="1"?"italic":"normal")+";color:"+(clr?"#"+clr.getAttribute("val"):dark?"#fff":"#222");
      pe.textContent=(bu?"• ":"")+txt;col.appendChild(pe)}
     if(!any&&!fc)continue;el.appendChild(col);d.appendChild(el)}}}
  var tree=px1(doc,"p:spTree");if(tree)await walk(tree);return d}
// shows `count` pages one at a time inside `host` (`wrap` holds them); getEl(i) gives page i; natW = width of one page in px
function pagedView(host,wrap,count,getEl,natW,unit,pre){
  var all=pre||[],pg=0,zm=1,Z=[1,1.8,2.8];
  async function go(k){pg=Math.max(0,Math.min(count-1,k));if(!all[pg]){all[pg]=await getEl(pg);wrap.appendChild(all[pg])}
   all.forEach(function(e,i){if(e)e.style.display=i===pg?"":"none"});
   wrap.style.zoom=Math.min(1,host.clientWidth/natW)*zm;host.style.maxHeight=zm>1?"72vh":"";host.style.justifyContent=zm>1?"flex-start":"center";host.scrollTop=0;host.scrollLeft=0;
   $("upPgLbl").textContent=count>1?unit+" "+(pg+1)+" of "+count:"";$("upPrevB").disabled=pg<=0;$("upNextB").disabled=pg>=count-1}
  $("upNav").classList.remove("hidden");$("upZoomB").classList.remove("hidden");
  [$("upPrevB"),$("upNextB"),$("upPgLbl")].forEach(function(e){e.classList.toggle("hidden",count<2)});
  $("upPrevB").onclick=function(){go(pg-1)};$("upNextB").onclick=function(){go(pg+1)};
  $("upZoomB").onclick=function(){zm=Z[(Z.indexOf(zm)+1)%Z.length];go(pg)};
  return go(0)}
// ----- Tap a picture to see it bigger (tap again to zoom more, tap outside or ✕ to close) -----
var lb=document.createElement("div");lb.className="imgview hidden";lb.innerHTML='<button class="lbx" type="button" aria-label="Close">✕</button><img alt=""><div class="lbh">Tap the picture to zoom in or out · tap outside to close</div>';document.body.appendChild(lb);
function openLb(src){lb.classList.remove("big");lb.querySelector("img").src=src;lb.classList.remove("hidden");lb.scrollTop=0;lb.scrollLeft=0}
lb.addEventListener("click",function(e){if(e.target.tagName==="IMG"){var big=lb.classList.toggle("big");if(big){lb.scrollLeft=(lb.scrollWidth-lb.clientWidth)/2;lb.scrollTop=0}}else lb.classList.add("hidden")});
document.addEventListener("keydown",function(e){if(e.key==="Escape")lb.classList.add("hidden")});
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("#clist img.thumb,#stage img,#upThumb img,#upThumb canvas,#ppGrid img");if(!t)return;
  try{openLb(t.tagName==="CANVAS"?t.toDataURL("image/jpeg",.92):t.currentSrc||t.src)}catch(x){}});
function stepper(m,p,inp,min,max){
 $(m).onclick=function(){var i=$(inp);i.value=Math.max(min,(+i.value||min)-1);i.dispatchEvent(new Event("input"))};
 $(p).onclick=function(){var i=$(inp);i.value=Math.min(max,(+i.value||min)+1);i.dispatchEvent(new Event("input"))}}
function renderUpload(){
 cur.photos=null;cur.file=null;cur.pages=1;cur.exact=false;pdfDoc=null;if(upUrl){URL.revokeObjectURL(upUrl);upUrl=null}
 $("suBody").innerHTML=
  '<div id="upPickRow" class="pickrow"><label class="bigpick pk1" for="upf">📂 Choose a file<small>PDF, Word, PowerPoint or photos (several photos = one PDF)'+(MAX_UPLOAD_MB>0?' · up to '+MAX_UPLOAD_MB+' MB':'')+'</small></label>'+
  '<label class="bigpick pk2" for="upCam">📷 Take a photo<small>of a page or your notes</small></label></div>'+
  '<input type="file" id="upf" class="hid" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"><input type="file" id="upCam" class="hid" accept="image/*" capture="environment"><input type="file" id="upMore" class="hid" multiple accept="image/*"><input type="file" id="upMoreCam" class="hid" accept="image/*" capture="environment">'+
  '<div class="tiny" id="upInfo"></div><div id="upPrev"></div>'+
  '<div id="upOpts" class="hidden">'+
   '<div id="pgBox" class="hidden"><label for="upPages">Number of pages <span id="pgWarn" class="hidden">⚠️</span></label><div class="stepper" id="pgRow"><button type="button" class="s" id="pgMinus">−</button><input id="upPages" type="number" min="1" max="500" value="1"><button type="button" class="s" id="pgPlus">+</button></div><div class="tiny">We cannot read the page count of this file. Please set it (used for the price).</div></div>'+
   '<label for="suCopies">Copies</label><div class="stepper"><button type="button" class="s" id="cpMinus">−</button><input id="suCopies" type="number" min="1" max="'+MAX_COPIES+'" value="1"><button type="button" class="s" id="cpPlus">+</button></div><div class="tiny" id="suPrice"></div>'+
   '<label for="suNote">Instructions for printing (optional)</label><textarea id="suNote" rows="2" maxlength="200" placeholder="e.g. both side print koiro, stapled, black &amp; white"></textarea><button type="button" class="p wide" id="suDl">📥 Download</button></div>'+
  '<details id="upHelp" class="uphelp"><summary>😕 Can\'t choose a file?</summary>'+guideSteps()+'<div class="frow">'+
   (IAB&&!IOS?'<button type="button" class="p" id="hpChrome">🌐 Open in Chrome</button><button type="button" class="s" id="hpOther">🌍 Other browser</button>':'')+
   '<button type="button" class="s" id="hpCopy">📋 Copy link</button>'+
   (MESSENGER_LINK?'<a class="lnkbtn" href="'+esc(MESSENGER_LINK)+'" target="_blank" rel="noopener">💬 Message '+esc(OWNER_NAME)+'</a>':'')+
  '</div></details>';
 function pick(){var fs=Array.prototype.slice.call(this.files);this.value="";if(fs.length)pickMany(fs,false)}
 $("upf").onchange=pick;$("upCam").onchange=pick;
 function more(){var fs=Array.prototype.slice.call(this.files);this.value="";if(fs.length)pickMany(fs,true)}
 $("upMore").onchange=more;$("upMoreCam").onchange=more;
 $("upPages").oninput=function(){cur.pages=Math.max(1,Math.min(500,+this.value||1));updPrice()};$("suCopies").oninput=updPrice;
 stepper("pgMinus","pgPlus","upPages",1,500);stepper("cpMinus","cpPlus","suCopies",1,MAX_COPIES);
 $("suDl").onclick=function(){downloadUp(false)};addDlHelp($("suDl"));$("hpCopy").onclick=function(){copyLink(this)};if($("hpChrome"))$("hpChrome").onclick=function(){location.href=chromeUrl()};if($("hpOther"))$("hpOther").onclick=function(){location.href=browserUrl()};
 if(IAB&&!IOS)$("upHelp").open=true;
 say("errSu","");updPrice()}
function toB64(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1]||"")};r.onerror=function(){rej(r.error||new Error("could not read the file"))};r.readAsDataURL(f)})}
async function readUpload(f,photos){
 cur.file=null;say("errSu","");pdfDoc=null;$("upOpts").classList.add("hidden");$("upPrev").innerHTML="";$("upPickRow").classList.remove("hidden");
 if(!f){$("upInfo").textContent="";return}
 var nm=f.name||"file";
 if(MAX_UPLOAD_MB>0&&f.size>MAX_UPLOAD_MB*1048576){$("upInfo").textContent="";say("errSu","That file is too big. Please choose a file under "+MAX_UPLOAD_MB+" MB.");return}
 var isImg=/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(nm);
 if(!isImg&&!/\.(pdf|docx?|pptx?|txt)$/i.test(nm)){say("errSu","Please choose a PDF, Word, PowerPoint, photo or text file.");return}
 cur.photos=photos||(isImg?[f]:null);
 $("upInfo").textContent="⏳ Getting your file ready…";
 try{
  if(isImg)f=await normalizeImage(f);
  var kind=isImg?"img":/\.pdf$/i.test(f.name)?"pdf":/\.docx?$/i.test(f.name)?"word":/\.pptx?$/i.test(f.name)?"ppt":"txt",n=1,exact=false,thumb="",b64=await toB64(f);
  if(upUrl)URL.revokeObjectURL(upUrl);
  if(kind==="img"){upUrl=URL.createObjectURL(f);thumb='<img alt="Preview" src="'+upUrl+'">';exact=true}
  else if(kind==="pdf"){
   try{var buf=new Uint8Array(await f.arrayBuffer());pdfDoc=await openPdf(buf);n=pdfDoc.numPages;exact=true;thumb='<span class="tiny" style="padding:20px">Loading preview…</span>'}
   catch(e){pdfDoc=null;var bin=await f.text(),m=bin.match(/\/Type\s*\/Page[^s]/g);n=m?m.length:0;if(!n){var c=bin.match(/\/Count\s+(\d+)/g)||[];c.forEach(function(x){n=Math.max(n,+x.replace(/\D/g,""))})}thumb='<div class="nopv">📕<br>PDF</div>'}}
  else{n=(kind==="word"||kind==="ppt")?await guessOfficePages(f):0;exact=!!n;thumb='<div class="nopv">'+(kind==="ppt"?"📊":kind==="word"?"📘":"📝")+'<br>'+esc(f.name)+'</div>'}
  n=Math.max(1,Math.min(500,n||1));
  var sm="";try{if(kind==="img")sm=await imgSmall(f);else if(kind==="pdf"&&pdfDoc)sm=await pdfSmall()}catch(e){}   // small picture for Print status
  cur.file={name:f.name,mime:f.type||"application/octet-stream",b64:b64,size:f.size,thumb:sm};cur.pages=n;
  $("upPickRow").classList.add("hidden");$("upInfo").textContent="";
  $("upPrev").innerHTML='<div class="upprev"><div class="upthumb" id="upThumb">'+thumb+'</div>'+
   '<div id="upNav" class="upnav'+(pdfDoc&&n>1?'':' hidden')+'"><button type="button" class="s" id="upPrevB">◀</button><span id="upPgLbl"></span><button type="button" class="s" id="upNextB">▶</button><button type="button" class="s hidden" id="upZoomB">🔍</button></div>'+
   '<div class="upmeta"><b>'+esc(f.name)+'</b><div class="tiny">'+sizeTxt(f.size)+(cur.photos&&cur.photos.length>1?' · '+cur.photos.length+' photos made into one PDF':'')+'</div></div>'+
   '<div><button type="button" class="s" id="upChange">🔄 Change file</button> <button type="button" class="s danger" id="upClear">✕ Remove</button></div>'+
   (cur.photos?'<div class="tiny" style="margin-top:8px">More pages? Add more photos and they all go into one PDF.</div><div><button type="button" class="s" id="upAdd">➕ Add photos</button> <button type="button" class="s" id="upAddCam">📷 Take another</button></div>':'')+'</div>';
  $("upChange").onclick=function(){$("upf").click()};if($("upAdd")){$("upAdd").onclick=function(){$("upMore").click()};$("upAddCam").onclick=function(){$("upMoreCam").click()}};$("upClear").onclick=function(){renderUpload()};
  if(kind==="word"&&/\.docx$/i.test(f.name)){var hh=$("upThumb");try{hh.innerHTML="";await docx.renderAsync(f,hh,null,{className:"docx",inWrapper:true,ignoreLastRenderedPageBreak:true});
    var ww=hh.querySelector(".docx-wrapper"),sc=ww&&ww.querySelector("section.docx");if(!sc)throw 0;try{cur.file.thumb=await docSmall(sc,parseFloat(sc.style.minHeight)||sc.offsetWidth*1.4142)}catch(x){}   /* picture of page 1 for Print status (taken before shrinking the view) */
    var secs=Array.prototype.slice.call(ww.querySelectorAll("section.docx")),PW=sc.offsetWidth,PH=parseFloat(sc.style.minHeight)||PW*1.4142,vp=[];
     /* a Word file without page breaks comes out as ONE very long page: cut it into real page-sized pieces */
     secs.forEach(function(x){var np=Math.max(1,Math.ceil((x.scrollHeight-6)/PH));for(var j=0;j<np;j++)vp.push({s:x,j:j,np:np})});
     secs.forEach(function(x){if(x.parentNode)x.parentNode.removeChild(x)});ww.style.padding="0";ww.style.background="transparent";
     if(!exact){n=Math.max(1,vp.length);cur.pages=n}
     await pagedView(hh,ww,vp.length,function(i){var v=vp[i];v.s.style.margin="0";if(v.np===1)return v.s;
       var c=document.createElement("div"),k=v.s.cloneNode(true);c.style.cssText="width:"+PW+"px;height:"+PH+"px;overflow:hidden;position:relative;flex:none;background:#fff";k.style.cssText+=";position:absolute;left:0;margin:0;top:"+(-v.j*PH)+"px";c.appendChild(k);return c},PW,"Page",[])}catch(e){hh.innerHTML=thumb}}   /* one page at a time (bigger), with ◀ ▶ and 🔍 */
   if(kind==="ppt"&&/\.pptx$/i.test(f.name)){var ph=$("upThumb");try{ph.innerHTML='<span class="tiny" style="padding:20px">Loading preview…</span>';var P=await loadPptx(f);if(!P.slides.length)throw 0;
     var pw=document.createElement("div");pw.style.flex="none";ph.innerHTML="";ph.appendChild(pw);var first=await buildPptSlide(P,0);pw.appendChild(first);
     try{cur.file.thumb=P.thumb||await docSmall(first)}catch(x){}   /* small picture of slide 1 for Print status */
     n=P.slides.length;exact=true;cur.pages=n;
     await pagedView(ph,pw,n,function(i){return buildPptSlide(P,i)},P.W/PEMU,"Slide",[first])}catch(e){ph.innerHTML=thumb}}
  if(pdfDoc){$("upPrevB").onclick=function(){renderPdfPage(pdfPg-1)};$("upNextB").onclick=function(){renderPdfPage(pdfPg+1)};
   await renderPdfPage(1).catch(function(){$("upThumb").innerHTML='<div class="nopv">📕<br>PDF</div>'})}
  $("upPages").value=n;cur.exact=exact;   // pages are only used (silently) when the file tells us the exact number
  $("suDl").textContent="📥 Download "+upWord();$("upOpts").classList.remove("hidden");updPrice()}
 catch(e){cur.file=null;$("upInfo").textContent="";say("errSu",(e&&e.message)||"Could not read that file. Try another file, or use Take a photo.")}}

// ----- Several photos -> ONE PDF (one photo per page, fitted to A4) -----
var PHOTO_MAX=30;
function isImgFile(f){return /^image\//.test(f.type||"")||/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name||"")}
async function needPdfLib(){if(!window.PDFLib)await addScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js")}
async function photoJpeg(f){   // redraws the photo (this also fixes phone photos that are turned sideways) and makes it a lighter JPG
 var r=await loadImg(f),im=r.img,w=im.naturalWidth,h=im.naturalHeight,k=Math.min(1,1800/Math.max(w,h)),c=document.createElement("canvas");
 c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(r.url);
 var b=await new Promise(function(res){c.toBlob(res,"image/jpeg",.82)});if(!b)throw new Error("Could not prepare a photo. Please try another one.");
 return{bytes:new Uint8Array(await b.arrayBuffer()),w:c.width,h:c.height}}
async function photosToPdf(files){
 await needPdfLib();var doc=await PDFLib.PDFDocument.create();
 for(var i=0;i<files.length;i++){
  var p=await photoJpeg(files[i]),land=p.w>p.h*1.05,PW=land?841.89:595.28,PH=land?595.28:841.89,M=18,sc=Math.min((PW-2*M)/p.w,(PH-2*M)/p.h),dw=p.w*sc,dh=p.h*sc,img=await doc.embedJpg(p.bytes),pg=doc.addPage([PW,PH]);
  pg.drawImage(img,{x:(PW-dw)/2,y:(PH-dh)/2,width:dw,height:dh})}
 return new File([await doc.save()],"Photos.pdf",{type:"application/pdf"})}
async function pickMany(fs,add){
 fs=Array.prototype.slice.call(fs);if(!fs.length)return;
 if(fs.length===1&&!add)return readUpload(fs[0]);
 if(!fs.every(isImgFile)){say("errSu","To send several files at once, choose photos only. For PDF, Word or PowerPoint, send one file per order.");return}
 var list=(add&&cur.photos?cur.photos:[]).concat(fs),cut=list.length>PHOTO_MAX;if(cut)list=list.slice(0,PHOTO_MAX);
 say("errSu","");$("upInfo").textContent="⏳ Making one PDF from "+list.length+" photo"+(list.length>1?"s":"")+"…";
 try{var pdf=await photosToPdf(list);await readUpload(pdf,list);if(cut)say("errSu","Only the first "+PHOTO_MAX+" photos were used.")}
 catch(e){$("upInfo").textContent="";say("errSu",e&&e.message==="blocked"?"Could not combine the photos here. Send them one by one as separate orders, or open this page in your browser.":(e&&e.message)||"Could not combine the photos. Try fewer photos.")}}

function upWord(){var e=cur.file&&/\.([A-Za-z0-9]{1,5})$/.exec(cur.file.name);return e?e[1].toUpperCase():"file"}   // PDF, DOCX, PPTX, JPG...
async function downloadUp(fromWarn){   // saves the chosen file straight from the phone: nothing is sent, nothing is uploaded
 if(!cur.file)return;
 var bs=atob(cur.file.b64),u8=new Uint8Array(bs.length);for(var i=0;i<bs.length;i++)u8[i]=bs.charCodeAt(i);
 await save(new Blob([u8],{type:cur.file.mime||"application/octet-stream"}),cur.file.name);
 var b=fromWarn?$("next"):$("suDl"),t=b.textContent;b.textContent="✅ Downloaded. Look in your Downloads folder (or the Files app)";setTimeout(function(){b.textContent=t},2500)}
async function startUpload(f){mode="print";cur.opt=OPTIONS.filter(function(o){return o.upload})[0];cur.tab=null;cur.skip=false;show(["su"]);renderUpload();await readUpload(f)}
$("upPick").onchange=async function(){var fs=Array.prototype.slice.call(this.files);this.value="";if(!fs.length)return;if(fs.length===1)startUpload(fs[0]);else{await startUpload(null);await pickMany(fs,false)}};
// ----- Drop a file anywhere on the page -----
var dragN=0,dov=document.createElement("div");dov.className="dropov hidden";dov.textContent="📤 Drop your file here";document.body.appendChild(dov);
function hasFiles(e){var t=e.dataTransfer&&e.dataTransfer.types;return !!t&&Array.prototype.indexOf.call(t,"Files")>=0}
function onAdmin(){return !$("admin").classList.contains("hidden")}
window.addEventListener("dragenter",function(e){if(!hasFiles(e))return;e.preventDefault();dragN++;if(!onAdmin())dov.classList.remove("hidden")});
window.addEventListener("dragover",function(e){if(hasFiles(e))e.preventDefault()});
window.addEventListener("dragleave",function(e){if(!hasFiles(e))return;dragN=Math.max(0,dragN-1);if(!dragN)dov.classList.add("hidden")});
window.addEventListener("drop",async function(e){if(!hasFiles(e))return;e.preventDefault();dragN=0;dov.classList.add("hidden");if(onAdmin())return;
  var fs=Array.prototype.slice.call(e.dataTransfer.files||[]);if(!fs.length)return;
  if(vis("se")&&window.peDrop){await peDrop(fs);return}   // on the Edit a PDF page
  if(vis("sp")){await ppAddFiles(fs);return}   // on the Photos -> PDF page: add the dropped photos to the list
  var inSu=cur.opt&&cur.opt.upload&&vis("su");
  if(inSu&&cur.photos&&fs.every(isImgFile)){await pickMany(fs,true);return}   // already have photos: add the new ones, do not replace
  if(fs.length>1&&fs.every(isImgFile)){if(!inSu)await startUpload(null);await pickMany(fs,false);return}
  if(inSu)await readUpload(fs[0]);else await startUpload(fs[0]);
  if(fs.length>1)say("errSu","Only the first file was taken ("+fs[0].name+"). To send several files at once, use photos only.")});
function updPrice(){var up=!!cur.opt.upload,n=Math.max(1,Math.min(MAX_COPIES,+$(up?"suCopies":"copies").value||1));$(up?"suPrice":"price").textContent=(up&&!cur.exact)?"":"Price (optional): "+money(cur.opt,n,up?cur.pages:0)+" "+CURRENCY}   /* uploads: the price is only shown when the page count is known */
$("copies").addEventListener("input",updPrice);
async function parse(r){var t=await r.text();try{return JSON.parse(t)}catch(e){throw new Error("The Google script is still the old version. In Apps Script: Deploy > Manage deployments > pencil > Version: New version > Deploy.")}}
async function get(q){return parse(await fetch(SCRIPT_URL+"?"+new URLSearchParams(q)))}
// NOTE FOR ANY AI / EDITOR: do NOT use XMLHttpRequest.upload.onprogress (or any upload listener) to send to the Google script.
// It makes the browser send a CORS "preflight" request that Apps Script cannot answer, so every upload fails with "No connection to Google".
// Uploads must use plain fetch() (see post()). Because of that a real percentage is not possible, so a moving bar + seconds is shown.
var progT=null;
function startProg(){var t0=Date.now();$("upProg").classList.remove("hidden");$("pbBar").classList.add("ind");
 function tick(){var sec=Math.round((Date.now()-t0)/1000);$("pbTxt").textContent="⬆️ Uploading "+sizeTxt(cur.file.size)+"… "+sec+" s. Please keep this page open.";$("next").textContent="Uploading… "+sec+" s"}
 tick();clearInterval(progT);progT=setInterval(tick,1000)}
function stopProg(){clearInterval(progT);progT=null;$("upProg").classList.add("hidden")}
async function post(b){return parse(await fetch(SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(b)}))}
var _show=show;show=function(ids){_show(ids);var m=ids[0]==="c1",dl=mode==="dl";$("tabNew").classList.toggle("on",!m);$("tabMine").classList.toggle("on",m);
 var upm=!!(cur.opt&&cur.opt.upload&&ids[0]==="s2");$("next").textContent=upm?"🖨️ Send to print":"Show preview";
 $("modeHint").textContent="📥 Download the file, or send it to "+OWNER_NAME+" to print at the end.";
 $("printOnly").classList.toggle("hidden",dl);$("dlOnly").classList.toggle("hidden",!dl);$("dlOk").classList.add("hidden");if(ids[0]==="s3")updPrice();bearStep()};
function copiesNow(){return Math.max(1,Math.min(MAX_COPIES,+$(cur.opt&&cur.opt.upload?"suCopies":"copies").value||1))}
function banner(msg,bad){var b=$("banner");if(!msg){b.className="hidden";return}b.className=bad?"banner err":"banner shine";b.textContent=msg;if(bad)flashBad(b)}
var mine=[];
function showMine(id,msg){show(["c1"]);$("cid").value=id||"";banner(msg);if(id)findOrders(false,!!msg);else $("clist").innerHTML=""}
$("tabNew").onclick=function(){mode="print";show(["s1"])};
$("tabMine").onclick=function(){showMine($("cid").value.trim()||cur.id||sessionStorage.getItem("myid")||"")};
$("dlPrev").onclick=async function(){var b=this,t=b.textContent;await dlFile(cur.opt,{id:cur.id,name:cur.name,section:cur.section,copies:copiesNow()},cur.tab);b.textContent="✅ Downloaded. Look in your Downloads folder (or the Files app)";setTimeout(function(){b.textContent=t},2500)};
$("dlMain").onclick=async function(){await dlFile(cur.opt,{id:cur.id,name:cur.name,section:cur.section,copies:1},cur.tab);$("dlOk").classList.remove("hidden");bearReact("cheer")};
function uploadFail(detail){
 var box=$("errS2");box.classList.remove("hidden");
 box.innerHTML='<div class="fail"><b>⚠️ Upload failed</b><div class="frow"><button type="button" class="p" id="fTry">🔁 Try again</button>'+
  (IAB&&!IOS?'<button type="button" class="s" id="fChrome">🌐 Open in Chrome</button><button type="button" class="s" id="fOther">🌍 Other browser</button>':'')+(IAB?'<button type="button" class="s" id="fCopy">📋 Copy link</button>':'')+
  (MESSENGER_LINK?'<a class="lnkbtn" href="'+esc(MESSENGER_LINK)+'" target="_blank" rel="noopener">💬 Message '+esc(OWNER_NAME)+'</a>':'')+
  '</div>'+(IAB?guideSteps():'')+'<details class="fdet"><summary>Why?</summary><div class="tiny">'+esc(detail)+'</div></details></div>';
 $("fTry").onclick=function(){say("errS2","");sendOrder()};
 if($("fChrome"))$("fChrome").onclick=function(){location.href=chromeUrl()};if($("fOther"))$("fOther").onclick=function(){location.href=browserUrl()};
 if($("fCopy"))$("fCopy").onclick=function(){copyLink(this)};
 flashBad(box)}
async function sendOrder(){
 var EID=cur.opt.upload?"errS2":"errS3",btn=cur.opt.upload?$("next"):$("confirm"),o={time:nowStr(),id:cur.id,name:cur.name,section:cur.section||"A",option:cur.opt.img?cur.opt.title+" – "+cur.tab.label:cur.opt.title,copies:copiesNow()};
 btn.disabled=true;say(EID,"");var oldTxt=btn.textContent;btn.textContent=cur.opt.upload?"Uploading…":"Sending…";
 try{
  if(cur.opt.upload){
   var up;try{startProg();up=await post({action:"upload",name:cur.file.name,mime:cur.file.mime,data:cur.file.b64,thumb:cur.file.thumb||"",id:cur.id})}catch(err){throw new Error(err&&err.message==="Failed to fetch"?"No connection to Google (no internet, or the file is too big)":(err&&err.message)||"No answer from Google")}
   if(!up||!up.ok||!up.url)throw new Error(up&&up.error==="type"?"File type not allowed by the script":up&&up.error==="size"?"File too big for the script":up&&up.error&&up.error!=="action"?String(up.error):"The Google script has no upload code yet, or it was not re-deployed as a New version");
   o.option="Upload: "+cur.file.name.replace(/[|\r\n]/g," ").slice(0,80)+(cur.exact?" ("+cur.pages+" page"+(cur.pages>1?"s":"")+")":"")+" | "+up.url+(up.thumb?" | "+up.thumb:"")}
  var nt=($(cur.opt.upload?"suNote":"note").value||"").replace(/[\r\n|]+/g," ").replace(/✎/g,"").trim().slice(0,200);if(nt)o.option+=NOTESEP+nt;
  var r=await post({action:"add",order:o});if(!r.ok)throw new Error(r.error||"failed");
  sessionStorage.setItem("myid",cur.id);showMine(cur.id,"✅ Sent to "+OWNER_NAME+" to print! "+OWNER_NAME+" will give you the printed copy "+HANDOVER_TEXT+". You can see the progress below.");celebrate();bearReact("cheer");buzz([90,50,90,50,250])}
 catch(e){if(cur.opt.upload)uploadFail(e&&e.message||String(e));else say(EID,"Could not send to print: "+(e.message||e),btn)}
 finally{btn.disabled=false;btn.textContent=oldTxt;stopProg()}}
// ----- Warning shown when someone presses "send to print" -----
function openWarn(){
 $("warnT").textContent="Your file will be sent to "+OWNER_NAME;
 $("warnMsg").textContent="If you press Yes, this file goes to "+OWNER_NAME+" to get printed, and "+OWNER_NAME+" will give you the printed copy "+HANDOVER_TEXT+". If you only want the file, download the file instead and nothing is sent.";
 $("warnYes").textContent="🖨️ Yes, let "+OWNER_NAME+" print it";
 $("warnDl").style.display="";if(cur.opt.upload)$("warnDl").textContent="📥 No, just download my "+upWord();
 $("warn").classList.remove("hidden");$("warnYes").focus();buzz([40,40,40])}
function closeWarn(){$("warn").classList.add("hidden")}
$("confirm").onclick=openWarn;
$("warnYes").onclick=function(){closeWarn();sendOrder()};
$("warnDl").onclick=function(){closeWarn();if(cur.opt.upload)downloadUp(true);else $("dlPrev").click()};
$("warnBack").onclick=closeWarn;
$("warn").addEventListener("click",function(e){if(e.target===this)closeWarn()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeWarn()});
async function del(oid,id){
 try{var r=await post({action:"delete",orderId:oid,id:id});
  return r.ok?"Cancelled. It will not be printed.":r.error==="used"?"This is already being printed, so it can't be cancelled.":"Could not find it."}
 catch(e){return"Could not cancel: "+(e.message||e)}}
var STEPS=["Sent","Printing","Printed"],POS=["0%","50%","100%"],prevStep={},seen=[];
try{seen=JSON.parse(localStorage.getItem("seenPrinted")||"[]")}catch(e){}
function stepOf(st){return st==="Used"?2:0}
function trk(now,prev){
 return'<div class="trk" data-now="'+now+'"><div class="bar"><i style="width:'+(prev*50)+'%"></i></div>'+
  [0,1,2].map(function(i){return'<span class="nd'+(i<=prev?" on":"")+'" style="left:'+POS[i]+'"></span><span class="lb" style="left:'+POS[i]+'">'+STEPS[i]+"</span>"}).join("")+
  '<span class="pap" style="left:'+POS[prev]+'">'+(prev===2?"✅":"📄")+"</span></div>"}
function settle(){   // moves the little paper to the real step (this is what makes it slide)
 document.querySelectorAll("#clist .trk").forEach(function(t){
  var n=+t.getAttribute("data-now");t.querySelector(".bar i").style.width=(n*50)+"%";
  t.querySelectorAll(".nd").forEach(function(d,i){d.classList.toggle("on",i<=n)});
  var p=t.querySelector(".pap");p.style.left=POS[n];p.textContent=n===2?"✅":"📄"})}
function row(o){
 var i=mine.indexOf(o),now=stepOf(o.status),prev=prevStep[o.orderId]!==undefined?prevStep[o.orderId]:now;
 return'<div class="ord"><div class="orow">'+thumbHtml(o.option)+'<div class="oc"><div class="oh"><b>'+esc(dispOpt(o.option))+'</b><span class="chip">'+esc(o.copies)+' copy</span></div><div class="tiny">'+esc(o.time)+"</div>"+(noteOf(o.option)?'<div class="tiny">📝 '+esc(noteOf(o.option))+"</div>":"")+"</div></div>"+trk(now,prev)+
  '<div style="margin-top:4px">'+(isUp(o.option)?'':'<button class="s" style="margin:6px 6px 0 0;padding:5px 12px" data-d="'+i+'">📥 Download '+fileWord(optOf(o.option))+'</button>')+
  (now!==2?' <button class="s danger" style="margin:6px 0 0 0;padding:5px 12px" data-o="'+esc(o.orderId)+'">✕ Don’t print this</button>':'<span class="tiny"> Printed</span>')+"</div></div>"}

async function findOrders(quiet,silent){
 var id=$("cid").value.trim();if(!id)return;sessionStorage.setItem("myid",id);
 if(!quiet)$("clist").innerHTML='<p class="note">Loading…</p>';
 try{mine=(await get({id:id})).reverse();
  var w=mine.filter(function(o){return o.status!=="Used"}),d=mine.filter(function(o){return o.status==="Used"}),
   printedNew=d.filter(function(o){return seen.indexOf(o.orderId)<0});
  $("clist").innerHTML='<div class="grp"><div class="gh">⏳ Waiting to be printed <span class="chip">'+w.length+"</span></div>"+(w.length?'<div class="tiny">Changed your mind? Press “Don’t print this” before it is printed.</div>'+w.map(row).join(""):'<p class="note" style="margin:6px 0 0">Nothing waiting.</p>')+"</div>"+
   '<div class="grp"><div class="gh">✅ Already printed <span class="chip">'+d.length+"</span></div>"+(d.length?d.map(row).join(""):'<p class="note" style="margin:6px 0 0">Nothing yet.</p>')+"</div>";
  requestAnimationFrame(function(){requestAnimationFrame(settle)});
  var nm={};mine.forEach(function(o){nm[o.orderId]=stepOf(o.status)});prevStep=nm;
  if(printedNew.length){seen=seen.concat(printedNew.map(function(o){return o.orderId}));try{localStorage.setItem("seenPrinted",JSON.stringify(seen))}catch(e){}
   if(!silent){banner("🎉 Your pages are printed! Ask "+OWNER_NAME+" for them.");celebrate();bearReact("cheer");buzz([90,50,90,50,250])}}
}
 catch(e){$("clist").innerHTML='<p class="note">Could not load: '+esc(e.message||e)+"</p>"}}
setInterval(function(){if(!document.hidden&&vis("c1")&&$("cid").value.trim())findOrders(true)},8000);
$("find").onclick=function(){banner("");findOrders()};
$("clist").addEventListener("click",async function(e){
 var d=e.target.getAttribute("data-d"),o=e.target.getAttribute("data-o");
 if(d!==null){var m=mine[d];var q=optOf(m.option);await dlFile(q,m,tabOf(q,m.option))}
 if(o){if(!confirm("Don't print this? It will be removed from "+OWNER_NAME+"'s print list."))return;var msg=await del(o,$("cid").value.trim());await findOrders();banner(msg,msg.indexOf("Cancelled")!==0)}});

// ----- Theme color -----
function applyTheme(hex){
 var c=[1,3,5].map(function(i){return parseInt(hex.slice(i,i+2),16)}),dark=matchMedia("(prefers-color-scheme: dark)").matches;
 function mix(base,k){return"rgb("+base.map(function(v,i){return Math.round(v+(c[i]-v)*k)}).join(",")+")"}
 var base=dark?[30,26,40]:[255,255,255],st=document.documentElement.style;
 st.setProperty("--accent",hex);
 st.setProperty("--onacc",(0.299*c[0]+0.587*c[1]+0.114*c[2])>150?"#1a1a1a":"#ffffff");
 st.setProperty("--accentD",dark?hex:"rgb("+c.map(function(v){return Math.round(v*.72)}).join(",")+")");
 st.setProperty("--glow","rgba("+c.join(",")+",.55)");
 st.setProperty("--cardbg",dark?"rgba(43,32,55,.5)":"rgba(255,255,255,.5)");
 st.setProperty("--blob1","rgba("+c.join(",")+","+(dark?.4:.75)+")");
 st.setProperty("--blob2","rgba(143,211,255,"+(dark?.3:.6)+")");
 st.setProperty("--shadow","rgba("+c.join(",")+",.18)");
 st.setProperty("--grad","linear-gradient(160deg,"+mix(base,dark?.1:.12)+","+mix(base,dark?.2:.26)+")");
 st.setProperty("--line",mix(base,dark?.3:.22));
}
applyTheme(THEME_COLOR);

// ----- Admin -----
var orders=[];
function pin(){var p=sessionStorage.getItem("pin");if(!p){p=prompt("Admin PIN")||"";sessionStorage.setItem("pin",p)}return p}
async function markUsed(ids){await post({action:"use",pin:pin(),ids:ids});load()}
function arow(o,i){
 var st=o.status||"Pending";
 return"<tr><td>"+esc(o.time)+"</td><td>"+esc(o.id)+"</td><td>"+esc(o.name)+"</td><td>"+optCell(o.option)+"</td><td>"+esc(o.copies)+"</td><td>"+priceTxt(o)+"</td><td>"+(st==="Used"?"Printed":"Waiting")+'</td><td style="white-space:nowrap"><button class="s" style="margin:0" data-i="'+i+'">'+"Download"+'</button>'+
  (st!=="Used"?' <button class="s" style="margin:0" data-u="'+i+'">Mark used</button>':"")+"</td></tr>"}
async function load(){
 $("mode").textContent="Showing orders from your Google Sheet.";$("mode").style.color="";
 try{var r=await get({all:1,pin:pin()});
  if(r.error==="pin"){sessionStorage.removeItem("pin");orders=[];$("mode").textContent="Wrong PIN. Press Refresh to try again.";$("mode").style.color="var(--bad)";flashBad($("mode"))}else orders=r}
 catch(e){orders=[];$("mode").textContent="Could not load orders: "+(e.message||e)}
 var h1="",h2="",n1=0,n2=0;
 orders.forEach(function(o,i){if(o.status==="Used"){h2=arow(o,i)+h2;n2++}else{h1+=arow(o,i);n1++}});
 $("rows").innerHTML=h1;$("rows2").innerHTML=h2;
 $("none").textContent=n1?"":"Nothing to print.";$("none2").textContent=n2?"":"Nothing processed yet."}
async function adminClick(e){
 var i=e.target.getAttribute("data-i"),u=e.target.getAttribute("data-u");
 if(i!==null){var o=orders[i],q=optOf(o.option),bt=e.target,t0=bt.textContent;if(q.upload){bt.disabled=true;bt.textContent="⏳ Getting file…"}
  try{await dlFile(q,o,tabOf(q,o.option))}finally{bt.disabled=false;bt.textContent=t0}}
 if(u!==null)markUsed([orders[u].orderId])}
$("rows").addEventListener("click",adminClick);$("rows2").addEventListener("click",adminClick);
$("dlAll").onclick=async function(){
 var p=orders.filter(function(o){return o.status!=="Used"});if(!p.length){alert("No pending orders.");return}
 var btn=this,old=btn.textContent;btn.disabled=true;btn.textContent="⏳ Getting the files…";
 function safe(t){return String(t).replace(/[\\\/:*?"<>|\r\n]+/g," ").replace(/\s+/g," ").trim().slice(0,110)}
 function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
 function bytesOf(d){var s=atob(d),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
 function loadPdfLib(){return window.PDFLib?Promise.resolve():new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";s.onload=res;s.onerror=function(){rej(new Error("pdf-lib"))};document.head.appendChild(s)})}
 var done=[],bad=[],notes=[],multi=[],n=0;
 async function out(blob,name,what){n++;btn.textContent="⏳ Downloading file "+n+"…";await save(blob,name);done.push(what||name);await sleep(900)}   // small pause so the browser accepts several downloads in a row
 try{
  var cov=p.filter(function(o){return !optOf(o.option).img&&!isUp(o.option)}),pic=p.filter(function(o){return optOf(o.option).img}),ups=p.filter(function(o){return isUp(o.option)});
  p.forEach(function(o){var c=+o.copies||1;if(c>1&&!optOf(o.option).img)multi.push(o.name+" ("+o.id+") – "+dispOpt(o.option)+": "+c+" copies")});
  // 1) cover pages: ONE Word file for everybody (each student's copies already repeated)
  if(cov.length)await out(await buildDocx(cov.map(function(o){var c={};for(var k in o)c[k]=o[k];c.copies=1;return c})),"Cover pages (all students).docx","📘 Cover pages (all students).docx: "+cov.length+" order(s), one page each");
  // 2) get the uploaded files from Drive
  var pdfs=[],others=[];
  for(var u=0;u<ups.length;u++){var o=ups[u],fid=driveIdOf(o.option),fn=dispOpt(o.option).replace(/^Upload:\s*/,""),nt=noteOf(o.option),r=null;
   btn.textContent="⏳ Getting file "+(u+1)+" of "+ups.length+"…";
   try{if(fid)r=await get({file:fid,pin:pin()})}catch(e){r=null}
   if(nt)notes.push(o.name+" ("+o.id+") – "+fn+": "+nt);
   if(r&&r.ok&&r.data){var it={o:o,fn:fn,data:r.data,mime:r.mime,k:u+1};(/\.pdf$/i.test(fn)?pdfs:others).push(it)}else bad.push(fn+" ("+o.name+")")}
  // 3) uploaded PDFs: merged into ONE pdf (each order's copies repeated)
  if(pdfs.length){var merged=null,failed=[],okc=0;
   try{btn.textContent="⏳ Merging PDFs…";await loadPdfLib();merged=await PDFLib.PDFDocument.create();
    for(var k=0;k<pdfs.length;k++){var q=pdfs[k];
     try{var sd=await PDFLib.PDFDocument.load(bytesOf(q.data)),ix=sd.getPageIndices();
      var cp=await merged.copyPages(sd,ix);cp.forEach(function(pg){merged.addPage(pg)})
      okc++}catch(e){failed.push(q)}}}
   catch(e){merged=null;failed=pdfs.slice()}
   if(merged&&merged.getPageCount()>0)await out(new Blob([await merged.save()],{type:"application/pdf"}),"Uploaded PDFs (all students, merged).pdf","📕 Uploaded PDFs (all students, merged).pdf: "+okc+" file(s), each once");
   others=failed.concat(others)}   // a PDF that could not be merged is simply downloaded on its own
  // 4) photos: each one downloaded separately, one after the other
  var cnt={},tb={};pic.forEach(function(o){var q=optOf(o.option),t=tabOf(q,o.option);cnt[t.key]=(cnt[t.key]||0)+(+o.copies||1);tb[t.key]=[q,t]});
  var keys=Object.keys(cnt);
  for(var i=0;i<keys.length;i++){var kk=keys[i],nm="Print "+cnt[kk]+" copies - "+safe(tb[kk][0].title+" - "+tb[kk][1].label)+".jpg";await out(imgBlob(kk),nm,"🖼️ "+nm)}
  // 5) other uploaded files (photos, Word, PowerPoint...) separately, one after the other
  for(var j=0;j<others.length;j++){var x=others[j],nm2=safe(x.k+". "+x.o.copies+" copies - "+x.o.name+" ("+x.o.id+") - "+x.fn);await out(new Blob([bytesOf(x.data)],{type:x.mime||"application/octet-stream"}),nm2,"📎 "+nm2)}
  var msg="Downloaded "+done.length+" file(s):\n• "+done.join("\n• ")+
   (multi.length?"\n\n🔢 Copies wanted (files are NOT repeated):\n• "+multi.join("\n• "):"")+(notes.length?"\n\n📝 Instructions from students:\n• "+notes.join("\n• "):"")+
   (bad.length?"\n\n⚠️ Could not get "+bad.length+" uploaded file(s): "+bad.join(", ")+". Use the 🔗 open link in the table for them. (If none of the uploads work, the Google script needs the new version: Deploy > Manage deployments > pencil > New version.)":"")+
   "\n\nIf your browser asked to allow multiple downloads, tap Allow.\n\nMark these "+p.length+" orders as used? (Students will see it, and can't cancel them.)";
  if(confirm(msg))markUsed(p.map(function(o){return o.orderId}))}
 catch(e){alert("Could not download everything: "+(e.message||e))}
 finally{btn.disabled=false;btn.textContent=old}};
$("openSheet").href=SHEET_URL;$("openDrive").href=DRIVE_URL;
$("refresh").onclick=load;$("toStudent").onclick=function(){location.hash=""};
function route(){var a=location.hash==="#admin";$("admin").classList.toggle("hidden",!a);$("student").classList.toggle("hidden",a);if(a)load()}
/* ===== Bridge for the extra scripts (photos-pdf.js, pdf-edit.js, docx-pdf.js) =====
   All the code above lives inside one function, so those files cannot see its names. Plain helpers are copied to window.
   show, renderUpload and readUpload are different: the extra files WRAP them (x=function(){...old x...}), and the wrapper
   must replace the one used in here, so they are linked both ways (reading gives the real one, assigning replaces it). */
[["$",$],["say",say],["save",save],["openPdf",openPdf],["needPdfLib",needPdfLib],["photosToPdf",photosToPdf],["photoJpeg",photoJpeg],["isImgFile",isImgFile],["startUpload",startUpload],["buildDocx",buildDocx],["imgBlob",imgBlob],["addScript",addScript],["bearReact",bearReact],["H2C",H2C],["cur",cur]].forEach(function(p){window[p[0]]=p[1]});
window.sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
function bridgeLink(n,get,set){Object.defineProperty(window,n,{configurable:true,get:get,set:set})}
/* photos-pdf.js reads everything from window.APP */
window.APP={$:$,say:say,save:save,openPdf:openPdf,needPdfLib:needPdfLib,photosToPdf:photosToPdf,photoJpeg:photoJpeg,isImgFile:isImgFile,loadImg:loadImg,startUpload:startUpload,buildDocx:buildDocx,imgBlob:imgBlob,addScript:addScript,sleep:window.sleep,bearReact:bearReact,guideSteps:guideSteps,copyLink:copyLink,chromeUrl:chromeUrl,browserUrl:browserUrl,IAB:IAB,IOS:IOS,H2C:H2C,PHOTO_MAX:PHOTO_MAX,cur:cur};
bridgeLink("show",function(){return show},function(f){show=f});
Object.defineProperty(window.APP,"show",{get:function(){return show}});
bridgeLink("renderUpload",function(){return renderUpload},function(f){renderUpload=f});
bridgeLink("readUpload",function(){return readUpload},function(f){readUpload=f});
bridgeLink("extras",function(){return extras},function(f){extras=f});
window.__bearK={DUR:DUR,BW:BW,BH:BH,bsay:bsay,get bear(){return bear},get cheering(){return cheering},act:act,sparkleBurst:sparkleBurst,bearReact:bearReact};
window.addEventListener("hashchange",function(){route();guide(100)});show(["s1"]);route();guide(900);
});