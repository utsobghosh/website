/* kawaii-extras.js : 3 cute extras. Loaded LAST (see index.html). Nothing in app.js / style.css is touched.
   1) Bear mood by time of day (a little prop + greeting bubble on the corner bear)
   2) Cute "Done!" cards instead of the plain "Downloaded" line
   3) Theme packs (round 🎨 button at the top-left)
   ===== HOW TO CHANGE =====
   Themes: edit PACKS below (hex = main colour).  Bear moods: edit MOODS (from = first hour of that mood, 0-23).
   Switch a part off: set MOOD_ON / SUCCESS_ON / THEMES_ON to false. */
(function(){
var MOOD_ON=true,SUCCESS_ON=true,THEMES_ON=true;
var PACKS=[
 {id:"def",label:"Lavender",e:"💜",hex:(typeof THEME_COLOR==="string"?THEME_COLOR:"#D8BBFF")},
 {id:"sak",label:"Sakura",e:"🌸",hex:"#FFB3D1"},
 {id:"mat",label:"Matcha",e:"🍵",hex:"#A9D6A0"},
 {id:"sta",label:"Starry night",e:"🌙",hex:"#8E9BFF"},
 {id:"str",label:"Strawberry milk",e:"🍓",hex:"#FF8FA8"},
 {id:"pch",label:"Peach soda",e:"🍑",hex:"#FFBE98"}
];
var MOODS=[   // checked from the latest "from" hour backwards
 {id:"night",from:19,prop:"🌙",say:"Sleepy time… 😴"},
 {id:"snack",from:15,prop:"🧋",say:"Snack time! 🧋"},
 {id:"meal",from:11,prop:"🍙",say:"Have you eaten? 🍙"},
 {id:"morn",from:5, prop:"☀️",say:"Good morning! ☀️"},
 {id:"late",from:0, prop:"🌙",say:"Still awake? 🌙"}
];
function $(id){return document.getElementById(id)}
/* ---------- Gemini Live (text only): ONE prompt per session -> many random bear messages. Falls back to the fixed MOODS text if it fails. ----------
   GEMINI_MODEL: change to the exact Live model id shown in AI Studio (e.g. Gemini 3 Flash Live). No sound is used. */
var GEMINI_KEY="",GEMINI_MODEL="models/gemini-3.8-live",MSGS=null;
var BEAR_BASE="You are a cute kawaii teddy bear mascot in a student notes app. Reply ONLY with raw JSON (no markdown) with keys night,morn,meal,snack,late,study. Each value is an array of 6 different short friendly messages (max 6 words, one emoji each). Contexts: night=sleepy evening, morn=good morning, meal=lunch time, ask if they ate, snack=afternoon snack time, late=after midnight, still awake, study=encouragement while reading notes.";
var READY=Promise.resolve();
function buildPrompt(){var old=[];Object.keys(HIST).forEach(function(k){old=old.concat(HIST[k]||[])});
 return BEAR_BASE+" Be creative: use fresh wording every time (variety seed "+Math.random().toString(36).slice(2,8)+")."+(old.length?" Do NOT reuse or closely copy any of these recent lines: "+JSON.stringify(old.slice(-30))+".":"")}
var KEY_URL="https://script.google.com/macros/s/AKfycbw58vYmfHbFmfJe050xn9zipIJfnPx9kHlzkg6gyWxU8RPgq0NjDN49iFSk8ef_KHVUEQ/exec";   // Apps Script web app that returns the Gemini key (key is kept in Apps Script, not in GitHub)
function loadMsgs(){
 try{if(sessionStorage.getItem("bearMsgs"))return loadMsgs0()}catch(e){}
 var p=fetch(KEY_URL).then(function(r){return r.text()}).then(function(k){GEMINI_KEY=k.trim()}).catch(function(){}).then(function(){loadMsgs0();return READY===p?undefined:READY});
 READY=p}
function loadMsgs0(){
 try{var c=sessionStorage.getItem("bearMsgs");if(c){MSGS=JSON.parse(c);clean();return}}catch(e){}
 READY=new Promise(function(ok){
 var txt="",done=false,ws;
 function fin(v,why){if(done)return;done=true;try{ws.close()}catch(e){}
  if(v&&typeof v==="object"){MSGS=v;clean();console.log("Bear Gemini OK");try{sessionStorage.setItem("bearMsgs",JSON.stringify(v))}catch(e){}}else console.warn("Bear Gemini failed:",why||"no/invalid reply");ok()}
 try{ws=new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key="+GEMINI_KEY)}catch(e){fin(null,e);return}
 setTimeout(function(){fin(null,"timeout 20s")},20000);
 ws.onopen=function(){ws.send(JSON.stringify({setup:{model:GEMINI_MODEL,generationConfig:{responseModalities:["AUDIO"]},outputAudioTranscription:{}}}))};
 ws.onmessage=async function(ev){var d=ev.data;if(d instanceof Blob)d=await d.text();var m;try{m=JSON.parse(d)}catch(e){return}
  if(m.error)console.warn("Bear Gemini error:",JSON.stringify(m.error));
  if(m.setupComplete)ws.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:buildPrompt()}]}],turnComplete:true}}));
  var sc=m.serverContent;if(!sc)return;
  if(sc.outputTranscription&&sc.outputTranscription.text)txt+=sc.outputTranscription.text;   // 3.8 Live answers in audio; we only read its text transcript and never play the sound
  if(sc.turnComplete){try{fin(JSON.parse(txt.replace(/```json|```/g,"").trim()))}catch(e){fin(null,"bad JSON: "+txt.slice(0,80))}}};
 ws.onerror=function(){fin(null,"socket error")};ws.onclose=function(ev){fin(null,"closed "+ev.code+" "+(ev.reason||""))}})}
window.bearPick=bagPick;
var HIST={};try{HIST=JSON.parse(localStorage.getItem("bearHistL")||"{}")}catch(e){}
function norm(t){return String(t).toLowerCase().replace(/[^a-z0-9]+/g,"")}
function clean(){if(!MSGS)return;Object.keys(MSGS).forEach(function(k){var a=MSGS[k];if(!Array.isArray(a)){delete MSGS[k];return}var seen={};MSGS[k]=a.filter(function(t){var n=norm(t);if(!n||seen[n])return false;seen[n]=1;return true})})}   // Gemini sometimes repeats itself: drop duplicate lines
function bagPick(k){var a=MSGS&&MSGS[k];if(!a||!a.length)return null;   // never one of the last 6 said (remembered across visits)
 var h=HIST[k]||[],n=Math.min(6,a.length-1),rec=h.slice(-n).map(norm),c=a.filter(function(t){return rec.indexOf(norm(t))<0});if(!c.length)c=a;
 var v=c[Math.floor(Math.random()*c.length)];h.push(v);HIST[k]=h.slice(-12);try{localStorage.setItem("bearHistL",JSON.stringify(HIST))}catch(e){}return v}
function pick(m){return bagPick(m.id)||m.say}

var st=document.createElement("style");
st.textContent=
".kprop{position:absolute;right:-8px;bottom:4px;font-size:22px;line-height:1;pointer-events:none;animation:kfl 2.6s ease-in-out infinite;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}"+
".kbub{position:absolute;bottom:100%;left:50%;transform:translateX(-50%) scale(.7);transform-origin:bottom center;white-space:nowrap;font-size:13px;font-weight:600;padding:5px 10px;border-radius:14px;background:#fff;color:#3b2f45;box-shadow:0 3px 10px rgba(0,0,0,.2);opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;z-index:3}"+
".kbub.on{opacity:1;transform:translateX(-50%) scale(1)}.kbub::after{content:'';position:absolute;top:100%;left:50%;margin-left:-5px;border:5px solid transparent;border-top-color:#fff}"+
"@keyframes kfl{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-5px) rotate(6deg)}}"+
".ok.kawaii{position:relative;overflow:hidden;color:var(--text);background:linear-gradient(135deg,rgba(255,179,209,.28),rgba(142,155,255,.28));border:2px dashed var(--accent);border-radius:16px;padding:10px 14px}"+
".ok.kawaii .kc{display:flex;align-items:center;gap:12px}.ok.kawaii .ke{font-size:38px;line-height:1}.ok.kawaii .kt{display:block;font-size:18px}.ok.kawaii .ks{font-size:13px;opacity:.8}"+
".ok.kawaii .kp{position:absolute;top:100%;font-style:normal;font-size:18px;pointer-events:none;opacity:0}"+
".ok.kawaii.go .ke{animation:kpop .7s cubic-bezier(.3,1.6,.5,1)}.ok.kawaii.go .kp{animation:krise 1.8s ease-out forwards}"+
"@keyframes kpop{0%{transform:scale(.2) rotate(-40deg)}100%{transform:scale(1) rotate(0)}}@keyframes krise{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(-95px) rotate(60deg)}}"+
"@media(max-width:700px){.wrap{padding-top:58px !important}#kThemeBtn,#kThemeBox{position:absolute !important}}"+
"#kThemeBtn{position:fixed;top:10px;left:10px;z-index:60;width:36px;height:36px;border-radius:50%;border:2px solid var(--line);background:var(--panel);font-size:18px;line-height:1;cursor:pointer;padding:0;box-shadow:0 2px 8px var(--shadow)}"+
"#kThemeBox{position:fixed;top:52px;left:10px;z-index:60;display:none;flex-direction:column;gap:4px;padding:8px;border-radius:16px;border:1px solid var(--line);background:var(--panel);color:var(--text);box-shadow:0 8px 24px var(--shadow)}#kThemeBox.on{display:flex}"+
"#kThemeBox button{display:flex;align-items:center;gap:8px;border:2px solid transparent;border-radius:12px;background:none;color:inherit;font:inherit;font-size:14px;padding:6px 10px;cursor:pointer;text-align:left}#kThemeBox button.on{border-color:var(--accent);background:var(--line)}#kThemeBox i{width:14px;height:14px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.2)}";
document.head.appendChild(st);

/* ---------- 3) theme packs (same maths as applyTheme in app.js, plus it remembers your pick) ---------- */
function applyHex(hex){
 var c=[1,3,5].map(function(i){return parseInt(hex.slice(i,i+2),16)}),dark=matchMedia("(prefers-color-scheme: dark)").matches;
 function mix(base,k){return"rgb("+base.map(function(v,i){return Math.round(v+(c[i]-v)*k)}).join(",")+")"}
 var base=dark?[30,26,40]:[255,255,255],s=document.documentElement.style;
 s.setProperty("--accent",hex);
 s.setProperty("--onacc",(0.299*c[0]+0.587*c[1]+0.114*c[2])>150?"#1a1a1a":"#ffffff");
 s.setProperty("--accentD",dark?hex:"rgb("+c.map(function(v){return Math.round(v*.72)}).join(",")+")");
 s.setProperty("--glow","rgba("+c.join(",")+",.55)");
 s.setProperty("--cardbg",dark?"rgba(43,32,55,.5)":"rgba(255,255,255,.5)");
 s.setProperty("--blob1","rgba("+c.join(",")+","+(dark?.4:.75)+")");
 s.setProperty("--shadow","rgba("+c.join(",")+",.18)");
 s.setProperty("--grad","linear-gradient(160deg,"+mix(base,dark?.1:.12)+","+mix(base,dark?.2:.26)+")");
 s.setProperty("--line",mix(base,dark?.3:.22));
 try{if(hex===PACKS[0].hex)localStorage.removeItem("themeVars");else{var V={_d:dark?1:0};["--accent","--onacc","--accentD","--glow","--cardbg","--blob1","--shadow","--grad","--line","--accent2","--accent3"].forEach(function(n){V[n]=s.getPropertyValue(n)});localStorage.setItem("themeVars",JSON.stringify(V))}}catch(e){}}   // saved so index.html can paint the right colours before anything loads (no pink/lavender flash)
function packOf(id){return PACKS.filter(function(p){return p.id===id})[0]||PACKS[0]}
function initThemes(){
 var cur="def";try{cur=localStorage.getItem("themePack")||"def"}catch(e){}
 var b=document.createElement("button");b.id="kThemeBtn";b.type="button";b.title="Themes";b.textContent="🎨";
 var box=document.createElement("div");box.id="kThemeBox";
 box.innerHTML=PACKS.map(function(p){return'<button type="button" data-k="'+p.id+'"><i style="background:'+p.hex+'"></i>'+p.e+" "+p.label+"</button>"}).join("");
 document.body.appendChild(b);document.body.appendChild(box);
 function mark(){Array.prototype.forEach.call(box.children,function(x){x.classList.toggle("on",x.getAttribute("data-k")===cur)})}
 function go(id){cur=id;try{localStorage.setItem("themePack",id)}catch(e){}applyHex(packOf(id).hex);mark()}
 b.onclick=function(e){e.stopPropagation();box.classList.toggle("on")};
 box.onclick=function(e){var t=e.target.closest("button");if(!t)return;go(t.getAttribute("data-k"));box.classList.remove("on")};
 document.addEventListener("click",function(e){if(!box.contains(e.target)&&e.target!==b)box.classList.remove("on")});
 matchMedia("(prefers-color-scheme: dark)").addEventListener&&matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){applyHex(packOf(cur).hex)});
 function re(){if(cur!=="def")applyHex(packOf(cur).hex)}
 re();mark();   // app.js applies the lavender theme again after its files load, so re-apply the saved pick
 if(window.__assetsReady)window.__assetsReady.then(function(){re();setTimeout(re,300);setTimeout(re,1500)});setTimeout(re,2500)}

/* ---------- 2) cute success cards ---------- */
var TITLES=["Done! 🎀","All yours! 🌸","Ta-da! ✨","Yay, saved! 🧸","Got it! 🍓"];
function initSuccess(){
 ["dlOk","ppOk","peOk"].forEach(function(id){var el=$(id);if(!el)return;
  var sub=(el.textContent||"").replace(/^[^A-Za-z]*Downloaded\.?\s*/i,"").trim()||"Look in your Downloads folder (or the Files app)";
  el.classList.add("kawaii");
  el.innerHTML='<div class="kc"><span class="ke">🧸</span><div><b class="kt">Done! 🎀</b><div class="ks">'+sub+'</div></div></div>'+["🌸","✨","⭐","🎀","💖","🌷"].map(function(x,i){return'<i class="kp" style="left:'+(8+i*16)+'%;animation-delay:'+(i*.12)+'s">'+x+"</i>"}).join("");
  new MutationObserver(function(){if(el.classList.contains("hidden"))return;
   el.querySelector(".kt").textContent=TITLES[Math.floor(Math.random()*TITLES.length)];
   el.classList.remove("go");void el.offsetWidth;el.classList.add("go")}).observe(el,{attributes:true,attributeFilter:["class"]})})}

/* ---------- 1) bear mood by time ---------- */
function moodNow(){var h=new Date().getHours();for(var i=0;i<MOODS.length;i++)if(h>=MOODS[i].from)return MOODS[i];return MOODS[MOODS.length-1]}
function initMood(bear){
 var prop=document.createElement("span"),bub=document.createElement("span"),last=null,t=0;
 prop.className="kprop";bub.className="kbub";bear.appendChild(prop);bear.appendChild(bub);
 function say(txt,n){n=n||0;var r=bear.getBoundingClientRect();
  if(bear.classList.contains("moving")||r.left<0||r.right>innerWidth){if(n<30)setTimeout(function(){say(txt,n+1)},700);return}   // wait until the bear has finished walking and is fully on screen
  if(r.top<46)return;
  bub.textContent=txt;var w=bub.offsetWidth,L=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2));
  bub.style.left=(L-r.left)+"px";bub.style.transform="none";bub.classList.add("on");window.__bearTalking=true;
  clearTimeout(t);t=setTimeout(function(){bub.classList.remove("on");window.__bearTalking=false},4200)}
 function tick(first){var m=moodNow();prop.textContent=m.prop;if(m!==last){last=m;setTimeout(function(){READY.then(function(){say(pick(m))})},first?5000:600)}}
 window.__kSay=function(){say(pick(moodNow()))};
 tick(true);setInterval(function(){tick(false)},60000);setInterval(function(){say(pick(moodNow()))},180000)}

/* ---------- 4) bigger camera + photo-taking gestures (replaces the bear's old "photo" move) ----------
   CAM_SIZE = camera size in px.  SNAP_TEXT = random lines said when the photo is taken. */
var CAM_SIZE=58,SNAP_TEXT=["Say cheese! 🧀","Perfect shot! 📸","You look great! ✨","Got it! So cute! 💖","Click! Great smile! 😊","Another memory! 🌸"];
function bearPhoto(){
 var K=window.__bearK,bear=K.bear,BW=K.BW,BH=K.BH,bsay=K.bsay;
 var r=bear.getBoundingClientRect(),fx=r.left+BW/2,fy=r.top+BH*.34,T=[],pk=function(a){return a[Math.floor(Math.random()*a.length)]};
 var cam=document.createElement("span");cam.className="bprop";cam.textContent="📸";
 cam.style.cssText="left:"+(fx-CAM_SIZE/2)+"px;top:"+(fy-CAM_SIZE/2)+"px;font-size:"+CAM_SIZE+"px;z-index:49;filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))";
 document.body.appendChild(cam);
 var L=$("armL"),R=$("armR"),body=$("bearBody");
 function later(f,ms){T.push(setTimeout(f,ms))}
 function arms(a,b){if(K.cheering)return;if(L)L.style.transform="rotate("+a+"deg)";if(R)R.style.transform="rotate("+b+"deg)"}
 // 1) camera pops up, arms lift it to the face
 cam.animate([{transform:"scale(.2)",opacity:0},{transform:"scale(1)",opacity:1}],{duration:450,easing:"cubic-bezier(.3,1.6,.5,1)",fill:"forwards"});
 arms(140,-140);
 // 2) positioning: camera sways / tilts / zooms while the bear leans to find me
 later(function(){
  cam.animate([
   {transform:"translate(0,0) rotate(0) scale(1)"},
   {transform:"translate(-16px,-6px) rotate(-14deg) scale(1.1)"},
   {transform:"translate(14px,4px) rotate(12deg) scale(.95)"},
   {transform:"translate(-6px,-8px) rotate(-6deg) scale(1.15)"},
   {transform:"translate(0,0) rotate(0) scale(1.05)"}],{duration:2800,easing:"ease-in-out",fill:"forwards"});
  if(body)body.animate([{transform:"rotate(0)"},{transform:"rotate(-7deg) translateX(-3px)"},{transform:"rotate(7deg) translateX(3px)"},{transform:"rotate(-3deg)"},{transform:"rotate(0)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:2800,easing:"ease-in-out"});
  arms(150,-125);later(function(){arms(125,-150)},800);later(function(){arms(150,-130)},1600);later(function(){arms(140,-140)},2300)},500);
 later(function(){bsay("Hold still… 🎯",1700)},900);
 // 3) countdown, then snap
 later(function(){bsay("3… 2… 1…",1500)},3100);
 later(function(){
  var rr=bear.getBoundingClientRect(),cx=rr.left+BW/2,cy=rr.top+BH*.34;
  var f=document.createElement("div");f.className="bflash";f.style.cssText="left:"+cx+"px;top:"+cy+"px;width:60px;height:60px;margin:-30px 0 0 -30px;z-index:60";
  document.body.appendChild(f);setTimeout(f.remove.bind(f),1000);
  cam.animate([{transform:"scale(1.05)"},{transform:"scale(1.3)"},{transform:"scale(1.05)"}],{duration:250});
  if(body)body.animate([{transform:"translateY(0)"},{transform:"translateY(-8px)"},{transform:"translateY(0)"}],{duration:350});
  bsay(pk(SNAP_TEXT),2800)},4500);
 // 4) the camera leaves only AFTER the bubble has appeared
 later(function(){cam.animate([{opacity:1,transform:"scale(1.05)"},{opacity:0,transform:"scale(.4)"}],{duration:450,fill:"forwards"});arms(0,0)},5900);
 later(function(){cam.remove();if(!K.cheering)arms(0,0)},6400)}
var _tries=0,_iv=setInterval(function(){   // app.js starts after its files load, so wait for it
 if(++_tries>100)return clearInterval(_iv);
 if(!window.__bearK||typeof window.extras!=="function")return;
 clearInterval(_iv);var _ex=window.extras;window.__bearK.DUR.photo=6500;
 window.extras=function(n){var K=window.__bearK;if(n==="photo"){var b=K.bear;if(!b)return;var r=b.getBoundingClientRect();if(r.right<20||r.left>innerWidth-20)return;bearPhoto();return}if(NEWACT[n]){var b2=K.bear;if(!b2)return;var r2=b2.getBoundingClientRect();if(r2.right<20||r2.left>innerWidth-20)return;bearNew(n);return}_ex.apply(this,arguments)}
 for(var nm in NEWACT)window.__bearK.DUR[nm]=NEWACT[nm];
 setInterval(function(){var K=window.__bearK,b=K.bear;if(!b||b.style.display==="none"||K.cheering||window.__bearTalking||b.classList.contains("moving")||Math.random()>.4)return;var ks=Object.keys(NEWACT);ks=ks.concat(PHOTO_LUCK);K.act(ks[Math.floor(Math.random()*ks.length)])},22000)},100);
/* ---------- 5) admin test panel (buttons to try the bear / themes / sparkles) ---------- */
function initTest(){var ad=$("admin");if(!ad||$("kTest"))return;
 var d=document.createElement("div");d.id="kTest";d.style.cssText="margin-top:18px;padding:12px;border:2px dashed var(--accent);border-radius:16px";
 d.innerHTML='<b>🧪 Test area</b><div class="tiny" style="margin:4px 0 8px;opacity:.8">Try the cute extras here. The bear shows up in the corner.</div><button type="button" class="s" data-t="photo">📸 Bear photo</button> <button type="button" class="s" data-t="rand">🎲 Random move</button> <button type="button" class="s" data-t="say">💬 Bear says</button> <button type="button" class="s" data-t="new">🎁 New move</button> <button type="button" class="s" data-t="cheer">🎉 Cheer</button> <button type="button" class="s" data-t="spark">✨ Sparkles</button> <button type="button" class="s" data-t="theme">🎨 Next theme</button>';
 ad.appendChild(d);
 var EM={bubbles:"🫧",balloon:"🎈",wish:"🌠",petals:"🌸",study:"📝",magic:"🪄",sneeze:"🤧",umbrella:"☂️",fireworks:"🎆",kite:"🪁",snow:"❄️",boo:"👻",coffee:"☕",rainbow:"🌈",butterfly:"🦋",fishing:"🎣",rocket:"🚀",trophy:"🏆",plane:"✈️"};
 d.insertAdjacentHTML("beforeend","<div style='margin-top:8px'><b class='tiny'>New moves:</b></div>"+Object.keys(NEWACT).map(function(n){return'<button type="button" class="s" data-t="n:'+n+'">'+(EM[n]||"🎁")+" "+n+"</button> "}).join(""));
 d.onclick=function(e){var t=e.target.getAttribute&&e.target.getAttribute("data-t");if(!t)return;var K=window.__bearK;
  if(t==="theme"){var b=$("kThemeBox");if(b){var bs=Array.prototype.slice.call(b.children),i=bs.findIndex(function(x){return x.classList.contains("on")});bs[(i+1)%bs.length].click()}return}
  if(!K||!K.bear){alert("The bear is not ready yet.");return}
  if(K.bear.style.display==="none")K.bear.style.display="";
  var b=K.bear,q=b.getBoundingClientRect(),ok=q.left>=0&&q.right<=innerWidth&&q.top>=0&&q.bottom<=innerHeight;   // off-screen on the admin page: walk in instead of teleporting
  if(!ok){b.style.transitionDuration="1.6s";b.classList.add("moving");b.style.left=(innerWidth-K.BW-20)+"px";b.style.top=(innerHeight-K.BH-20)+"px";setTimeout(function(){b.classList.remove("moving");go(t,K)},1700);return}
  go(t,K)}
 function go(t,K){
  if(t==="photo")K.act("photo");
  else if(t==="rand"){var L=["jump","wiggle","wave","dance","bounce","sway","heart","shy","kick","read","snack","music","sleep"];K.act(L[Math.floor(Math.random()*L.length)])}
  else if(t.slice(0,2)==="n:")K.act(t.slice(2));
  else if(t==="new"){var ks=Object.keys(NEWACT);K.act(ks[Math.floor(Math.random()*ks.length)])}
  else if(t==="say"){if(window.__kSay)window.__kSay()}
  else if(t==="cheer")K.bearReact("cheer");
  else if(t==="spark")K.sparkleBurst(innerWidth/2,innerHeight/2,16,.8,true)}}

/* ---------- 6) more bear events (they join the bear's random moves). Remove a line from NEWACT to drop one. ---------- */
var PHOTO_LUCK=["photo"];   // the camera gets one extra "lottery ticket" among the extra moves (add another "photo" for better luck)
var NEWACT={bubbles:3800,balloon:4400,wish:4200,petals:4400,study:5200,magic:3400,sneeze:2300,umbrella:4800,fireworks:3400,kite:4400,snow:4400,boo:2600,coffee:4200,rainbow:3800,butterfly:4600,fishing:4400,rocket:3200,trophy:3600,plane:3600};
function bearNew(n){
 var K=window.__bearK,bear=K.bear,BW=K.BW,bsay=K.bsay,r=bear.getBoundingClientRect(),fx=r.left+BW/2,d=r.left>innerWidth/2?-1:1,
  body=$("bearBody"),L=$("armL"),R=$("armR"),pk=function(a){return a[Math.floor(Math.random()*a.length)]},rnd=function(a){return Math.random()*a};
 function fly(txt,x,y,kf,ms,size,z){var s=document.createElement("span");s.className="bprop";s.textContent=txt;
  s.style.cssText="left:"+x+"px;top:"+y+"px;font-size:"+(size||24)+"px;z-index:"+(z||49);document.body.appendChild(s);
  s.animate(kf,{duration:ms,easing:"ease-out",fill:"forwards"});setTimeout(function(){s.remove()},ms+50)}
 function arms(a,b,t){if(K.cheering)return;if(L)L.style.transform="rotate("+a+"deg)";if(R)R.style.transform="rotate("+b+"deg)";if(t)setTimeout(function(){if(!K.cheering){if(L)L.style.transform="rotate(0deg)";if(R)R.style.transform="rotate(0deg)"}},t)}
 function sway(ms,deg){if(body)body.animate([{transform:"rotate(0)"},{transform:"rotate("+deg+"deg)"},{transform:"rotate("+(-deg)+"deg)"},{transform:"rotate(0)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:ms,easing:"ease-in-out"})}
 if(n==="bubbles"){arms(70,-70,3400);sway(1800,3);bsay("Bubbles! 🫧",1800);
  for(var i=0;i<9;i++)(function(i){setTimeout(function(){var dx=rnd(50)-25;fly("🫧",fx-10+d*10,r.top+34,[{opacity:0,transform:"translate(0,0) scale(.4)"},{opacity:1,offset:.2},{opacity:0,transform:"translate("+dx+"px,-110px) scale(1.3)"}],2200,22+rnd(12))},i*320)})(i)}
 else if(n==="balloon"){arms(150,-20,4000);bsay("Wheee! 🎈",1800);
  fly("🎈",fx+14,r.top+10,[{transform:"translate(0,0) rotate(-6deg)"},{transform:"translate(10px,-40px) rotate(6deg)",offset:.3},{transform:"translate(-8px,-90px) rotate(-6deg)",offset:.6},{transform:"translate(6px,-"+Math.max(120,r.top+60)+"px) rotate(4deg)",opacity:0}],4000,42);sway(2000,4)}
 else if(n==="wish"){arms(155,-155,3600);bsay("Make a wish! 🌠",2200);
  setTimeout(function(){fly("🌠",Math.max(10,fx-140),Math.max(10,r.top-90),[{transform:"translate(0,0) scale(.6)",opacity:0},{opacity:1,offset:.2},{transform:"translate(260px,70px) scale(1.2)",opacity:0}],1500,34)},500);
  setTimeout(function(){K.sparkleBurst(fx,r.top+10,10,.5,false)},1700)}
 else if(n==="petals"){bsay("So pretty! 🌸",2000);sway(2400,3);
  for(var j=0;j<12;j++)(function(j){setTimeout(function(){var x=fx-60+rnd(120),sw=rnd(40)-20;fly(pk(["🌸","🌷","🌸"]),x,r.top-50,[{transform:"translate(0,0) rotate(0)",opacity:0},{opacity:1,offset:.15},{transform:"translate("+sw+"px,"+(BH0(r)+30)+"px) rotate(300deg)",opacity:0}],2600,16+rnd(10))},j*260)})(j)}
 else if(n==="study"){arms(60,-60,4600);bsay(pk(["Focus… 📚","Studying hard! ✏️","Almost done… 📝"]),2400);
  fly("📝",fx-14,r.top+52,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1)",offset:.1},{opacity:1,offset:.9},{opacity:0}],4800,30);
  fly("✏️",fx+d*12,r.top+46,[{transform:"translate(0,0) rotate(0)"},{transform:"translate(-8px,4px) rotate(-18deg)",offset:.25},{transform:"translate(6px,0) rotate(10deg)",offset:.5},{transform:"translate(-8px,4px) rotate(-18deg)",offset:.75},{transform:"translate(0,0)",opacity:0}],4800,24,50)}
 else if(n==="magic"){arms(140,-30,2600);bsay("Abracadabra! ✨",2000);
  fly("🪄",fx+d*20,r.top+26,[{transform:"rotate(-30deg) scale(.3)",opacity:0},{transform:"rotate(-30deg) scale(1)",opacity:1,offset:.15},{transform:"rotate(40deg)",offset:.4},{transform:"rotate(-30deg)",offset:.6},{transform:"rotate(40deg)",offset:.8},{opacity:0,transform:"rotate(40deg)"}],2800,40);
  setTimeout(function(){var q=bear.getBoundingClientRect();K.sparkleBurst(q.left+BW/2,q.top+20,18,.7,true)},1500)}
 else if(n==="umbrella"){arms(125,-20,4400);bsay("It's raining! ☔",2000);
  fly("☂️",fx-6,r.top-16,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1)",offset:.1},{transform:"rotate(-6deg)",offset:.4},{transform:"rotate(6deg)",offset:.7},{opacity:0}],4600,46);
  for(var u=0;u<16;u++)(function(u){setTimeout(function(){fly("💧",fx-70+rnd(140),r.top-70,[{opacity:0,transform:"translate(0,0)"},{opacity:.9,offset:.2},{opacity:0,transform:"translate(-6px,"+(BH0(r)+40)+"px)"}],1100,14+rnd(6))},u*220)})(u)}
 else if(n==="fireworks"){arms(155,-155,3000);bsay("Fireworks! 🎆",1600);
  for(var w=0;w<3;w++)(function(w){setTimeout(function(){var q=bear.getBoundingClientRect();K.sparkleBurst(Math.max(40,Math.min(innerWidth-40,q.left+BW/2-90+rnd(180))),Math.max(70,q.top-110-rnd(60)),18,.8,true)},500+w*750)})(w)}
 else if(n==="kite"){arms(140,-20,4200);bsay("Fly high! 🪁",1800);sway(2200,3);
  fly("🪁",fx+d*18,r.top-4,[{opacity:0,transform:"translate(0,0) rotate(0)"},{opacity:1,transform:"translate("+d*20+"px,-40px) rotate(12deg)",offset:.2},{transform:"translate("+d*50+"px,-80px) rotate(-10deg)",offset:.5},{transform:"translate("+d*30+"px,-120px) rotate(10deg)",offset:.8},{opacity:0,transform:"translate("+d*60+"px,-150px)"}],4400,40)}
 else if(n==="snow"){bsay("Brrr! ❄️",1800);sway(1000,2);
  for(var s2=0;s2<16;s2++)(function(s2){setTimeout(function(){var sw=rnd(40)-20;fly("❄️",fx-80+rnd(160),r.top-60,[{opacity:0,transform:"translate(0,0) rotate(0)"},{opacity:1,offset:.15},{opacity:0,transform:"translate("+sw+"px,"+(BH0(r)+40)+"px) rotate(240deg)"}],2400,14+rnd(10))},s2*200)})(s2)}
 else if(n==="boo"){setTimeout(function(){bsay("Boo! 👻",1500);if(body)body.animate([{transform:"translateY(0)"},{transform:"translateY(-12px) scale(1.06)"},{transform:"translateY(0)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:450});
   fly("👻",fx+d*26,r.top+22,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1.1)",offset:.25},{opacity:0,transform:"translate("+d*40+"px,-50px) scale(1.4)"}],1500,34)},500)}
 else if(n==="coffee"){arms(70,-70,3900);bsay("Sip sip… ☕",1800);
  fly("☕",fx-12,r.top+54,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"translateY(0)",offset:.1},{transform:"translateY(-6px)",offset:.3},{transform:"translateY(0)",offset:.5},{transform:"translateY(-6px)",offset:.7},{opacity:0}],4000,30);
  for(var c2=0;c2<4;c2++)(function(c2){setTimeout(function(){fly("♨️",fx-8+rnd(10),r.top+36,[{opacity:0,transform:"translate(0,0)"},{opacity:.8,offset:.3},{opacity:0,transform:"translate("+(rnd(16)-8)+"px,-36px)"}],1100,16)},c2*800)})(c2)}
 else if(n==="rainbow"){arms(155,-155,3000);bsay("Wow! 🌈",1800);
  fly("🌈",fx-34,r.top-78,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1)",offset:.2},{opacity:1,offset:.8},{opacity:0,transform:"scale(1.1)"}],3800,68,48)}
 else if(n==="butterfly"){arms(60,-20,4400);bsay("Hi, little friend! 🦋",2200);
  fly("🦋",fx+d*50,r.top+60,[{opacity:0,transform:"translate(0,0)"},{opacity:1,transform:"translate("+(-d*30)+"px,-30px) rotate(-15deg)",offset:.2},{transform:"translate("+(-d*70)+"px,-60px) rotate(15deg)",offset:.45},{transform:"translate("+(-d*20)+"px,-90px) rotate(-15deg)",offset:.7},{opacity:0,transform:"translate("+(d*40)+"px,-130px) rotate(10deg)"}],4600,28)}
 else if(n==="fishing"){arms(120,-40,4000);bsay("Let's fish! 🎣",1500);
  fly("🎣",fx+d*24,r.top+30,[{opacity:0,transform:"rotate(-20deg) scale(.4)"},{opacity:1,transform:"rotate(-20deg) scale(1)",offset:.1},{transform:"rotate(10deg)",offset:.45},{transform:"rotate(-30deg)",offset:.55},{opacity:1,offset:.9},{opacity:0}],4200,38);
  setTimeout(function(){bsay("Got one! 🐟",1600);fly("🐟",fx+d*60,r.top+100,[{opacity:1,transform:"translate(0,0) rotate(0)"},{opacity:1,transform:"translate("+(-d*30)+"px,-70px) rotate("+(-d*90)+"deg)",offset:.5},{opacity:0,transform:"translate("+(-d*60)+"px,10px) rotate("+(-d*180)+"deg)"}],1500,30)},2300)}
 else if(n==="rocket"){bsay("3, 2, 1… 🚀",1500);arms(150,-150,3000);
  setTimeout(function(){bsay("Blast off!",1200);fly("🚀",fx+d*30,r.top+20,[{opacity:1,transform:"translate(0,0) rotate(0) scale(.8)"},{opacity:1,offset:.7},{opacity:0,transform:"translate("+d*60+"px,-"+(r.top+60)+"px) rotate("+d*10+"deg) scale(1.1)"}],1700,40);fly("💨",fx+d*26,r.top+52,[{opacity:.9,transform:"scale(.6)"},{opacity:0,transform:"translate(0,24px) scale(1.8)"}],1100,28)},1500)}
 else if(n==="trophy"){arms(155,-155,3400);bsay("I'm a champion! 🏆",2200);
  fly("🏆",fx-18,r.top-34,[{opacity:0,transform:"translateY(14px) scale(.3)"},{opacity:1,transform:"translateY(0) scale(1.1)",offset:.2},{transform:"scale(1) rotate(-6deg)",offset:.5},{transform:"scale(1) rotate(6deg)",offset:.7},{opacity:0}],3600,44);
  setTimeout(function(){var q=bear.getBoundingClientRect();K.sparkleBurst(q.left+BW/2,q.top-10,14,.6,false)},700)}
 else if(n==="plane"){arms(140,-20,3400);bsay("Bye bye! ✈️",1800);
  fly("✈️",-60,Math.max(60,r.top-70),[{transform:"translate(0,0) rotate(0)"},{opacity:1,offset:.9},{opacity:0,transform:"translate("+(innerWidth+140)+"px,-30px) rotate(-6deg)"}],3600,32,48)}
 else if(n==="sneeze"){bsay("Ah… ah… 🤧",900);
  setTimeout(function(){bsay("Achoo! 💨",1200);if(body)body.animate([{transform:"translateY(0) scale(1)"},{transform:"translateY(-6px) scale(1.08,.94)"},{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(0)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:600});
   fly("💨",fx+d*26,r.top+40,[{opacity:1,transform:"translate(0,0) scale(.6)"},{opacity:0,transform:"translate("+d*50+"px,-10px) scale(1.5)"}],900,28)},1000)}}
function BH0(r){return Math.min(120,Math.max(60,innerHeight-r.top))}

/* ---------- 7) walking: feet step; moving up shows the bear's BACK (face hidden + tail), moving left/right shows a SIDE view ---------- */
function initWalk(bear){
 var ns="http://www.w3.org/2000/svg",body=$("bearBody");
 if(body){
  var head=body.querySelector('circle[cx="50"][cy="40"]'),belly=body.querySelector('ellipse[cx="50"][cy="84"]'),arm=$("armL");
  if(head){var items=[],n=head.nextElementSibling;
   while(n&&!(n.tagName==="path"&&/^M50 68L/.test(n.getAttribute("d")||""))&&items.length<30){items.push(n);n=n.nextElementSibling}
   if(items.length&&items.length<30){var g=document.createElementNS(ns,"g");g.id="kFace";body.insertBefore(g,items[0]);items.forEach(function(x){g.appendChild(x)})}
   for(var c=0;c<3&&n;c++,n=n.nextElementSibling)n.classList.add("kc")}   // bow tie
  if(belly)belly.classList.add("kc");
  if(arm){var t=document.createElementNS(ns,"circle");t.id="kTail";t.setAttribute("cx","50");t.setAttribute("cy","93");t.setAttribute("r","8");t.style.fill="var(--fur2)";body.insertBefore(t,arm)}}
 var s=document.createElement("style");
 s.textContent="@keyframes kstepA{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-6px)}}"+
 "#bear.moving #bearBody>ellipse:nth-of-type(1),#bear.moving #bearBody>ellipse:nth-of-type(3){animation:kstepA .5s ease-in-out infinite}"+
 "#bear.moving #bearBody>ellipse:nth-of-type(2),#bear.moving #bearBody>ellipse:nth-of-type(4){animation:kstepA .5s ease-in-out -.25s infinite}"+
 "#kFace,.kc,#kTail{transition:opacity .25s,transform .25s}#kTail{opacity:0}"+
 "#kFace{transform-origin:50px 40px}.kc{transform-origin:50px 80px}#kTail{transform-origin:50px 93px}"+
 "#bear[data-dir=u].moving #kFace,#bear[data-dir=u].moving .kc{opacity:0}#bear[data-dir=u].moving #kTail{opacity:1}"+
 "#bear[data-dir=r].moving #kFace{transform:translateX(10px) scaleX(.8)}#bear[data-dir=l].moving #kFace{transform:translateX(-10px) scaleX(.8)}"+
 "#bear[data-dir=r].moving .kc{transform:translateX(7px) scaleX(.7)}#bear[data-dir=l].moving .kc{transform:translateX(-7px) scaleX(.7)}"+
 "#bear[data-dir=r].moving #kTail{opacity:1;transform:translateX(-27px)}#bear[data-dir=l].moving #kTail{opacity:1;transform:translateX(27px)}"+
 "#bear[data-dir=r].moving #armL,#bear[data-dir=l].moving #armR{opacity:0}#armL,#armR{transition:opacity .25s}"+
 "#ofShades,#ofGlasses{transform-origin:50px 40px;transition:opacity .25s,transform .25s}#ofCap,#ofCrown,#ofBow,#ofFlowers,#ofSleep,#ofPhones{transform-origin:50px 20px;transition:opacity .25s,transform .25s}"+
 "#bear[data-dir=u].moving #ofShades,#bear[data-dir=u].moving #ofGlasses{opacity:0}"+
 "#bear[data-dir=r].moving #ofShades,#bear[data-dir=r].moving #ofGlasses{transform:translateX(10px) scaleX(.8)}#bear[data-dir=l].moving #ofShades,#bear[data-dir=l].moving #ofGlasses{transform:translateX(-10px) scaleX(.8)}"+
 "#bear[data-dir=r].moving :is(#ofCap,#ofCrown,#ofBow,#ofFlowers,#ofSleep,#ofPhones){transform:translateX(5px) scaleX(.9)}#bear[data-dir=l].moving :is(#ofCap,#ofCrown,#ofBow,#ofFlowers,#ofSleep,#ofPhones){transform:translateX(-5px) scaleX(.9)}";
 document.head.appendChild(s);
 var px=parseFloat(bear.style.left)||0,py=parseFloat(bear.style.top)||0;
 new MutationObserver(function(){var x=parseFloat(bear.style.left),y=parseFloat(bear.style.top);if(isNaN(x)||isNaN(y))return;
  var dx=x-px,dy=y-py;if(Math.abs(dx)>3||Math.abs(dy)>3)bear.setAttribute("data-dir",Math.abs(dy)>Math.abs(dx)?(dy<0?"u":"d"):(dx>0?"r":"l"));px=x;py=y}).observe(bear,{attributes:true,attributeFilter:["style"]})}

function start(){
 initTest();
 loadMsgs();
 if(THEMES_ON)initThemes();
 if(SUCCESS_ON)initSuccess();
 if(MOOD_ON){var n=0,iv=setInterval(function(){var b=$("bear");if(b){clearInterval(iv);initWalk(b);initMood(b)}else if(++n>20)clearInterval(iv)},500)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();