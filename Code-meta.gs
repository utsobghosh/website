// =====================================================================================================
//  ORGANIZE FILES FROM THE WEBSITE (pin / move to a subject / archive)  -- ADD to your existing Code.gs
//  It only ADDS a few lines, so your own changes in Code.gs stay as they are.
//
//  3 small steps:
//   1) paste ALL of this file at the very bottom of your Code.gs
//   2) in doGet(e), right after the line   var p = e.parameter || {};   add this line:
//         if (p.meta) return json_(getMeta_());
//   3) in doPost(e), inside the lock (right after   lock.waitLock(20000);   +   try {   ) add this line:
//         if (b.action === "meta") return json_(setMeta_(b));
//   Then: Deploy > Manage deployments > (pencil) > Version: New version > Deploy.
//   The tab "FileMeta" is created automatically the first time you organize a file. It uses your existing ADMIN_PIN.
// =====================================================================================================

var META_SUBJECTS = ["dsa", "oop", "eee", "law", "math", "oth"];   // subjects a file can be moved to (the ids used on the website)

function metaSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("FileMeta") || ss.insertSheet("FileMeta");
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, 5).setValues([["Path", "Pin", "Subject", "Archived", "Updated"]]); sh.setFrozenRows(1); }
  return sh;
}
// everybody (students too) reads this: which files are pinned / moved / archived
function getMeta_() {
  var cache = CacheService.getScriptCache(), hit = cache.get("meta");
  if (hit) return JSON.parse(hit);
  var sh = metaSheet_(), last = sh.getLastRow(), items = {};
  if (last >= 2) {
    var v = sh.getRange(2, 1, last - 1, 4).getValues();
    for (var i = 0; i < v.length; i++) {
      var path = String(v[i][0]); if (!path) continue;
      var o = {};
      if (v[i][1] === 1 || v[i][1] === "1") o.pin = 1; else if (v[i][1] === 0 || v[i][1] === "0") o.pin = 0;
      if (v[i][2]) o.sj = String(v[i][2]);
      if (v[i][3] === 1 || v[i][3] === "1") o.ar = 1;
      if (Object.keys(o).length) items[path] = o;
    }
  }
  var out = { ok: true, items: items };
  try { cache.put("meta", JSON.stringify(out), 60); } catch (e) {}
  return out;
}
// only the admin (PIN) can change it; b = {pin, path, set:{pin:1|0|"", sj:"dsa"|"", ar:1|""}}
function setMeta_(b) {
  if (b.pin !== ADMIN_PIN) return { ok: false, error: "pin" };
  var path = String(b.path || "").slice(0, 400), set = b.set || {};
  if (!path) return { ok: false, error: "path" };
  var sh = metaSheet_(), last = sh.getLastRow(), row = 0, cur = ["", "", "", ""];
  if (last >= 2) {
    var paths = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < paths.length; i++) if (String(paths[i][0]) === path) { row = i + 2; break; }
    if (row) cur = sh.getRange(row, 1, 1, 4).getValues()[0];
  }
  var pin = cur[1], sj = cur[2], ar = cur[3];
  if ("pin" in set) pin = (set.pin === 1 || set.pin === "1") ? 1 : (set.pin === 0 || set.pin === "0") ? 0 : "";
  if ("sj" in set) sj = (META_SUBJECTS.indexOf(String(set.sj)) >= 0) ? String(set.sj) : "";
  if ("ar" in set) ar = (set.ar === 1 || set.ar === "1") ? 1 : "";
  var empty = (pin === "" && sj === "" && ar === "");
  if (row && empty) sh.deleteRow(row);                                                         // nothing special any more: the row is not needed
  else if (!empty) {
    var vals = [[path, pin, sj, ar, Utilities.formatDate(new Date(), "Asia/Dhaka", "d MMM yyyy, h:mm a")]];
    var rg = sh.getRange(row || (last + 1), 1, 1, 5); rg.setNumberFormat("@"); rg.setValues(vals);   // plain text: a file name can never become a formula
  }
  CacheService.getScriptCache().remove("meta");
  return { ok: true };
}
