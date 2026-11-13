/* auth.js : OPTIONAL PASSWORD for a student ID + "Log in with Google" (university email). Loaded AFTER ask-bear.js (index.html).
   Nothing is forced: an ID without a password works as always. Google proves the ID (12345678@uap-bd.edu), so it is also the "forgot password" way.
   The server half is at the bottom of code.gs (handleAuth_, "Passwords" tab). The profile box in ask-bear.js only calls the functions below.
   SETUP: paste your Google "Web client ID" in GCLIENT (same one as GOOGLE_CLIENT_ID in code.gs). */
(function () {
var K = window.__askCore; if (!K) return;
var ls = K.ls, api = K.api, post = K.post, getId = K.getId, setId = K.setId, tokOf = K.tokOf;
var GCLIENT = "300879992860-bqvcpmr9fcml4a0i9d6balg21bf9opeg.apps.googleusercontent.com";   // <-- paste the Google "Web client ID" here (same one as GOOGLE_CLIENT_ID in code.gs). While empty, the Google button says it is not set up.
var UNI = "uap-bd.edu";
var G = null;   // Google proof kept in memory only (~45 min, until refresh): re-opening a password box does not ask for Google again
var PW_ERR = { setup: "Google sign-in is not set up yet.", token: "Google could not confirm this sign-in. Try again.", email: "Please use your university email (ID@" + UNI + ").", wrong: "Wrong password.", locked: "Too many tries. Try again in 10 minutes, or use Google below.", short: "The password needs at least 6 characters.", auth: "Please sign in with Google to do this." };
function gsiLoad() { return window.google && google.accounts && google.accounts.id ? Promise.resolve() : new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.onload = res; s.onerror = function () { rej(new Error("gsi")); }; document.head.appendChild(s); }); }
function googleBtn(el, onCred, onErr) {
  if (!GCLIENT) { onErr("setup"); return; }
  gsiLoad().then(function () {
    google.accounts.id.initialize({ client_id: GCLIENT, hd: UNI, callback: function (r) { onCred(r.credential); } });
    google.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 260 });
  }).catch(function () { onErr("token"); });
}
function pwOverlay(html) {
  var o = document.createElement("div");
  o.style.cssText = "position:fixed;inset:0;z-index:10010;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:12px";
  o.innerHTML = '<div class="kpa" style="background:#fff;color:#333;border-radius:16px;padding:16px;width:min(330px,100%);box-sizing:border-box;font:14px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);max-height:92vh;overflow:auto"><style>.kpa input{width:100%;box-sizing:border-box;margin:6px 0;padding:9px 10px;border:2px solid #e3a9c0;border-radius:10px;font-size:16px}.kpa button{padding:8px 12px;border-radius:999px;border:2px solid #c98aa5;background:#ffe3ee;font:600 13px system-ui;cursor:pointer;margin:3px 4px 3px 0}.kpa button.alt{background:#fff}.kpa p{margin:6px 0;font-size:13px;color:#555}.kpa .pwm{min-height:16px;font-size:12.5px;color:#b4235a;margin:4px 0}.kpa .pwo{font-size:12px;color:#777;margin:8px 0 4px}</style>' + html + '</div>';
  (document.fullscreenElement || document.body).appendChild(o);
  o.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  return o;
}
function idGate(v, cont) {   // an ID with a password must log in first; an ID without one is unchanged
  api({ auth: 1, id: v }).then(function (st) { if (!st || !st.protected || tokOf(v)) cont(); else loginModal(v, cont); }).catch(function () { cont(); });
}
function loginModal(id, done) {
  var o = pwOverlay('<b>🔐 ID ' + id + ' has a password</b><input type="password" id="pwI" placeholder="Password" autocomplete="current-password"><div class="pwm" id="pwM"></div><button type="button" id="pwGo">Log in</button><button type="button" class="alt" id="pwX">Cancel</button><div class="pwo">Forgot it? Tap “Continue with Google” and choose your <b>university email</b> (ID@' + UNI + '):</div><div id="pwG"></div>');
  function msg(t) { o.querySelector("#pwM").textContent = t; }
  function ok(tok) { ls("askTok:" + id, tok); o.remove(); done(); }
  o.querySelector("#pwX").onclick = function () { o.remove(); };
  function go() { var pw = o.querySelector("#pwI").value; if (!pw) return; msg("…"); post({ action: "auth_login", id: id, pw: pw }).then(function (r) { if (r && r.ok) ok(r.tok || ""); else msg(PW_ERR[r && r.error] || "Could not log in."); }).catch(function () { msg("No internet?"); }); }
  o.querySelector("#pwGo").onclick = go; o.querySelector("#pwI").addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  googleBtn(o.querySelector("#pwG"), function (cred) { post({ action: "auth_google", cred: cred }).then(function (r) { if (!r || !r.ok) msg(PW_ERR[r && r.error] || "Could not log in."); else { if (r.tok) ls("askTok:" + r.id, r.tok); G = { cred: cred, id: r.id, t: Date.now() }; o.remove(); if (r.id === id) done(); else setId(r.id, "google"); } }).catch(function () { msg("No internet?"); }); }, function (e) { msg(PW_ERR[e]); });
  setTimeout(function () { try { o.querySelector("#pwI").focus(); } catch (e) {} }, 40);
}
function googleLogin() {   // log in with the university Google account: the ID comes from the email (12345678@uap-bd.edu), nothing to type
  var o = pwOverlay('<b>🎓 Log in with Google</b><p>Use your university email (<i>ID@' + UNI + '</i>). Your ID is taken from the email, so there is nothing to type, and no password is needed.</p><div class="pwm" id="pwM"></div><div id="pwG"></div><button type="button" class="alt" id="pwX">Cancel</button>');
  function msg(t) { o.querySelector("#pwM").textContent = t; }
  o.querySelector("#pwX").onclick = function () { o.remove(); };
  googleBtn(o.querySelector("#pwG"), function (cred) { post({ action: "auth_google", cred: cred }).then(function (r) { if (!r || !r.ok) { msg(PW_ERR[r && r.error] || "Could not log in."); return; } if (r.tok) ls("askTok:" + r.id, r.tok); G = { cred: cred, id: r.id, t: Date.now() }; o.remove(); setId(r.id, "google"); }).catch(function () { msg("No internet?"); }); }, function (e) { msg(PW_ERR[e]); });
}
function pwPanel(mode) {   // mode: "add" | "change" | "remove"
  var T = { add: "🔐 Add a password", change: "🔑 Replace password", remove: "🗑 Remove password" };
  var txt = mode === "remove" ? "To remove it, confirm with your <b>university (institutional) email</b> (ID@" + UNI + ") using Google, or tap Yes if this device is already logged in. After this, your ID works without a password again." : "<b>Step 1:</b> tap “Continue with Google” and choose your <b>university (institutional) email</b>, <i>ID@" + UNI + "</i>. A personal Gmail will not work.<br><b>Step 2:</b> choose your password. Next time you can log in with the password, or with Google. You can replace or remove it any time.";
  var o = pwOverlay('<b>' + T[mode] + '</b><p>' + txt + '</p><div class="pwm" id="pwM"></div><div id="pwA"></div><button type="button" class="alt" id="pwX">Close</button>');
  function msg(t) { o.querySelector("#pwM").textContent = t; }
  function A() { return o.querySelector("#pwA"); }
  o.querySelector("#pwX").onclick = function () { o.remove(); };
  function viaGoogle(next) { if (G && Date.now() - G.t < 2700000) { next(G.cred, G.id); return; } A().innerHTML = '<div id="pwG"></div>'; googleBtn(o.querySelector("#pwG"), function (cred) { post({ action: "auth_google", cred: cred }).then(function (r) { if (!r || !r.ok) msg(PW_ERR[r && r.error] || "Google sign-in failed."); else { G = { cred: cred, id: r.id, t: Date.now() }; next(cred, r.id); } }).catch(function () { msg("No internet?"); }); }, function (e) { msg(PW_ERR[e]); }); }
  if (mode === "remove") {
    var id = getId();
    function done(i) { ls("askTok:" + i, null); A().innerHTML = ""; msg("✅ Password removed."); }
    function viaG() { msg("Confirm with Google, using your university email (ID@" + UNI + "):"); viaGoogle(function (cred, gid) { post({ action: "auth_remove", cred: cred }).then(function (x) { if (x && x.ok) done(gid); else { if (x && x.error === "token") G = null; msg(PW_ERR[x && x.error] || "Could not remove it."); } }); }); }
    if (id && tokOf(id)) {
      A().innerHTML = '<button type="button" id="pwYes">Yes, remove my password</button>';
      o.querySelector("#pwYes").onclick = function () { post({ action: "auth_remove", id: id, tok: tokOf(id) }).then(function (r) { if (r && r.ok) done(id); else viaG(); }).catch(function () { msg("No internet?"); }); };
    } else viaG();
    return;
  }
  viaGoogle(function (cred, gid) {   // Google confirmed who it is: now the new password
    A().innerHTML = '<input type="password" id="pwN1" placeholder="New password (6+ characters)" autocomplete="new-password"><input type="password" id="pwN2" placeholder="Type it again" autocomplete="new-password"><button type="button" id="pwSv">Save password</button>'; msg("✅ Google confirmed ID " + gid + ". Choose a password.");
    o.querySelector("#pwSv").onclick = function () {
      var a = o.querySelector("#pwN1").value, b = o.querySelector("#pwN2").value; if (a !== b) { msg("The two passwords are different."); return; } if (a.length < 6) { msg(PW_ERR.short); return; }
      post({ action: "auth_set", cred: cred, pw: a }).then(function (s) { if (s && s.ok) { ls("askTok:" + s.id, s.tok || ""); if (s.id !== getId()) setId(s.id, "google"); A().innerHTML = ""; msg("✅ Password saved for ID " + s.id + ". You can remove it any time."); } else { if (s && s.error === "token") G = null; msg(PW_ERR[s && s.error] || "Could not save (the Google sign-in may have expired: try again)."); } }).catch(function () { msg("No internet?"); });
    };
  });
}
function paintPw(box) {   // the password buttons in the profile say exactly what they do
  var row = box.querySelector("#kpPwRow"); if (!row) return; var id = getId();
  if (!id) { row.innerHTML = ""; row.dataset.id = ""; return; }
  if (row.dataset.id === id && row.dataset.on !== undefined) return;
  row.dataset.id = id; row.dataset.on = ""; delete row.dataset.on; row.innerHTML = '<span style="font-size:11.5px;opacity:.7">…</span>';
  api({ auth: 1, id: id }).then(function (st) {
    var on = !!(st && st.protected); row.dataset.on = on ? "1" : "0";
    row.innerHTML = on ? '<button type="button" class="alt" id="kpChg">🔑 Replace password</button><button type="button" class="alt" id="kpRm">🗑 Remove password</button>' : '<button type="button" class="alt" id="kpAdd">🔐 Add a password</button>';
    var b; if ((b = row.querySelector("#kpAdd"))) b.onclick = function () { box.remove(); pwPanel("add"); };
    if ((b = row.querySelector("#kpChg"))) b.onclick = function () { box.remove(); pwPanel("change"); };
    if ((b = row.querySelector("#kpRm"))) b.onclick = function () { box.remove(); pwPanel("remove"); };
  }).catch(function () { row.innerHTML = ""; });
}

// SECRET admin list: tap the "Orders to print" title 5 times fast (admin page, uses the PIN already entered)
function pwAdmin() {
  var pin = ""; try { pin = sessionStorage.getItem("pin") || ""; } catch (e) {} if (!pin) return;
  var o = pwOverlay('<b>🔐 Password users</b><div class="pwm" id="pwM">Loading…</div><div id="pwL" style="font-size:12.5px"></div><button type="button" class="alt" id="pwX">Close</button>');
  o.querySelector("#pwX").onclick = function () { o.remove(); };
  function E(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  api({ pwlist: 1, pin: pin }).then(function (r) {
    if (!r || !r.ok) { o.querySelector("#pwM").textContent = "Not allowed (admin PIN only)."; return; }
    o.querySelector("#pwM").textContent = "Active now: " + r.active.length + " · times added: " + r.added + " · changed: " + r.changed + " · removed: " + r.removed;
    o.querySelector("#pwL").innerHTML = "<b>Active</b>" + (r.active.map(function (x) { return "<div>" + E(x.id) + " " + E(x.name) + " <i>" + E(x.on) + "</i></div>"; }).join("") || "<div>none</div>") +
      "<b style='display:block;margin-top:8px'>History (latest first)</b>" + (r.log.map(function (x) { return "<div>" + E(x.t) + " · " + E(x.id) + " " + E(x.name) + " · <b>" + E(x.act) + "</b></div>"; }).join("") || "<div>none yet</div>");
  }).catch(function () { o.querySelector("#pwM").textContent = "No internet?"; });
}
(function () { var h = document.querySelector("#admin h1"), n = 0, t = 0; if (!h) return; h.addEventListener("click", function () { var w = Date.now(); n = w - t < 1500 ? n + 1 : 1; t = w; if (n >= 5) { n = 0; pwAdmin(); } }); })();

window.__auth = { idGate: idGate, googleLogin: googleLogin, pwPanel: pwPanel, paintPw: paintPw };
})();