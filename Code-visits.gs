// =====================================================================================================
//  VISITOR COUNTER (admin sees: how many visits, which ID how many times, how many guests)  -- ADD to your existing Code.gs
//
//  3 small steps:
//   1) paste ALL of this file at the very bottom of your Code.gs
//   2) in doGet(e), right after the line   var p = e.parameter || {};   add this line:
//         if (p.visits) return json_(getVisits_(String(p.pin || "")));
//   3) in doPost(e), inside the lock (right after   lock.waitLock(20000);   +   try {   ) add this line:
//         if (b.action === "visit") return json_(logVisit_(b));
//   Then: Deploy > Manage deployments > (pencil) > Version: New version > Deploy.
//   The tabs "Visits" and "VisitDays" are created automatically. Uses your existing ADMIN_PIN.
//   One row per DEVICE (not per visit), so the sheet stays small even with many visits.
// =====================================================================================================

function visitSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Visits");
  if (!sh) {
    sh = ss.insertSheet("Visits");
    sh.getRange("A:B").setNumberFormat("@"); sh.getRange("D:E").setNumberFormat("@");   // plain text: nothing can become a formula
    sh.getRange(1, 1, 1, 6).setValues([["Device", "ID", "Visits", "First visit", "Last visit", "LastTs"]]); sh.setFrozenRows(1);
  }
  return sh;
}
function visitDaySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("VisitDays");
  if (!sh) {
    sh = ss.insertSheet("VisitDays");
    sh.getRange("A:A").setNumberFormat("@");
    sh.getRange(1, 1, 1, 3).setValues([["Date", "Visits", "Guest visits"]]); sh.setFrozenRows(1);
  }
  return sh;
}

// called from the website (no PIN: every visitor sends it). b = {dev, id, add}  add=0 only tells us the ID of a device we already counted
function logVisit_(b) {
  var dev = String(b.dev || ""), id = String(b.id || "");
  if (!/^[a-z0-9]{10,24}$/.test(dev)) return { ok: false, error: "dev" };
  if (id && !/^\d{8}$/.test(id)) id = "";
  var add = (b.add === 0 || b.add === "0") ? 0 : 1;
  var sh = visitSheet_(), last = sh.getLastRow(), row = 0, now = new Date();
  var nowTxt = Utilities.formatDate(now, "Asia/Dhaka", "d MMM yyyy, h:mm a");
  if (last >= 2) {
    var devs = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < devs.length; i++) if (String(devs[i][0]) === dev) { row = i + 2; break; }
  }
  if (row) {
    var cur = sh.getRange(row, 1, 1, 6).getValues()[0];
    var newId = id || String(cur[1]);                                  // once a device told us its ID, keep it
    sh.getRange(row, 2, 1, 5).setValues([[newId, (Number(cur[2]) || 0) + add, String(cur[3]), add ? nowTxt : String(cur[4]), add ? now.getTime() : Number(cur[5]) || 0]]);
  } else {
    sh.getRange(last + 1, 1, 1, 6).setValues([[dev, id, Math.max(add, 1), nowTxt, nowTxt, now.getTime()]]);
    add = 1;
  }
  if (add) {                                                           // per-day totals
    var ds = visitDaySheet_(), dl = ds.getLastRow(), today = Utilities.formatDate(now, "Asia/Dhaka", "yyyy-MM-dd");
    if (dl >= 2 && String(ds.getRange(dl, 1).getValue()) === today) {
      var v = ds.getRange(dl, 2, 1, 2).getValues()[0];
      ds.getRange(dl, 2, 1, 2).setValues([[(Number(v[0]) || 0) + 1, (Number(v[1]) || 0) + (id ? 0 : 1)]]);
    } else ds.getRange(dl + 1, 1, 1, 3).setValues([[today, 1, id ? 0 : 1]]);
  }
  return { ok: true };
}

// admin only (PIN)
function getVisits_(pin) {
  if (pin !== ADMIN_PIN) return { ok: false, error: "pin" };
  var sh = visitSheet_(), last = sh.getLastRow(), byId = {}, g = { visits: 0, devices: 0, last: "", ts: 0 }, total = 0, devices = 0;
  if (last >= 2) {
    var v = sh.getRange(2, 1, last - 1, 6).getValues();
    for (var i = 0; i < v.length; i++) {
      if (!v[i][0]) continue;
      var id = String(v[i][1]), n = Number(v[i][2]) || 0, ts = Number(v[i][5]) || 0, lt = String(v[i][4]);
      total += n; devices++;
      var o = id ? (byId[id] = byId[id] || { id: id, visits: 0, devices: 0, last: "", ts: 0 }) : g;
      o.visits += n; o.devices++;
      if (ts >= o.ts) { o.ts = ts; o.last = lt; }
    }
  }
  var ids = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return b.visits - a.visits; });
  var ds = visitDaySheet_(), dl = ds.getLastRow(), days = [];
  if (dl >= 2) {
    var from = Math.max(2, dl - 6), dv = ds.getRange(from, 1, dl - from + 1, 3).getValues();
    for (var k = dv.length - 1; k >= 0; k--) days.push({ d: String(dv[k][0]), v: Number(dv[k][1]) || 0, g: Number(dv[k][2]) || 0 });
  }
  var today = Utilities.formatDate(new Date(), "Asia/Dhaka", "yyyy-MM-dd");
  return { ok: true, total: total, devices: devices, ids: ids, guest: g, days: days, today: today };
}
