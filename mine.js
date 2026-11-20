/* mine.js : ⭐ MINE = a student's own space, like a small Google Drive: the notes they starred (☆), kept in folders and sub-folders they make themselves.
   Saved in the Google Sheet ("Stars" tab, one row per student ID) and cached on the phone. Saving needs a login (student ID); when not logged in a small pop-up asks for the ID.
   Loaded BEFORE notes.js (see the loader lists in index.html). It reads the notes through window.__notesCtx only when the screen is drawn. */
(function () {
var W = window, D = document;
if (W.__mine) return;
var MAXI = 300, MAXF = 40, MAXD = 5;   // notes, folders, folder depth
var M = null, MID = "", saveT = 0, dirty = 0, CL = {};   // M = data of the logged-in ID; CL = folders folded on this phone
try { CL = JSON.parse(localStorage.getItem("mineCl") || "{}") || {}; } catch (e) {}
function $(i) { return D.getElementById(i); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function K() { return W.__askCore || null; }
function myId() { try { return (W.__askId && W.__askId()) || ""; } catch (e) { return ""; } }
function C() { return W.__notesCtx || null; }
function fire() { try { D.dispatchEvent(new CustomEvent("minechange")); } catch (e) {} }
function toast(t) { var x = $("mnT"); if (!x) { x = D.createElement("div"); x.id = "mnT"; D.body.appendChild(x); } x.textContent = t; x.className = "show"; clearTimeout(toast.t); toast.t = setTimeout(function () { x.className = ""; }, 2400); }
function status(t) { var s = $("mnS"); if (s) s.textContent = t || ""; }

// ---------- data ----------
function norm(x) {   // accepts the old flat list (array of paths) and the new {f:[folders],it:[notes]}
  var d = { v: 1, f: [], it: [] };
  if (Array.isArray(x)) { x.forEach(function (p) { d.it.push({ p: String(p), f: "" }); }); return d; }
  if (x && typeof x === "object") {
    (x.f || []).forEach(function (a) { if (a && a.i && a.n) d.f.push({ i: String(a.i), n: String(a.n).slice(0, 40), p: String(a.p || "") }); });
    (x.it || []).forEach(function (a) { if (a && a.p) d.it.push({ p: String(a.p), f: String(a.f || "") }); });
  }
  var ids = {}; d.f.forEach(function (a) { ids[a.i] = 1; });
  d.f.forEach(function (a) { if (a.p && !ids[a.p]) a.p = ""; }); d.it.forEach(function (a) { if (a.f && !ids[a.f]) a.f = ""; });
  return d;
}
function ensure() {
  var id = myId(); if (!id) { M = null; MID = ""; return false; }
  if (MID !== id || !M) { MID = id; var c = null; try { c = JSON.parse(localStorage.getItem("mine:" + id) || "null"); } catch (e) {} M = norm(c); }
  return true;
}
function persist() {
  try { localStorage.setItem("mine:" + MID, JSON.stringify(M)); } catch (e) {}
  dirty++; clearTimeout(saveT); saveT = setTimeout(push, 700); fire();
}
function push() {
  var k = K(), id = MID; if (!k || !id || !M) return;
  var ver = dirty;   // changes made while this save is on its way stay "unsaved"
  k.post({ action: "mine", id: id, tok: k.tokOf(id), data: JSON.stringify(M) }).then(function (r) {
    if (r && r.error === "auth") status("Log in again to save your changes.");
    else if (!r || !r.ok) status("Could not save yet, trying again later."); else { status(""); if (dirty === ver) dirty = 0; }
  }).catch(function () { status("No internet: kept on this phone, will save later."); });
}
function load() {
  var k = K(), id = myId(); if (!k || !id) { ensure(); fire(); render(); return Promise.resolve(); }
  ensure();
  return k.api({ stars: 1, id: id }).then(function (r) {
    if (r && r.ok && myId() === id && !dirty) { M = norm(r.data); MID = id; try { localStorage.setItem("mine:" + id, JSON.stringify(M)); } catch (e) {} fire(); render(); }
  }).catch(function () {});
}
function idx(p) { for (var i = 0; i < M.it.length; i++) if (M.it[i].p === p) return i; return -1; }
function folder(i) { for (var j = 0; j < M.f.length; j++) if (M.f[j].i === i) return M.f[j]; return null; }
function depth(i) { var d = 0; while (i) { var f = folder(i); if (!f) break; i = f.p; d++; } return d; }
function isUnder(anc, i) { while (i) { if (i === anc) return true; var f = folder(i); i = f ? f.p : ""; } return false; }
function path(i) { var a = []; while (i) { var f = folder(i); if (!f) break; a.unshift(f.n); i = f.p; } return a.join(" / "); }
function count(i) { var n = M.it.filter(function (a) { return a.f === i; }).length; M.f.forEach(function (f) { if (f.p === i) n += count(f.i); }); return n; }

// ---------- public ----------
function has(p) { return !!(M && MID === myId() && idx(p) >= 0); }
function toggle(p) {
  if (!myId()) { loginAsk(p); return; }
  ensure(); var i = idx(p);
  if (i >= 0) M.it.splice(i, 1);
  else { if (M.it.length >= MAXI) { toast("Mine is full (" + MAXI + " notes)"); return; } M.it.unshift({ p: p, f: "" }); }
  persist(); render();
}

// ---------- small dialogs ----------
function dlg(html, wire) {
  var o = D.createElement("div"); o.className = "mno"; o.innerHTML = '<div class="mnd">' + html + "</div>"; D.body.appendChild(o);
  o.addEventListener("click", function (e) { if (e.target === o) o.remove(); });
  if (wire) wire(o); return o;
}
function askName(title, val, ok) {
  dlg("<b>" + esc(title) + '</b><input type="text" maxlength="40" id="mnI" value="' + esc(val) + '" autocomplete="off"><div class="mnrow"><button type="button" data-k="ok">OK</button><button type="button" data-k="no">Cancel</button></div>', function (o) {
    var inp = o.querySelector("#mnI"); setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 40);
    function go() { var v = inp.value.replace(/\s+/g, " ").trim(); if (!v) return; o.remove(); ok(v.slice(0, 40)); }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    o.addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (!b) return; if (b.getAttribute("data-k") === "ok") go(); else o.remove(); });
  });
}
function choose(title, opts, cb) {   // opts: [{k, t}]
  dlg("<b>" + esc(title) + "</b>" + opts.map(function (x, i) { return '<button type="button" class="mnop" data-i="' + i + '">' + esc(x.t) + "</button>"; }).join("") + '<button type="button" class="mnop" data-i="x">Cancel</button>', function (o) {
    o.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (!b) return; var i = b.getAttribute("data-i"); o.remove(); if (i !== "x") cb(opts[+i].k); });
  });
}
function pickFolder(title, exclude, cb) {
  var o = [{ k: "", t: "📂 Mine (top level)" }];
  M.f.slice().sort(function (a, b) { return path(a.i).localeCompare(path(b.i)); }).forEach(function (f) { if (exclude && isUnder(exclude, f.i)) return; o.push({ k: f.i, t: "📁 " + path(f.i) }); });
  choose(title, o, cb);
}

// ---------- folders ----------
function newFolder(par) {
  if (M.f.length >= MAXF) { toast("You can have up to " + MAXF + " folders"); return; }
  if (par && depth(par) >= MAXD) { toast("Folders can go " + MAXD + " levels deep"); return; }
  askName(par ? "New sub-folder in “" + folder(par).n + "”" : "New folder", "", function (n) {
    M.f.push({ i: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n: n, p: par || "" }); persist(); render();
  });
}
function folderMenu(fid) {
  var f = folder(fid); if (!f) return;
  choose("📁 " + f.n, [{ k: "ren", t: "✏️ Rename" }, { k: "sub", t: "📁 New sub-folder" }, { k: "mv", t: "↗ Move this folder" }, { k: "del", t: "🗑 Delete folder (notes move up)" }], function (a) {
    if (a === "ren") askName("Rename folder", f.n, function (n) { f.n = n; persist(); render(); });
    else if (a === "sub") newFolder(fid);
    else if (a === "mv") pickFolder("Move “" + f.n + "” to…", fid, function (to) {
      if (to && depth(to) + 1 + sub(fid) > MAXD) { toast("Folders can go " + MAXD + " levels deep"); return; }
      f.p = to; persist(); render();
    });
    else if (a === "del") { if (!confirm("Delete the folder “" + f.n + "”? The notes and folders inside move up one level.")) return;
      M.f.forEach(function (x) { if (x.p === fid) x.p = f.p; }); M.it.forEach(function (x) { if (x.f === fid) x.f = f.p; });
      M.f.splice(M.f.indexOf(f), 1); delete CL[fid]; persist(); render(); }
  });
}
function sub(i) { var m = 0; M.f.forEach(function (f) { if (f.p === i) m = Math.max(m, 1 + sub(f.i)); }); return m; }   // levels below a folder
function moveItem(p) { var i = idx(p); if (i < 0) return; pickFolder("Move to…", "", function (to) { M.it[idx(p)].f = to; persist(); render(); }); }
function rm(p) { var i = idx(p); if (i >= 0) { M.it.splice(i, 1); persist(); render(); } }
function saveCL() { try { localStorage.setItem("mineCl", JSON.stringify(CL)); } catch (e) {} }

// ---------- login pop-up (when not logged in and a ☆ is pressed, or Mine is opened) ----------
function loginAsk(p) {
  var k = K();
  dlg('<b>⭐ Log in to save</b><div class="mnsm">Your saved notes are kept in your account, so you see them on any phone. Type your student ID to log in.</div><input type="tel" inputmode="numeric" maxlength="8" autocomplete="off" id="mnI" placeholder="e.g. 25101000"><div class="mnsm mnerr" id="mnM"></div><div class="mnrow"><button type="button" data-k="go">Log in &amp; save</button><button type="button" data-k="gg">🎓 Google</button><button type="button" data-k="no">Cancel</button></div>', function (o) {
    var inp = o.querySelector("#mnI"), M2 = o.querySelector("#mnM"); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 40);
    function after() { load().then(function () { if (p && myId()) { ensure(); if (idx(p) < 0) toggle(p); } render(); }); }
    function go() {
      if (!k) { M2.textContent = "Please wait a moment and try again."; return; }
      var v = inp.value.replace(/\D/g, ""); if (!/^\d{8}$/.test(v)) { M2.textContent = "Please type your 8-digit student ID."; return; }
      var done = function () { o.remove(); k.setId(v, "star"); after(); };
      if (W.__auth && W.__auth.idGate) W.__auth.idGate(v, done); else done();
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    o.addEventListener("click", function (e) {
      var b = e.target.closest("[data-k]"); if (!b) return; var a = b.getAttribute("data-k");
      if (a === "no") o.remove(); else if (a === "go") go();
      else if (a === "gg") { if (W.__auth && W.__auth.googleLogin) { o.remove(); var f = function () { D.removeEventListener("askid", f); clearTimeout(t); after(); }, t = setTimeout(function () { D.removeEventListener("askid", f); }, 120000); D.addEventListener("askid", f); W.__auth.googleLogin(); } else M2.textContent = "Google login is not available."; }
    });
  });
}

// ---------- the Mine screen ----------
function build() {
  var st = D.createElement("style");
  st.textContent =
    ".mn{position:fixed;inset:0;z-index:8500;overflow:auto;background:var(--bg,#fff);color:var(--text,#222);padding:10px 12px 100px;-webkit-overflow-scrolling:touch}.mn.hidden{display:none}html.mnopen{overflow:hidden}" +
    "@media (min-width:761px){.mn{padding:16px 24px 28px 104px}}" +
    ".mnb,.mnh{max-width:1100px;margin:0 auto}.mnh{display:flex;align-items:center;gap:8px;font-size:18px;position:sticky;top:0;z-index:2;padding:8px 0;background:var(--bg,#fff)}.mnsp{flex:1}.mnS{font-size:12px;color:var(--accent)}" +
    ".mnh button,.mnlog button,.mno button{padding:8px 14px;border-radius:999px;border:2px solid var(--accent,#d6336c);background:color-mix(in srgb,var(--accent,#d6336c) 16%,var(--panel,#fff));color:var(--text,#222);font:600 13px system-ui,sans-serif;cursor:pointer;margin:0;box-shadow:none;transform:none}" +
        ".mnf{margin:8px 0;border:1px solid var(--line,rgba(0,0,0,.15));border-radius:14px;background:color-mix(in srgb,var(--panel,#fff) 70%,transparent);padding:4px 8px 8px}.mnfh{display:flex;align-items:center;gap:4px}" +
    ".mn .mnfh button{border:0;background:none;color:inherit;font:inherit;cursor:pointer;margin:0;box-shadow:none;padding:6px 8px;font-size:15px}.mn .mnfh .mnn{flex:1;text-align:left;font-weight:700}.mn .mnfh .mnt{width:30px;padding:6px 4px}.mnn small{font-weight:400;color:var(--muted,#777)}" +
    ".mnc{margin:2px 0 0 10px;padding-left:8px;border-left:2px solid var(--line,rgba(0,0,0,.15))}.mnl{margin:4px 0}.mnlab{font-size:12px;color:var(--muted,#777);margin:10px 2px 2px}.mnemp,.mnlog{text-align:center;padding:48px 12px;color:var(--muted,#777)}.mnlog button{margin-top:10px}" +
    ".mno{position:fixed;inset:0;z-index:10006;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:12px}.mnd{background:var(--panel,#fff);color:var(--text,#222);border-radius:16px;padding:16px;width:min(380px,100%);max-height:88vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.4);box-sizing:border-box}" +
    ".mnd input{width:100%;box-sizing:border-box;margin:8px 0;padding:9px 12px;border-radius:10px;border:2px solid var(--accent2,#8a4dff);background:var(--bg,#fff);color:inherit;font:inherit;font-size:16px}.mnrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.mnsm{font-size:12.5px;color:var(--muted,#777)}.mnerr{min-height:18px;color:var(--accent,#d6336c)}" +
    ".mno .mnop{display:block;width:100%;text-align:left;margin:5px 0;border-radius:12px}#mnT{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:10007;padding:8px 14px;border-radius:999px;background:#222;color:#fff;font:600 13px system-ui;opacity:0;pointer-events:none;transition:opacity .2s}#mnT.show{opacity:1}";
  D.head.appendChild(st);
  var o = D.createElement("div"); o.id = "mn"; o.className = "mn hidden";
  o.innerHTML = '<div class="mnh"><b>⭐ Mine</b><span class="mnS" id="mnS"></span><span class="mnsp"></span><button type="button" data-a="nf">📁 New folder</button><button type="button" data-a="x" title="Close">✕</button></div><div class="mnb" id="mnB"></div>';
  D.body.appendChild(o);
  o.addEventListener("click", function (e) {
    var t = e.target, b;
    if ((b = t.closest("[data-more]"))) { e.preventDefault(); var w = b.closest(".nfw"); if (w) { var on = w.classList.toggle("open"); b.textContent = on ? "▴" : "⋯"; } return; }
    if ((b = t.closest("[data-a]"))) {
      var a = b.getAttribute("data-a"), fid = b.getAttribute("data-f");
      if (a === "x") close(); else if (a === "nf") { if (ensure()) newFolder(""); else loginAsk(""); }
      else if (a === "login") loginAsk("");
      else if (a === "tg") { CL[fid] = !CL[fid]; saveCL(); render(); }
      else if (a === "fm") folderMenu(fid);
      return;
    }
    if ((b = t.closest("[data-mv]"))) { moveItem(b.getAttribute("data-mv")); return; }
    if ((b = t.closest("[data-rm]"))) { rm(b.getAttribute("data-rm")); return; }
  });
}
function rowOf(a) {
  var c = C(), f = c && c.fileOf ? c.fileOf(a.p) : null;
  if (!f || !c.rowHtml) return '<div class="nfw"><div class="nf" style="opacity:.65"><b>📄 ' + esc(a.p.split("/").pop()) + '</b><small>Not on the site any more</small></div><button type="button" class="nft" data-rm="' + esc(a.p) + '" title="Remove">✕</button></div>';
  var extra = '<button type="button" class="nfa" data-mv="' + esc(a.p) + '">📂 Move to folder…</button><button type="button" class="nfa" data-rm="' + esc(a.p) + '">✕ Remove from Mine</button>';
  return c.rowHtml(f).replace(/<\/div><\/div>$/, extra + "</div></div>");
}
function tree(par, dep) {
  var h = "", fs = M.f.filter(function (x) { return x.p === par; }).sort(function (a, b) { return a.n.localeCompare(b.n); }), items = M.it.filter(function (a) { return a.f === par; });
  fs.forEach(function (f) {
    var col = !!CL[f.i], e = esc(f.i);
    h += '<div class="mnf"><div class="mnfh"><button type="button" class="mnt" data-a="tg" data-f="' + e + '" aria-label="' + (col ? "Open" : "Fold") + ' folder">' + (col ? "▸" : "▾") + '</button><button type="button" class="mnn" data-a="tg" data-f="' + e + '">📁 ' + esc(f.n) + " <small>(" + count(f.i) + ')</small></button><button type="button" data-a="fm" data-f="' + e + '" aria-label="Folder options">⋮</button></div>' +
      (col ? "" : '<div class="mnc">' + tree(f.i, dep + 1) + "</div>") + "</div>";
  });
  if (items.length) { if (par === "" && fs.length) h += '<div class="mnlab">Not in a folder</div>'; h += '<div class="nflist cmp mnl">' + items.map(rowOf).join("") + "</div>"; }
  return h;
}
function render() {
  var B = $("mnB"); if (!B) return;
  if (!myId()) { B.innerHTML = '<div class="mnlog">🔒<br><b>Log in to use Mine</b><p>Save notes with ☆ and organise them into your own folders. Your saved notes follow you to any phone.</p><button type="button" data-a="login">Log in</button></div>'; return; }
  ensure(); if (!C()) { B.innerHTML = '<p class="mnemp">Loading…</p>'; return; }
  var y = B.parentNode.scrollTop;
  B.innerHTML = (M.it.length || M.f.length) ? tree("", 0) : '<div class="mnemp">Nothing here yet.<br>Tap the <b>☆</b> on any note to save it, then organise it into folders here.</div>';
  B.parentNode.scrollTop = y;
}
function visible() { var o = $("mn"); return !!(o && !o.classList.contains("hidden")); }
function open() { if (!$("mn")) build(); $("mn").classList.remove("hidden"); D.documentElement.classList.add("mnopen"); render(); load(); }
function close() { var o = $("mn"); if (o) o.classList.add("hidden"); D.documentElement.classList.remove("mnopen"); }

W.__mine = { has: has, toggle: toggle, open: open, close: close, visible: visible, data: function () { return M; } };
D.addEventListener("askid", function () { load(); });
setTimeout(load, 1800); setTimeout(load, 5000);
})();