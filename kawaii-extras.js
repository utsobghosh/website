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
 {from:19,prop:"🌙",say:"Sleepy time… 😴"},
 {from:15,prop:"🧋",say:"Snack time! 🧋"},
 {from:11,prop:"🍙",say:"Have you eaten? 🍙"},
 {from:5, prop:"☀️",say:"Good morning! ☀️"},
 {from:0, prop:"🌙",say:"Still awake? 🌙"}
];
function $(id){return document.getElementById(id)}
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
 s.setProperty("--line",mix(base,dark?.3:.22))}
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
 if(cur!=="def")applyHex(packOf(cur).hex);mark()}

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
 function say(txt){var r=bear.getBoundingClientRect();if(r.right<40||r.left>innerWidth-40)return;
  bub.textContent=txt;bub.style.left=r.left<70?"0":"50%";bub.style.transform="";bub.classList.add("on");
  clearTimeout(t);t=setTimeout(function(){bub.classList.remove("on")},4200)}
 function tick(first){var m=moodNow();prop.textContent=m.prop;if(m!==last){last=m;setTimeout(function(){say(m.say)},first?5000:600)}}
 tick(true);setInterval(function(){tick(false)},60000)}

function start(){
 if(THEMES_ON)initThemes();
 if(SUCCESS_ON)initSuccess();
 if(MOOD_ON){var n=0,iv=setInterval(function(){var b=$("bear");if(b){clearInterval(iv);initMood(b)}else if(++n>20)clearInterval(iv)},500)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
