/* ask-bear.js : the website PROFILE (student ID + picture), the "Ask AI" chat with the bear (Gemini Live), and the saving of chats / quiz answers.
   Loaded by index.html AFTER kawaii-extras.js. Needs: SCRIPT_URL and STUDENTS (index.html), window.__gem (kawaii-extras.js).
   Chat and quiz answers are saved in the Google Sheet (tabs "Chats" and "QuizLog") by the Apps Script (Code-additions.gs).
   - PROFILE: round picture at the top-right of the page. The ID is remembered from the last visit; tap the picture to change it. No ID = the website simply works as before.
   - THE BEAR'S 💬 AI BUTTON opens a small text box beside the bear (sound, 💬 show conversation, send); the answer appears above it. The full conversation window opens from the 💬 button or from the profile's "Chat history".
   - After every page refresh the first use asks: who is asking (ID typed or guest), then save or not save. Every question also sends a small screenshot of what the student is looking at (without the bear / bar / window); the bear uses it only when the question is about the page.
   - Every visit starts a NEW chat (like other AI apps); nothing old is loaded until the student opens "Chat history" (profile button or the 🕘 button).
   - ID known + "Save my chat"  -> chats live in the sheet (the last 500 conversations per student, the last 500 answered quiz questions)
   - no ID + "Save my chat"     -> chats live only in this browser (last 500 conversations)
   - "Don't save my chat"       -> nothing is stored anywhere
   - the 🗑 button deletes ONLY the chat that is open; in "Chat history" each chat (and each day) has a ⋮ menu to delete it
   - quiz answers are saved ONLY when the profile has an ID. The ID typed on the cover page maker is never used here.
   The chat window can be moved (drag the top bar) and resized from every side / corner; it follows the website theme colours. */
(function () {
"use strict";
var ASK_PHOTO_URL = "";   // optional: direct picture link with {id} in it, e.g. "https://example.edu/photos/{id}.jpg". Leave "" to let Apps Script fetch the picture (PHOTO_URL in Code-additions.gs).
var KEEP = 500, CONV_MAX = 200, HIST_TURNS = 8, MINW = 220, MINH = 190;   // KEEP = conversations kept; CONV_MAX = messages kept per conversation
var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function $(i) { return document.getElementById(i); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
var URL_ = (typeof SCRIPT_URL !== "undefined") ? SCRIPT_URL : "";
function pad(n) { return (n < 10 ? "0" : "") + n; }
function nowT() { var d = new Date(), h = d.getHours(), m = d.getMinutes(); return d.getDate() + " " + MON[d.getMonth()] + ", " + ((h + 11) % 12 + 1) + ":" + pad(m) + " " + (h < 12 ? "AM" : "PM"); }
function ts() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }   // how times are stored (sortable)
function showT(t) { var m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(t || ""); if (!m) return t || ""; var h = +m[4]; return (+m[3]) + " " + MON[+m[2] - 1] + ", " + ((h + 11) % 12 + 1) + ":" + m[5] + " " + (h < 12 ? "AM" : "PM"); }
function dayLabel(t) {
  var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(t || ""); if (!m) return "Earlier";
  var d = new Date(), k = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); d.setDate(d.getDate() - 1);
  var y = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  return m[0] === k ? "Today" : m[0] === y ? "Yesterday" : (+m[3]) + " " + MON[+m[2] - 1] + " " + m[1];
}

// ---------- profile + the choices of this visit ----------
// S lives only until the page is refreshed, so "who is asking" and "save or not" are asked again after a refresh. The remembered ID itself lives in localStorage.
var S = { setup: false, guest: false, save: null, sound: ls("askSound") === "1", tip: false };
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) document.documentElement.classList.add("ios");   // iPhones zoom into small text boxes, so those keep a bigger font
function rememberedId() { var v = ls("askId") || ""; return /^\d{8}$/.test(v) ? v : ""; }
function getId() { return S.guest ? "" : rememberedId(); }
function setId(v) { ls("askId", v || null); S.guest = false; document.dispatchEvent(new CustomEvent("askid")); }
function setGuest() { S.guest = true; document.dispatchEvent(new CustomEvent("askid")); }
function nameOf(id) { try { var c = typeof STUDENTS !== "undefined" && STUDENTS[id]; if (c) return c; } catch (e) {} return ls("askNm:" + id) || ""; }   // class list first, otherwise the name Apps Script found (kept on this phone)
window.__askId = getId;

// ---------- Apps Script ----------
function api(q) { return fetch(URL_ + "?" + Object.keys(q).map(function (k) { return k + "=" + encodeURIComponent(q[k]); }).join("&")).then(function (r) { return r.json(); }); }
function post(b) { return fetch(URL_, { method: "POST", body: JSON.stringify(b) }).then(function (r) { return r.json(); }); }

// ---------- profile picture: class picture if it can be fetched, otherwise a cute placeholder ----------
var phMem = {}, profMem = {};
function profApi(id) { return profMem[id] || (profMem[id] = api({ photo: id }).catch(function () { delete profMem[id]; return null; })); }   // ONE request gives picture + name
function gotName(id, r) { if (r && r.name && !ls("askNm:" + id)) { ls("askNm:" + id, String(r.name).slice(0, 80)); document.dispatchEvent(new CustomEvent("askname", { detail: id })); } }
function fetchName(id) { if (!id || nameOf(id) || !URL_) return; profApi(id).then(function (r) { gotName(id, r); }); }
function photoFor(id) {
  if (phMem[id]) return phMem[id];
  var c = ls("askPh:" + id); if (c) return (phMem[id] = Promise.resolve(c));
  var no = false; try { no = !!sessionStorage.getItem("askNoPh:" + id); } catch (e) {}
  if (no || !URL_) return Promise.resolve("");
  return (phMem[id] = new Promise(function (res) {
    function viaScript() {
      profApi(id).then(function (r) {
        gotName(id, r);
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
  fetchName(id);
  photoFor(id).then(function (u) {
    if (!u || el.getAttribute("data-id") !== id) return;
    var im = new Image(); im.alt = ""; im.onload = function () { if (el.getAttribute("data-id") === id) { el.textContent = ""; el.appendChild(im); } }; im.src = u;
  });
}

// ---------- voice (default OFF): Gemini's own cute voice, or the browser's voice if that fails ----------
var AC = null, playT = 0;
function audioUnlock() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { AC = null; } }   // must be called from a tap / key press
function playPcm(b64) {   // Gemini sends 24 kHz 16-bit sound in small pieces; they are queued one after another
  if (!AC) return false;
  try {
    var bin = atob(b64), n = bin.length >> 1, f = new Float32Array(n);
    for (var i = 0; i < n; i++) { var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; f[i] = v / 32768; }
    var buf = AC.createBuffer(1, n, 24000); buf.copyToChannel(f, 0);
    var src = AC.createBufferSource(); src.buffer = buf; src.connect(AC.destination);
    var t = Math.max(AC.currentTime + 0.04, playT); src.start(t); playT = t + buf.duration; return true;
  } catch (e) { return false; }
}
function stopVoice() { playT = 0; try { if (AC) { AC.close(); AC = null; } } catch (e) {} try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
function speakTTS(text) {   // fallback: the browser's own voice, made bright and cute
  try {
    var ss = window.speechSynthesis; if (!ss) return; ss.cancel();
    var clean = String(text).replace(/\*\*/g, "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").slice(0, 600), u = new SpeechSynthesisUtterance(clean), bn = /[\u0980-\u09FF]/.test(clean);
    u.lang = bn ? "bn-BD" : "en-US"; u.pitch = 1.6; u.rate = 1.05;
    var vs = ss.getVoices().filter(function (v) { return v.lang.indexOf(bn ? "bn" : "en") === 0; }), pick = vs.filter(function (v) { return /female|samantha|zira|aria|jenny|google|karen|susan|serena/i.test(v.name); })[0] || vs[0];
    if (pick) u.voice = pick; ss.speak(u);
  } catch (e) {}
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// ---------- what the student is looking at: a small picture + the visible text (the bear, the ask bar and the chat window are NOT in it: what is behind them is) ----------
var H2P = "https://cdn.jsdelivr.net/npm/html2canvas-pro@2.5.0/dist/html2canvas-pro.min.js";   // html2canvas-pro understands modern CSS colours (the old html2canvas stops on them)
function visibleText() {
  try {
    var out = [], n = 0, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), t;
    while ((t = w.nextNode()) && n < 1500) {
      var s = (t.nodeValue || "").replace(/\s+/g, " ").trim(); if (s.length < 2) continue; var el = t.parentElement; if (!el) continue;
      if (el.closest("#bear,#askBar,#askWin,.kpbox,script,style,noscript,#kProf")) continue;
      var st = getComputedStyle(el); if (st.visibility === "hidden" || st.display === "none" || +st.opacity === 0) continue;
      var r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      out.push(s); n += s.length + 1;
    }
    return out.join("\n").slice(0, 1500);
  } catch (e) { return ""; }
}
async function pagePicture() {
  try {
    var c = null; try { c = window.__notesCtx && window.__notesCtx(); } catch (e) {}
    if (c && c.viewer) {   // PDF viewer: copy the page pictures that are on screen (fast and exact; the viewer's bear is not part of these pictures)
      var vb = $("nvB"); if (!vb) return ""; var r = vb.getBoundingClientRect(), sc = Math.min(1, 800 / r.width), out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(r.width * sc)); out.height = Math.max(1, Math.round(r.height * sc));
      var x = out.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, out.width, out.height);
      var cs = document.querySelectorAll("#nvI .nvp canvas"), any = false;
      for (var i = 0; i < cs.length; i++) { var cr = cs[i].getBoundingClientRect(); if (cr.bottom < r.top || cr.top > r.bottom || !cs[i].width) continue; x.drawImage(cs[i], (cr.left - r.left) * sc, (cr.top - r.top) * sc, cr.width * sc, cr.height * sc); any = true; }
      return any ? out.toDataURL("image/jpeg", .7).split(",")[1] : "";
    }
    var A = window.APP || {};
    if (!window.__h2p && A.addScript) { var prev = window.html2canvas; window.html2canvas = undefined; try { await A.addScript(H2P); window.__h2p = window.html2canvas; } finally { if (prev) window.html2canvas = prev; } }   // keep the website's own html2canvas (cover pages) untouched
    if (!window.__h2p) return "";
    var cv = await window.__h2p(document.body, { x: window.scrollX, y: window.scrollY, width: innerWidth, height: innerHeight, windowWidth: innerWidth, windowHeight: innerHeight, scale: Math.min(1, 700 / innerWidth), backgroundColor: null, logging: false, useCORS: true,
      ignoreElements: function (el) { return el.id === "bear" || el.id === "askWin" || el.id === "askBar" || (el.classList && (el.classList.contains("kpbox") || el.classList.contains("ak-mnu"))); } });
    return cv.toDataURL("image/jpeg", .65).split(",")[1];
  } catch (e) { return ""; }
}
var ABOUT_PAGE = /\b(this|these|that|here|page|screen|screenshot|see|seeing|look|looking|showing|shown|displayed|visible|button|picture|image|above|below|on my)\b|এই|এখানে|পেজ|স্ক্রিন|দেখ|ছবি|বাটন|ওপরে|নিচে|উপরে/i;
function captureShot(question) {   // {text: visible text (instant), img: promise of a small JPEG}. In the PDF viewer the picture is always taken (it is instant and the pages are pictures); on the website pages it is taken only when the question sounds like it is about the page, because drawing the page takes a second or two
  var inViewer = false; try { var c = window.__notesCtx && window.__notesCtx(); inViewer = !!(c && c.viewer); } catch (e) {}
  return { text: inViewer ? "" : visibleText(), img: (inViewer || ABOUT_PAGE.test(question || "")) ? pagePicture() : Promise.resolve("") };
}

// ---------- Gemini: the SAME kind of request the bear's messages and quiz already use (one user turn; the text comes from the transcript) ----------
var SYS = "You are Teddy, a friendly kawaii teddy bear AI assistant on a student's notes website (a 2nd-year CSE class at a university). The student can ask you ANYTHING: studies, coding, maths, writing, advice, ideas or just curious questions. Answer correctly, clearly and in a short friendly way; use simple steps when it helps. Plain text only: no markdown headings or tables (short '-' lists and **bold** are fine). Reply in the language the student writes (English, Bangla or mixed). If you are not sure, say so. ALWAYS end your reply with at least one fitting emoji as the very last character.";
function buildPrompt(hist, text, note, img, pageText) {
  var t = SYS;
  if (img || pageText) t += "\nYou can also see the page the student is looking at right now" + (img ? " (a screenshot is attached)" : "") + (pageText ? " and this is the text visible on it:\n<<<\n" + pageText + "\n>>>" : "") + "\nUse this ONLY if the question is about that page (for example 'this', 'here', 'what is on my screen', 'explain this page'); otherwise ignore it completely and just answer the question. Do not mention it unless it matters.";
  if (note) t += "\n(Background only, ignore it if the question is about something else: the student currently has " + note + " open.)";
  if (hist.length) t += "\n\nConversation so far:\n" + hist.map(function (m) { return (m.role === "user" ? "Student: " : "Teddy: ") + String(m.text).slice(0, 1000); }).join("\n");
  return t + "\n\nStudent: " + text + "\nTeddy:";
}
function geminiOnce(g, key, prompt, shotP, voice, onText) {
  return new Promise(function (ok, bad) {
    var txt = "", done = false, ws, to, gotAudio = false;
    function fin(v, err) { if (done) return; done = true; clearTimeout(to); try { ws.close(); } catch (e) {} if (v) { if (voice && !gotAudio) speakTTS(v); ok(v); } else { console.warn("Ask AI failed:", err && err.message); bad(err || new Error("no reply")); } }
    try { ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" + key); } catch (e) { return bad(e); }
    to = setTimeout(function () { fin(txt.trim() || null, new Error("timeout (60 s)")); }, 60000);
    ws.onopen = function () {
      var gc = { responseModalities: ["AUDIO"] }; if (voice) gc.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: typeof voice === "string" ? voice : voiceName() } } };   // the voice chosen in the profile box (default "Leda")
      ws.send(JSON.stringify({ setup: { model: g.m || "models/gemini-3.8-live", generationConfig: gc, outputAudioTranscription: {} } }));
    };
    ws.onmessage = async function (ev) {
      var d = ev.data; if (d instanceof Blob) d = await d.text(); var m; try { m = JSON.parse(d); } catch (e) { return; }
      if (m.error) { fin(null, new Error((m.error.message || JSON.stringify(m.error)).slice(0, 120))); return; }
      if (m.setupComplete) {
        var img = ""; try { img = shotP ? await Promise.race([shotP, sleep(2500).then(function () { return ""; })]) : ""; } catch (e) {}
        var parts = [{ text: prompt }]; if (img) parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
        if (!done) ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: parts }], turnComplete: true } }));
      }
      var sc = m.serverContent; if (!sc) return;
      if (sc.outputTranscription && sc.outputTranscription.text) { txt += sc.outputTranscription.text; if (onText) try { onText(txt); } catch (e) {} }   // text appears while the voice is playing
      if (sc.modelTurn && sc.modelTurn.parts) sc.modelTurn.parts.forEach(function (p) {
        if (p.text) { txt += p.text; if (onText) try { onText(txt); } catch (e) {} }
        if (voice && p.inlineData && /audio/.test(p.inlineData.mimeType || "") && playPcm(p.inlineData.data)) gotAudio = true;
      });
      if (sc.turnComplete) fin(txt.trim() || null, new Error("empty answer"));
    };
    ws.onerror = function () { fin(txt.trim() || null, new Error("connection error")); };
    ws.onclose = function (ev) { fin(txt.trim() || null, new Error("closed " + ev.code + (ev.reason ? " " + ev.reason.slice(0, 80) : ""))); };
  });
}
async function gemini(hist, text, note, shot, onText) {
  var shotP = shot && shot.img, pageText = shot ? shot.text : "";
  if (window.__askMock) { var mr = await window.__askMock(hist, text, note, shot); if (S.sound) speakTTS(mr); return mr; }   // (test hook)
  var g = (window.__gem && window.__gem()) || {}, key = g.k;
  if (!key && g.u) key = (await (await fetch(g.u)).text()).trim();
  if (!key) throw new Error("no Gemini key");
  stopVoice(); if (S.sound) audioUnlock();
  // if the server refuses the picture or the voice setting, the next try drops it, so a question never fails only because of an extra
  var tries = []; if (shotP) tries.push({ img: true, voice: S.sound }); tries.push({ img: false, voice: S.sound }); if (S.sound) tries.push({ img: false, voice: false });
  var last;
  for (var i = 0; i < tries.length; i++) {
    try { return await geminiOnce(g, key, buildPrompt(hist, text, note, tries[i].img, pageText), tries[i].img ? shotP : null, tries[i].voice, onText); }
    catch (e) { last = e; if (/timeout/.test(e.message)) break; }
  }
  throw last || new Error("no reply");
}
var VOICES = [["Leda", "young"], ["Zephyr", "bright"], ["Puck", "upbeat"], ["Aoede", "breezy"], ["Achird", "friendly"], ["Sulafat", "warm"], ["Achernar", "soft"], ["Kore", "firm"], ["Charon", "calm"], ["Fenrir", "excited"]];   // names of Gemini's ready-made voices
function voiceName() { var v = ls("askVoice"); return VOICES.some(function (x) { return x[0] === v; }) ? v : "Leda"; }
async function previewVoice(name, btn) {   // plays one short sentence in that voice so the student can hear what it sounds like
  var old = btn.textContent; btn.disabled = true; btn.textContent = "…";
  try {
    var g = (window.__gem && window.__gem()) || {}, key = g.k; if (!key && g.u) key = (await (await fetch(g.u)).text()).trim(); if (!key) throw new Error("no key");
    stopVoice(); audioUnlock();
    await geminiOnce(g, key, "Say exactly this sentence in a cheerful voice and nothing else: Hi! I am Teddy, your study buddy!", null, name);
    btn.textContent = old;
  } catch (e) { btn.textContent = "✗ failed"; setTimeout(function () { btn.textContent = old; }, 1800); }
  btn.disabled = false;
}
var EMO = ["🧸", "✨", "😊", "💜", "🌟", "🍀", "🌸"];
function tidy(r) {   // every answer ends with an emoji; the very first answer of a visit also gets one tiny tip
  r = String(r).trim();
  if (!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B50\u2764]\uFE0F?\s*$/u.test(r)) r += " " + EMO[Math.floor(Math.random() * EMO.length)];
  if (!S.tip) { S.tip = true; r += "\n\n👀 Tip: screenshot of the page you viewing gets send to me! you can ask about them!"; }
  return r;
}

// ---------- look (all colours come from the website theme variables, so the chat follows the theme and dark mode) ----------
var CSS = [
  // "Ask AI" button next to the bear: a raised pill like the site's other buttons, with a little tail pointing at the bear
  ".kask{position:absolute;left:-37px;top:38px;height:16px;padding:0 5px;border:1.5px solid #fff;border-radius:9px;background:var(--accent,#8a4dff);color:var(--onacc,#fff);font:800 8.5px/1 system-ui,-apple-system,sans-serif;letter-spacing:.2px;white-space:nowrap;display:flex;align-items:center;gap:2px;cursor:pointer;box-shadow:0 2px 0 var(--accentD,#5b3fb0),0 2px 5px var(--shadow,rgba(80,40,160,.35));touch-action:manipulation;-webkit-tap-highlight-color:transparent;animation:kaskp 5s ease-in-out infinite}",
  ".kask:before{content:'';position:absolute;right:-3px;bottom:1px;width:6px;height:6px;background:inherit;border-right:1.5px solid #fff;border-bottom:1.5px solid #fff;transform:rotate(-45deg) skew(8deg,8deg);border-radius:0 0 3px 0}",
  ".kask.kr{left:auto;right:-37px}.kask.kr:before{display:none}.kask:after{content:'';position:absolute;inset:-8px}.kask:active{transform:translateY(1px);box-shadow:0 1px 0 var(--accentD,#5b3fb0)}@keyframes kaskp{0%,86%,100%{transform:scale(1)}92%{transform:scale(1.1) rotate(-4deg)}}",
  ".askb{pointer-events:auto;cursor:pointer;height:18px;padding:0 7px;border:1.5px solid #fff;border-radius:10px;background:var(--accent,#8a4dff);color:var(--onacc,#fff);font:800 9.5px/1 system-ui,-apple-system,sans-serif;white-space:nowrap;display:flex;align-items:center;box-shadow:0 2px 0 var(--accentD,#5b3fb0),0 3px 7px rgba(0,0,0,.3);-webkit-tap-highlight-color:transparent;flex:none}.askb:after{content:'';position:absolute;inset:-6px}.askb:active{transform:translateY(2px);box-shadow:none}",
  // profile
  "#kProf{position:fixed;top:10px;right:10px;z-index:60;height:42px;max-width:min(190px,calc(100vw - 70px));box-sizing:border-box;padding:3px 13px 3px 4px;margin:0;border-radius:21px;border:2px solid var(--line);background:var(--panel);color:var(--text);cursor:pointer;box-shadow:0 2px 8px var(--shadow);display:flex;align-items:center;gap:8px;font:inherit;text-align:left}body.night #kProf{right:84px}#kProf:active{transform:translateY(1px)}#kProf .kpt{display:flex;flex-direction:column;min-width:0;line-height:1.15}#kProf .kpt b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#kProf .kpt small{font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".kpbox{z-index:10006;width:min(270px,calc(100vw - 20px));box-sizing:border-box;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--panel);color:var(--text);box-shadow:0 8px 24px var(--shadow,rgba(0,0,0,.3));font:13px/1.35 system-ui,-apple-system,sans-serif}.kpbox.fx{position:fixed;top:52px;right:10px}.kpbox.ab{position:absolute;top:46px;left:8px;z-index:9}",
  ".kpbox .kp-top{display:flex;align-items:center;gap:10px;margin-bottom:9px}.kpbox .kp-top div{min-width:0}.kpbox b{display:block;font-size:14px}.kpbox small{display:block;color:var(--muted);font-size:11.5px}",
  ".kpbox input{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:15px;letter-spacing:1px;background:var(--panel);color:var(--text);outline:0}.kpbox input:focus{border-color:var(--accent)}",
  ".kpbox .ak-n{min-height:15px;font-size:11.5px;margin:4px 0 0;color:var(--muted)}.kpbox .kp-row{display:flex;gap:6px;margin-top:8px}.kpbox .kp-row button{border:0;border-radius:10px;padding:7px 12px;font:inherit;font-size:12.5px;cursor:pointer;background:var(--accent);color:var(--onacc)}.kpbox .kp-voice{display:flex;gap:6px;margin-top:8px}.kpbox .kp-voice select{flex:1;min-width:0;border:1px solid var(--line);border-radius:10px;padding:6px 6px;font:inherit;font-size:12.5px;background:var(--panel);color:var(--text)}.kpbox .kp-voice button{flex:none;border:0;border-radius:10px;padding:6px 10px;background:var(--accent);color:var(--onacc);font:inherit;font-size:12px;cursor:pointer}.ios .kpbox select{font-size:16px}.kpbox .kp-hist{width:100%;margin-top:8px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font:inherit;font-size:12.5px;cursor:pointer;background:var(--bg,transparent);color:var(--text);text-align:left}.kpbox .kp-row button.alt{background:transparent;color:var(--text);border:1px solid var(--line)}",
  "#askWin button,.kpbox button,#kProf{margin:0;font-family:inherit}#askWin button,.kpbox button{box-shadow:none;transform:none}",
  ".ak-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;color:#3b2f45;font-weight:700;flex:none;vertical-align:middle}.ak-av.g{background:var(--line,#e6dcf5)}.ak-av img{width:100%;height:100%;object-fit:cover}",
  // quiz ID line
  ".kqid{margin-top:7px;font-size:11px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.kqid input{flex:1;min-width:120px;box-sizing:border-box;padding:5px 8px;border:1.5px solid var(--line,#c9b8f0);border-radius:9px;font:inherit;font-size:12px;background:var(--panel,#fff);color:var(--text,#3b2f45);outline:0}.kqid .ed{cursor:pointer;opacity:.85;text-decoration:underline}",
  // chat window: outer box carries the resize handles, .ak-in is the rounded body
  "#askWin{position:fixed;left:0;top:0;width:320px;height:420px;z-index:10004;color:var(--text,#3b2f45);font:13px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif}#askWin.hidden{display:none}",
  ".ak-in{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--panel,#fff);border:1px solid var(--line);border-radius:16px;box-shadow:0 10px 34px var(--shadow,rgba(60,30,90,.4)),0 2px 8px rgba(0,0,0,.18);overflow:hidden}",
  ".ak-rz{position:absolute;z-index:8;touch-action:none}.ak-rz[data-d=n]{top:-9px;left:16px;right:16px;height:18px;cursor:ns-resize}.ak-rz[data-d=s]{bottom:-9px;left:16px;right:16px;height:18px;cursor:ns-resize}.ak-rz[data-d=e]{right:-9px;top:16px;bottom:16px;width:18px;cursor:ew-resize}.ak-rz[data-d=w]{left:-9px;top:16px;bottom:16px;width:18px;cursor:ew-resize}",
  ".ak-rz[data-d=ne]{top:-9px;right:-9px;width:26px;height:26px;cursor:nesw-resize}.ak-rz[data-d=nw]{top:-9px;left:-9px;width:26px;height:26px;cursor:nwse-resize}.ak-rz[data-d=se]{bottom:-9px;right:-9px;width:26px;height:26px;cursor:nwse-resize}.ak-rz[data-d=sw]{bottom:-9px;left:-9px;width:26px;height:26px;cursor:nesw-resize}",
  ".ak-in.hist .ak-f,.ak-in.hist .ak-stat{display:none}",
  ".hh{display:flex;align-items:center;gap:6px;position:sticky;top:-8px;z-index:2;margin:-8px -8px 4px;padding:7px 8px;background:var(--bg,#fbf9ff);border-bottom:1px solid var(--line)}.hh b{flex:1;font-size:13px}.hh button{border:0;border-radius:10px;padding:5px 10px;font:inherit;font-size:11.5px;cursor:pointer;background:var(--line);color:var(--text)}",
  ".hd{display:flex;align-items:center;justify-content:space-between;font-size:10.5px;font-weight:700;color:var(--muted);margin-top:8px;letter-spacing:.3px;text-transform:uppercase}.hc{display:flex;align-items:center;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:6px 4px 6px 10px;cursor:pointer;margin-top:4px}.hc:active{background:var(--line)}.hc-x{flex:1;min-width:0}.hc-t{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hc-s{font-size:10.5px;color:var(--muted)}",
  ".mb{border:0;background:none;color:var(--muted);font-size:18px;line-height:1;padding:3px 8px;cursor:pointer}.ak-mnu{position:absolute;z-index:12;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:11px;box-shadow:0 6px 18px var(--shadow,rgba(0,0,0,.3));padding:4px}.ak-mnu button{display:block;border:0;background:none;color:var(--text);padding:9px 12px;font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}",
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
  ".ak-row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.ak-row button{border:0;border-radius:11px;padding:7px 11px;font:inherit;font-size:12px;cursor:pointer;background:var(--accent);color:var(--onacc,#fff)}.ak-row button.alt{background:transparent;color:var(--text);border:1px solid var(--line)}",
  ".ab-dots{letter-spacing:2px;opacity:.7}",
  "#askBar{position:fixed;z-index:10004;left:0;bottom:12px;width:300px;display:flex;flex-direction:column;gap:6px;color:var(--text,#3b2f45);font:13px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif}#askBar.hidden{display:none}",
  ".ab-row{position:relative;display:flex;align-items:flex-end;gap:5px;background:var(--panel,#fff);border:1px solid var(--line);border-radius:22px;padding:5px 5px 5px 12px;box-shadow:0 6px 22px var(--shadow,rgba(60,30,90,.35)),0 2px 6px rgba(0,0,0,.15)}",
  ".ab-row textarea{flex:1;min-width:0;resize:none;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:13px;line-height:1.3;max-height:110px;padding:7px 0;margin:0}.ab-row textarea:disabled{opacity:.6}",
  "#askBar button{flex:none;width:32px;height:32px;border:0;border-radius:50%;padding:0;margin:0;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;background:var(--line);color:var(--text);box-shadow:none;transform:none;font-family:inherit}",
  "#askBar button.go,#askBar button.on{background:var(--accent);color:var(--onacc,#fff)}#askBar button:disabled{opacity:.45}#askBar button.ab-x{position:absolute;right:-4px;top:-9px;width:20px;height:20px;font-size:10px;background:var(--panel);box-shadow:0 1px 4px rgba(0,0,0,.3)}",
  ".ab-ans{background:var(--panel,#fff);border:1px solid var(--line);border-radius:16px;box-shadow:0 6px 22px var(--shadow,rgba(60,30,90,.35));padding:8px 11px 9px;max-height:min(42vh,300px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.ab-ans.hidden{display:none}",
  ".ab-h{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-bottom:3px}.ab-h b{flex:1;color:var(--text)}.ab-h span{cursor:pointer;padding:0 4px}.ab-t{font-size:13px;line-height:1.42;word-wrap:break-word;overflow-wrap:anywhere}#askBar .ak-retry{width:auto;height:auto;border-radius:10px;padding:3px 10px;font-size:11.5px;display:inline-block}",
  ".ab-pop{background:var(--panel,#fff);color:var(--text);border:2px solid var(--accent);border-radius:16px;padding:10px 11px;box-shadow:0 6px 22px var(--shadow,rgba(60,30,90,.35));font-size:12px}.ab-pop.hidden{display:none}.ab-pop b,.ak-pop b{display:block;font-size:13px;margin-bottom:2px}",
  ".su-id{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:11px;padding:7px 10px;margin-top:6px;font:inherit;font-size:14px;letter-spacing:.5px;background:var(--panel,#fff);color:var(--text);outline:0;text-align:center}.su-id:focus{border-color:var(--accent)}.ab-pop .ak-n,.ak-pop .ak-n{min-height:14px;font-size:11px;color:var(--muted);margin-top:3px}",
  ".ab-pop .ak-row button,#askBar .ak-row button{width:auto;height:auto;border-radius:11px;padding:7px 11px;font-size:12px;background:var(--accent);color:var(--onacc,#fff)}.ab-pop .ak-row button.alt,#askBar .ak-row button.alt{background:transparent;color:var(--text);border:1px solid var(--line)}",
  ".ak-f button.snd{background:var(--line);color:var(--text)}.ak-f button.snd.on{background:var(--accent);color:var(--onacc,#fff)}",
  "@media (max-width:430px){.kpbox{width:min(236px,calc(100vw - 20px));padding:10px}.kpbox input,.su-id{font-size:13px;padding:6px 8px}.kpbox .kp-top b{font-size:13px}.ab-pop,.ak-pop{font-size:11.5px}.ak-row button{padding:6px 9px;font-size:11.5px}}",
  ".ios .ab-row textarea,.ios .ak-f textarea,.ios .kpbox input,.ios .su-id,.ios .kqid input{font-size:16px}"
].join("");
var stEl = document.createElement("style"); stEl.textContent = CSS; document.head.appendChild(stEl);

// ---------- profile button (top-right of the page: picture + name + ID) + small profile box ----------
function host() { return document.fullscreenElement || document.body; }   // inside the PDF viewer's full screen, windows must live INSIDE the full-screen element or they stay hidden
function closeProfile() { var b = document.querySelector(".kpbox"); if (b) b.remove(); }
function showProfile(parent, cls) {
  var had = document.querySelector(".kpbox"); if (had) { var same = had.parentNode === parent; had.remove(); if (same) return; }
  var id = getId(), box = document.createElement("div"); box.className = "kpbox " + cls;
  box.innerHTML = '<div class="kp-top"><span id="kpAv"></span><div><b id="kpName"></b><small id="kpSub"></small></div></div><input id="kpId" inputmode="numeric" maxlength="8" placeholder="e.g. 25101003" value="' + esc(rememberedId()) + '" autocomplete="off"><div class="ak-n" id="kpN"></div><div class="kp-row"><button type="button" id="kpSave">Save</button><button type="button" class="alt" id="kpClear" title="Forget the ID on this phone. Nothing saved is deleted.">Log out</button></div><div class="kp-voice"><select id="kpVoice" title="Voice of the bear">' + VOICES.map(function (v) { return '<option value="' + v[0] + '"' + (v[0] === voiceName() ? " selected" : "") + ">" + v[0] + " · " + v[1] + "</option>"; }).join("") + '</select><button type="button" id="kpPlay">▶ Hear</button></div><button type="button" class="kp-hist" id="kpHist">💬 Chat history</button>';
  parent.appendChild(box);
  var inp = box.querySelector("#kpId"), note = box.querySelector("#kpN");
  function top() { var cur = getId(); paintAvatar(box.querySelector("#kpAv"), cur, 44); box.querySelector("#kpName").textContent = cur ? (nameOf(cur) || "ID " + cur) : "Guest"; box.querySelector("#kpSub").textContent = cur ? "ID " + cur + " · remembered on this device" : "Add your ID to save your chats and quiz answers"; }
  function hint() { var v = inp.value.replace(/\D/g, ""); inp.value = v; if (/^\d{8}$/.test(v)) fetchName(v); note.textContent = /^\d{8}$/.test(v) ? (nameOf(v) ? "👋 Hi, " + nameOf(v) + "!" : "Not in the class list, but that is fine 🙂") : (v ? "The ID has 8 digits" : ""); }
  function save() { var v = inp.value.replace(/\D/g, ""); if (!v) { setId(""); box.remove(); return; } if (!/^\d{8}$/.test(v)) { note.textContent = "Please type your 8-digit ID"; return; } setId(v); box.remove(); }
  inp.addEventListener("input", hint); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save(); } });
  box.querySelector("#kpSave").onclick = save; box.querySelector("#kpClear").onclick = function () { setId(""); box.remove(); };
  box.querySelector("#kpVoice").onchange = function () { ls("askVoice", this.value); previewVoice(this.value, box.querySelector("#kpPlay")); };
  box.querySelector("#kpPlay").onclick = function () { previewVoice(box.querySelector("#kpVoice").value, this); };
  box.querySelector("#kpHist").onclick = function () { box.remove(); window.__askOpen({ hist: true }); };
  function onNm() { if (!box.isConnected) { document.removeEventListener("askname", onNm); return; } top(); hint(); }
  document.addEventListener("askname", onNm);
  top(); hint(); setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 40);
}
document.addEventListener("pointerdown", function (e) { var t = e.target; var b = document.querySelector(".kpbox"); if (b && !(t.closest && (t.closest(".kpbox") || t.closest("#kProf") || t.closest("#akPf") || t.closest(".kqid")))) b.remove(); var mn = document.querySelector(".ak-mnu"); if (mn && !(t.closest && (t.closest(".ak-mnu") || t.closest(".mb")))) mn.remove(); });
function paintProf() {
  var id = getId(), n = $("kProfName"), s = $("kProfSub"); paintAvatar($("kProfAv"), id, 32); if (!n) return;
  n.textContent = id ? (nameOf(id) || "ID " + id) : "Guest"; s.textContent = id ? "ID " + id : "Tap to add your ID";
}
function addProfileIcon() {
  if ($("kProf")) return; var b = document.createElement("button"); b.type = "button"; b.id = "kProf"; b.title = "Profile"; b.setAttribute("aria-label", "Profile");
  b.innerHTML = '<span id="kProfAv"></span><span class="kpt"><b id="kProfName"></b><small id="kProfSub"></small></span>';
  b.onclick = function () { showProfile(host(), "fx"); }; document.body.appendChild(b); paintProf();
}
document.addEventListener("askname", function () { paintProf(); try { if (win) paintHeader(); } catch (e) {} });
document.addEventListener("askid", function () {
  paintProf(); hist = null; newConv();   // another ID = another person: a fresh chat, and their own history
  if (win) { paintHeader(); if (winVisible()) { setView("chat"); var pp = $("akPop"); if (pp && S.setup) pp.classList.add("hidden"); render(true); } }
  try { qlFetch(); } catch (e) {}
  var qs = document.querySelectorAll(".kqid"); for (var i = 0; i < qs.length; i++) if (qs[i].__draw) qs[i].__draw();
});

// ---------- chat window: one conversation at a time ----------
var win = null, conv = null, pending = false, G = null, view = "chat", hist = null, wantHist = false;
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function newConv() { conv = { c: genId(), title: "", msgs: [], first: true, saved: false }; }
function titleOf(t) { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 48 ? t.slice(0, 46) + "…" : t; }
// guests (no ID): the conversations live in this browser
var LC = "askConvs";
function lcGet() { try { return JSON.parse(ls(LC) || "[]"); } catch (e) { return []; } }
function lcSet(a) { a = a.slice(-KEEP); while (a.length) { try { localStorage.setItem(LC, JSON.stringify(a)); return; } catch (e) { a.shift(); } } try { localStorage.removeItem(LC); } catch (e) {} }
function lcSave(c) {
  var a = lcGet().filter(function (x) { return x.c !== c.c; }), m = c.msgs.slice(-CONV_MAX);
  a.push({ c: c.c, title: c.title, t: m.length ? m[0].t : ts(), t1: m.length ? m[m.length - 1].t : ts(), n: m.length, msgs: m.map(function (x) { return { role: x.role, text: x.text, t: x.t }; }) }); lcSet(a);
}
function lcDel(cs) { lcSet(lcGet().filter(function (x) { return cs.indexOf(x.c) < 0; })); }
function ctxNote() {
  try {
    var c = window.__notesCtx && window.__notesCtx();
    if (c && c.viewer) { var pg = $("nvPg"); return 'the note "' + (c.label || "") + '"' + (pg && pg.textContent ? " (page " + pg.textContent + ")" : ""); }
    if (c && c.label) return 'the "' + c.label + '" notes list';
  } catch (e) {}
  return "";
}
function fmt(s) { return esc(s).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); }
function bubble(m) { return '<div class="ak-b ' + (m.role === "user" ? "u" : "b") + '"><div class="ak-x">' + fmt(m.text) + "</div><i>" + esc(showT(m.t)) + "</i></div>"; }
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

function winVisible() { return !!win && !win.classList.contains("hidden"); }
var coarse = window.matchMedia && matchMedia("(pointer:coarse)").matches;   // on phones Enter makes a new line (the ➤ button sends); on computers Enter sends
function enterSends(e) { return e.key === "Enter" && !e.shiftKey && !coarse; }
function autosize(t, max) { t.style.height = "auto"; t.style.height = Math.min(max, t.scrollHeight) + "px"; }

// ---------- first use after a page load: who is asking, then save or not (shown above the text box) ----------
function setupCard(pop, done) {
  pop.classList.remove("hidden"); var rem = rememberedId();
  function step1() {
    pop.onclick = null;
    pop.innerHTML = '<b>👋 Who is asking?</b><input class="su-id" inputmode="numeric" maxlength="8" placeholder="e.g. 25101003" value="' + esc(rem) + '" autocomplete="off"><div class="ak-n" id="suN"></div><div class="ak-row"><button type="button" id="suGo">Continue</button><button type="button" class="alt" id="suGuest">Continue as guest</button></div>';
    var inp = pop.querySelector(".su-id"), note = pop.querySelector("#suN");
    function hint() { var v = inp.value.replace(/\D/g, ""); inp.value = v; if (/^\d{8}$/.test(v)) fetchName(v); note.textContent = /^\d{8}$/.test(v) ? (nameOf(v) ? "👋 Hi, " + nameOf(v) + "!" : "") : (v ? "e.g. 25101003" : ""); }
    function go() { var v = inp.value.replace(/\D/g, ""); if (!/^\d{8}$/.test(v)) { note.textContent = v ? "e.g. 25101003" : "Type your ID, or tap Continue as guest"; return; } if (v !== rememberedId() || S.guest) setId(v); step2(); }
    inp.addEventListener("input", hint); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } }); hint();
    pop.querySelector("#suGo").onclick = go; pop.querySelector("#suGuest").onclick = function () { setGuest(); step2(); };
    setTimeout(function () { try { inp.focus({ preventScroll: true }); if (rem) inp.select(); } catch (e) {} }, 60);
  }
  function step2() {
    pop.innerHTML = "<b>💬 Save this chat?</b>Your chat gets saved (if you have an ID, otherwise only on this phone). Please don't talk about anything personal, or tap “Don't save my chat”." +
      '<div class="ak-row"><button type="button" data-v="1">💾 Save my chat</button><button type="button" class="alt" data-v="0">🙈 Don\'t save my chat</button></div>';
    pop.onclick = function (e) { var b = e.target.closest && e.target.closest("button[data-v]"); if (!b) return; S.save = b.getAttribute("data-v"); S.setup = true; pop.onclick = null; pop.classList.add("hidden"); paintStat(); setInputOk(); if (done) done(); };
  }
  step1();
}

// ---------- the compact ask bar: opened by the bear's "💬 AI" button. A text box beside the bear (not a full window); the answer appears above it ----------
var bar = null, barOpen = false, barTimer = 0, lastRun = null;
function buildBar() {
  if (bar) return;
  bar = document.createElement("div"); bar.id = "askBar"; bar.className = "hidden";
  bar.innerHTML = '<div class="ab-pop hidden" id="abPop"></div><div class="ab-ans hidden" id="abAns"><div class="ab-h"><b>🧸 Teddy</b><span id="abAx" title="Hide the answer">✕</span></div><div class="ab-t" id="abTxt"></div></div>' +
    '<div class="ab-row"><button type="button" class="ab-x" id="abX" title="Close">✕</button><textarea id="abIn" rows="1" maxlength="1500" placeholder="Ask me anything…" enterkeyhint="send"></textarea><button type="button" id="abSnd">🔇</button><button type="button" id="abCv" title="Show the conversation">💬</button><button type="button" class="go" id="abGo" title="Send">➤</button></div>';
  host().appendChild(bar);
  var t = $("abIn");
  t.addEventListener("keydown", function (e) { if (enterSends(e)) { e.preventDefault(); barSend(); } });
  t.addEventListener("input", function () { autosize(t, 110); placeBar(); });
  $("abGo").onclick = barSend; $("abX").onclick = closeBar; $("abAx").onclick = function () { $("abAns").classList.add("hidden"); placeBar(); };
  $("abSnd").onclick = function () { setSound(!S.sound); }; $("abCv").onclick = function () { openWindow({}); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && barOpen) closeBar(); });
  document.addEventListener("fullscreenchange", function () { if (bar && bar.parentNode !== host()) host().appendChild(bar); });
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", placeBar); window.visualViewport.addEventListener("scroll", placeBar); }
  window.addEventListener("resize", placeBar); paintSound();
}
function anchorRect() {   // the bear (or the bear of the PDF viewer): the bar is placed BESIDE it so the bear stays visible
  var c = null; try { c = window.__notesCtx && window.__notesCtx(); } catch (e) {}
  var el = (c && c.viewer) ? $("nvBe") : $("bear"); if (!el) return null; var r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight)) return null;
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, viewer: !!(c && c.viewer) };
}
function placeBar() {
  if (!bar || !barOpen) return; var vv = vp(), a = anchorRect(), W = Math.min(320, Math.round(vv.w * .84)), x, b;   // never the full width of the screen
  if (a) {
    var gap = a.viewer ? 66 : 40,   // room for the small "Ask AI" button that sits next to the bear
        sl = a.left - vv.x - 10 - (a.viewer ? 0 : gap), sr = vv.x + vv.w - a.right - 10 - gap, sp = Math.max(sl, sr);
    if (sp >= 220) { W = Math.min(320, sp); x = sl >= sr ? a.left - 6 - (a.viewer ? 0 : gap) - W : a.right + 6 + gap; b = vv.y + vv.h - a.bottom; }   // beside the bear
    else { x = a.left + a.width / 2 - W / 2; b = vv.y + vv.h - a.top + 8; }                                                                      // not enough room beside it: above it
  } else { x = vv.x + (vv.w - W) / 2; b = 12; }
  x = Math.max(vv.x + 8, Math.min(x, vv.x + vv.w - W - 8)); b = Math.max(8, Math.min(b, vv.h - 70));
  bar.style.width = Math.round(W) + "px"; bar.style.left = Math.round(x) + "px"; bar.style.bottom = Math.round(b + (innerHeight - (vv.y + vv.h))) + "px";
}
function paintBar() {
  if (!bar) return; var ok = S.setup; $("abIn").disabled = !ok; $("abIn").placeholder = ok ? "Ask me anything…" : "Answer above first ☝️"; $("abGo").disabled = !ok || pending; paintSound();
}
function openBar() {
  buildBar(); if (!conv) newConv(); if (bar.parentNode !== host()) host().appendChild(bar); if (winVisible()) closeAsk();
  bar.classList.remove("hidden"); barOpen = true; freezeBear(true); placeBar(); clearInterval(barTimer); barTimer = setInterval(placeBar, 700); paintBar();
  if (!S.setup) setupCard($("abPop"), function () { paintBar(); placeBar(); focusBar(); }); else focusBar();
}
function closeBar() { if (!bar) return; bar.classList.add("hidden"); barOpen = false; clearInterval(barTimer); freezeBear(false); }
function freezeBear(on) {   // while the ask bar is open the bear stands still (the bar is placed beside it, so a walking bear dragged the whole box around)
  window.__askBarOpen = !!on; if (!on) return; var b = $("bear"); if (!b) return;
  try { var r = b.getBoundingClientRect(); b.style.transitionDuration = "0s"; b.style.left = Math.round(r.left) + "px"; b.style.top = Math.round(r.top) + "px"; b.classList.remove("moving"); } catch (e) {}
}
function focusBar() { setTimeout(function () { try { $("abIn").focus({ preventScroll: true }); } catch (e) {} }, 60); }
function showAns(html) { if (!barOpen) return; var a = $("abAns"); a.classList.remove("hidden"); $("abTxt").innerHTML = html; a.scrollTop = 0; placeBar(); }
function barSend() { var t = $("abIn"), text = (t.value || "").trim(); if (!text || pending || !S.setup) return; t.value = ""; t.style.height = "auto"; sendText(text); }
function setSound(v) { S.sound = v; ls("askSound", v ? "1" : "0"); if (v) audioUnlock(); else stopVoice(); paintSound(); }
function paintSound() { ["abSnd", "akSnd"].forEach(function (id) { var b = $(id); if (!b) return; b.textContent = S.sound ? "🔊" : "🔇"; b.classList.toggle("on", S.sound); b.title = S.sound ? "Voice is on (tap to turn it off)" : "Voice is off (tap to turn it on)"; }); }

// ---------- the full conversation window ----------
function build() {
  if (win) return;
  win = document.createElement("div"); win.id = "askWin"; win.className = "hidden"; win.setAttribute("role", "dialog"); win.setAttribute("aria-label", "Ask AI");
  win.innerHTML = '<div class="ak-in"><div class="ak-h" title="Drag to move"><button type="button" class="ak-pf" id="akPf" title="Your profile"><span id="akAv"></span></button><div class="ak-t"><b>Ask AI 🧸</b><small id="akWho"></small></div><button type="button" class="ak-ib" id="akNew" title="New chat">＋</button><button type="button" class="ak-ib" id="akHist" title="Chat history">🕘</button><button type="button" class="ak-ib" id="akCl" title="Delete this chat">🗑</button><button type="button" class="ak-ib" id="akX" title="Close">✕</button></div>' +
    '<div class="ak-m" id="akM"></div><div class="ak-pop hidden" id="akPop"></div>' +
    '<div class="ak-stat" id="akStat"></div><div class="ak-f" id="akF"><textarea id="akIn" rows="1" maxlength="1500" placeholder="Ask me anything…" enterkeyhint="send"></textarea><button type="button" class="snd" id="akSnd">🔇</button><button type="button" id="akSend" title="Send">➤</button></div></div>' +
    ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map(function (d) { return '<div class="ak-rz" data-d="' + d + '"></div>'; }).join("");
  host().appendChild(win); loadGeo(); applyGeo(); wireGeo();
  $("akX").onclick = closeAsk;
  $("akPf").onclick = function () { showProfile(win.querySelector(".ak-in"), "ab"); };
  $("akNew").onclick = function () { if (!S.setup) return; if (view === "hist" || conv.msgs.length) { newConv(); setView("chat"); render(true); paintStat(); try { $("akIn").focus({ preventScroll: true }); } catch (e) {} } };
  $("akHist").onclick = function () { if (!S.setup) return; if (view === "hist") { setView("chat"); render(true); } else showHist(); };
  $("akCl").onclick = deleteCurrent; $("akSend").onclick = send; $("akSnd").onclick = function () { setSound(!S.sound); };
  var inp = $("akIn");
  inp.addEventListener("keydown", function (e) { if (enterSends(e)) { e.preventDefault(); send(); } });
  inp.addEventListener("input", function () { autosize(inp, 110); });
  M().addEventListener("click", histClick);
  $("akPop").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("button[data-s]"); if (b) setSave(b.getAttribute("data-s")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && winVisible()) { var mn = document.querySelector(".ak-mnu"); if (mn) mn.remove(); else closeAsk(); } });
  document.addEventListener("fullscreenchange", function () { if (win && win.parentNode !== host()) host().appendChild(win); });
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", applyGeo); window.visualViewport.addEventListener("scroll", applyGeo); }
  window.addEventListener("resize", applyGeo); paintSound();
}
function setView(v) { view = v; if (win) win.querySelector(".ak-in").classList.toggle("hist", v === "hist"); var mn = document.querySelector(".ak-mnu"); if (mn) mn.remove(); }
function paintHeader() {
  if (!win) return; var id = getId(), nm = nameOf(id);
  paintAvatar($("akAv"), id, 28);
  $("akWho").textContent = id ? (nm ? nm + " · " + id : "ID " + id) : "Guest · tap picture to add ID";
  paintStat();
}
// bear button / viewer pill -> the compact bar (tap again to close it); profile "Chat history" or the 💬 in the bar -> the full window
window.__askOpen = function (o) { if (o && o.hist) openWindow(o); else if (barOpen) closeBar(); else openBar(); };
function openWindow(o) {
  build(); if (!conv) newConv(); if (win.parentNode !== host()) host().appendChild(win); closeBar();
  win.classList.remove("hidden"); applyGeo(); paintHeader(); wantHist = !!(o && o.hist);
  if (!wantHist) { setView("chat"); render(true); }
  if (!S.setup) { setupCard($("akPop"), afterSetupWin); return; }
  afterSetupWin();
}
function afterSetupWin() {
  $("akPop").classList.add("hidden"); paintStat(); setInputOk();
  if (wantHist) { wantHist = false; showHist(); return; }
  setTimeout(function () { if (S.setup && view === "chat" && $("akIn")) { try { $("akIn").focus({ preventScroll: true }); } catch (e) {} } }, 60);
}
function closeAsk() { closeProfile(); var mn = document.querySelector(".ak-mnu"); if (mn) mn.remove(); if (win) win.classList.add("hidden"); }

// ---- "save this chat?" (change it later with the "change" link under the chat) ----
function showSavePop() {
  var s = S.save, p = $("akPop");
  p.innerHTML = (s !== null ? '<span class="ak-pc" id="akPc" title="Close">✕</span>' : "") + "<b>💬 Save this chat?</b>Your chat gets saved (if you have an ID, otherwise only on this phone). Please don't talk about anything personal, or tap “Don't save my chat”." +
    '<div class="ak-row"><button type="button" data-s="1" class="' + (s === "1" ? "sel" : "") + '">' + (s === "1" ? "✓ " : "💾 ") + 'Save my chat</button><button type="button" data-s="0" class="alt ' + (s === "0" ? "sel" : "") + '">' + (s === "0" ? "✓ " : "🙈 ") + "Don't save my chat</button></div>";
  p.classList.remove("hidden"); var c = $("akPc"); if (c) c.onclick = function () { p.classList.add("hidden"); };
}
function setSave(v) { $("akPop").classList.add("hidden"); S.save = v; paintStat(); setTimeout(function () { try { $("akIn").focus({ preventScroll: true }); } catch (e) {} }, 60); }   // from now on; messages already sent keep their state
function paintStat() {
  var el = $("akStat"); if (!el) return; var s = S.save, id = getId(), t, c = "";
  if (!S.setup) t = "Answer above first ☝️";
  else if (s === "1") { t = id ? "💾 Chat is saved to your ID " + id : "💾 Chat is saved on this phone only (no ID)"; c = "on"; }
  else t = "🙈 This chat is NOT saved";
  el.className = "ak-stat " + c; el.innerHTML = esc(t) + (S.setup ? " <u id=\"akChg\">change</u>" : "");
  var u = $("akChg"); if (u) u.onclick = showSavePop;
}
function setInputOk() {
  var ok = S.setup, w = $("akIn"); if (w) { w.disabled = !ok; w.placeholder = ok ? "Ask me anything…" : "Answer above first ☝️"; $("akSend").disabled = !ok || pending; }
  paintBar();
}

// ---- the open chat ----
function render(bottom) {
  if (view !== "chat" || !conv) return; var m = M(); if (!m) return; setInputOk();
  m.innerHTML = hintHTML() + (conv.msgs.length ? conv.msgs.map(bubble).join("") : greet());
  var hx = $("akHintX"); if (hx) hx.onclick = function () { ls("askHint", "1"); var h = $("akHint"); if (h) h.remove(); };
  if (bottom) m.scrollTop = m.scrollHeight;
}
function hintHTML() { return ls("askHint") === "1" ? "" : '<div class="ak-hint" id="akHint">↔ Move this window by dragging the top bar. Resize it by dragging the round dots and bars on its edges (a finger works too).<span id="akHintX" title="Got it">✕</span></div>'; }
function deleteCurrent() {   // deletes ONLY the chat that is open (the rest of the history stays)
  if (view !== "chat" || !S.setup || !conv.msgs.length) return;
  if (!confirm("Delete this chat? Your other chats stay.")) return;
  var cv = conv, id = getId();
  if (cv.saved) { if (id) post({ action: "chat_del", id: id, conv: cv.c }).catch(function () {}); else lcDel([cv.c]); }
  hist = null; newConv(); render(true); paintStat();
}

// ---- chat history (only loaded when it is opened) ----
function showHist() { setView("hist"); $("akPop").classList.add("hidden"); if (!hist || !hist.loaded) loadHist(false); else drawHist(); }
async function loadHist(older) {
  if (!hist) hist = { items: [], more: false, cursor: 0, loaded: false, busy: false, err: "" };
  if (hist.busy) return; hist.busy = true; hist.err = ""; drawHist(); var id = getId();
  try {
    if (id) { var r = await api(older ? { convs: 1, id: id, limit: 40, before: hist.cursor } : { convs: 1, id: id, limit: 40 }), it = r.convs || []; hist.items = older ? hist.items.concat(it) : it; hist.more = !!r.more; if (it.length) hist.cursor = it[it.length - 1].r; }
    else { hist.items = lcGet().slice().reverse().map(function (x) { return { c: x.c, title: x.title, t: x.t, t1: x.t1, n: x.n }; }); hist.more = false; }
    hist.loaded = true;
  } catch (e) { hist.err = "Could not load your chats (offline?)"; }
  hist.busy = false; drawHist();
}
function drawHist() {
  if (view !== "hist") return; var m = M(), h = hist; if (!m || !h) return;
  var html = '<div class="hh"><button type="button" id="hhBack" title="Back to the chat">←</button><b>Chat history</b><button type="button" id="hhNew">＋ New chat</button></div>';
  if (h.busy && !h.loaded) html += '<div class="ak-st">Loading…</div>';
  else if (h.err && !h.items.length) html += '<div class="ak-st">' + esc(h.err) + ' <button type="button" class="ak-retry" id="hhRetry">Try again</button></div>';
  else if (!h.items.length) html += '<div class="ak-st">No saved chats yet.' + (S.save === "1" ? "" : "<br>Choose “Save my chat” and your chats will be listed here.") + "</div>";
  else {
    var cur = ""; if (h.err) html += '<div class="ak-st">' + esc(h.err) + "</div>";
    h.items.forEach(function (x) {
      var d = dayLabel(x.t1 || x.t);
      if (d !== cur) { cur = d; html += '<div class="hd"><span>' + esc(d) + '</span><button type="button" class="mb" data-day="' + esc(d) + '" title="More">⋮</button></div>'; }
      html += '<div class="hc" data-c="' + esc(x.c) + '"><div class="hc-x"><div class="hc-t">' + esc(x.title || "Chat") + '</div><div class="hc-s">' + (x.n || 0) + " messages · " + esc(showT(x.t1 || x.t)) + '</div></div><button type="button" class="mb" data-m="' + esc(x.c) + '" title="More">⋮</button></div>';
    });
    if (h.more) html += '<button type="button" class="ak-old" id="hhMore">⬇ Load older</button>';
  }
  m.innerHTML = html; m.scrollTop = 0;
}
function histClick(e) {
  var t = e.target, bt = t.closest && t.closest("button"), mn = document.querySelector(".ak-mnu"); if (mn) mn.remove();
  if (view !== "hist") return;
  if (bt && bt.id === "hhBack") { setView("chat"); render(true); return; }
  if (bt && bt.id === "hhNew") { newConv(); setView("chat"); render(true); paintStat(); return; }
  if (bt && bt.id === "hhMore") { loadHist(true); return; }
  if (bt && bt.id === "hhRetry") { hist.loaded = false; loadHist(false); return; }
  if (bt && bt.classList.contains("mb")) {
    var day = bt.getAttribute("data-day"), c = bt.getAttribute("data-m"); e.stopPropagation();
    var menu = document.createElement("div"); menu.className = "ak-mnu"; var inn = win.querySelector(".ak-in"), a = inn.getBoundingClientRect(), r = bt.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom - a.top + 2) + "px"; menu.style.right = Math.round(a.right - r.right) + "px";
    menu.innerHTML = '<button type="button">🗑 ' + (day ? "Delete all chats of " + esc(day) : "Delete this chat") + "</button>"; inn.appendChild(menu);
    menu.firstChild.onclick = function () { menu.remove(); if (day) { var ids = hist.items.filter(function (x) { return dayLabel(x.t1 || x.t) === day; }).map(function (x) { return x.c; }); delConvs(ids, "Delete all " + ids.length + " chats of " + day + "?"); } else delConvs([c], "Delete this chat?"); };
    return;
  }
  var row = t.closest && t.closest(".hc"); if (row) openConv(row.getAttribute("data-c"));
}
async function delConvs(cs, q) {
  if (!cs.length || !confirm(q)) return; var id = getId();
  try {
    if (id) { var r = cs.length === 1 ? await post({ action: "chat_del", id: id, conv: cs[0] }) : await post({ action: "chat_del_many", id: id, convs: cs }); if (!r || !r.ok) throw 0; } else lcDel(cs);
    hist.items = hist.items.filter(function (x) { return cs.indexOf(x.c) < 0; }); if (conv && cs.indexOf(conv.c) > -1) newConv();
  } catch (e) { hist.err = "Could not delete (offline?)"; }
  drawHist();
}
async function openConv(c) {
  var id = getId(), it = (hist && hist.items.filter(function (x) { return x.c === c; })[0]) || {}, msgs = [];
  var m = M(); m.innerHTML = '<div class="ak-st">Opening…</div>';
  try {
    if (id) { var r = await api({ getconv: c, id: id }); msgs = (r.msgs || []).map(function (x) { return { role: x.role, text: x.text, t: x.t }; }); }
    else { var a = lcGet().filter(function (x) { return x.c === c; })[0]; msgs = a ? a.msgs : []; }
  } catch (e) { hist.err = "Could not open this chat (offline?)"; drawHist(); return; }
  conv = { c: c, title: it.title || "", msgs: msgs, first: false, saved: true }; setView("chat"); render(true); paintStat();
}

// ---- sending (from the bar or from the window) ----
function append(m) { var x = M(); if (!x) return; var g = x.querySelector(".ak-st"); if (g && conv.msgs.length <= 1) g.remove(); x.insertAdjacentHTML("beforeend", bubble(m)); x.scrollTop = x.scrollHeight; }
function typing(on) { var x = M(); if (!x) return; var t = $("akTyp"); if (!on) { if (t) t.remove(); return; } if (t) return; x.insertAdjacentHTML("beforeend", '<div class="ak-typ" id="akTyp">🧸 <span>•</span><span>•</span><span>•</span></div>'); x.scrollTop = x.scrollHeight; }
function persist(cv, list, note) {   // saved after every answer (only when "Save my chat" is chosen)
  if (S.save !== "1") return; var id = getId();
  if (id) {
    var rows = list.map(function (m, i) { return { role: m.role, text: m.text, t: m.t, note: i === 0 ? note : "" }; });
    post({ action: "chat", id: id, conv: cv.c, title: cv.title, first: cv.first, msgs: rows }).then(function (r) { if (!r || !r.ok) throw 0; cv.first = false; cv.saved = true; hist = null; })
      .catch(function () { var x = M(); if (x && conv === cv && winVisible() && view === "chat") x.insertAdjacentHTML("beforeend", '<div class="ak-st">⚠️ Could not save this message (offline?)</div>'); });
  } else { lcSave(cv); cv.saved = true; hist = null; }
}
function busyUI(on) {
  if (winVisible() && view === "chat") typing(on);
  if (barOpen) { if (on) showAns('<span class="ab-dots">• • •</span>'); var g = $("abGo"); if (g) g.disabled = on || !S.setup; }
}
async function run(cv, um, note, h, shotP) {
  pending = true; lastRun = { cv: cv, um: um, note: note, h: h, shotP: shotP }; setInputOk(); busyUI(true);
  function live(txt) {   // show the words as they arrive (same time as the voice), in the chat window and in the small bar
    txt = String(txt || "").trim(); if (!txt || conv !== cv) return;
    if (winVisible() && view === "chat") { var x = M(); if (x) { var b = $("akLive"); if (!b) { typing(false); x.insertAdjacentHTML("beforeend", '<div class="ak-b b" id="akLive"><div class="ak-x"></div></div>'); b = $("akLive"); } b.firstChild.innerHTML = fmt(txt); x.scrollTop = x.scrollHeight; } }
    if (barOpen) showAns(fmt(txt));
  }
  function unlive() { var b = $("akLive"); if (b) b.remove(); }
  try {
    var r = tidy(await gemini(h, um.text, note, shotP, live)), bm = { role: "bear", text: r, t: ts() };
    unlive(); cv.msgs.push(bm); persist(cv, [um, bm], note); busyUI(false);
    if (conv === cv) { if (winVisible() && view === "chat") append(bm); if (barOpen) showAns(fmt(bm.text)); }
  } catch (e) {
    unlive(); busyUI(false); var msg = esc((e && e.message) || "error");
    if (conv === cv && winVisible() && view === "chat") { var x = M(); if (x) { x.insertAdjacentHTML("beforeend", '<div class="ak-st" id="akErr">🥲 No answer (' + msg + ') <button type="button" class="ak-retry" id="akRetry">Try again</button></div>'); x.scrollTop = x.scrollHeight; $("akRetry").onclick = function () { var er = $("akErr"); if (er) er.remove(); run(cv, um, note, h, shotP); }; } }
    if (barOpen) { showAns('🥲 No answer (' + msg + ') <button type="button" class="ak-retry" id="abRetry">Try again</button>'); $("abRetry").onclick = function () { run(cv, um, note, h, shotP); }; }
  } finally { pending = false; setInputOk(); }
}
function sendText(text) {
  if (!text || pending || !S.setup) return;
  stopVoice(); if (S.sound) audioUnlock();   // the tap / key press is what allows the phone to play sound
  var um = { role: "user", text: text, t: ts() }; if (!conv.title) conv.title = titleOf(text);
  var h = conv.msgs.slice(-HIST_TURNS); conv.msgs.push(um); if (winVisible() && view === "chat") append(um);
  run(conv, um, ctxNote(), h, captureShot(text));   // the screenshot is taken right now, while the page is still as the student sees it
}
function send() { var inp = $("akIn"), text = (inp.value || "").trim(); if (!text || pending || view !== "chat" || !S.setup) return; inp.value = ""; inp.style.height = "auto"; sendText(text); }

// ---------- the bear's "Ask AI" button (tiny, outside the bear so it covers nothing) ----------
function addBadge() {
  var b = $("bear"); if (!b || b.querySelector(".kask")) return;
  var k = document.createElement("button"); k.type = "button"; k.className = "kask"; k.title = "Chat with the AI bear"; k.setAttribute("aria-label", "Ask AI"); k.textContent = "💬 AI";
  ["pointerdown", "pointerup", "touchstart", "mousedown"].forEach(function (ev) { k.addEventListener(ev, function (e) { e.stopPropagation(); }); });   // the bear must not start dragging / petting
  k.addEventListener("click", function (e) { e.stopPropagation(); window.__askOpen(); });
  b.appendChild(k);
  setInterval(function () { var r = b.getBoundingClientRect(); k.classList.toggle("kr", r.left < 40); }, 800);   // bear near the left edge: the button goes to its right side
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
      box.innerHTML = '<input inputmode="numeric" maxlength="8" placeholder="Your ID, e.g. 25101003">';
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