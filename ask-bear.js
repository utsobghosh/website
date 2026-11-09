/* ask-bear.js : the website PROFILE (student ID + picture), the "Ask AI" chat with the bear (Gemini Live), and the saving of chat / quiz answers.
   Loaded by index.html AFTER kawaii-extras.js. Needs: SCRIPT_URL and STUDENTS (index.html), window.__gem (kawaii-extras.js).
   Chat and quiz answers are saved in the Google Sheet (tabs "Chats" and "QuizLog") by the Apps Script (Code-additions.gs).
   - PROFILE: round picture at the top-right of the page. The ID is remembered from the last visit; tap the picture to change it. No ID = the website simply works as before.
   - ID known + "Save my chat"  -> chat lives in the sheet (last 500 messages per student; the latest 30 load first, older ones on demand)
   - no ID + "Save my chat"     -> chat lives only in this browser (last 500)
   - "Don't save my chat"       -> nothing is stored anywhere
   - quiz answers are saved ONLY when the profile has an ID. The ID typed on the cover page maker is never used here.
   The chat window can be moved (drag the top bar) and resized from every side / corner; it follows the website theme colours. */
(function () {
"use strict";
var ASK_PHOTO_URL = "";   // optional: direct picture link with {id} in it, e.g. "https://example.edu/photos/{id}.jpg". Leave "" to let Apps Script fetch the picture (PHOTO_URL in Code-additions.gs).
var KEEP = 500, PAGE = 30, HIST_TURNS = 8, MINW = 220, MINH = 190;
var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function $(i) { return document.getElementById(i); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
var URL_ = (typeof SCRIPT_URL !== "undefined") ? SCRIPT_URL : "";
function nowT() { var d = new Date(), h = d.getHours(), m = d.getMinutes(); return d.getDate() + " " + MON[d.getMonth()] + ", " + ((h + 11) % 12 + 1) + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "AM" : "PM"); }

// ---------- profile (the ID is remembered from the last visit) ----------
function getId() { var v = ls("askId") || ""; return /^\d{8}$/.test(v) ? v : ""; }
function setId(v) { ls("askId", v || null); setVerified(); document.dispatchEvent(new CustomEvent("askid")); }
function nameOf(id) { try { return (typeof STUDENTS !== "undefined" && STUDENTS[id]) || ""; } catch (e) { return ""; } }
window.__askId = getId;

// ---------- Apps Script ----------
function api(q) { return fetch(URL_ + "?" + Object.keys(q).map(function (k) { return k + "=" + encodeURIComponent(q[k]); }).join("&")).then(function (r) { return r.json(); }); }
function post(b) { return fetch(URL_, { method: "POST", body: JSON.stringify(b) }).then(function (r) { return r.json(); }); }

// ---------- profile picture: class picture if it can be fetched, otherwise a cute placeholder ----------
var phMem = {};
function photoFor(id) {
  if (phMem[id]) return phMem[id];
  var c = ls("askPh:" + id); if (c) return (phMem[id] = Promise.resolve(c));
  var no = false; try { no = !!sessionStorage.getItem("askNoPh:" + id); } catch (e) {}
  if (no || !URL_) return Promise.resolve("");
  return (phMem[id] = new Promise(function (res) {
    function viaScript() {
      api({ photo: id }).then(function (r) {
        if (r && r.ok && r.data) { if (r.data.length < 120000) ls("askPh:" + id, r.data); res(r.data); }
        else { try { sessionStorage.setItem("askNoPh:" + id, "1"); } catch (e) {} res(""); }
      }).catch(function () { res(""); });
    }
    if (ASK_PHOTO_URL) { var im = new Image(), u = ASK_PHOTO_URL.replace("{id}", id); im.onload = function () { res(u); }; im.onerror = viaScript; im.src = u; }
    else viaScript();
  }));
}
function paintAvatar(el, id, size) {
  if (!el) return;
  el.className = "ak-av"; el.style.width = el.style.height = size + "px"; el.style.fontSize = Math.round(size * .5) + "px"; el.removeAttribute("data-id"); el.innerHTML = ""; el.style.background = "";
  if (!id) { el.classList.add("g"); el.textContent = "🧸"; return; }   // no ID: teddy placeholder
  var nm = nameOf(id).replace(/^(Md\.|M\.)\s*/, ""), h = 0;
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  el.style.background = "linear-gradient(135deg,hsl(" + h + ",80%,80%),hsl(" + ((h + 50) % 360) + ",75%,70%))";
  el.textContent = nm ? nm.charAt(0).toUpperCase() : "🌸";   // ID but no picture: pastel circle with the first letter
  el.setAttribute("data-id", id);
  photoFor(id).then(function (u) {
    if (!u || el.getAttribute("data-id") !== id) return;
    var im = new Image(); im.alt = ""; im.onload = function () { if (el.getAttribute("data-id") === id) { el.textContent = ""; el.appendChild(im); } }; im.src = u;
  });
}

// ---------- Gemini: the SAME request the bear's messages and quiz already use (one user turn, the answer is read from the transcript, no sound is played) ----------
var SYS = "You are Teddy, a friendly kawaii teddy bear AI assistant on a student's notes website (a 2nd-year CSE class at a university). The student can ask you ANYTHING: studies, coding, maths, writing, advice, ideas or just curious questions. Answer correctly, clearly and in a short friendly way; use simple steps when it helps. Plain text only: no markdown headings or tables (short '-' lists and **bold** are fine). Reply in the language the student writes (English, Bangla or mixed). If you are not sure, say so.";
function buildPrompt(hist, text, note) {
  var t = SYS + (note ? "\n(Background only, ignore it if the question is about something else: the student currently has " + note + " open.)" : "");
  if (hist.length) t += "\n\nConversation so far:\n" + hist.map(function (m) { return (m.role === "user" ? "Student: " : "Teddy: ") + String(m.text).slice(0, 1000); }).join("\n");
  return t + "\n\nStudent: " + text + "\nTeddy:";
}
async function gemini(hist, text, note) {
  if (window.__askMock) return window.__askMock(hist, text, note);
  var g = (window.__gem && window.__gem()) || {}, key = g.k;
  if (!key && g.u) key = (await (await fetch(g.u)).text()).trim();
  if (!key) throw new Error("no Gemini key");
  var prompt = buildPrompt(hist, text, note);
  return new Promise(function (ok, bad) {
    var txt = "", done = false, ws, to;
    function fin(v, err) { if (done) return; done = true; clearTimeout(to); try { ws.close(); } catch (e) {} if (v) ok(v); else { console.warn("Ask AI failed:", err && err.message); bad(err || new Error("no reply")); } }
    try { ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" + key); } catch (e) { return bad(e); }
    to = setTimeout(function () { fin(txt.trim() || null, new Error("timeout (60 s)")); }, 60000);
    ws.onopen = function () { ws.send(JSON.stringify({ setup: { model: g.m || "models/gemini-3.8-live", generationConfig: { responseModalities: ["AUDIO"] }, outputAudioTranscription: {} } })); };
    ws.onmessage = async function (ev) {
      var d = ev.data; if (d instanceof Blob) d = await d.text(); var m; try { m = JSON.parse(d); } catch (e) { return; }
      if (m.error) { fin(null, new Error((m.error.message || JSON.stringify(m.error)).slice(0, 120))); return; }
      if (m.setupComplete) ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: prompt }] }], turnComplete: true } }));
      var sc = m.serverContent; if (!sc) return;
      if (sc.outputTranscription && sc.outputTranscription.text) txt += sc.outputTranscription.text;
      if (sc.modelTurn && sc.modelTurn.parts) sc.modelTurn.parts.forEach(function (p) { if (p.text) txt += p.text; });
      if (sc.turnComplete) fin(txt.trim() || null, new Error("empty answer"));
    };
    ws.onerror = function () { fin(txt.trim() || null, new Error("connection error")); };
    ws.onclose = function (ev) { fin(txt.trim() || null, new Error("closed " + ev.code + (ev.reason ? " " + ev.reason.slice(0, 80) : ""))); };
  });
}

// ---------- look (all colours come from the website theme variables, so the chat follows the theme and dark mode) ----------
var CSS = [
  // "Ask AI" button next to the bear: a raised pill like the site's other buttons, with a little tail pointing at the bear
  ".kask{position:absolute;left:-46px;top:30px;height:19px;padding:0 7px;border:1.5px solid #fff;border-radius:10px;background:var(--accent,#8a4dff);color:var(--onacc,#fff);font:800 9.5px/1 system-ui,-apple-system,sans-serif;letter-spacing:.2px;white-space:nowrap;display:flex;align-items:center;gap:2px;cursor:pointer;box-shadow:0 2px 0 var(--accentD,#5b3fb0),0 3px 6px var(--shadow,rgba(80,40,160,.35));touch-action:manipulation;-webkit-tap-highlight-color:transparent;animation:kaskp 5s ease-in-out infinite}",
  ".kask:before{content:'';position:absolute;right:-4px;bottom:2px;width:7px;height:7px;background:inherit;border-right:1.5px solid #fff;border-bottom:1.5px solid #fff;transform:rotate(-45deg) skew(8deg,8deg);border-radius:0 0 3px 0}",
  ".kask.kr{left:auto;right:-46px}.kask.kr:before{display:none}.kask:after{content:'';position:absolute;inset:-8px}.kask:active{transform:translateY(1px);box-shadow:0 1px 0 var(--accentD,#5b3fb0)}@keyframes kaskp{0%,86%,100%{transform:scale(1)}92%{transform:scale(1.1) rotate(-4deg)}}",
  ".askb{pointer-events:auto;cursor:pointer;height:18px;padding:0 7px;border:1.5px solid #fff;border-radius:10px;background:var(--accent,#8a4dff);color:var(--onacc,#fff);font:800 9.5px/1 system-ui,-apple-system,sans-serif;white-space:nowrap;display:flex;align-items:center;box-shadow:0 2px 0 var(--accentD,#5b3fb0),0 3px 7px rgba(0,0,0,.3);-webkit-tap-highlight-color:transparent;flex:none}.askb:after{content:'';position:absolute;inset:-6px}.askb:active{transform:translateY(2px);box-shadow:none}",
  // profile
  "#kProf{position:fixed;top:10px;right:10px;z-index:60;width:36px;height:36px;padding:0;border-radius:50%;border:2px solid var(--line);background:var(--panel);cursor:pointer;box-shadow:0 2px 8px var(--shadow);display:flex;align-items:center;justify-content:center;overflow:hidden}body.night #kProf{right:84px}#kProf .ak-av{width:100%!important;height:100%!important}",
  ".kpbox{z-index:10006;width:min(270px,calc(100vw - 20px));box-sizing:border-box;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--panel);color:var(--text);box-shadow:0 8px 24px var(--shadow,rgba(0,0,0,.3));font:13px/1.35 system-ui,-apple-system,sans-serif}.kpbox.fx{position:fixed;top:52px;right:10px}.kpbox.ab{position:absolute;top:46px;left:8px;z-index:9}",
  ".kpbox .kp-top{display:flex;align-items:center;gap:10px;margin-bottom:9px}.kpbox .kp-top div{min-width:0}.kpbox b{display:block;font-size:14px}.kpbox small{display:block;color:var(--muted);font-size:11.5px}",
  ".kpbox input{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:15px;letter-spacing:1px;background:var(--panel);color:var(--text);outline:0}.kpbox input:focus{border-color:var(--accent)}",
  ".kpbox .ak-n{min-height:15px;font-size:11.5px;margin:4px 0 0;color:var(--muted)}.kpbox .kp-row{display:flex;gap:6px;margin-top:8px}.kpbox .kp-row button{border:0;border-radius:10px;padding:7px 12px;font:inherit;font-size:12.5px;cursor:pointer;background:var(--accent);color:var(--onacc)}.kpbox .kp-row button.alt{background:transparent;color:var(--text);border:1px solid var(--line)}",
  "#askWin button,.kpbox button{margin:0;box-shadow:none;transform:none;font-family:inherit}",
  ".ak-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;color:#3b2f45;font-weight:700;flex:none;vertical-align:middle}.ak-av.g{background:var(--line,#e6dcf5)}.ak-av img{width:100%;height:100%;object-fit:cover}",
  // quiz ID line
  ".kqid{margin-top:7px;font-size:11px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.kqid input{flex:1;min-width:120px;box-sizing:border-box;padding:5px 8px;border:1.5px solid var(--line,#c9b8f0);border-radius:9px;font:inherit;font-size:12px;background:var(--panel,#fff);color:var(--text,#3b2f45);outline:0}.kqid .ed{cursor:pointer;opacity:.85;text-decoration:underline}",
  // chat window: outer box carries the resize handles, .ak-in is the rounded body
  "#askWin{position:fixed;left:0;top:0;width:320px;height:420px;z-index:10004;color:var(--text,#3b2f45);font:13px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif}#askWin.hidden{display:none}",
  ".ak-in{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--panel,#fff);border:1px solid var(--line);border-radius:16px;box-shadow:0 10px 34px var(--shadow,rgba(60,30,90,.4)),0 2px 8px rgba(0,0,0,.18);overflow:hidden}",
  ".ak-rz{position:absolute;z-index:8;touch-action:none}.ak-rz[data-d=n]{top:-9px;left:16px;right:16px;height:18px;cursor:ns-resize}.ak-rz[data-d=s]{bottom:-9px;left:16px;right:16px;height:18px;cursor:ns-resize}.ak-rz[data-d=e]{right:-9px;top:16px;bottom:16px;width:18px;cursor:ew-resize}.ak-rz[data-d=w]{left:-9px;top:16px;bottom:16px;width:18px;cursor:ew-resize}",
  ".ak-rz[data-d=ne]{top:-9px;right:-9px;width:26px;height:26px;cursor:nesw-resize}.ak-rz[data-d=nw]{top:-9px;left:-9px;width:26px;height:26px;cursor:nwse-resize}.ak-rz[data-d=se]{bottom:-9px;right:-9px;width:26px;height:26px;cursor:nwse-resize}.ak-rz[data-d=sw]{bottom:-9px;left:-9px;width:26px;height:26px;cursor:nesw-resize}",
  ".ak-h:before{content:'';position:absolute;top:3px;left:50%;width:36px;height:4px;margin-left:-18px;border-radius:3px;background:currentColor;opacity:.4;pointer-events:none}",
  ".ak-rz:after{content:'';position:absolute;background:var(--accent);box-shadow:0 0 0 1.5px #fff,0 1px 4px rgba(0,0,0,.35);pointer-events:none;opacity:.92}",
  ".ak-rz[data-d=n]:after,.ak-rz[data-d=s]:after{left:50%;top:6px;width:30px;height:6px;margin-left:-15px;border-radius:3px}.ak-rz[data-d=e]:after,.ak-rz[data-d=w]:after{top:50%;left:6px;width:6px;height:30px;margin-top:-15px;border-radius:3px}",
  ".ak-rz[data-d=ne]:after,.ak-rz[data-d=nw]:after,.ak-rz[data-d=se]:after,.ak-rz[data-d=sw]:after{width:12px;height:12px;border-radius:50%}.ak-rz[data-d=nw]:after{left:3px;top:3px}.ak-rz[data-d=ne]:after{right:3px;top:3px}.ak-rz[data-d=sw]:after{left:3px;bottom:3px}.ak-rz[data-d=se]:after{right:3px;bottom:3px}",
  ".ak-stat{flex:none;padding:3px 10px;font-size:10.5px;color:var(--muted);background:var(--panel);border-top:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ak-stat.on{color:var(--ok,#1f8a54);font-weight:600}.ak-stat u{cursor:pointer;margin-left:4px;color:var(--text);font-weight:400}",
  ".ak-hint{align-self:stretch;background:var(--panel);border:1px dashed var(--accent);border-radius:11px;padding:6px 26px 6px 9px;font-size:11px;color:var(--text);position:relative}.ak-hint span{position:absolute;right:8px;top:5px;cursor:pointer;opacity:.7}",
  ".ak-pop .kp-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}.ak-pop .kp-top b{font-size:13.5px;margin:0}.ak-pop .kp-top small{display:block}.ak-pc{position:absolute;right:10px;top:7px;cursor:pointer;opacity:.6}.ak-row button.sel{box-shadow:0 0 0 2px var(--accent);font-weight:700}",
  "#kqLog{margin-top:12px;border-top:1px dashed var(--line);padding-top:10px;color:var(--text)}#kqLog .ql-h b{display:block;font-size:13.5px}#kqLog .ql-h small{color:var(--muted);font-size:11px}#kqLog .ql-e{font-size:12px;color:var(--muted);padding:8px 0}",
  ".ql-i{border:1px solid var(--line);border-radius:11px;padding:6px 9px;margin-top:6px;background:var(--panel)}.ql-i summary{font-size:12.5px;cursor:pointer;line-height:1.3}.ql-i summary small{display:block;color:var(--muted);font-size:10.5px}.ql-o{font-size:12px;padding:2px 0 2px 4px}.ql-o b{display:inline-block;width:16px}.ql-o.ok{color:var(--ok,#1f8a54);font-weight:600}.ql-o.bad{color:#d33;font-weight:600}",
  "#kqLog button.ql-m{margin:8px 0 0;border:0;border-radius:11px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer;background:var(--line);color:var(--text);box-shadow:none}",
  ".ak-h{position:relative;display:flex;align-items:center;gap:6px;padding:7px 8px;background:var(--accent);color:var(--onacc,#fff);flex:none;cursor:move;touch-action:none;user-select:none;-webkit-user-select:none}.ak-h .ak-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15}.ak-h b{font-size:13px}.ak-h small{font-size:10.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".ak-pf,.ak-ib{border:0;background:rgba(255,255,255,.28);border-radius:50%;width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;color:inherit;flex:none}.ak-pf{background:none;width:30px;height:30px}",
  ".ak-m{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:5px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:var(--bg,#fbf9ff)}",
  ".ak-b{max-width:88%;padding:5px 9px 3px;border-radius:13px;word-wrap:break-word;overflow-wrap:anywhere}.ak-b.u{align-self:flex-end;background:var(--accent);color:var(--onacc,#fff);border-bottom-right-radius:4px}.ak-b.b{align-self:flex-start;background:var(--panel,#fff);color:var(--text);border:1px solid var(--line);border-bottom-left-radius:4px}",
  ".ak-x{font-size:12.5px;line-height:1.38}.ak-b i{display:block;text-align:right;font-style:normal;font-size:9.5px;opacity:.6;margin-top:1px}",
  ".ak-old,.ak-retry{align-self:center;border:0;background:var(--line);color:var(--text);border-radius:12px;padding:4px 12px;font:inherit;font-size:11.5px;cursor:pointer}.ak-st{align-self:center;font-size:11px;color:var(--muted);padding:2px 6px;text-align:center}",
  ".ak-typ{align-self:flex-start;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:13px;padding:6px 11px;font-size:12px}.ak-typ span{display:inline-block;animation:akd 1.2s infinite}.ak-typ span:nth-child(2){animation-delay:.2s}.ak-typ span:nth-child(3){animation-delay:.4s}@keyframes akd{0%,60%,100%{opacity:.25}30%{opacity:1}}",
  ".ak-f{display:flex;gap:6px;padding:7px;background:var(--panel);border-top:1px solid var(--line);flex:none}.ak-f textarea{flex:1;resize:none;border:1.5px solid var(--line);border-radius:14px;padding:7px 10px;font:inherit;font-size:13px;max-height:84px;outline:0;background:var(--panel);color:var(--text)}.ak-f textarea:focus{border-color:var(--accent)}.ak-f textarea:disabled{opacity:.6}",
  ".ak-f button{border:0;border-radius:50%;width:34px;height:34px;flex:none;background:var(--accent);color:var(--onacc,#fff);font-size:15px;cursor:pointer;align-self:flex-end}.ak-f button:disabled{opacity:.45}",
  ".ak-pop{position:absolute;left:8px;right:8px;top:48px;z-index:5;background:var(--panel);color:var(--text);border:2px solid var(--accent);border-radius:14px;padding:9px 10px;box-shadow:0 8px 22px var(--shadow,rgba(60,30,90,.3));font-size:12px}.ak-pop.hidden{display:none}.ak-pop b{display:block;font-size:13px;margin-bottom:2px}.ak-pop small{color:var(--muted)}",
  ".ak-row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.ak-row button{border:0;border-radius:11px;padding:7px 11px;font:inherit;font-size:12px;cursor:pointer;background:var(--accent);color:var(--onacc,#fff)}.ak-row button.alt{background:transparent;color:var(--text);border:1px solid var(--line)}"
].join("");
var stEl = document.createElement("style"); stEl.textContent = CSS; document.head.appendChild(stEl);

// ---------- profile icon (top-right of the page) + small profile box ----------
function host() { return document.fullscreenElement || document.body; }   // inside the PDF viewer's full screen, windows must live INSIDE the full-screen element or they stay hidden
function closeProfile() { var b = document.querySelector(".kpbox"); if (b) b.remove(); }
function showProfile(parent, cls) {
  var had = document.querySelector(".kpbox"); if (had) { var same = had.parentNode === parent; had.remove(); if (same) return; }
  var id = getId(), box = document.createElement("div"); box.className = "kpbox " + cls;
  box.innerHTML = '<div class="kp-top"><span id="kpAv"></span><div><b id="kpName"></b><small id="kpSub"></small></div></div><input id="kpId" inputmode="numeric" maxlength="8" placeholder="Your 8-digit ID" value="' + esc(id) + '" autocomplete="off"><div class="ak-n" id="kpN"></div><div class="kp-row"><button type="button" id="kpSave">Save</button><button type="button" class="alt" id="kpClear">Remove ID</button></div>';
  parent.appendChild(box);
  var inp = box.querySelector("#kpId"), note = box.querySelector("#kpN");
  function top() { var cur = getId(); paintAvatar(box.querySelector("#kpAv"), cur, 44); box.querySelector("#kpName").textContent = cur ? (nameOf(cur) || "ID " + cur) : "Guest"; box.querySelector("#kpSub").textContent = cur ? "ID " + cur + " · remembered on this device" : "Add your ID to save your chat and quiz answers"; }
  function hint() { var v = inp.value.replace(/\D/g, ""); inp.value = v; note.textContent = /^\d{8}$/.test(v) ? (nameOf(v) ? "👋 Hi, " + nameOf(v) + "!" : "Not in the class list, but that is fine 🙂") : (v ? "The ID has 8 digits" : ""); }
  function save() { var v = inp.value.replace(/\D/g, ""); if (!v) { setId(""); box.remove(); return; } if (!/^\d{8}$/.test(v)) { note.textContent = "Please type your 8-digit ID"; return; } setId(v); box.remove(); }
  inp.addEventListener("input", hint); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save(); } });
  box.querySelector("#kpSave").onclick = save; box.querySelector("#kpClear").onclick = function () { setId(""); box.remove(); };
  top(); hint(); setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 40);
}
document.addEventListener("pointerdown", function (e) { var b = document.querySelector(".kpbox"); if (b && !(e.target.closest && (e.target.closest(".kpbox") || e.target.closest("#kProf") || e.target.closest("#akPf") || e.target.closest(".kqid")))) b.remove(); });
function addProfileIcon() {
  if ($("kProf")) return; var b = document.createElement("button"); b.type = "button"; b.id = "kProf"; b.title = "Profile"; b.setAttribute("aria-label", "Profile"); b.innerHTML = '<span id="kProfAv"></span>';
  b.onclick = function () { showProfile(host(), "fx"); }; document.body.appendChild(b); paintAvatar($("kProfAv"), getId(), 32);
}
document.addEventListener("askid", function () { paintAvatar($("kProfAv"), getId(), 32); paintHeader(); if (win && !win.classList.contains("hidden")) { var pp = $("akPop"); if (pp) pp.classList.add("hidden"); loadedOnce = false; loadFirst(); if (ls("askSave") === null) showSavePop(); else paintStat(); } try { qlFetch(); } catch (e) {} var qs = document.querySelectorAll(".kqid"); for (var i = 0; i < qs.length; i++) if (qs[i].__draw) qs[i].__draw(); });

// ---------- chat window ----------
var win = null, msgs = [], more = false, cursor = 0, pending = false, loadedOnce = false, busyOld = false, G = null;
function gKey() { return "askChat:guest"; }
function gGet() { try { return JSON.parse(ls(gKey()) || "[]"); } catch (e) { return []; } }
function gSet(a) { ls(gKey(), JSON.stringify(a.slice(-KEEP))); }
function ctxNote() {
  try {
    var c = window.__notesCtx && window.__notesCtx();
    if (c && c.viewer) { var pg = $("nvPg"); return 'the note "' + (c.label || "") + '"' + (pg && pg.textContent ? " (page " + pg.textContent + ")" : ""); }
    if (c && c.label) return 'the "' + c.label + '" notes list';
  } catch (e) {}
  return "";
}
function fmt(s) { return esc(s).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); }
function bubble(m) { return '<div class="ak-b ' + (m.role === "user" ? "u" : "b") + '"><div class="ak-x">' + fmt(m.text) + "</div><i>" + esc(m.t || "") + "</i></div>"; }
function M() { return $("akM"); }
function greet() { return '<div class="ak-st">🧸 Hi! Ask me anything: notes, code, maths, or just something you are curious about.</div>'; }

// window position / size: drag the top bar, resize from any side or corner; remembered
function vp() { var v = window.visualViewport; return { w: v ? v.width : innerWidth, h: v ? v.height : innerHeight, x: v ? v.offsetLeft : 0, y: v ? v.offsetTop : 0 }; }
function defGeo() { var v = vp(), w = Math.min(330, v.w - 16), h = Math.min(430, Math.round(v.h * .7)); return { x: v.w - w - 8, y: v.h - h - 8, w: w, h: h }; }
function loadGeo() { try { G = JSON.parse(ls("askGeo") || "null"); } catch (e) { G = null; } if (!G || !(G.w > 0) || !(G.h > 0)) G = defGeo(); }
function applyGeo() {   // the saved geometry is clamped to what is visible now (a phone keyboard makes the window shrink / move up, and it comes back when the keyboard closes)
  if (!win || !G) return; var v = vp(), w = Math.max(Math.min(MINW, v.w - 8), Math.min(G.w, v.w - 8)), h = Math.max(Math.min(MINH, v.h - 8), Math.min(G.h, v.h - 8));
  var x = Math.max(v.x + 4, Math.min(G.x, v.x + v.w - w - 4)), y = Math.max(v.y + 4, Math.min(G.y, v.y + v.h - h - 4));
  win.style.left = Math.round(x) + "px"; win.style.top = Math.round(y) + "px"; win.style.width = Math.round(w) + "px"; win.style.height = Math.round(h) + "px";
}
function saveGeo() { ls("askGeo", JSON.stringify(G)); }
function gesture(el, onStart, onMove) {
  el.addEventListener("pointerdown", function (e) {
    if (e.button > 0 || (el.className.indexOf("ak-h") > -1 && e.target.closest && e.target.closest("button"))) return;
    var r = win.getBoundingClientRect(), s = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height }, id = e.pointerId; onStart && onStart(); e.preventDefault();
    try { el.setPointerCapture(id); } catch (x) {}
    function mv(ev) { if (ev.pointerId !== id) return; onMove(ev.clientX - s.px, ev.clientY - s.py, s); applyGeo(); }
    function up(ev) { if (ev.pointerId !== id) return; el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); saveGeo(); }
    el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
}
function wireGeo() {
  gesture(win.querySelector(".ak-h"), null, function (dx, dy, s) { G.x = s.x + dx; G.y = s.y + dy; G.w = s.w; G.h = s.h; });
  Array.prototype.forEach.call(win.querySelectorAll(".ak-rz"), function (h) {
    var d = h.getAttribute("data-d");
    gesture(h, null, function (dx, dy, s) {
      var x = s.x, y = s.y, w = s.w, hh = s.h, v = vp();
      if (d.indexOf("e") > -1) w = Math.min(s.w + dx, v.x + v.w - s.x - 4);
      if (d.indexOf("s") > -1) hh = Math.min(s.h + dy, v.y + v.h - s.y - 4);
      if (d.indexOf("w") > -1) { w = Math.min(s.w - dx, s.x + s.w - v.x - 4); x = s.x + s.w - Math.max(MINW, w); }
      if (d.indexOf("n") > -1) { hh = Math.min(s.h - dy, s.y + s.h - v.y - 4); y = s.y + s.h - Math.max(MINH, hh); }
      G.x = x; G.y = y; G.w = Math.max(MINW, w); G.h = Math.max(MINH, hh);
    });
  });
}

function build() {
  if (win) return;
  win = document.createElement("div"); win.id = "askWin"; win.className = "hidden"; win.setAttribute("role", "dialog"); win.setAttribute("aria-label", "Ask AI");
  win.innerHTML = '<div class="ak-in"><div class="ak-h" title="Drag to move"><button type="button" class="ak-pf" id="akPf" title="Your profile"><span id="akAv"></span></button><div class="ak-t"><b>Ask AI 🧸</b><small id="akWho"></small></div><button type="button" class="ak-ib" id="akCl" title="Delete my saved chat">🗑</button><button type="button" class="ak-ib" id="akX" title="Close">✕</button></div>' +
    '<div class="ak-m" id="akM"></div><div class="ak-pop hidden" id="akPop"></div>' +
    '<div class="ak-stat" id="akStat"></div><div class="ak-f" id="akF"><textarea id="akIn" rows="1" maxlength="1500" placeholder="Ask me anything…" enterkeyhint="send"></textarea><button type="button" id="akSend" title="Send">➤</button></div></div>' +
    ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map(function (d) { return '<div class="ak-rz" data-d="' + d + '"></div>'; }).join("");
  host().appendChild(win); loadGeo(); applyGeo(); wireGeo();
  $("akX").onclick = closeAsk;
  $("akPf").onclick = function () { showProfile(win.querySelector(".ak-in"), "ab"); };
  $("akCl").onclick = clearChat;
  $("akSend").onclick = send;
  var inp = $("akIn");
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  inp.addEventListener("input", function () { inp.style.height = "auto"; inp.style.height = Math.min(84, inp.scrollHeight) + "px"; });
  M().addEventListener("scroll", function () { if (M().scrollTop < 30 && more && !busyOld) loadOlder(); }, { passive: true });
  $("akPop").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("button[data-s]"); if (b) setSave(b.getAttribute("data-s")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && win && !win.classList.contains("hidden")) closeAsk(); });
  document.addEventListener("fullscreenchange", function () { if (win && win.parentNode !== host()) host().appendChild(win); });
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", applyGeo); window.visualViewport.addEventListener("scroll", applyGeo); }
  window.addEventListener("resize", applyGeo);
}
function paintHeader() {
  if (!win) return; var id = getId(), nm = nameOf(id);
  paintAvatar($("akAv"), id, 28);
  $("akWho").textContent = id ? (nm ? nm + " · " + id : "ID " + id) : "Guest · tap picture to add ID";
  paintStat();
}
window.__askOpen = function () {
  build(); if (win.parentNode !== host()) host().appendChild(win);
  win.classList.remove("hidden"); applyGeo(); paintHeader();
  if (needVerify()) { render(); showVerify(); return; }   // first time this visit: the remembered ID is shown with a button to confirm it
  afterVerify();
};
// ---- "is this you?" (once per visit, only when the profile has an ID) ----
function verified() { try { return sessionStorage.getItem("askVerified") === "1"; } catch (e) { return true; } }
function setVerified() { try { sessionStorage.setItem("askVerified", "1"); } catch (e) {} }
function needVerify() { return !!getId() && !verified(); }
function showVerify() {
  var id = getId(), p = $("akPop"), nm = nameOf(id);
  p.innerHTML = '<div class="kp-top"><span id="akVAv"></span><div><b>Is this you?</b><small>' + esc(nm ? nm + " · " + id : "ID " + id) + '</small></div></div><div class="ak-row"><button type="button" id="akVOk">✓ Continue as ' + esc(id) + '</button><button type="button" class="alt" id="akVNo">✎ Change ID</button></div>';
  paintAvatar($("akVAv"), id, 40); p.classList.remove("hidden"); setInputOk(); paintStat();
  $("akVOk").onclick = function () { setVerified(); p.classList.add("hidden"); afterVerify(); };
  $("akVNo").onclick = function () { p.classList.add("hidden"); showProfile(win.querySelector(".ak-in"), "ab"); };
}
function afterVerify() {
  if (!loadedOnce) loadFirst(); else render(true);
  if (ls("askSave") === null) showSavePop(); else $("akPop").classList.add("hidden");
  paintStat();
  setTimeout(function () { if (ls("askSave") !== null && $("akIn")) { try { $("akIn").focus({ preventScroll: true }); } catch (e) {} } }, 60);
}
function closeAsk() { closeProfile(); if (win) win.classList.add("hidden"); }

// ---- "save this chat?" pop-up: sits at the TOP of the conversation window; the line above the input always says what is happening ----
function showSavePop() {
  var s = ls("askSave"), p = $("akPop");
  p.innerHTML = (s !== null ? '<span class="ak-pc" id="akPc" title="Close">✕</span>' : "") + "<b>💬 Save this chat?</b>Your chat gets saved (in the class sheet if you have an ID, otherwise only on this phone). Please don't talk about anything personal, or tap “Don't save my chat”." +
    '<div class="ak-row"><button type="button" data-s="1" class="' + (s === "1" ? "sel" : "") + '">' + (s === "1" ? "✓ " : "💾 ") + 'Save my chat</button><button type="button" data-s="0" class="alt ' + (s === "0" ? "sel" : "") + '">' + (s === "0" ? "✓ " : "🙈 ") + "Don't save my chat</button></div>";
  p.classList.remove("hidden"); var c = $("akPc"); if (c) c.onclick = function () { p.classList.add("hidden"); };
  setInputOk(); paintStat();
}
function setSave(v) {
  $("akPop").classList.add("hidden");
  if (ls("askSave") === v) { paintStat(); return; }
  ls("askSave", v); paintStat(); loadedOnce = false; loadFirst(); setTimeout(function () { try { $("akIn").focus({ preventScroll: true }); } catch (e) {} }, 60);
}
function paintStat() {
  var el = $("akStat"); if (!el) return; var s = ls("askSave"), id = getId(), t, c = "";
  if (needVerify()) t = "Confirm who you are above ☝️";
  else if (s === "1") { t = id ? "💾 Chat is saved to your ID " + id : "💾 Chat is saved on this phone only (no ID)"; c = "on"; }
  else if (s === "0") t = "🙈 This chat is NOT saved";
  else t = "Choose above: save this chat or not ☝️";
  el.className = "ak-stat " + c; el.innerHTML = esc(t) + (s !== null && !needVerify() ? " <u id=\"akChg\">change</u>" : "");
  var u = $("akChg"); if (u) u.onclick = showSavePop;
}
function setInputOk() {
  var nv = needVerify(), ok = ls("askSave") !== null && !nv; $("akIn").disabled = !ok;
  $("akIn").placeholder = nv ? "Confirm who you are above ☝️" : ok ? "Ask me anything…" : "Choose above first ☝️"; $("akSend").disabled = !ok || pending;
}

// ---- history ----
function render(bottom) {
  var m = M(); if (!m) return; setInputOk();
  m.innerHTML = hintHTML() + (more ? '<button type="button" class="ak-old" id="akOld">⬆ Load older</button>' : "") + (msgs.length || pending ? msgs.map(bubble).join("") : greet());
  var o = $("akOld"); if (o) o.onclick = loadOlder;
  var hx = $("akHintX"); if (hx) hx.onclick = function () { ls("askHint", "1"); var h = $("akHint"); if (h) h.remove(); };
  if (bottom) m.scrollTop = m.scrollHeight;
}
function hintHTML() { return ls("askHint") === "1" ? "" : '<div class="ak-hint" id="akHint">↔ Move this window by dragging the top bar. Resize it by dragging the round dots and bars on its edges (a finger works too).<span id="akHintX" title="Got it">✕</span></div>'; }
async function loadFirst() {
  loadedOnce = true; msgs = []; more = false; cursor = 0; render(); var id = getId(), m = M();
  if (ls("askSave") !== "1") return;
  if (id) {
    m.insertAdjacentHTML("afterbegin", '<div class="ak-st" id="akLd">Loading your chat…</div>');
    try { var r = await api({ chat: 1, id: id, limit: PAGE }); msgs = r.msgs || []; more = !!r.more; cursor = msgs.length ? msgs[0].r : 0; }
    catch (e) { render(); m.insertAdjacentHTML("afterbegin", '<div class="ak-st">Could not load the saved chat (offline?)</div>'); return; }
  } else { var a = gGet(); msgs = a.slice(-PAGE); more = a.length > msgs.length; }
  render(true);
}
async function loadOlder() {
  if (busyOld || !more) return; busyOld = true; var m = M(), h = m.scrollHeight, id = getId();
  try {
    if (id) { var r = await api({ chat: 1, id: id, limit: PAGE, before: cursor }), o = r.msgs || []; msgs = o.concat(msgs); more = !!r.more; if (o.length) cursor = o[0].r; }
    else { var a = gGet(), end = a.length - msgs.length, from = Math.max(0, end - PAGE); msgs = a.slice(from, end).concat(msgs); more = from > 0; }
    render(false); m.scrollTop = m.scrollHeight - h + m.scrollTop;
  } catch (e) {}
  busyOld = false;
}
function clearChat() {
  if (!confirm("Delete your saved chat? This cannot be undone.")) return;
  var id = getId(); if (id) post({ action: "chat_clear", id: id }).catch(function () {}); else ls(gKey(), null);
  msgs = []; more = false; cursor = 0; render();
}

// ---- sending ----
function append(m) { var x = M(); if (!x) return; var g = x.querySelector(".ak-st"); if (g && msgs.length <= 1) g.remove(); x.insertAdjacentHTML("beforeend", bubble(m)); x.scrollTop = x.scrollHeight; }
function typing(on) { var x = M(); if (!x) return; var t = $("akTyp"); if (!on) { if (t) t.remove(); return; } if (t) return; x.insertAdjacentHTML("beforeend", '<div class="ak-typ" id="akTyp">🧸 <span>•</span><span>•</span><span>•</span></div>'); x.scrollTop = x.scrollHeight; }
function persist(list, note) {
  if (ls("askSave") !== "1") return; var id = getId();
  var rows = list.map(function (m, i) { return { role: m.role, text: m.text, t: m.t, note: i === 0 ? note : "" }; });
  if (id) post({ action: "chat", id: id, msgs: rows }).then(function (r) { if (!r || !r.ok) throw 0; }).catch(function () { var x = M(); if (x) x.insertAdjacentHTML("beforeend", '<div class="ak-st">⚠️ Could not save this message (offline?)</div>'); });
  else gSet(gGet().concat(rows.map(function (r) { return { role: r.role, text: r.text, t: r.t }; })));
}
async function run(um, note, hist) {
  pending = true; setInputOk(); typing(true);
  try {
    var r = await gemini(hist, um.text, note), bm = { role: "bear", text: r, t: nowT() };
    typing(false); msgs.push(bm); append(bm); persist([um, bm], note);
  } catch (e) {
    typing(false); var x = M();
    if (x) { x.insertAdjacentHTML("beforeend", '<div class="ak-st" id="akErr">🥲 No answer (' + esc((e && e.message) || "error") + ') <button type="button" class="ak-retry" id="akRetry">Try again</button></div>'); x.scrollTop = x.scrollHeight; $("akRetry").onclick = function () { var er = $("akErr"); if (er) er.remove(); run(um, note, hist); }; }
  } finally { pending = false; setInputOk(); }
}
function send() {
  var inp = $("akIn"), text = (inp.value || "").trim();
  if (!text || pending || ls("askSave") === null) return;
  inp.value = ""; inp.style.height = "auto";
  var um = { role: "user", text: text, t: nowT() }, hist = msgs.slice(-HIST_TURNS);
  msgs.push(um); append(um); run(um, ctxNote(), hist);
}

// ---------- the bear's "Ask AI" button ----------
function addBadge() {
  var b = $("bear"); if (!b || b.querySelector(".kask")) return;
  var k = document.createElement("button"); k.type = "button"; k.className = "kask"; k.title = "Chat with the AI bear"; k.setAttribute("aria-label", "Ask AI"); k.textContent = "💬 Ask AI";
  ["pointerdown", "pointerup", "touchstart", "mousedown"].forEach(function (ev) { k.addEventListener(ev, function (e) { e.stopPropagation(); }); });   // the bear must not start dragging / petting
  k.addEventListener("click", function (e) { e.stopPropagation(); window.__askOpen(); });
  b.appendChild(k);
  setInterval(function () { var r = b.getBoundingClientRect(); k.classList.toggle("kr", r.left < 66); }, 800);   // bear near the left edge: the button goes to its right side
}
(function wait() { var n = 0, iv = setInterval(function () { if ($("bear")) { addBadge(); clearInterval(iv); } else if (++n > 40) clearInterval(iv); }, 500); })();
addProfileIcon();

// ---------- quiz: ID line on the question card (the ID comes from the profile) + saving of the answered question ----------
window.__askQuizRow = function (box) {
  if (!box) return;
  ["click", "pointerdown"].forEach(function (ev) { box.addEventListener(ev, function (e) { e.stopPropagation(); }); });
  box.__draw = function () {
    var id = getId(); box.innerHTML = "";
    if (id) {
      box.innerHTML = '<span class="ak-av" id="kqAv"></span><span>' + esc(nameOf(id) || "ID " + id) + ' · answers are saved</span><span class="ed">change</span>';
      paintAvatar(box.querySelector("#kqAv"), id, 18); box.querySelector(".ed").onclick = function () { showProfile(host(), "fx"); };
    } else {
      box.innerHTML = '<input inputmode="numeric" maxlength="8" placeholder="Your ID (to save your answers)">';
      var inp = box.querySelector("input"); inp.addEventListener("input", function () { inp.value = inp.value.replace(/\D/g, ""); if (/^\d{8}$/.test(inp.value)) setId(inp.value); });
    }
  };
  box.__draw();
};
var qlSession = [], qlSheet = null, qlMore = false, qlCursor = 0, qlBusy = false;
function qlItems() { return getId() && qlSheet ? qlSheet : qlSession; }
function qlHTML(it) {
  var res = it.res === "right" ? "✅" : it.res === "wrong" ? "❌" : it.res === "timeout" ? "⏰" : "📖";
  var opts = (it.o || []).filter(function (x) { return x; }).map(function (x, n) { var cls = x === it.a ? "ok" : (x === it.pick ? "bad" : ""); return '<div class="ql-o ' + cls + '"><b>' + "ABCD".charAt(n) + "</b>" + esc(x) + (x === it.a ? " ✅" : x === it.pick ? " ❌ your answer" : "") + "</div>"; }).join("");
  return '<details class="ql-i"><summary>' + res + " " + esc(it.q) + "<small>" + esc((it.subj || "") + (it.t ? " · " + it.t : "")) + "</small></summary>" + (opts || '<div class="ql-o ok">✅ ' + esc(it.a) + "</div>") + "</details>";
}
function logBox() { var kq = $("kq"); if (!kq) return null; var b = $("kqLog"); if (!b) { b = document.createElement("div"); b.id = "kqLog"; kq.appendChild(b); } return b; }
function renderLog() {
  var b = logBox(); if (!b) return; var id = getId(), items = qlItems();
  b.innerHTML = '<div class="ql-h"><b>📒 My answered questions</b><small>' + (id ? "saved with your ID " + esc(id) : "this visit only · add your ID (picture at the top-right) to keep them") + "</small></div>" +
    (items.length ? items.map(qlHTML).join("") : '<div class="ql-e">Nothing yet. Answer the bear\'s question and it shows up here.</div>') + (id && qlSheet && qlMore ? '<button type="button" class="ql-m" id="qlMore">⬇ Load older</button>' : "");
  var m = $("qlMore"); if (m) m.onclick = qlOlder;
}
function qlFetch() {
  var id = getId(); qlSheet = null; renderLog();
  if (!id || !URL_) return;
  api({ quizlog: 1, id: id, limit: 20 }).then(function (r) { if (id !== getId()) return; var it = r.items || []; qlSheet = it.slice().reverse(); qlMore = !!r.more; qlCursor = it.length ? it[0].r : 0; renderLog(); }).catch(function () { renderLog(); });
}
function qlOlder() {
  var id = getId(); if (qlBusy || !id || !qlSheet) return; qlBusy = true;
  api({ quizlog: 1, id: id, limit: 20, before: qlCursor }).then(function (r) { var it = r.items || []; qlSheet = qlSheet.concat(it.slice().reverse()); qlMore = !!r.more; if (it.length) qlCursor = it[0].r; renderLog(); }).catch(function () {}).then(function () { qlBusy = false; });
}
(function waitKq() { var n = 0, iv = setInterval(function () { var t = $("tabKq"); if (t) { t.addEventListener("click", function () { setTimeout(qlFetch, 0); }); clearInterval(iv); } else if (++n > 40) clearInterval(iv); }, 500); })();
window.__askQuizSave = function (q) {
  var it = { t: nowT(), subj: q.subj, q: q.q, o: q.o, a: q.a, pick: q.pick, res: q.res, src: q.src }, id = getId();
  qlSession.unshift(it); if (qlSession.length > 100) qlSession.pop();   // this visit's list (kept in memory only)
  if (id && URL_) {                                                    // saved in the sheet ONLY when the profile has an ID
    if (qlSheet) qlSheet.unshift(it);
    post({ action: "quiz", id: id, name: nameOf(id), subj: q.subj, q: q.q, o: q.o, a: q.a, pick: q.pick, res: q.res, src: q.src }).catch(function () {});
  }
  var k = $("kq"); if (k && k.offsetParent !== null) renderLog();
};
})();