/* appnav.js : "app view" for phones: a bottom bar with 🏠 Home · 📚 Notes · ⭐ Mine · 🧸 Ask.  Loaded last (see the loader list in index.html).
   It only shows on narrow screens (phones) and hides itself while a note is open in the reader.
   ⭐ Mine scrolls to the student's "⭐ My shortcuts" row (made in notes.js, notes they starred with ☆). */
(function () {
if (window.__appnav) return; window.__appnav = 1;
var d = document, $ = function (i) { return d.getElementById(i); };
var st = d.createElement("style");
st.textContent =
  "#nBar{display:none;position:fixed;left:0;right:0;bottom:0;z-index:9000;gap:6px;justify-content:space-around;padding:6px 10px calc(6px + env(safe-area-inset-bottom,0px));background:color-mix(in srgb,var(--panel,#fff) 94%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid var(--line,rgba(0,0,0,.12))}" +
  "#nBar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;margin:0;padding:6px 4px;border:0;border-radius:14px;background:none;color:var(--muted,#777);font:600 11px system-ui,sans-serif;cursor:pointer;box-shadow:none;transform:none}" +
  "#nBar button span{font-size:21px;line-height:1}#nBar button.on{color:var(--text,#222);background:color-mix(in srgb,var(--accent,#ff9ec4) 30%,transparent)}" +
  "#nBarT{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9001;max-width:86vw;padding:8px 14px;border-radius:999px;background:#222;color:#fff;font:600 13px system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s}#nBarT.show{opacity:1}" +
  "@media (max-width:760px){#nBar{display:flex}body{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}}" +
  "@media (min-width:761px){#nBar{display:flex;flex-direction:column;left:12px;right:auto;top:50%;bottom:auto;transform:translateY(-50%);width:68px;padding:8px 6px;gap:4px;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:22px;box-shadow:0 6px 24px rgba(0,0,0,.16)}#nBar button{padding:9px 2px}#nBarT{bottom:24px}}" +
  "@media (min-width:761px) and (max-width:1200px){body{padding-left:92px}}" +
  "body:has(.nv:not(.hidden)) #nBar{display:none}";
d.head.appendChild(st);
var bar = d.createElement("nav"); bar.id = "nBar"; bar.setAttribute("aria-label", "Quick navigation");
bar.innerHTML = '<button type="button" data-g="home"><span>🏠</span>Home</button><button type="button" data-g="notes"><span>📚</span>Notes</button><button type="button" data-g="mine"><span>⭐</span>Mine</button><button type="button" data-g="ask"><span>🧸</span>Ask</button>';
d.body.appendChild(bar);
var tip = d.createElement("div"); tip.id = "nBarT"; d.body.appendChild(tip);
var tT = 0;
function toast(t) { tip.textContent = t; tip.classList.add("show"); clearTimeout(tT); tT = setTimeout(function () { tip.classList.remove("show"); }, 2600); }
function inNotes() { var sn = $("sn"); return !!(sn && !sn.classList.contains("hidden")); }
function closeViewer() { var v = d.querySelector(".nv:not(.hidden)"), x = $("nvX"); if (v && x) x.click(); }
function mineOpen() { return !!(window.__mine && window.__mine.visible()); }
function closeMine() { if (window.__mine) window.__mine.close(); }
function toHome() { closeViewer(); closeMine(); if (inNotes() && $("nBack")) $("nBack").click(); }
function mark() { var a = mineOpen() ? "mine" : inNotes() ? "notes" : "home"; [].forEach.call(bar.querySelectorAll("button[data-g]"), function (b) { var g = b.getAttribute("data-g"); if (g !== "ask") b.classList.toggle("on", g === a); }); }
bar.addEventListener("click", function (e) {
  var b = e.target.closest("button[data-g]"); if (!b) return; var g = b.getAttribute("data-g");
  if (g === "home") { toHome(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (g === "notes") { closeViewer(); closeMine(); if (!inNotes() && $("nOpen")) $("nOpen").click(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (g === "mine") { closeViewer(); if (window.__mine) window.__mine.open(); }
  else if (g === "ask") { if (window.__askOpen) window.__askOpen(); }
  setTimeout(mark, 300);
});
mark(); setInterval(mark, 1000);
})();