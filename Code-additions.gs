// =====================================================================================================
//  ASK THE BEAR  (chat history, quiz answers, class pictures)  -- ADD to your existing Code.gs
//
//  3 small steps:
//   1) paste ALL of this file at the very bottom of your Code.gs
//   2) in doGet(e), right after the line   var p = e.parameter || {};   add these two lines:
//         if (p.chat)  return json_(getChat_(String(p.id || ""), Number(p.before) || 0, Math.min(Number(p.limit) || 30, 100)));
//         if (p.photo) return json_(getPhoto_(String(p.photo)));
//   3) in doPost(e), right after the line   lock.waitLock(20000);   +   try {   add this line:
//         if (b.action === "chat" || b.action === "chat_clear" || b.action === "quiz") return json_(handleAsk_(b));
//   Then: Deploy > Manage deployments > (pencil) > Version: New version > Deploy.  Google asks for one more permission
//   (to fetch a picture from another website): Allow it. The "Chats" and "QuizLog" tabs are created automatically.
// =====================================================================================================

var CHAT_KEEP = 500;   // messages kept per student
var PHOTO_URL = "";    // class picture of a student, with {id} in it, e.g. "https://example.edu/photos/{id}.jpg". Leave "" until you know it (then a cute placeholder is shown).

function chatSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Chats") || ss.insertSheet("Chats");
  if (sh.getLastRow() === 0) { sh.appendRow(["Time", "ID", "Role", "Text", "Note"]); sh.setFrozenRows(1); }
  return sh;
}
function quizSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("QuizLog") || ss.insertSheet("QuizLog");
  if (sh.getLastRow() === 0) { sh.appendRow(["Time", "ID", "Name", "Subject", "Question", "A", "B", "C", "D", "Correct answer", "Their answer", "Result", "Source"]); sh.setFrozenRows(1); }
  return sh;
}
function okId_(id) { return /^\d{8}$/.test(String(id || "")); }
function clip_(s, n) { return String(s == null ? "" : s).slice(0, n); }

// rows (sheet row numbers) of one student's messages
function idRows_(sh, id) {
  var last = sh.getLastRow(); if (last < 2) return [];
  var ids = sh.getRange(2, 2, last - 1, 1).getValues(), rows = [];
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) rows.push(i + 2);
  return rows;
}
// latest `limit` messages of a student; `before` = row number to continue from (0 = newest)
function getChat_(id, before, limit) {
  if (!okId_(id)) return { msgs: [], more: false };
  var sh = chatSheet_(), rows = idRows_(sh, id);
  var cand = before ? rows.filter(function (r) { return r < before; }) : rows;
  var slice = cand.slice(-limit);
  if (!slice.length) return { msgs: [], more: false };
  var first = slice[0], lastR = slice[slice.length - 1], want = {};
  slice.forEach(function (r) { want[r] = 1; });
  var vals = sh.getRange(first, 1, lastR - first + 1, 5).getValues(), msgs = [];
  for (var k = 0; k < vals.length; k++) {
    var r = first + k;
    if (want[r]) msgs.push({ r: r, t: String(vals[k][0]), role: vals[k][2] === "user" ? "user" : "bear", text: String(vals[k][3]) });
  }
  return { msgs: msgs, more: cand.length > slice.length };
}
function blankRows_(sh, rows) {   // old messages are blanked (one fast call); the sheet is tidied up now and then
  if (!rows.length) return;
  sh.getRangeList(rows.map(function (r) { return "A" + r + ":E" + r; })).clearContent();
}
function compactChat_(sh) {
  var last = sh.getLastRow(); if (last < 2) return;
  var all = sh.getRange(2, 1, last - 1, 5).getValues(), keep = all.filter(function (r) { return String(r[1]) !== ""; });
  if (all.length - keep.length < 300) return;
  sh.getRange(2, 1, last - 1, 5).clearContent();
  if (keep.length) { var rg = sh.getRange(2, 1, keep.length, 5); rg.setNumberFormat("@"); rg.setValues(keep); }
}
function handleAsk_(b) {   // called inside doPost while the script lock is held
  var id = String(b.id || "");
  if (!okId_(id)) return { ok: false, error: "id" };
  if (b.action === "chat") {
    var list = (b.msgs || []).slice(0, 4);
    if (!list.length) return { ok: false };
    var sh = chatSheet_();
    var vals = list.map(function (m) { return [clip_(m.t, 40), id, m.role === "user" ? "user" : "bear", clip_(m.text, 6000), clip_(m.note, 200)]; });
    var rg = sh.getRange(sh.getLastRow() + 1, 1, vals.length, 5);
    rg.setNumberFormat("@"); rg.setValues(vals);                       // plain text: nothing typed by a student can turn into a formula
    var rows = idRows_(sh, id);
    if (rows.length > CHAT_KEEP + 30) { blankRows_(sh, rows.slice(0, rows.length - CHAT_KEEP)); compactChat_(sh); }
    return { ok: true };
  }
  if (b.action === "chat_clear") { var s2 = chatSheet_(); blankRows_(s2, idRows_(s2, id)); compactChat_(s2); return { ok: true }; }
  if (b.action === "quiz") {
    var o = (b.o || []).slice(0, 4); while (o.length < 4) o.push("");
    var qs = quizSheet_(), r2 = qs.getRange(qs.getLastRow() + 1, 1, 1, 13);
    r2.setNumberFormat("@");
    r2.setValues([[Utilities.formatDate(new Date(), "Asia/Dhaka", "d MMM, yyyy h:mm a"), id, clip_(b.name, 80), clip_(b.subj, 80), clip_(b.q, 600),
      clip_(o[0], 300), clip_(o[1], 300), clip_(o[2], 300), clip_(o[3], 300), clip_(b.a, 300), clip_(b.pick, 300), clip_(b.res, 12), clip_(b.src, 12)]]);
    return { ok: true };
  }
  return { ok: false };
}
// class picture (only works if PHOTO_URL is a link that opens WITHOUT logging in); returns a small data: picture or {ok:false}
function getPhoto_(id) {
  try {
    if (!okId_(id) || !PHOTO_URL) return { ok: false, error: "nourl" };
    var cache = CacheService.getScriptCache(), hit = cache.get("ph" + id);
    if (hit) return { ok: true, data: hit };
    var resp = UrlFetchApp.fetch(PHOTO_URL.replace("{id}", id), { muteHttpExceptions: true, followRedirects: true });
    var h = resp.getHeaders(), ct = String(h["Content-Type"] || h["content-type"] || "");
    if (resp.getResponseCode() !== 200 || ct.indexOf("image") !== 0) return { ok: false };
    var bytes = resp.getContent(); if (bytes.length > 150000) return { ok: false };
    var data = "data:" + ct.split(";")[0] + ";base64," + Utilities.base64Encode(bytes);
    if (data.length < 95000) cache.put("ph" + id, data, 21600);
    return { ok: true, data: data };
  } catch (err) { return { ok: false }; }
}
