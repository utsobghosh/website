/* seat-plan.js : the "Section wise seat-plan generator" button + its pop-up. Loaded AFTER notes.js, ask-bear.js and auth.js (see the loader list at the bottom of index.html).
   WHAT IT DOES
   - A full-width, slim button under the three tabs (or just above "Which file do you want?"). Admin can hide / show it, move it, change its height, text size and text.
   - Students give the seat-plan PDF (they upload the one from their email, OR you put a Google Drive link in the admin settings and nobody has to upload).
   - The PDF is read in the browser (pdf.js, nothing is sent anywhere). Every room that has someone from the chosen section is cut out and stacked into ONE small picture,
     with the repeated headers removed, and every other ID is blurred.
   - Logged-in student with a known section: applied automatically. Not logged in: asked to log in (ID or Google). Section still unknown: choose it from the list.
     The ID range can always be typed by hand.
   WHAT IT USES: notes.js (window.__notesCtx: CFG, cfgSave, modal), ask-bear.js (window.__askCore: getId, setId), auth.js (window.__auth), SECTION_OF / STUDENTS / SCRIPT_URL from index.html.
   The admin settings are saved in the same place as your pins (CFG.sp), so no change is needed in Code.gs for that. */
(function () {
"use strict";
var C = window.__notesCtx, K = window.__askCore;
if (!C) { console.error("seat-plan.js: notes.js is not loaded"); return; }

var SCALE = (navigator.deviceMemory && navigator.deviceMemory <= 2) ? 1.5 : 2, U = SCALE / 2;   // low-memory phones draw the PDF a bit smaller
var DEF = { t: "Section wise seat-plan generator", h: 0, pos: "tabs", ht: 38, fs: 14, u: "", ins: "Upload the seatplan pdf file that you got in your email to generate section wise" };
var PREV = null;   // live preview while the admin settings box is open

function $(i) { return document.getElementById(i); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function cfg() {
  var s = (C.CFG && C.CFG.sp) || {}, o = {}, k;
  for (k in DEF) o[k] = (s[k] !== undefined && s[k] !== null) ? s[k] : DEF[k];
  if (PREV) for (k in PREV) o[k] = PREV[k];
  o.h = +o.h ? 1 : 0; o.ht = Math.max(22, Math.min(100, +o.ht || DEF.ht)); o.fs = Math.max(8, Math.min(24, +o.fs || DEF.fs));
  if (o.pos !== "files") o.pos = "tabs";
  return o;
}
function admin() { try { return !!sessionStorage.getItem("pin") && sessionStorage.getItem("role") !== "viewer"; } catch (e) { return false; } }
function driveId(t) { t = String(t || "").trim(); if (!t) return ""; var m = /\/d\/([\w-]{10,})/.exec(t) || /[?&]id=([\w-]{10,})/.exec(t) || /^([\w-]{20,})$/.exec(t); return m ? m[1] : ""; }

/* ================= pure PDF logic (no page elements needed) ================= */
var isHeader = function (s) { return /University of Asia|Department of Computer|Final Exam Seat|^\s*Date\s*:/.test(s); };
var isCount = function (s) { return /=/.test(s) || /^\s*Total/.test(s); };
function minOf(a, f) { var m = Infinity; a.forEach(function (x) { var v = f(x); if (v < m) m = v; }); return m; }
function maxOf(a, f) { var m = -Infinity; a.forEach(function (x) { var v = f(x); if (v > m) m = v; }); return m; }

// split one page into room blocks: Room title + count box + table (+ its own header lines, if the page has them)
// the PDF cuts every line into small pieces ("Department of C" + "omputer" ...), so glue the pieces of one line back together first
function mkLines(T) {
  var a = T.slice().sort(function (p, q) { return p.y - q.y || p.x - q.x; }), rows = [], L = [];
  a.forEach(function (t) { var r = rows.filter(function (r) { return Math.abs(r.y - t.y) < 0.5 * t.h; })[0]; if (r) r.t.push(t); else rows.push({ y: t.y, t: [t] }); });
  rows.forEach(function (r) {
    r.t.sort(function (p, q) { return p.x - q.x; }); var cur = null;
    r.t.forEach(function (t) {
      if (cur && t.x - (cur.x + cur.w) < 2.5 * t.h) { cur.s += (t.x - (cur.x + cur.w) > 0.15 * t.h ? " " : "") + t.s; cur.w = t.x + t.w - cur.x; cur.y = Math.min(cur.y, t.y); cur.h = Math.max(cur.h, t.h); }
      else { cur = { s: t.s, x: t.x, y: t.y, w: t.w, h: t.h }; L.push(cur); }
    });
  });
  return L;
}
function layout(P) {
  var T = P.lines || mkLines(P.texts), B = [];
  var rooms = T.filter(function (t) { return /^\s*Room\b/.test(t.s); }).sort(function (a, b) { return a.y - b.y; });
  rooms.forEach(function (r, i) {
    var prevY = i ? rooms[i - 1].y : -1e9;
    var hdr = T.filter(function (t) { return isHeader(t.s) && t.y < r.y && t.y >= prevY; });
    var cnt = T.filter(function (t) { return isCount(t.s) && t.y > r.y - 3.5 * r.h && t.y < r.y + r.h; });
    var boxTop = cnt.length ? minOf(cnt, function (t) { return t.y; }) - 0.7 * cnt[0].h : r.y;
    var cropTop = Math.max(0, Math.min(r.y - 0.3 * r.h, boxTop));
    var hasH = hdr.length > 0, hTop = hasH ? minOf(hdr, function (t) { return t.y; }) : 0, hBot = hasH ? maxOf(hdr, function (t) { return t.y + t.h; }) : 0;
    B.push({ name: r.s.replace(/\s*\(.*$/, "").trim(), roomTop: r.y, cropTop: cropTop, hasHeader: hasH, hdr: hdr, hTop: hTop, hBot: hBot,
             naturalTop: hasH ? Math.max(0, Math.min(hTop - 8 * U, cropTop)) : cropTop, bottom: 0, limit: 0, ids: [] });
  });
  B.forEach(function (b, i) {
    b.limit = i + 1 < B.length ? B[i + 1].naturalTop : P.h;
    b.ids = P.items.filter(function (it) { return it.y >= b.naturalTop && it.y < b.limit; });
  });
  return B;
}
function lastInkRow(canvas, y0, y1) {   // last row (between y0 and y1) that is not white
  y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(canvas.height - 1, Math.floor(y1));
  if (y1 <= y0) return y1;
  var w = canvas.width, h = y1 - y0 + 1, d = canvas.getContext("2d").getImageData(0, y0, w, h).data, r, x, i;
  for (r = h - 1; r >= 0; r--) for (x = 0; x < w; x += 2) { i = (r * w + x) * 4; if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) return y0 + r; }
  return y1;
}
window.__spLogic = { layout: layout, mkLines: mkLines, isHeader: isHeader, isCount: isCount };   // (used only for testing)

/* ================= the front-screen button ================= */
var CSS = '#spWrap{position:relative;margin:8px 0}#spWrap .spb{display:flex;align-items:center;gap:10px;box-sizing:border-box;width:100%;height:var(--sph,38px);padding:2px 12px;border:2px solid var(--accent2,#8a4dff);border-radius:14px;background:var(--panel,#fff);color:var(--text,#333);box-shadow:0 3px 0 color-mix(in srgb,var(--accent2,#8a4dff) 45%,transparent);cursor:pointer;font:inherit;text-align:left}'
+ '#spWrap .spb:active{transform:translateY(2px);box-shadow:none}#spWrap .spi{font-size:17px;flex:none}#spWrap .spt{flex:1;min-width:0;display:block;overflow:hidden;max-height:calc(var(--sph,38px) - 8px);font-weight:700;line-height:1.15;font-size:var(--spfs,14px);overflow-wrap:anywhere}#spWrap .spa{font-size:18px;opacity:.7;flex:none}'
+ '#spWrap.adm .spb{padding-right:78px}#spWrap .spc{display:none;position:absolute;right:8px;top:50%;transform:translateY(-50%);gap:4px}#spWrap.adm .spc{display:flex}#spWrap .spc button{border:1px solid var(--line,#ccc);background:var(--panel,#fff);color:var(--text,#333);border-radius:8px;padding:2px 7px;font-size:14px;cursor:pointer}#spWrap.off .spb{opacity:.55;border-style:dashed}'
+ '.spov{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.45);display:flex;align-items:stretch;justify-content:center}.spbox{background:var(--bg,#fff);color:var(--text,#333);width:min(980px,100%);height:100%;overflow:auto;padding:12px 14px 30px;box-sizing:border-box;font:14px system-ui,sans-serif}'
+ '.sphd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:16px}.spx{border:1px solid var(--line,#ccc);background:var(--panel,#fff);color:var(--text,#333);border-radius:10px;padding:5px 11px;font-size:16px;cursor:pointer}'
+ '.spdz{display:block;text-align:center;padding:22px 14px;border:2px dashed var(--accent,#c9307f);border-radius:14px;background:var(--panel,#fff);cursor:pointer;line-height:1.35}.spdz small{display:block;opacity:.7;margin-top:6px}'
+ '.spmsg{margin:8px 0;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--accent,#c9307f) 12%,var(--panel,#fff));font-size:13px}.spmsg.warn{background:color-mix(in srgb,#f0a000 22%,var(--panel,#fff))}.spok{margin:8px 0;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,#2e9e5b 18%,var(--panel,#fff));font-weight:600}'
+ '.spcard{margin:8px 0;padding:10px;border:1px solid var(--line,#ccc);border-radius:12px;background:var(--panel,#fff)}.sprow{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}'
+ '.spov input[type=text],.spov input[type=number],.spov input:not([type]),.spov select,.spov textarea{padding:7px 9px;border:2px solid var(--line,#ccc);border-radius:10px;background:var(--bg,#fff);color:var(--text,#333);font:inherit;max-width:100%;box-sizing:border-box}'
+ '.spbt{padding:7px 13px;border-radius:999px;border:2px solid var(--accent,#c9307f);background:color-mix(in srgb,var(--accent,#c9307f) 16%,var(--panel,#fff));color:var(--text,#333);font:600 13px system-ui;cursor:pointer}.spbt.alt{background:var(--panel,#fff)}.spbt.on{background:var(--accent,#c9307f);color:#fff}'
+ '.spimg{background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.25);overflow:auto;max-width:100%;margin:8px 0}.spimg canvas{display:block;max-width:100%;height:auto;margin:0 auto}.spsm{font-size:12px;opacity:.75}.spov details{margin:8px 0}.spov summary{cursor:pointer;font-weight:600}'
+ '.spf label{display:block;margin:8px 0 2px;font-size:13px}.spf input[type=text],.spf textarea,.spf select{width:100%}.spf .spr{display:flex;gap:8px;align-items:center}.spf .spr input[type=range]{flex:1}';
var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

var sig = "";
function s1Hidden() { var s = $("s1"); return !s || s.classList.contains("hidden"); }
function vis() {
  var w = $("spWrap"); if (!w) return; var c = cfg(), show = !c.h || admin();
  w.style.display = (!show || (c.pos === "tabs" && s1Hidden())) ? "none" : "";
}
function fit() {   // text never hidden: if it does not fit the chosen height, it gets smaller
  var t = $("spT"); if (!t) return; var fs = cfg().fs, n = 0; t.style.fontSize = fs + "px";
  while (t.scrollHeight > t.clientHeight + 1 && fs > 8 && n++ < 40) { fs -= 0.5; t.style.fontSize = fs + "px"; }
}
function place(w, c) {
  var tabs = document.querySelector("#student .tabs"), s1t = $("s1t");
  if (c.pos === "files" && s1t && s1t.parentNode) { if (w.nextSibling !== s1t) s1t.parentNode.insertBefore(w, s1t); }
  else if (tabs && tabs.parentNode) { if (w.previousElementSibling !== tabs) tabs.parentNode.insertBefore(w, tabs.nextSibling); }
}
function toggleHide() { C.cfgSave(function (n) { n.sp = n.sp || {}; n.sp.h = n.sp.h ? 0 : 1; }); paint(true); }
function paint(force) {
  var c = cfg(), adm = admin(), s = JSON.stringify([c, adm]);
  if (!force && s === sig && $("spWrap")) { vis(); return; }
  sig = s;
  var w = $("spWrap");
  if (!w) {
    w = document.createElement("div"); w.id = "spWrap";
    w.innerHTML = '<button type="button" class="spb" id="spGo"><span class="spi">🪑</span><span class="spt" id="spT"></span><span class="spa">›</span></button><span class="spc"><button type="button" id="spEye" title="Show / hide for visitors">👁</button><button type="button" id="spCog" title="Settings of this button">⚙</button></span>';
    w.querySelector("#spGo").onclick = openGen;
    w.querySelector("#spEye").onclick = function (e) { e.stopPropagation(); toggleHide(); };
    w.querySelector("#spCog").onclick = function (e) { e.stopPropagation(); settings(); };
  }
  place(w, c);
  if (!w.parentNode) return;
  w.className = (adm ? "adm " : "") + (c.h ? "off" : "");
  w.style.setProperty("--sph", c.ht + "px"); w.style.setProperty("--spfs", c.fs + "px");
  $("spT").textContent = c.t + (c.h && adm ? "  (hidden for visitors)" : "");
  $("spEye").textContent = c.h ? "🙈" : "👁";
  vis(); fit();
}
/* ---- admin settings ---- */
function settings() {
  if (!admin()) return;
  var c0 = cfg(); PREV = null; var c = cfg();
  var ov = C.modal('<div class="spf"><b>🪑 Seat-plan button</b>'
    + '<label><input type="checkbox" id="spsShow"> Show it to visitors (untick = only you see it, dimmed)</label>'
    + '<label>Where it sits</label><select id="spsPos"><option value="tabs">Under the 3 buttons</option><option value="files">Just above “Which file do you want?”</option></select>'
    + '<label>Height: <b id="spsHv"></b></label><div class="spr"><input type="range" id="spsHt" min="24" max="90"></div>'
    + '<label>Text size: <b id="spsFv"></b> <span class="spsm">(it shrinks by itself if the text does not fit)</span></label><div class="spr"><input type="range" id="spsFs" min="9" max="22"></div>'
    + '<label>Button text</label><input type="text" id="spsT">'
    + '<label>Seat-plan PDF link on Google Drive (leave empty = students upload their own PDF)</label><input type="text" id="spsU" placeholder="https://drive.google.com/file/d/…">'
    + '<label>Message above the upload box</label><textarea id="spsI" rows="2"></textarea>'
    + '<div class="edfoot"><button type="button" class="p" data-m="save">Save</button><button type="button" class="s" data-m="reset">Reset look</button><button type="button" class="s" data-m="x">Cancel</button></div></div>',
    function (a, ov) {
      if (a === "reset") { PREV = null; fill({ t: DEF.t, ht: DEF.ht, fs: DEF.fs, pos: DEF.pos }); live(); return; }
      if (a !== "save") return;
      var v = read(); PREV = null;
      C.cfgSave(function (n) { n.sp = { h: v.h, pos: v.pos, ht: v.ht, fs: v.fs, t: v.t, u: v.u, ins: v.ins }; });
      ov.remove(); paint(true);
    });
  function g(i) { return ov.querySelector("#" + i); }
  function fill(o) {
    if (o.h !== undefined) g("spsShow").checked = !o.h;
    if (o.pos !== undefined) g("spsPos").value = o.pos;
    if (o.ht !== undefined) g("spsHt").value = o.ht;
    if (o.fs !== undefined) g("spsFs").value = o.fs;
    if (o.t !== undefined) g("spsT").value = o.t;
    if (o.u !== undefined) g("spsU").value = o.u;
    if (o.ins !== undefined) g("spsI").value = o.ins;
  }
  function read() { return { h: g("spsShow").checked ? 0 : 1, pos: g("spsPos").value, ht: +g("spsHt").value, fs: +g("spsFs").value, t: g("spsT").value.trim() || DEF.t, u: g("spsU").value.trim(), ins: g("spsI").value.trim() || DEF.ins }; }
  function live() { var v = read(); g("spsHv").textContent = v.ht + " px"; g("spsFv").textContent = v.fs + " px"; PREV = { h: v.h, pos: v.pos, ht: v.ht, fs: v.fs, t: v.t }; paint(true); }
  fill(c); live();
  ov.addEventListener("input", live); ov.addEventListener("change", live);
  var wt = setInterval(function () { if (!document.body.contains(ov)) { clearInterval(wt); if (PREV) { PREV = null; paint(true); } } }, 400);   // Cancel / outside: drop the preview
}

/* ================= the generator pop-up ================= */
var S = null;   // state of the open pop-up
function sections() { var o = {}; if (typeof SECTION_OF === "undefined") return []; Object.keys(SECTION_OF).forEach(function (k) { o[SECTION_OF[k]] = (o[SECTION_OF[k]] || 0) + 1; }); return Object.keys(o).sort().map(function (k) { return { s: k, n: o[k] }; }); }
function secIds(sec) { var a = []; if (typeof SECTION_OF === "undefined") return a; Object.keys(SECTION_OF).forEach(function (k) { if (SECTION_OF[k] === sec) a.push(k); }); return a.sort(); }
function myId() { try { return K ? K.getId() : ""; } catch (e) { return ""; } }

function pdfLib() {
  if (typeof window.loadPdfJs === "function") return window.loadPdfJs();
  return new Promise(function (res, rej) {
    if (window.pdfjsLib) return res(window.pdfjsLib);
    var B = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/", s = document.createElement("script"); s.src = B + "pdf.min.js";
    s.onload = function () { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob(['importScripts("' + B + 'pdf.worker.min.js");'], { type: "text/javascript" })); res(window.pdfjsLib); } catch (e) { rej(e); } };
    s.onerror = function () { rej(new Error("pdf.js could not be loaded")); }; document.head.appendChild(s);
  });
}
function b64buf(t) { var s = atob(t), u = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
async function fromDrive(id) {   // same route notes.js uses for Drive files (Apps Script ?dfile=)
  var urls = [SCRIPT_URL + "?dfile=" + encodeURIComponent(id)];
  if (window.DRIVE_URL && /script\.google\.com/.test(window.DRIVE_URL)) urls.push(window.DRIVE_URL + "?id=" + encodeURIComponent(id));
  for (var i = 0; i < urls.length; i++) {
    try {
      var t = (await (await fetch(urls[i])).text()).trim();
      if (!t || t === "denied" || t.length < 50 || !/^[A-Za-z0-9+\/=\s]+$/.test(t.slice(0, 80))) continue;
      var buf = b64buf(t), h = new Uint8Array(buf, 0, 4);
      if (h[0] === 37 && h[1] === 80 && h[2] === 68 && h[3] === 70) return buf;   // %PDF
    } catch (e) {}
  }
  throw new Error("drive");
}

function openGen() {
  if ($("spOv")) return;
  var c = cfg(), ov = document.createElement("div"); ov.id = "spOv"; ov.className = "spov";
  ov.innerHTML = '<div class="spbox"><div class="sphd"><b>🪑 ' + esc(c.t) + '</b><button type="button" class="spx" id="spClose" aria-label="Close">✕</button></div><div id="spSrc"></div><div id="spWho" style="display:none"></div><div id="spRes"></div></div>';
  document.body.appendChild(ov);
  var oldOv = document.body.style.overflow; document.body.style.overflow = "hidden";
  S = { pages: null, sel: { mode: "", sec: "", lo: "", hi: "" }, touched: false, run: 0, blur: 5, fade: 70, maxw: 1100, fmt: "png", canvas: null, label: "", timer: 0 };
  function close() { document.removeEventListener("askid", onAsk); document.body.style.overflow = oldOv; ov.remove(); S = null; }
  function onAsk() { if (!S || !S.pages) return; S.touched = false; whoRender(); schedule(0); }
  document.addEventListener("askid", onAsk);
  $("spClose").onclick = close;
  ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
  ov.addEventListener("dragover", function (e) { e.preventDefault(); });
  ov.addEventListener("drop", function (e) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) takeFile(f); });
  var id = driveId(c.u);
  if (id) {
    $("spSrc").innerHTML = '<div class="spmsg" id="spMsg">⏳ Loading the seat plan…</div>';
    fromDrive(id).then(loadBuf).catch(function () { if (S) showUpload("The seat plan could not be loaded from the link. Please upload the PDF you got in your email."); });
  } else showUpload("");
}
function showUpload(note) {
  var h = cfg().ins;
  $("spSrc").innerHTML = (note ? '<div class="spmsg warn">' + esc(note) + '</div>' : '') + '<label class="spdz" for="spFile">📤 <b>' + esc(h) + '</b><small>PDF only · it is read on your phone, nothing is uploaded anywhere</small></label><input type="file" id="spFile" accept="application/pdf,.pdf" style="display:none">';
  $("spFile").onchange = function () { if (this.files[0]) takeFile(this.files[0]); };
}
function takeFile(f) {
  if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { showUpload("That is not a PDF file."); return; }
  $("spSrc").innerHTML = '<div class="spmsg" id="spMsg">⏳ Reading ' + esc(f.name) + '…</div>';
  var r = new FileReader(); r.onload = function () { loadBuf(r.result); }; r.onerror = function () { showUpload("Could not read that file."); }; r.readAsArrayBuffer(f);
}
async function loadBuf(buf) {
  if (!S) return;
  var msg = function (t) { var m = $("spMsg"); if (m) m.textContent = t; };
  try {
    if (!$("spMsg")) $("spSrc").innerHTML = '<div class="spmsg" id="spMsg"></div>';
    msg("⏳ Reading the PDF…");
    var lib = await pdfLib(), pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise, pages = [], total = 0, n;
    for (n = 1; n <= pdf.numPages; n++) {
      if (!S) return;
      var page = await pdf.getPage(n), vp = page.getViewport({ scale: SCALE }), tc = await page.getTextContent(), texts = [], items = [];
      tc.items.forEach(function (it) {
        var s = it.str; if (!s || !s.trim()) return;
        var tr = lib.Util.transform(vp.transform, it.transform), fh = Math.hypot(tr[2], tr[3]), W = it.width * SCALE;
        texts.push({ s: s, x: tr[4], y: tr[5] - fh * 0.95, w: W, h: fh * 1.2 });
        var re = /\d{8}/g, m; while ((m = re.exec(s))) items.push({ x: tr[4] + (m.index / s.length) * W, y: tr[5] - fh * 0.95, w: (8 / s.length) * W, h: fh * 1.2, id: m[0] });
      });
      var P = { page: page, vp: vp, w: vp.width, h: vp.height, texts: texts, items: items, base: null, blocks: [] };
      P.lines = mkLines(texts); P.blocks = layout(P); total += items.length; pages.push(P);
      msg("⏳ Reading page " + n + " of " + pdf.numPages + "…");
    }
    if (!total) { showUpload("This does not look like a seat plan (no student IDs found). Please upload the right PDF."); return; }
    S.pages = pages;
    $("spSrc").innerHTML = '<div class="spsm">✅ Seat plan loaded (' + pages.length + ' pages). <a href="#" id="spOther">Use another PDF</a></div>';
    $("spOther").onclick = function (e) { e.preventDefault(); S.pages = null; S.canvas = null; $("spWho").style.display = "none"; $("spRes").innerHTML = ""; showUpload(""); };
    whoRender(); schedule(0);
  } catch (e) { console.error(e); if (S) showUpload("Could not read this PDF (" + (e && e.message || "error") + "). Try again, or upload another copy."); }
}

/* ---- who: automatic section, login, section list, manual range ---- */
function whoRender() {
  var W = $("spWho"); if (!W || !S) return; W.style.display = "";
  var id = myId(), sec = (id && typeof SECTION_OF !== "undefined") ? SECTION_OF[id] : "", nm = (id && typeof STUDENTS !== "undefined" && STUDENTS[id]) || "", secs = sections();
  if (sec && !S.touched) S.sel = { mode: "sec", sec: sec, lo: "", hi: "" };
  var top;
  if (id && sec) top = '<div class="spok">✅ ' + esc(nm ? nm + " · " : "") + 'ID ' + esc(id) + ' · Section ' + esc(sec) + ' — applied automatically.</div>';
  else if (id) top = '<div class="spmsg warn">You are logged in as ' + esc(id) + ', but I could not find your section. Please choose it below.</div>';
  else top = K ? '<div class="spcard"><b>🔐 Log in to get your section automatically</b><div class="sprow"><input type="text" id="spId" inputmode="numeric" maxlength="8" placeholder="Your ID, e.g. 25101000"><button type="button" class="spbt" id="spLogin">Log in</button></div>'
    + (window.__auth ? '<div class="sprow"><button type="button" class="spbt alt" id="spGoogle">🎓 Log in with Google (university email)</button></div>' : '')
    + '<div class="spsm">No ID? Just choose your section below.</div></div>' : '';
  W.innerHTML = top + '<div class="spcard"><b>Section</b><div class="sprow" id="spChips">' + secs.map(function (x) { return '<button type="button" class="spbt alt" data-s="' + esc(x.s) + '">' + esc(x.s) + ' <small>(' + x.n + ')</small></button>'; }).join("") + '</div>'
    + '<div class="sprow"><span>or ID range:</span><input type="text" id="spLo" inputmode="numeric" maxlength="8" placeholder="from, e.g. 25101001" size="12"> – <input type="text" id="spHi" inputmode="numeric" maxlength="8" placeholder="to, e.g. 25101055" size="12"></div></div>';
  var b;
  if ((b = $("spLogin"))) b.onclick = doLogin;
  if ((b = $("spId"))) b.addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  if ((b = $("spGoogle"))) b.onclick = function () { window.__auth.googleLogin(); };
  [].forEach.call(W.querySelectorAll("[data-s]"), function (x) { x.onclick = function () { S.touched = true; S.sel = { mode: "sec", sec: x.getAttribute("data-s"), lo: "", hi: "" }; mark(); schedule(0); }; });
  function rg() { var lo = $("spLo").value.replace(/\D/g, ""), hi = $("spHi").value.replace(/\D/g, ""); S.touched = true; S.sel = { mode: "range", sec: "", lo: lo, hi: hi }; mark(); if (lo.length === 8 && hi.length === 8) schedule(250); }
  $("spLo").oninput = rg; $("spHi").oninput = rg;
  mark();
}
function mark() {
  if (!S) return; var W = $("spWho"); if (!W) return;
  [].forEach.call(W.querySelectorAll("[data-s]"), function (x) { x.classList.toggle("on", S.sel.mode === "sec" && S.sel.sec === x.getAttribute("data-s")); });
  if (S.sel.mode === "sec") { var a = secIds(S.sel.sec); if (a.length) { $("spLo").value = a[0]; $("spHi").value = a[a.length - 1]; } }
}
function doLogin() {
  var v = ($("spId").value || "").replace(/\D/g, ""); if (v.length !== 8) { $("spId").focus(); return; }
  var go = function () { K.setId(v, "seat-plan"); };
  if (window.__auth && window.__auth.idGate) window.__auth.idGate(v, go); else go();
}

/* ---- draw the picture ---- */
function matcher() {
  var s = S.sel;
  if (s.mode === "sec") { var set = {}; secIds(s.sec).forEach(function (k) { set[k] = 1; }); return function (id) { return !!set[id]; }; }
  if (s.mode === "range" && s.lo.length === 8 && s.hi.length === 8) { var lo = +s.lo, hi = +s.hi; if (lo > hi) { var t = lo; lo = hi; hi = t; } return function (id) { var n = +id; return n >= lo && n <= hi; }; }
  return null;
}
function schedule(ms) { if (!S) return; clearTimeout(S.timer); S.timer = setTimeout(generate, ms); }
async function ensureBase(P) {
  if (P.base) return;
  var c = document.createElement("canvas"); c.width = Math.ceil(P.w); c.height = Math.ceil(P.h);
  await P.page.render({ canvasContext: c.getContext("2d"), viewport: P.vp }).promise;
  P.base = c; P.blocks.forEach(function (b) { b.bottom = Math.min(c.height, lastInkRow(c, b.roomTop, b.limit - 1) + 8 * U); });
}
function blurCopy(base, px) {
  var c = document.createElement("canvas"); c.width = base.width; c.height = base.height; var x = c.getContext("2d");
  if ("filter" in x) { x.filter = "blur(" + (px * U) + "px)"; x.drawImage(base, 0, 0); return c; }
  var k = 1 + px * 0.8, t = document.createElement("canvas"); t.width = Math.max(1, Math.round(base.width / k)); t.height = Math.max(1, Math.round(base.height / k));   // old iPhones: no canvas blur, shrink-and-stretch instead
  t.getContext("2d").drawImage(base, 0, 0, t.width, t.height); x.imageSmoothingEnabled = true; x.drawImage(t, 0, 0, base.width, base.height); return c;
}
function hide(P, m, blurPx, fade) {   // copy of the page where every ID that is not in the chosen group is blurred and faded
  var c = document.createElement("canvas"); c.width = P.base.width; c.height = P.base.height; var x = c.getContext("2d"); x.drawImage(P.base, 0, 0);
  var bl = blurPx > 0 ? blurCopy(P.base, blurPx) : null;
  P.items.forEach(function (it) {
    if (m(it.id)) return; var pad = 3 * U, X = it.x - pad, Y = it.y - pad, W = it.w + pad * 2, H = it.h + pad * 2;
    x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.fillStyle = "#fff"; x.fillRect(X, Y, W, H); x.globalAlpha = 1 - fade / 100; x.drawImage(bl || P.base, 0, 0); x.restore();
  });
  return c;
}
async function generate() {
  if (!S || !S.pages) return;
  var run = ++S.run, m = matcher(), R = $("spRes");
  if (!m) { R.innerHTML = '<div class="spmsg">👆 Log in, or choose your section (or type an ID range) to see your rooms.</div>'; return; }
  var picked = [];
  S.pages.forEach(function (P) { P.blocks.forEach(function (b) { if (b.ids.some(function (it) { return m(it.id); })) picked.push({ P: P, b: b }); }); });
  if (!picked.length) { R.innerHTML = '<div class="spmsg warn">No seat was found for this ' + (S.sel.mode === "sec" ? "section" : "range") + ' in this PDF. Check the section or the range.</div>'; S.canvas = null; return; }
  R.innerHTML = '<div class="spmsg">⏳ Drawing…</div>';
  var i, seen = [];
  for (i = 0; i < picked.length; i++) { if (seen.indexOf(picked[i].P) < 0) { seen.push(picked[i].P); await ensureBase(picked[i].P); if (run !== S.run || !S) return; } }
  var cache = [], W = Math.max.apply(null, seen.map(function (P) { return P.base.width; })), segs = [], GAP = Math.round(10 * U);
  picked.forEach(function (o, k) {
    var P = o.P, b = o.b, ix = S.pages.indexOf(P), c = cache[ix] || (cache[ix] = hide(P, m, S.blur, S.fade)), own = k === 0 && b.hasHeader;
    var top = Math.floor(own ? b.naturalTop : b.cropTop), h = Math.max(4, Math.ceil(b.bottom - top)), stripH = 0, strip = null, GH = null;
    if (k === 0 && !b.hasHeader) { S.pages.some(function (Q) { var q = Q.blocks.filter(function (z) { return z.hasHeader; })[0]; if (q) { GH = { P: Q, b: q }; return true; } }); }
    if (GH) { strip = { x0: Math.max(0, minOf(GH.b.hdr, function (t) { return t.x; }) - 12 * U), x1: Math.min(W, maxOf(GH.b.hdr, function (t) { return t.x + t.w; }) + 12 * U), y0: GH.b.hTop - 8 * U, y1: GH.b.hBot + 8 * U }; stripH = Math.ceil(strip.y1 - strip.y0); }
    var seg = document.createElement("canvas"); seg.width = W; seg.height = stripH + h; var s = seg.getContext("2d"); s.fillStyle = "#fff"; s.fillRect(0, 0, seg.width, seg.height);
    if (strip) s.drawImage(GH.P.base, strip.x0, strip.y0, strip.x1 - strip.x0, stripH, strip.x0, 0, strip.x1 - strip.x0, stripH);
    s.drawImage(c, 0, top, c.width, Math.min(h, c.height - top), 0, stripH, c.width, Math.min(h, c.height - top));
    if (!own) { s.fillStyle = "#fff"; b.hdr.forEach(function (t) { s.fillRect(t.x - 6 * U, stripH + (t.y - top) - 6 * U, t.w + 12 * U, t.h + 12 * U); }); }   // this room's repeated header text
    segs.push(seg);
  });
  var H = 0; segs.forEach(function (g) { H += g.height; }); H += GAP * (segs.length - 1);
  var full = document.createElement("canvas"); full.width = W; full.height = H; var f = full.getContext("2d"); f.fillStyle = "#fff"; f.fillRect(0, 0, W, H);
  var y = 0; segs.forEach(function (g) { f.drawImage(g, 0, y); y += g.height + GAP; });
  var d = f.getImageData(0, 0, W, H).data, minX = W, maxX = 0, yy, x;   // cut the empty left / right margins
  for (yy = 0; yy < H; yy += 2) for (x = 0; x < W; x++) { i = (yy * W + x) * 4; if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) { if (x < minX) minX = x; if (x > maxX) maxX = x; } }
  var pad = 14 * U; minX = Math.max(0, minX - pad); maxX = Math.min(W - 1, maxX + pad);
  var cw = maxX - minX + 1, ratio = Math.min(1, (+S.maxw || 1100) / cw), out = document.createElement("canvas");
  out.width = Math.round(cw * ratio); out.height = Math.round(H * ratio);
  var o = out.getContext("2d"); o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height); o.imageSmoothingQuality = "high"; o.drawImage(full, minX, 0, cw, H, 0, 0, out.width, out.height);
  if (run !== S.run || !S) return;
  S.pages.forEach(function (P) { if (seen.indexOf(P) < 0) P.base = null; });   // free memory of pages that are not needed
  S.canvas = out;
  var rooms = [], cnt = 0; picked.forEach(function (o2) { rooms.push(o2.b.name); o2.b.ids.forEach(function (it) { if (m(it.id)) cnt++; }); });
  S.label = S.sel.mode === "sec" ? "section_" + S.sel.sec : "ids_" + S.sel.lo + "-" + S.sel.hi;
  var extra = "";
  if (S.sel.mode === "sec") {
    var all = secIds(S.sel.sec), present = {}; S.pages.forEach(function (P) { P.items.forEach(function (it) { present[it.id] = 1; }); });
    var miss = all.filter(function (k) { return !present[k]; });
    extra = '<div class="spsm">Found ' + (all.length - miss.length) + ' of ' + all.length + ' students of section ' + esc(S.sel.sec) + ' in this PDF.' + (miss.length ? ' <details style="display:inline"><summary style="display:inline">Not in this PDF</summary>' + miss.map(function (k) { return esc(k); }).join(", ") + '</details>' : '') + '</div>';
  }
  R.innerHTML = '<div class="spsm"><b>' + esc(rooms.join(" · ")) + '</b> — ' + cnt + ' seat' + (cnt === 1 ? '' : 's') + ' highlighted</div>' + extra
    + '<div class="spimg" id="spImg"></div><div class="sprow"><button type="button" class="spbt" id="spDl">⬇ Download image</button><button type="button" class="spbt alt" id="spShare">📤 Share</button><span class="spsm">' + out.width + ' × ' + out.height + ' px</span></div>'
    + '<details><summary>Look &amp; size</summary><div class="sprow">Blur <input type="range" id="spBl" min="0" max="12" value="' + S.blur + '"> Fade <input type="range" id="spFd" min="0" max="100" value="' + S.fade + '"></div>'
    + '<div class="sprow">Max width <input type="number" id="spMw" value="' + S.maxw + '" step="100" min="400" style="width:90px"> px · Format <select id="spFm"><option value="png"' + (S.fmt === "png" ? " selected" : "") + '>PNG</option><option value="jpeg"' + (S.fmt === "jpeg" ? " selected" : "") + '>JPG (smaller)</option></select></div></details>';
  $("spImg").appendChild(out);
  $("spDl").onclick = function () { fileOut(function (blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }); };
  $("spShare").onclick = function () { fileOut(function (blob, name) { var file = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "Seat plan" }).catch(function () {}); else alert("Sharing is not supported here. Use Download instead."); }); };
  $("spBl").oninput = function () { S.blur = +this.value; schedule(200); }; $("spFd").oninput = function () { S.fade = +this.value; schedule(200); };
  $("spMw").onchange = function () { S.maxw = +this.value || 1100; schedule(0); }; $("spFm").onchange = function () { S.fmt = this.value; };
}
function fileOut(cb) {
  if (!S || !S.canvas) return; var jp = S.fmt === "jpeg", type = jp ? "image/jpeg" : "image/png", name = "seat_plan_" + S.label + (jp ? ".jpg" : ".png");
  S.canvas.toBlob(function (b) { if (b) cb(b, name); }, type, 0.9);
}

/* ================= start ================= */
function adminPageBtn() {   // the same settings from the admin page (works even when the button is hidden for visitors)
  var t = $("toStudent"); if (!t || $("spAdm")) return;
  var b = document.createElement("button"); b.type = "button"; b.className = "s"; b.id = "spAdm"; b.textContent = "🪑 Seat-plan button"; b.onclick = settings; t.insertAdjacentElement("afterend", b);
}
var _show = window.show;
if (typeof _show === "function") window.show = function () { var r = _show.apply(this, arguments); vis(); return r; };
paint(true); adminPageBtn();
setInterval(function () { paint(false); adminPageBtn(); }, 1500);   // follows the saved settings (they arrive a moment after the page opens) and the admin PIN
window.addEventListener("resize", fit);
setTimeout(function () { paint(true); }, 800);   // once more when the fonts are in, so the text fit is exact
})();