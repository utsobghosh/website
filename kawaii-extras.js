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
var KEY_URL="https://script.google.com/macros/s/AKfycbw58vYmfHbFmfJe050xn9zipIJfnPx9kHlzkg6gyWxU8RPgq0NjDN49iFSk8ef_KHVUEQ/exec";window.__gem=function(){return{k:GEMINI_KEY,m:GEMINI_MODEL,u:KEY_URL}};   // lets ask-bear.js use the same Gemini key/model
   // Apps Script web app that returns the Gemini key (key is kept in Apps Script, not in GitHub)
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
  var mo=new MutationObserver(function(){if(el.classList.contains("hidden"))return;
   mo.disconnect();   // our own class change below must not trigger this again (that was an endless loop that froze the page)
   el.querySelector(".kt").textContent=TITLES[Math.floor(Math.random()*TITLES.length)];
   el.classList.remove("go");void el.offsetWidth;el.classList.add("go");
   mo.observe(el,{attributes:true,attributeFilter:["class"]})});
  mo.observe(el,{attributes:true,attributeFilter:["class"]})})}

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
var CAM_SIZE=58,SNAP_TEXT=["Say cheese! 🧀","Perfect shot! 📸","You look great! ✨","Got it! So cute! 💖","Click! Great smile! 😊","Another memory! 🌸","Snap! Frame it! 🖼️","That one's going in the album! 📖","Wow, so photogenic! 🌟","Click! You're glowing today ✨","Best photo of the day! 🏆","Nailed it! 🎯","Ooh, that's a keeper! 🔒","Cute alert! 🚨💖","Flash! Gorgeous! ⚡","Photo saved in my heart 💌","Smile detected! 😁","10/10 would photograph again 📸","You broke my camera, too cute! 💥","Look at that smile! 🌷","Picture perfect! 🎀","Chef's kiss shot! 😘","Instant classic! 🎞️","I'll print this one! 🖨️","Click-click! Another one! 📷","So pretty, I almost dropped the camera 🫣","Memory stored, 100% cute 💾","Best model ever! 🌸","That was a good one! 👍","Professional bear photographer at work 🧸","You + sunshine = great photo ☀️","Aww, look at you! 🥰","Camera loves you! 💕","Photo of the year! 🥇","Pose master! 🕺","Say cheese again? 🧀🧀","That's going on the fridge! 🧲","Shutter speed: super cute ⏱️💗","Selfie? No, bear-ie! 🐻","Click! Now you're famous ⭐"],HOLD_TEXT=["Hold still… 🎯","Don't move… 📷","Almost ready… 🔍","Wait, wait, perfect light… 💡","Little bit to the left… ⬅️","Chin up, smile! 😊","Hmm, finding the best angle… 📐","Stay right there! 🧍","Focusing… 🔎","One sec, adjusting the lens… 🔧","Ooh, good light here! 🌤️","Shhh, don't blink! 👀","Get ready to smile! 😁","Hold that pose! 💃"];
function bearPhoto(){
 var K=window.__bearK,bear=K.bear,BW=K.BW,BH=K.BH,bsay=K.bsay;CAM_SIZE=Math.max(22,Math.round(58*BW/84));   // the camera follows the bear size
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
 later(function(){bsay(pk(HOLD_TEXT),1700)},900);
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
 window.extras=function(n){var K=window.__bearK;if(NEWACT2[n]){var b3=K.bear;if(!b3)return;var r3=b3.getBoundingClientRect();if(r3.right<20||r3.left>innerWidth-20)return;ACT2[n]().catch(function(){kBusy=false;window.__bearTalking=false});return}if(n==="photo"){var b=K.bear;if(!b)return;var r=b.getBoundingClientRect();if(r.right<20||r.left>innerWidth-20)return;bearPhoto();return}if(NEWACT[n]){var b2=K.bear;if(!b2)return;var r2=b2.getBoundingClientRect();if(r2.right<20||r2.left>innerWidth-20)return;bearNew(n);return}_ex.apply(this,arguments)}
 for(var nm in NEWACT)window.__bearK.DUR[nm]=NEWACT[nm];for(var nm2 in NEWACT2)window.__bearK.DUR[nm2]=NEWACT2[nm2];
 setInterval(function(){var K=window.__bearK,b=K.bear;if(!b||b.style.display==="none"||K.cheering||window.__bearTalking||b.classList.contains("moving")||Math.random()>.4)return;var ks=luckList();K.act(ks[Math.floor(Math.random()*ks.length)])},22000)},100);
/* ---------- 5) admin test panel (buttons to try the bear / themes / sparkles) ---------- */
function initTest(){var ad=$("admin");if(!ad||$("kTest"))return;
 var d=document.createElement("div");d.id="kTest";d.style.cssText="margin-top:18px;padding:12px;border:2px dashed var(--accent);border-radius:16px";
 d.innerHTML='<b>🧪 Test area</b><div class="tiny" style="margin:4px 0 8px;opacity:.8">Try the cute extras here. The bear shows up in the corner.</div><button type="button" class="s" data-t="loading">⏳ Loading screen</button> <button type="button" class="s" data-t="photo">📸 Bear photo</button> <button type="button" class="s" data-t="rand">🎲 Random move</button> <button type="button" class="s" data-t="say">💬 Bear says</button> <button type="button" class="s" data-t="new">🎁 New move</button> <button type="button" class="s" data-t="cheer">🎉 Cheer</button> <button type="button" class="s" data-t="spark">✨ Sparkles</button> <button type="button" class="s" data-t="theme">🎨 Next theme</button> <button type="button" class="s" data-t="paints">🖼️ All paintings</button>';
 ad.appendChild(d);
 var EM={bubbles:"🫧",balloon:"🎈",wish:"🌠",petals:"🌸",study:"📝",magic:"🪄",sneeze:"🤧",umbrella:"☂️",fireworks:"🎆",kite:"🪁",snow:"❄️",boo:"👻",coffee:"☕",rainbow:"🌈",butterfly:"🦋",fishing:"🎣",rocket:"🚀",trophy:"🏆",plane:"✈️",detective:"🔍",painter:"🎨",hide:"🙈",quiz:"🧠"};
 var allM=Object.keys(NEWACT).concat(Object.keys(NEWACT2)),btn=function(n){return'<button type="button" class="s" data-t="n:'+n+'">'+(EM[n]||"🎁")+" "+n+"</button> "};
 d.insertAdjacentHTML("beforeend","<div style='margin-top:8px'><b class='tiny'>⭐ Fun moves (more luck): </b>"+allM.filter(function(n){return FUN_MOVES[n]!==undefined}).map(btn).join("")+" <span class='tiny'>(+ 📸 Bear photo above)</span></div><div style='margin-top:8px'><b class='tiny'>Other moves (less luck):</b></div>"+allM.filter(function(n){return FUN_MOVES[n]===undefined}).map(btn).join(""));
 d.onclick=function(e){
  var gi=e.target.closest&&e.target.closest(".kgi");   // tap a painting in the gallery to watch it being drawn again
  if(gi){var gp=gi.querySelector("path"),GL=gp.getTotalLength();gp.style.strokeDasharray=GL;gp.animate([{strokeDashoffset:GL},{strokeDashoffset:0}],{duration:1500,easing:"ease-in-out"}).onfinish=function(){gp.style.strokeDasharray=""};return}
  var t=e.target.getAttribute&&e.target.getAttribute("data-t");if(!t)return;var K=window.__bearK;
  if(t==="paints"){var g=$("kGallery");if(g){g.remove();return}   // show / hide every painting the painter bear can draw
   var SH=kShapes();g=document.createElement("div");g.id="kGallery";g.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-top:10px";
   g.innerHTML=SH.map(function(sd,i){var h=Math.round(i*360/SH.length);return'<div class="kgi" style="text-align:center;cursor:pointer"><svg viewBox="0 0 100 100" style="width:100%;max-width:96px;background:var(--cardbg,#fff);border-radius:12px"><path d="'+sd+'" fill="hsla('+h+',85%,62%,.25)" stroke="hsl('+h+',85%,62%)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="tiny">'+(i+1)+". "+(SHAPE_NAMES[i]||"new")+"</div></div>"}).join("");
   d.appendChild(g);return}
  if(t==="theme"){var b=$("kThemeBox");if(b){var bs=Array.prototype.slice.call(b.children),i=bs.findIndex(function(x){return x.classList.contains("on")});bs[(i+1)%bs.length].click()}return}
  if(t==="loading"){if(window.__testLoading)window.__testLoading();else alert("The notes viewer is not ready yet.");return}   // only shows the notes viewer's loading screen (press Close to leave)
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
/* ===== LUCK: how often the bear picks each move (every 22 s, 40% of the time it does something) =====
   FUN moves (interactive / story moves) = more tickets. Everything else = few tickets. To make a move fun, add it to FUN_MOVES.
   Chance of a move = its tickets / all tickets. */
var FUN_MOVES={photo:7,detective:4,painter:4,hide:4};   /* the quiz is NOT a random move any more (it only appears from the AI quiz tab / admin test) */   // fun moves: tickets EACH (add a new fun move here, e.g. dance:4)
var NORMAL_TICKETS=1;                                    // every other move (bubbles, balloon, petals ...)
function luckList(){var a=[];Object.keys(FUN_MOVES).forEach(function(k){for(var i=0;i<FUN_MOVES[k];i++)a.push(k)});
 Object.keys(NEWACT).concat(Object.keys(NEWACT2)).forEach(function(k){if(k!=="quiz"&&FUN_MOVES[k]===undefined)for(var i=0;i<NORMAL_TICKETS;i++)a.push(k)});return a}
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

/* ---------- 7) three more bear moves: detective 🔍, painter 🎨, hide and seek 🙈 ----------
   Small and short: they use a little corner of the screen for a few seconds, then give it back.
   NEWACT2 = name: how long the move lasts (ms). Remove a name to drop that move. The lists below are the lines the bear says. */
var NEWACT2={detective:7600,painter:5400,hide:12000,quiz:50000};
var DETECT_TEXT=["Hmm, where is it? 🔍","Detective bear on the case! 🕵️","Searching for clues… 🔎","I smell some notes nearby… 👃","Don't worry, I'll find it! 🧸","Let me investigate… 🧐"],
 FOUND_TEXT=["Found it! 🔍","Aha! Got you! 🕵️","Case solved! 📁","Elementary, my dear student! 🎩","This is the one! ✨","Clue found! 🧩","Gotcha, note! 📚","Mystery solved! 🔎✨","Look what I found! 🎉","Is this what you were looking for? 👀","Found it! Great detective work! 🏅"],
 PAINT_TEXT=["Let me paint something! 🎨","Art time! 🖌️","Watch this… 🎨","Painting a surprise! ✨","Bear artist at work! 🧑‍🎨"],
 TADA_TEXT=["Ta-da! 🎨","My masterpiece! 🖼️","Beautiful, right? 😌","Art for you! 💖","Gallery worthy! ✨","Picasso bear! 🧸","Ta-da! Hang it up! 📌"],
 HIDE_TEXT=["Let's play hide and seek! 🙈","Don't look! 🙈","Count to ten… 🔢","I'm gonna hide! 🤫","Shhh… find me! 👀"],
 FOUNDME_TEXT=["Found me! 🙈","You found me! 🎉","Aww, you got me! 🧸","Peekaboo! 👋","Okay okay, I'm caught! 😆","You're good at this! 🏆"],
 NOTFOUND_TEXT=["Hehe, you didn't tap me! 😝","I win! 🏅","Too slow! 🐢","Hide and seek champion! 🏆","Find me next time! 🙈"];
var kBusy=false;
(function(){var st=document.createElement("style");st.textContent=".kglow{animation:kglow 1.1s ease-in-out 2}@keyframes kglow{0%,100%{box-shadow:0 0 0 0 rgba(255,214,102,0)}50%{box-shadow:0 0 0 5px rgba(255,214,102,.9),0 0 20px 8px rgba(255,214,102,.8)}}.kdet{position:absolute;left:58%;top:38%;font-size:30px;pointer-events:none;z-index:5;transform-origin:20% 80%}.kpaint{position:fixed;width:110px;height:110px;pointer-events:none;z-index:48;transition:opacity .9s}.kbrush{position:fixed;left:0;top:0;font-size:22px;pointer-events:none;z-index:49}";document.head.appendChild(st)})();
function kpk(a){return a[Math.floor(Math.random()*a.length)]}
function kWait(ms){return new Promise(function(r){setTimeout(r,ms)})}
function kWalk(bear,x,y,ms){return new Promise(function(res){bear.style.transitionDuration=(ms/1000)+"s";bear.classList.add("moving");bear.style.left=x+"px";bear.style.top=y+"px";setTimeout(function(){bear.classList.remove("moving");bear.style.transitionDuration="";res()},ms+80)})}
function kTargets(){var out=[];Array.prototype.forEach.call(document.querySelectorAll(".nchip,.nf,.opt"),function(e){var r=e.getBoundingClientRect();
  if(r.width<40||r.height<16||r.top<60||r.bottom>innerHeight-10||r.left<0||r.right>innerWidth)return;
  var c=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(c&&e.contains(c))out.push(e)});return out}   // only buttons you can really see
async function kDetective(){var K=window.__bearK,bear=K.bear,BW=K.BW,BH=K.BH,body=$("bearBody");
 if(kBusy)return;var T=kTargets();if(!T.length)return;   // nothing to find on this screen
 kBusy=true;window.__bearTalking=true;var r0=bear.getBoundingClientRect(),hx=r0.left,hy=r0.top,tg=kpk(T),lens=document.createElement("span");
 lens.className="kdet";lens.textContent="🔍";bear.appendChild(lens);
 try{K.bsay(kpk(DETECT_TEXT),1800);
  var tr=tg.getBoundingClientRect(),x=Math.max(4,Math.min(innerWidth-BW-4,tr.left+tr.width/2-BW/2)),y=Math.max(50,Math.min(innerHeight-BH-4,tr.top-BH*.8));
  await kWalk(bear,x,y,1500);
  lens.animate([{transform:"rotate(-28deg)"},{transform:"rotate(28deg)"}],{duration:300,iterations:4,direction:"alternate"});await kWait(1300);
  if(body)body.animate([{transform:"translateY(0)"},{transform:"translateY(12px) scale(1.05)"},{transform:"translateY(0)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:380});   // pounce
  tg.classList.add("kglow");setTimeout(function(){tg.classList.remove("kglow")},2400);
  var q=tg.getBoundingClientRect();try{K.sparkleBurst(q.left+q.width/2,q.top+q.height/2,8,.6,true)}catch(e){}
  K.bsay(kpk(FOUND_TEXT),2200);await kWait(2300);
  lens.remove();await kWalk(bear,hx,hy,1500)}
 finally{lens.remove();bear.classList.remove("moving");bear.style.transitionDuration="";kBusy=false;window.__bearTalking=false}}
var SHAPE_NAMES=["heart","star","smiley","moon","cloud","flower","house","lightning","tulip","crown"];   // same order as kShapes() below (only used for the admin gallery)
function kShapes(){   // shapes the painter bear can draw (100 x 100 box). Add your own path here.
 var fl="";for(var i=0;i<6;i++){var a=i*Math.PI/3,c=Math.cos(a),n=Math.sin(a),P=function(x,y){return(50+x*c-y*n).toFixed(1)+" "+(50+x*n+y*c).toFixed(1)};fl+="M"+P(0,0)+" C"+P(-22,-14)+" "+P(-14,-40)+" "+P(0,-40)+" C"+P(14,-40)+" "+P(22,-14)+" "+P(0,0)+" "}
 return["M50 88 C10 58 6 30 28 20 C42 14 50 26 50 34 C50 26 58 14 72 20 C94 30 90 58 50 88 Z",   // heart
  "M50 8 L61 38 L93 38 L67 57 L77 89 L50 70 L23 89 L33 57 L7 38 L39 38 Z",   // star
  "M50 10 A40 40 0 1 1 49.9 10 Z M34 38 L34 44 M66 38 L66 44 M28 60 Q50 84 72 60",   // smiley
  "M62 10 A40 40 0 1 0 90 66 A32 32 0 1 1 62 10 Z",   // moon
  "M26 74 A17 17 0 0 1 28 38 A24 24 0 0 1 74 40 A17 17 0 0 1 74 74 Z",   // cloud
  fl,   // flower
  "M10 50 L50 14 L90 50 M20 44 L20 88 L80 88 L80 44 M42 88 L42 62 L58 62 L58 88",   // house
  "M58 6 L22 56 L46 56 L38 94 L78 42 L54 42 Z",   // lightning
  "M32 12 C30 40 38 54 50 54 C62 54 70 40 68 12 L59 26 L50 10 L41 26 Z M50 54 L50 92 M50 84 C34 84 22 74 20 58 C36 60 48 68 50 84 M50 76 C64 76 76 68 80 54 C64 56 52 62 50 76",   // tulip
  "M20 70 L20 30 L38 46 L50 24 L62 46 L80 30 L80 70 Z"]}   // crown
async function kPainter(){var K=window.__bearK,bear=K.bear,body=$("bearBody");if(kBusy)return;kBusy=true;window.__bearTalking=true;
 var NS="http://www.w3.org/2000/svg",svg=document.createElementNS(NS,"svg"),path=document.createElementNS(NS,"path"),brush=document.createElement("span");
 try{var r=bear.getBoundingClientRect(),W=110,left=r.left>innerWidth/2?r.left-W-6:r.right+6;left=Math.max(6,Math.min(innerWidth-W-6,left));var top=Math.max(50,Math.min(innerHeight-W-6,r.top-30));
  var star=Math.random()<.5,hue=Math.floor(Math.random()*360),col="hsl("+hue+",85%,62%)";
  path.setAttribute("d",kpk(kShapes()));
  path.setAttribute("fill","none");path.setAttribute("stroke",col);path.setAttribute("stroke-width","6");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
  svg.setAttribute("viewBox","0 0 100 100");svg.setAttribute("class","kpaint");svg.style.left=left+"px";svg.style.top=top+"px";svg.appendChild(path);document.body.appendChild(svg);
  var L=path.getTotalLength();path.style.strokeDasharray=L;path.style.strokeDashoffset=L;
  brush.className="kbrush";brush.textContent="🖌️";document.body.appendChild(brush);
  K.bsay(kpk(PAINT_TEXT),1500);
  if(body)body.animate([{transform:"rotate(-4deg)"},{transform:"rotate(4deg)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:300,iterations:7,direction:"alternate"});
  var t0=performance.now(),D=2000;   // the colour trail is drawn with the brush
  await new Promise(function(res){(function f(now){var t=Math.min(1,(now-t0)/D);path.style.strokeDashoffset=L*(1-t);var p=path.getPointAtLength(L*t);brush.style.transform="translate("+(left+p.x*W/100)+"px,"+(top+p.y*W/100-18)+"px)";if(t<1)requestAnimationFrame(f);else res()})(t0)});
  brush.remove();path.setAttribute("fill","hsla("+hue+",85%,62%,.25)");
  K.bsay(kpk(TADA_TEXT),2000);await kWait(1900);svg.style.opacity="0";await kWait(1000)}   // the painting fades away
 finally{brush.remove();svg.remove();kBusy=false;window.__bearTalking=false}}
async function kHide(){var K=window.__bearK,bear=K.bear,BW=K.BW,BH=K.BH,body=$("bearBody");if(kBusy)return;kBusy=true;window.__bearTalking=true;
 var r0=bear.getBoundingClientRect(),hx=r0.left,hy=r0.top,found=false,onTap=function(){found=true},prop=null,mode=kpk(["edge","bottom","prop","prop"]),   // 3 different ways to hide
  hop=function(){if(body)body.animate([{transform:"translateY(0)"},{transform:"translateY(-18px)"},{transform:"translateY(0)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:420,iterations:2})},
  wait=async function(ms){for(var t=0;t<ms&&!found;t+=100)await kWait(100)};   // waits, but stops as soon as you tap
 bear.addEventListener("click",onTap);
 try{K.bsay(kpk(HIDE_TEXT),1500);await kWait(900);
  if(mode==="prop"){   // the bear sneaks into a bush / box / basket: tap it to find the bear
   var side=r0.left>innerWidth/2?-1:1,px=Math.max(6,Math.min(innerWidth-56,r0.left+BW/2+side*BW*.9-22));
   prop=document.createElement("span");prop.textContent=kpk(["🌿","📦","🧺","🪴","🌳","🎁"]);
   prop.style.cssText="position:fixed;left:"+px+"px;top:"+(hy+BH-52)+"px;font-size:46px;line-height:1;z-index:47;cursor:pointer;transform-origin:50% 90%";
   document.body.appendChild(prop);prop.addEventListener("click",onTap);prop.animate([{transform:"scale(0)"},{transform:"scale(1.15)"},{transform:"scale(1)"}],{duration:400});
   await kWalk(bear,px+22-BW/2,hy,1000);bear.style.opacity="0";   // the bear is inside
   for(var j=0;j<5&&!found;j++){await wait(1200);if(found)break;prop.animate([{transform:"rotate(-8deg)"},{transform:"rotate(8deg)"}],{duration:200,iterations:4,direction:"alternate"})}
   bear.style.opacity="";prop.animate([{transform:"scale(1)",opacity:1},{transform:"scale(1.4)",opacity:0}],{duration:350,fill:"forwards"});setTimeout(function(){if(prop)prop.remove()},400)}
  else{   // the bear hides at the screen edge (left/right) or the bottom and peeks out
   var right=r0.left>innerWidth/2,hX,hY,pX,pY,oX,oY;
   if(mode==="edge"){hX=right?innerWidth-BW*.42:-BW*.58;hY=hy;pX=hX+(right?-28:28);pY=hy;oX=right?innerWidth-BW-14:14;oY=hy}
   else{hX=Math.max(10,Math.min(innerWidth-BW-10,innerWidth*(.2+Math.random()*.6)-BW/2));hY=innerHeight-BH*.35;pX=hX;pY=hY-32;oX=hX;oY=innerHeight-BH-14}
   await kWalk(bear,hX,hY,1300);
   for(var i=0;i<2&&!found;i++){await wait(900);if(found)break;await kWalk(bear,pX,pY,350);await wait(1000);if(found)break;await kWalk(bear,hX,hY,350)}
   await kWalk(bear,oX,oY,500)}
  hop();if(found){try{var q=bear.getBoundingClientRect();K.sparkleBurst(q.left+q.width/2,q.top+q.height/3,10,.7,true)}catch(e){}}
  K.bsay(kpk(found?FOUNDME_TEXT:NOTFOUND_TEXT),2000);await kWait(2000);
  await kWalk(bear,hx,hy,1300)}
 finally{bear.removeEventListener("click",onTap);bear.style.opacity="";if(prop)prop.remove();bear.classList.remove("moving");bear.style.transitionDuration="";kBusy=false;window.__bearTalking=false}}
/* ---------- 8) study quiz 🧠: the bear asks a question from YOUR topics (the subject / note that is open right now). Tap the card = answer ----------
   Gemini writes 5 fresh multiple-choice questions from the open topics (same connection as the bear messages); if it is slow or offline the fixed questions are used.
   Fixed questions come from notes-info.js: (1) every heading that has 2+ items under it ("What belongs under ...?"), (2) every table row ("Binary search: time complexity?"),
   (3) your own quiz:[["Question","Answer"]] lists. Viewer open = that note's topics, Notes screen open = that subject's topics, otherwise any subject. */
var QUIZ_TEXT=["Quiz time! 🧠","Pop quiz! 📝","Let's test you! 🎓","Quick question! ❓","Brain check! 🧠","Think fast! ⚡"],RIGHT_TEXT=["Correct! 🎉","Smart cookie! 🍪","Yes! Nice one! ✨","You got it! 💪","Bear is proud! 🧸"],WRONG_TEXT=["Oops, not quite! 😅","Close! Check the green one 👀","Next time! 💖","Good try! 🌱","Now you know! 📖"],kQSeen={};
(function(){var st=document.createElement("style");st.textContent=".kquiz{position:fixed;z-index:10001;box-sizing:border-box;background:var(--panel,#fff);border:2px solid var(--accent2,#8a4dff);border-radius:14px;padding:8px 10px;box-shadow:0 5px 20px rgba(0,0,0,.28);font-size:12.5px;line-height:1.35;max-height:70vh;overflow:auto;transition:opacity .45s}.kqs{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:var(--accent2,#8a4dff);margin:-2px -4px 4px;padding:4px;border-radius:8px;background:color-mix(in srgb,var(--accent2,#8a4dff) 10%,transparent);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}.kqs:active{cursor:grabbing}.kql{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kqt{font-variant-numeric:tabular-nums;padding:1px 6px;border-radius:8px;background:rgba(128,128,128,.18);color:inherit;white-space:nowrap}.kqt.low{background:#ffd3d3;color:#a01919}.kqx{border:0;background:transparent;color:inherit;font-size:14px;line-height:1;padding:2px 4px;cursor:pointer;opacity:.7}.kqx:hover{opacity:1}.kqbar{height:3px;border-radius:2px;background:rgba(128,128,128,.25);margin:-1px 0 6px;overflow:hidden}.kqbar i{display:block;height:100%;width:100%;background:var(--accent2,#8a4dff);transition:width .12s linear}.kqbar.low i{background:#e05252}.kqmin{position:fixed;z-index:10001;left:14px;bottom:14px;width:44px;height:44px;padding:0;border-radius:50%;border:2px solid var(--accent2,#8a4dff);background:var(--panel,#fff);box-shadow:0 4px 14px rgba(0,0,0,.3);font-size:22px;line-height:1;cursor:pointer}.kqmin b{position:absolute;top:-5px;right:-5px;font-size:10px;line-height:1;background:#e05252;color:#fff;border-radius:9px;padding:2px 5px}.kqq{font-weight:700;font-size:13px}.kqo{display:flex;flex-direction:column;gap:4px;margin-top:6px}.kqb{display:block;width:100%;text-align:left;font:inherit;font-size:12px;padding:5px 8px;border:1.5px solid var(--line,#ccc);border-radius:9px;background:transparent;color:inherit;cursor:pointer}.kqb b{color:var(--accent2,#8a4dff);margin-right:4px}.kqb:active{transform:scale(.98)}.kqb.off{pointer-events:none}.kqb.off:not(.ok):not(.bad){opacity:.55}.kqb.ok{background:#c8f7d4;border-color:#2fb35a;color:#12351d}.kqb.bad{background:#ffd3d3;border-color:#e05252;color:#4a1414}.kqa{margin-top:6px;padding:6px 8px;border-radius:9px;background:color-mix(in srgb,var(--accent2,#8a4dff) 14%,transparent)}.kqh{font-size:10.5px;opacity:.7;margin-top:5px;text-align:right}@media(max-width:600px){.kquiz{font-size:12px;padding:7px 9px}.kqq{font-size:12.5px}.kqb{font-size:11.5px;padding:4px 7px}}";document.head.appendChild(st)})();
function kesc(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function kShuf(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function kSubj(e){return String((e&&e.keys&&e.keys[0])||(e&&e.title)||"").toLowerCase()}   // subject of a topics block = its first key (dsa, oop, math ...)
function kRandSubject(){var all=window.NOTES_INFO||[],ks=all.map(kSubj).filter(function(k,i,a){return a.indexOf(k)===i});if(!ks.length)return[];var k=kpk(ks);return all.filter(function(e){return kSubj(e)===k})}   // nothing open: ONE random subject (never a mix)
function kQuizPool(blocks){var Q=[];
 function nm(t){return t&&typeof t==="object"?(t.t||""):String(t)}
 function walk(items,s,sk){(items||[]).forEach(function(t){if(!t||typeof t!=="object")return;
  if(t.t&&t.sub&&t.sub.length>1&&!/^(topics|subtopics|exam questions)\b/i.test(t.t)){var K=t.sub.map(nm).filter(Boolean).slice(0,8);Q.push({q:"What belongs under “"+t.t+"”?",a:K.map(function(x){return"• "+x}).join("\n"),s:s,k:sk,h:t.t,kids:K})}
  if(t.sub)walk(t.sub,s,sk)})}
 (blocks||[]).forEach(function(e){if(!e)return;var s=e.title||"Quiz",sk=kSubj(e);
  (e.quiz||[]).forEach(function(x){if(x&&x[0]&&x[1])Q.push({q:x[0],a:x[1],s:s,k:sk,g:"cq",w:Array.isArray(x[2])?x[2]:null})});
  (e.table||[]).forEach(function(r){if(Array.isArray(r)&&r.length>1)Q.push({q:r[0]+": "+((e.head&&e.head[1])||"time complexity")+"?",a:r[1],s:s,k:sk,g:"tbl"})});
  walk(e.items,s,sk)});
 return Q}
/* fixed question -> multiple choice: wrong options are borrowed ONLY from the same subject (never another one). Few wrong answers available = fewer options (min 2). None at all = null (tap-to-reveal card). */
function kMcq(Q,pool){var good,bad=[];
 if(Q.kids){good=kpk(Q.kids);pool.forEach(function(x){if(x!==Q&&x.k===Q.k&&x.kids)x.kids.forEach(function(k){if(Q.kids.indexOf(k)<0&&bad.indexOf(k)<0)bad.push(k)})})}
 else{good=Q.a;if(Q.w&&Q.w.length)bad=Q.w.filter(function(x){return x!==good});else pool.forEach(function(x){if(!x.kids&&x.k===Q.k&&x.g===Q.g&&x.a!==good&&bad.indexOf(x.a)<0)bad.push(x.a)})}   // own wrong options if the question has them, else borrowed from the same subject
 if(!Q.kids&&!(Q.w&&Q.w.length)){var num=/^\s*\d/.test(good),like=bad.filter(function(x){return/^\s*\d/.test(x)===num});if(like.length)bad=like}   // number answers get number-like wrong options (and text gets text), so the right one is not obvious by type
 if(bad.length<1)return null;
 var o=kShuf(kShuf(bad).slice(0,3).concat([good]));return{q:Q.kids?"Which one belongs under “"+Q.h+"”?":Q.q,o:o,c:o.indexOf(good),a:good}}
/* the quiz box sits at the screen EDGE (right side, middle) and can be dragged anywhere by its top bar. Where you leave it is remembered (as a share of the free space, so it also works after rotating the phone). */
function kQPos(){try{var P=JSON.parse(localStorage.getItem("bearQuizPos")||"null");if(P&&P.fx>=0&&P.fy>=0)return P}catch(e){}return{fx:1,fy:.5}}
function kQPlace(card){var M=6,P=kQPos(),w=card.offsetWidth,h=card.offsetHeight;
 card.style.bottom="auto";card.style.left=Math.round(M+Math.min(1,P.fx)*Math.max(0,innerWidth-w-2*M))+"px";card.style.top=Math.round(M+Math.min(1,P.fy)*Math.max(0,innerHeight-h-2*M))+"px"}
function kQKeep(card){var r=card.getBoundingClientRect();if(r.bottom>innerHeight-4)card.style.top=Math.max(4,innerHeight-r.height-4)+"px"}   // the card grew (answer shown): keep it on screen
function kQDrag(card,h){var sx=0,sy=0,ox=0,oy=0;h.addEventListener("pointerdown",function(e){if(e.target.closest&&e.target.closest(".kqx"))return;var r=card.getBoundingClientRect();card.__drag=1;sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top;try{h.setPointerCapture(e.pointerId)}catch(x){}e.preventDefault()});
 h.addEventListener("pointermove",function(e){if(!card.__drag)return;var w=card.offsetWidth,hh=card.offsetHeight;card.style.bottom="auto";
  card.style.left=Math.max(4,Math.min(innerWidth-w-4,ox+e.clientX-sx))+"px";card.style.top=Math.max(4,Math.min(innerHeight-hh-4,oy+e.clientY-sy))+"px"});
 function up(){if(!card.__drag)return;card.__drag=0;var M=6,w=card.offsetWidth,hh=card.offsetHeight,x=parseFloat(card.style.left)||0,y=parseFloat(card.style.top)||0,fw=Math.max(1,innerWidth-w-2*M),fh=Math.max(1,innerHeight-hh-2*M);
  try{localStorage.setItem("bearQuizPos",JSON.stringify({fx:Math.max(0,Math.min(1,(x-M)/fw)),fy:Math.max(0,Math.min(1,(y-M)/fh))}))}catch(e){}}
 h.addEventListener("pointerup",up);h.addEventListener("pointercancel",up)}
/* --- Questions: Gemini LIVE model (free) writes 6 multiple-choice questions per call from the open topics. The FIRST question is shown the moment it arrives, the other 5 are SAVED on this device
   (localStorage), so the next quizzes need NO call at all. A call is only made when a quiz box is really about to be shown. If Gemini fails, premade questions are used and the card says "📚 premade"
   (reason in the console and in the Question zone tab). --- */
var KQ_TIME=60000,KQ_CLOSE=8000,KQ_N=6;   // 60 s to answer (was 30 s, too short to read and think), answer stays 8 s, questions per Gemini call
var kQWhy=[],kLiveBusy=false;
function kTopicsTxt(blocks){function it(a,d){var p=new Array(d+1).join("  ");return(a||[]).map(function(t){if(t&&typeof t==="object")return p+(t.t||"")+((t.sub&&t.sub.length)?"\n"+it(t.sub,d+1):"");return p+"- "+t}).join("\n")}
 return(blocks||[]).map(function(e){return(e.title||"")+"\n"+(e.table?e.table.map(function(r){return Array.isArray(r)?r.join(": "):""}).join("\n"):it(e.items,0))}).join("\n\n").slice(0,3500)}
function kParseQuiz(raw,label){var items=[];try{var i=raw.indexOf("["),j=raw.lastIndexOf("]");items=JSON.parse(raw.slice(i,j+1))}catch(e){items=[];(raw.match(/\{[^{}]*\}/g)||[]).forEach(function(o){try{items.push(JSON.parse(o))}catch(x){}})}   // unfinished reply: keep every complete question
 var out=[];if(!Array.isArray(items))return out;
 items.forEach(function(x){if(!x||typeof x.q!=="string"||x.q.length<5||!Array.isArray(x.o)||x.o.length!==4||!(x.c>=0&&x.c<4))return;
  var o=x.o.map(function(y){return String(y).trim()});if(o.some(function(y){return!y})||o.filter(function(y,n){return o.indexOf(y)===n}).length!==4)return;
  var good=o[x.c|0],sh=kShuf(o.slice());out.push({q:x.q.trim(),o:sh,c:sh.indexOf(good),a:good,s:label,ai:1})});return out.slice(0,10)}
function kBankGet(){try{return JSON.parse(localStorage.getItem("bearQuizBank")||"{}")}catch(e){return{}}}   // saved Gemini questions per subject, kept on this device
function kBankAdd(sig,arr){if(!arr.length)return;var B=kBankGet();B[sig]=(B[sig]||[]).concat(arr).slice(-30);try{localStorage.setItem("bearQuizBank",JSON.stringify(B))}catch(e){}}
/* ONE Live call. Resolves with the first complete question (or null after 20 s / on failure); the call keeps running in the background and saves the rest of the questions. */
function kKeyOk(k){return/^[^\s<>"']{20,}$/.test(k||"")}   // any key without spaces / HTML (new Google keys contain a dot, the old check rejected them)
async function kLiveQuiz(blocks,label,sig){kQWhy=[];
 if(kLiveBusy){kQWhy.push("the previous Gemini call is still running");return null}
 if(!kKeyOk(GEMINI_KEY)){try{GEMINI_KEY=(await(await fetch(KEY_URL)).text()).trim()}catch(e){kQWhy.push("key: "+((e&&e.message)||e))}}   // the key is only fetched once per session by the bear messages; fetch it here if that was skipped
 if(!kKeyOk(GEMINI_KEY)){var kl=String(GEMINI_KEY||"").length;kQWhy.push("no usable Gemini key (got "+kl+" characters)");console.warn("Bear quiz: no usable Gemini key, got "+kl+" characters");return null}
 var topics=kTopicsTxt(blocks);if(!topics.trim())return null;var recent=Object.keys(kQSeen).slice(-12);
 var prompt="You are a friendly teddy bear tutor in a student notes app. The student is studying: "+label+". Topics:\n"+topics+"\n\nWrite "+KQ_N+" different multiple-choice questions based ONLY on these topics (easy to medium). Ask about the CONTENT of each topic (concepts, definitions, differences, types, steps, formulas), NEVER about the exam pattern, how many questions or how many marks come from a topic. If a topic line only says how many questions or marks come from a subject, ask a concept question about that subject itself, using your own knowledge of it. Each has exactly 4 short options (max 8 words each), exactly one correct, and the 3 wrong ones plausible but clearly wrong. Each question must make sense on its own, because the student sees it suddenly: name the topic or subject inside the question. Write every question and every option in ENGLISH only, even if a topic line contains Bengali (understand the Bengali, but answer in English). Keep technical terms in English (inheritance, polymorphism, overloading, etc.). Reply ONLY with raw JSON, no markdown: [{\"q\":\"question, max 18 words\",\"o\":[\"option\",\"option\",\"option\",\"option\"],\"c\":0}] where c is the index 0-3 of the correct option. "+(recent.length?"Do NOT ask these again: "+JSON.stringify(recent)+". ":"")+"Variety seed "+Math.random().toString(36).slice(2,8)+".";
 kLiveBusy=true;
 return new Promise(function(resolve){var txt="",finished=false,resolved=false,delivered=null,have={},got=[],ws,tFirst,tAll;
  function give(v){if(resolved)return;resolved=true;resolve(v)}
  function fin(why){if(finished)return;finished=true;clearTimeout(tFirst);clearTimeout(tAll);try{ws.close()}catch(e){}kLiveBusy=false;
   kBankAdd(sig,got.filter(function(x){return x!==delivered}));   // everything except the question that is being shown now is saved for later
   if(!got.length)kQWhy.push("live: "+(why||"no usable reply")+(txt?" ("+txt.slice(0,50)+")":""));
   if(!delivered&&!resolved)console.warn("Bear quiz: Gemini gave no question, using premade →",kQWhy.join(" | "));give(null)}
  function scan(){kParseQuiz(txt,label).forEach(function(x){if(!have[x.q]){have[x.q]=1;got.push(x)}});
   if(!resolved&&got.length){delivered=got[0];clearTimeout(tFirst);give(delivered)}   // first question ready: show it NOW, keep collecting the rest
   if(got.length>=KQ_N)fin("enough")}
  try{ws=new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key="+GEMINI_KEY)}catch(e){fin(String(e));return}
  tFirst=setTimeout(function(){if(!resolved){kQWhy.push("live: first question took over 20 s");give(null)}},20000);   // premade question now; the call still fills the bank
  tAll=setTimeout(function(){fin("timeout 70 s")},70000);
  ws.onopen=function(){ws.send(JSON.stringify({setup:{model:GEMINI_MODEL,generationConfig:{responseModalities:["AUDIO"]},outputAudioTranscription:{}}}))};
  ws.onmessage=async function(ev){var d=ev.data;if(d instanceof Blob)d=await d.text();var m;try{m=JSON.parse(d)}catch(e){return}
   if(m.error)kQWhy.push("live: "+JSON.stringify(m.error).slice(0,120));
   if(m.setupComplete)ws.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:prompt}]}],turnComplete:true}}));
   var sc=m.serverContent;if(!sc)return;
   if(sc.outputTranscription&&sc.outputTranscription.text){txt+=sc.outputTranscription.text;scan()}   // the sound is never played, only its text transcript is read
   if(sc.turnComplete){scan();fin("turn ended")}};
  ws.onerror=function(){fin("socket error")};ws.onclose=function(ev){fin("closed "+ev.code+" "+(ev.reason||""))}})}
/* wait up to `total` ms; stops early when stop() is true; the clock is PAUSED while the box is dragged or minimised; a box left minimised for 3 minutes is dropped. true = ran out of time */
async function kqWait(card,total,stop,onTick){var t=0;while(t<total&&!stop()&&!card.__gone){await kWait(100);
  if(card.__drag||card.__min){if(card.__min&&++card.__idle>1800)card.__gone=true;continue}
  t+=100;if(onTick)onTick(total-t)}return t>=total}
function kInViewer(){try{var c=window.__notesCtx&&window.__notesCtx();return!!(c&&c.viewer)}catch(e){return false}}   // a PDF is open in the viewer
async function kQuiz(force){var K=window.__bearK||{},bear=K.bear,body=$("bearBody");if(kBusy||document.hidden||kInViewer())return;   // tab in the background or PDF viewer open: nothing is shown, so NO Gemini call
 var bearOn=!!(bear&&bear.style.display!=="none"),say=function(t,ms){if(bearOn&&K.bsay)K.bsay(t,ms)};   // in the PDF viewer the bear is not there: the box pops up alone   // force: undefined = the subject that is open, "*" = any subject, "dsa" etc = that subject (Question zone tab)
 var ctx=null;try{ctx=window.__notesCtx&&window.__notesCtx()}catch(e){}
 var blocks=typeof force==="string"?(force==="*"?kRandSubject():(window.NOTES_INFO||[]).filter(function(e){return kSubj(e)===force})):(ctx&&ctx.blocks&&ctx.blocks.length?ctx.blocks:kRandSubject());
 var fixed=kQuizPool(blocks);if(!fixed.length&&typeof force!=="string"){blocks=kRandSubject();fixed=kQuizPool(blocks)}if(!fixed.length)return false;
 kBusy=true;window.__bearTalking=true;var card=document.createElement("div"),dot=null,tapped=false,pick=-1,answered=false,t;
 try{var label=blocks.slice(0,2).map(function(e){return e.title}).join(" + "),sig=blocks.map(function(e){return e.title}).join("|")+"#"+kTopicsTxt(blocks).length,B=kBankGet(),list=(B[sig]||[]).filter(function(x){return!kQSeen[x.q]}),Q=list.shift();   // saved Gemini questions first: no call at all
  if(Q){B[sig]=list;try{localStorage.setItem("bearQuizBank",JSON.stringify(B))}catch(e){}}
  else{say("Thinking of a question… 🤔",3500);Q=await kLiveQuiz(blocks,label,sig)}   // ONE call: shows the first question at once and saves the others
  if(kInViewer()){if(Q&&Q.ai)kBankAdd(sig,[Q]);return}   // a PDF was opened while Gemini was answering: keep the question for later, show nothing
  if(!Q){var fresh=fixed.filter(function(x){return!kQSeen[x.q]});if(!fresh.length){kQSeen={};fresh=fixed}Q=kpk(fresh)}   // Gemini failed / offline: premade questions, no repeats until all were asked
  window.__kqLast={ai:!!Q.ai,why:Q.ai?"":(kQWhy.join(" | ")||"no answer")};
  kQSeen[Q.q]=1;if(!Q.o){var m=kMcq(Q,fixed);if(m)Q=Object.assign({},Q,m)}
  var mc=!!Q.o,W=Math.min(innerWidth<=600?235:260,innerWidth-16);
  card.className="kquiz";card.style.width=W+"px";card.style.left="0px";card.style.top="0px";card.__idle=0;
  card.innerHTML='<div class="kqs"><span class="kql">⠿ 🧠 Quiz · '+kesc(Q.s)+(Q.ai?' · 🤖 AI':' · 📚 premade')+'</span><span class="kqt">⏱ '+KQ_TIME/1000+'s</span><button type="button" class="kqx" title="Minimise" aria-label="Minimise">✕</button></div><div class="kqbar"><i></i></div><div class="kqq">'+kesc(Q.q)+'</div>'+
   (mc?'<div class="kqo">'+Q.o.map(function(x,n){return'<button type="button" class="kqb" data-i="'+n+'"><b>'+"ABCD".charAt(n)+'</b>'+kesc(x)+'</button>'}).join("")+'</div>'
      :'<div class="kqa" style="display:none">✅ '+kesc(Q.a).replace(/\n/g,"<br>")+'</div>')+
   '<div class="kqh">'+(mc?'👆 Pick one':'👆 Tap to see the answer')+' · ✥ drag the top bar to move</div><div class="kqid"></div>';
  var tm=card.querySelector(".kqt"),bar=card.querySelector(".kqbar"),hint=card.querySelector(".kqh");try{window.__askQuizRow&&window.__askQuizRow(card.querySelector(".kqid"))}catch(e){}   // ID row (ask-bear.js)
  function paint(rem){var sec=Math.ceil(rem/1000),low=sec<=10;tm.textContent="⏱ "+sec+"s";tm.classList.toggle("low",low);bar.classList.toggle("low",low);bar.firstChild.style.width=Math.max(0,rem/KQ_TIME*100)+"%"}
  function minimise(){if(card.__min)return;card.__min=1;card.style.display="none";   // ✕ before answering: shrink to a small circle in the corner (clock paused), tap it to come back
   dot=document.createElement("button");dot.type="button";dot.className="kqmin";dot.title="Open the quiz";dot.setAttribute("aria-label","Open the quiz");dot.innerHTML="🧠<b>1</b>";
   dot.onclick=function(){card.__min=0;card.style.display="";if(dot){dot.remove();dot=null}kQKeep(card)};document.body.appendChild(dot)}
  card.querySelector(".kqx").addEventListener("click",function(e){e.stopPropagation();if(answered)tapped=true;else minimise()});
  card.addEventListener("click",function(e){if(e.target.closest&&e.target.closest(".kqs"))return;var b=e.target.closest&&e.target.closest(".kqb");if(b&&mc&&pick<0)pick=+b.getAttribute("data-i");else tapped=true});
  say(kpk(QUIZ_TEXT),1600);
  if(bearOn&&body)body.animate([{transform:"rotate(-5deg)"},{transform:"rotate(5deg)"}].map(function(f){f.transformOrigin="50px 100px";return f}),{duration:350,iterations:4,direction:"alternate"});
  await kWait(900);document.body.appendChild(card);kQPlace(card);kQDrag(card,card.querySelector(".kqs"));card.animate([{transform:"scale(.6)",opacity:0},{transform:"scale(1)",opacity:1}],{duration:260,easing:"ease-out"});
  var late,ok=false,tag=Q.ai?" · 🤖 AI-made, check your notes":"";
  paint(KQ_TIME);
  await kqWait(card,KQ_TIME,function(){return mc?pick>=0:tapped},paint);   // 30 s with a visible countdown
  if(card.__gone)return;
  if(mc){late=pick<0;ok=pick===Q.c;kqScore(ok);
   Array.prototype.forEach.call(card.querySelectorAll(".kqb"),function(b,n){b.classList.add("off");if(n===Q.c)b.classList.add("ok");else if(n===pick)b.classList.add("bad")});
   hint.textContent=(late?"⏰ Time's up":ok?"🎉 Correct!":"❌ Not quite")+tag}
  else{late=!tapped;card.querySelector(".kqa").style.display="";hint.textContent="👆 Tap to close"+tag}
  tapped=false;answered=true;kQKeep(card);bar.style.display="none";tm.classList.remove("low");tm.textContent=late?"⏰ 0s":mc?(ok?"✅":"❌"):"📖";
  try{window.__askQuizSave&&window.__askQuizSave({subj:Q.s||"",q:Q.q,o:Q.o||[],a:Q.a||(Q.o?Q.o[Q.c]:""),pick:(mc&&pick>=0&&Q.o)?Q.o[pick]:"",res:mc?(late?"timeout":ok?"right":"wrong"):"viewed",src:Q.ai?"AI":"premade"})}catch(e){}   // saved in the sheet ONLY when the student's ID is known (ask-bear.js)
  say(late?"Time's up! Here it is 📖":mc?kpk(ok?RIGHT_TEXT:WRONG_TEXT):"Did you get it? 🤔",2200);
  if(ok){try{var q=card.getBoundingClientRect();K.sparkleBurst(q.left+q.width/2,q.top,10,.7,true)}catch(e){}}
  var base=hint.textContent;
  await kqWait(card,KQ_CLOSE,function(){return tapped},function(rem){hint.textContent=base+" · closes in "+Math.ceil(rem/1000)+"s"});   // answer stays 8 s (tap the card or ✕ to close now)
  if(card.__gone)return;
  card.style.opacity="0";await kWait(500)}
 finally{card.remove();if(dot)dot.remove();kBusy=false;window.__bearTalking=false}}
//i am reanming Question zone as AI quiz if you are ai you may remove this comment line and change the comments so future ai doensnt change the text back to question zone
/* ---------- 9) 🧸 Question zone: a tab beside "Print status". Pick a subject -> the bear asks a quiz question right now. Score is saved on this device. ---------- */
function kqScoreGet(){try{return JSON.parse(localStorage.getItem("bearQuizScore")||"{}")}catch(e){return{}}}
function kqShowScore(){var e=$("kqScore");if(!e)return;var S=kqScoreGet(),a=S.a|0,r=S.r|0;e.textContent=a?r+" / "+a+" correct ("+Math.round(r*100/a)+"%)":"no answers yet"}
function kqScore(ok){var S=kqScoreGet();S.a=(S.a|0)+1;if(ok)S.r=(S.r|0)+1;try{localStorage.setItem("bearQuizScore",JSON.stringify(S))}catch(e){}kqShowScore()}
function kqStatus(t){var e=$("kqMsg");if(e)e.textContent=t||""}
function kqRender(){var box=$("kqSubs");if(!box)return;var ks=(window.NOTES_INFO||[]).map(kSubj).filter(function(k,i,a){return a.indexOf(k)===i});   // one button per subject found in notes-info.js
 box.innerHTML=ks.length?ks.map(function(k){return'<button type="button" class="s" data-k="'+kesc(k)+'">'+kesc(k.toUpperCase())+'</button>'}).join("")+'<button type="button" class="s" data-k="*">🎲 Any subject</button>':'<span class="tiny">Topics are still loading… open this tab again in a moment.</span>';
 kqShowScore()}
function kqAsk(key){var K=window.__bearK;if(!K||!K.bear){kqStatus("The bear is not ready yet 🧸");return}
 if(kBusy){kqStatus("The bear is busy, one moment… 🧸");return}
 var b=K.bear;if(b.style.display==="none")b.style.display="";
 var q=b.getBoundingClientRect(),inV=q.left>=0&&q.right<=innerWidth&&q.top>=0&&q.bottom<=innerHeight;   // bear off-screen: it walks in first
 var go=function(){kqStatus("🧸 Look at the bear's question!");kQuiz(key).then(function(r){var L=window.__kqLast;kqStatus(r===false?"No topics for that subject yet 🧸":(L&&!L.ai?"📚 That one was premade. Gemini gave no questions: "+L.why:""))},function(){kBusy=false;window.__bearTalking=false;kqStatus("")})};
 if(!inV){b.style.transitionDuration="1.6s";b.classList.add("moving");b.style.left=(innerWidth-K.BW-20)+"px";b.style.top=(innerHeight-K.BH-20)+"px";setTimeout(function(){b.classList.remove("moving");go()},1700)}else go()}
function initZone(){if(!$("tabMine")||!$("c1")||$("tabKq"))return;
 var st=document.createElement("style");st.textContent=".kqsubs{display:flex;flex-wrap:wrap;gap:8px}.kqsubs button{padding:10px 16px;font-weight:700}";document.head.appendChild(st);
 $("tabMine").insertAdjacentHTML("afterend",'<button class="tab" id="tabKq">🧸 Ai quiz</button>');
 $("c1").insertAdjacentHTML("afterend",'<div class="card hidden" id="kq"><b>🧸 Bear question zone</b><div class="tiny" style="margin:2px 0 10px">Pick a subject and the bear asks you a quick multiple-choice question from my topics.</div><div id="kqSubs" class="kqsubs"></div><div id="kqMsg" class="note" style="margin:10px 0 0;min-height:1.2em"></div><div class="tiny" style="margin-top:8px">Your score: <b id="kqScore"></b> <button type="button" class="s" id="kqReset" style="margin-left:6px;padding:2px 8px">↺ Reset</button></div></div>');
 $("tabKq").onclick=function(){show(["kq"])};
 var _s=show;show=function(ids){_s(ids);var q=ids[0]==="kq";$("kq").classList.toggle("hidden",!q);$("tabKq").classList.toggle("on",q);if(q){$("tabNew").classList.remove("on");$("tabMine").classList.remove("on");kqRender()}};   // same trick as notes.js: wrap show() so this card hides / shows with the others
 $("kqSubs").onclick=function(e){var b=e.target.closest("button");if(b)kqAsk(b.getAttribute("data-k"))};
 $("kqReset").onclick=function(){try{localStorage.removeItem("bearQuizScore")}catch(e){}kqShowScore()}}
var ACT2={detective:kDetective,painter:kPainter,hide:kHide,quiz:kQuiz};

function start(){
 initTest();
 initZone();
 loadMsgs();
 if(THEMES_ON)initThemes();
 if(SUCCESS_ON)initSuccess();
 if(MOOD_ON){var n=0,iv=setInterval(function(){var b=$("bear");if(b){clearInterval(iv);initWalk(b);initMood(b)}else if(++n>20)clearInterval(iv)},500)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();