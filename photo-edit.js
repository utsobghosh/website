/* photo-edit.js : a small "Paint" for ONE photo. Loaded ON DEMAND by pdf-edit.js and photos-pdf.js (only when someone taps ✏ Edit), so it costs nothing until it is used.
   window.photoEdit(file, {title}) -> Promise of the edited photo as a JPG File (or null if cancelled / nothing changed).
   Tools: pen, marker, eraser (paints white), text, shapes, SELECT (cut / copy / delete an area and move it), CROP, SIZE (drag the edges outward to add space on any side, inward to remove it, like MS Paint),
   PICTURE (add another photo on top) and PASTE (Ctrl+V of a screenshot), rotate, undo / redo, reset.
   Two fingers = zoom and move the picture. One finger = the tool.
   HOW IT WORKS (so it stays light on a phone): the photo is shrunk to 1800 px once; every change is stored as a small "operation" and the picture is drawn again from them,
   so undo / redo cost almost no memory (no copies of the whole picture). */
(function () {
if (window.photoEdit) return;
var MAXS = 1800, COLORS = ["#111111", "#e53935", "#1e88e5", "#43a047", "#fdd835", "#ffffff", "#fb8c00", "#8e24aa"], ZTOP = 100000, STACK = [];
var IC = {
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
  img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  hl: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  erase: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  shape: '<rect x="3" y="9" width="12" height="12" rx="1"/><circle cx="15" cy="9" r="6"/>',
  rot: '<path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  reset: '<path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  undo: '<path d="M9 14L4 9l5-5M20 20v-7a4 4 0 0 0-4-4H4"/>',
  redo: '<path d="M15 14l5-5-5-5M4 20v-7a4 4 0 0 1 4-4h12"/>',
  ok: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  sel: '<rect x="3" y="3" width="18" height="18" rx="1" stroke-dasharray="3 3"/>',
  size: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  paste: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'
};
function svg(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + "</svg>"; }
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function mk(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function copy(c) { var n = mk(c.width, c.height); n.getContext("2d").drawImage(c, 0, 0); return n; }

function css() {
  if (document.getElementById("pxeCss")) return;
  var s = el("style"); s.id = "pxeCss";
  s.textContent =
    ".pxe{position:fixed;inset:0;background:#1b1b1b;color:#fff;display:flex;flex-direction:column;font:14px system-ui,sans-serif;-webkit-user-select:none;user-select:none;overscroll-behavior:contain}" +
    ".pxe button{font:inherit;color:inherit;margin:0;box-shadow:none;transform:none}" +
    ".pxe-top,.pxe-tools{display:flex;align-items:center;gap:2px;padding:4px 6px;background:#000}" +
    ".pxe-top{padding-top:calc(4px + env(safe-area-inset-top,0px))}.pxe-tools{padding-bottom:calc(4px + env(safe-area-inset-bottom,0px));overflow-x:auto;-webkit-overflow-scrolling:touch}" +
    ".pxe-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;opacity:.85;padding:0 4px}" +
    ".pxe-b{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:46px;padding:5px 6px;border:0;border-radius:10px;background:none;cursor:pointer;line-height:1.1;-webkit-tap-highlight-color:transparent}" +
    ".pxe-b i{font-style:normal;font-size:9.5px;font-weight:600;white-space:nowrap}.pxe-b[disabled]{opacity:.3}.pxe-b.on{background:var(--accent,#8a4dff);color:var(--onacc,#fff)}" +
    ".pxe-b.go{background:var(--accent,#8a4dff);color:var(--onacc,#fff)}" +
    ".pxe-stage{flex:1;min-height:0;position:relative;overflow:hidden;background:#2a2a2a;touch-action:none}" +
    ".pxe-wrap{position:absolute;left:0;top:0;transform-origin:0 0;background:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.25),0 4px 20px rgba(0,0,0,.6)}" +
    ".pxe-wrap canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}.pxe-ov{pointer-events:none}" +
    ".pxe-opt{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 8px;background:#111;min-height:34px}" +
    ".pxe-opt .sw{width:26px;height:26px;border-radius:50%;border:2px solid #666;padding:0;cursor:pointer}.pxe-opt .sw.on{border-color:#fff;box-shadow:0 0 0 2px var(--accent,#8a4dff)}" +
    ".pxe-opt input[type=range]{flex:1 1 90px;min-width:70px;max-width:200px}.pxe-opt input[type=color]{width:30px;height:28px;padding:0;border:0;background:none}" +
    ".pxe-btn{padding:6px 12px;border:1px solid #777;border-radius:10px;background:#222;cursor:pointer}.pxe-btn.p{background:var(--accent,#8a4dff);border-color:transparent;color:var(--onacc,#fff);font-weight:700}.pxe-btn.on{border-color:var(--accent,#8a4dff);background:#333}" +
    ".pxe-hint{font-size:12px;opacity:.75}" +
    ".pxe-modal{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px;z-index:5}" +
    ".pxe-box{background:#2b2540;border-radius:14px;padding:14px;width:min(420px,100%);display:flex;flex-direction:column;gap:10px}.pxe-box textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:8px;border-radius:8px;border:1px solid #666;background:#111;color:#fff;-webkit-user-select:text;user-select:text}" +
    ".pxe-row{display:flex;gap:8px;justify-content:flex-end}";
  document.head.appendChild(s);
}

function decode(file, max) {
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(file), i = new Image();
    i.onload = function () {
      var w = i.naturalWidth, h = i.naturalHeight, k = Math.min(1, max / Math.max(w, h)), c = mk(w * k, h * k), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c);
    };
    i.onerror = function () { URL.revokeObjectURL(u); rej(new Error("This photo type can't be opened here. Please choose a JPG or PNG.")); };
    i.src = u;
  });
}

// ----- the operations: every change is one small object; the picture is drawn from the first one to the last -----
function path(x, pts) {
  if (!pts.length) return;
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) x.lineTo(pts[0][0] + 0.01, pts[0][1] + 0.01);
  else { for (var i = 1; i < pts.length - 1; i++) x.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); var l = pts[pts.length - 1]; x.lineTo(l[0], l[1]); }
}
function apply(c, o, P) {
  if (o.t === "crop") { var n = mk(o.w, o.h), cg = n.getContext("2d"); if (o.x < 0 || o.y < 0 || o.x + o.w > c.width || o.y + o.h > c.height) { cg.fillStyle = o.f || "#fff"; cg.fillRect(0, 0, o.w, o.h); } cg.drawImage(c, -o.x, -o.y); return n; }   // a box bigger than the picture = more space around it
  if (o.t === "rot") { var q = ((o.d % 360) + 360) % 360, sw = q % 180, n2 = mk(sw ? c.height : c.width, sw ? c.width : c.height), g = n2.getContext("2d"); g.translate(n2.width / 2, n2.height / 2); g.rotate(q * Math.PI / 180); g.drawImage(c, -c.width / 2, -c.height / 2); return n2; }
  var x = c.getContext("2d"); x.save(); x.lineCap = "round"; x.lineJoin = "round";
  if (o.t === "s") {
    x.lineWidth = o.w;
    if (o.k === "erase") x.strokeStyle = o.pv ? "rgba(150,150,150,.6)" : "#fff";
    else if (o.k === "hl") { x.strokeStyle = o.c; if (o.pv) x.globalAlpha = 0.4; else x.globalCompositeOperation = "multiply"; }   // marker: like a real highlighter, the text under it stays readable
    else x.strokeStyle = o.c;
    path(x, o.pts); x.stroke();
  } else if (o.t === "sh") {
    x.lineWidth = o.w; x.strokeStyle = o.c; x.fillStyle = o.c;
    if (o.k === "line" || o.k === "arrow") {
      x.beginPath(); x.moveTo(o.x1, o.y1); x.lineTo(o.x2, o.y2); x.stroke();
      if (o.k === "arrow") { var a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), L = Math.max(o.w * 4, 14); x.beginPath(); x.moveTo(o.x2, o.y2); x.lineTo(o.x2 - L * Math.cos(a - 0.45), o.y2 - L * Math.sin(a - 0.45)); x.lineTo(o.x2 - L * Math.cos(a + 0.45), o.y2 - L * Math.sin(a + 0.45)); x.closePath(); x.fill(); }
    } else if (o.k === "rect") x.strokeRect(Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1));
    else { x.beginPath(); x.ellipse((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, Math.abs(o.x2 - o.x1) / 2 || 1, Math.abs(o.y2 - o.y1) / 2 || 1, 0, 0, Math.PI * 2); x.stroke(); }
  } else if (o.t === "tx") {
    x.font = "bold " + o.fs + "px system-ui,'Segoe UI','Noto Sans Bengali',sans-serif"; x.textBaseline = "top";
    var ls = String(o.s).split("\n"), lh = o.fs * 1.25, w = 0; ls.forEach(function (l) { w = Math.max(w, x.measureText(l).width); });
    if (o.bg) { x.fillStyle = "#fff"; x.fillRect(o.x - o.fs * 0.25, o.y - o.fs * 0.15, w + o.fs * 0.5, lh * ls.length + o.fs * 0.1); }
    x.fillStyle = o.c; ls.forEach(function (l, i) { x.fillText(l, o.x, o.y + i * lh); });
  } else if (o.t === "fill") { x.fillStyle = o.c || "#fff"; x.fillRect(o.x, o.y, o.w, o.h);
  } else if (o.t === "im" || o.t === "mv") {
    if (o.cut) { x.fillStyle = "#fff"; x.fillRect(o.sx, o.sy, o.sw, o.sh); }   // "cut": the place it came from becomes white
    var p = P[o.p]; x.drawImage(p, o.x, o.y, o.w, o.h);
    if (o.b) { x.strokeStyle = "#111"; x.lineWidth = o.b; x.strokeRect(o.x, o.y, o.w, o.h); }
  }
  x.restore(); return c;
}

// ----- the editor -----
function open(src, opts) {
  opts = opts || {}; css();
  return new Promise(function (resolve) {
    var S = { base: src, ops: [], redo: [], pieces: [], tool: opts.startTool || "pen", col: { pen: "#e53935", hl: "#fdd835", shape: "#e53935", text: "#111111", size: "#ffffff" }, size: 6, tsize: 36, shape: "rect", border: true, crop: null, place: null, act: null, v: { s: 1, tx: 0, ty: 0 }, dims: "" };
    var R = el("div", "pxe"); R.style.zIndex = ++ZTOP;
    R.innerHTML =
      '<div class="pxe-top"><button type="button" class="pxe-b" data-a="close">' + svg("x") + "<i>Cancel</i></button><div class=\"pxe-title\"></div>" +
      '<button type="button" class="pxe-b" data-a="undo">' + svg("undo") + "<i>Undo</i></button>" + '<button type="button" class="pxe-b" data-a="redo">' + svg("redo") + "<i>Redo</i></button>" +
      '<button type="button" class="pxe-b go" data-a="done">' + svg("ok") + "<i>" + (opts.doneLabel || "Done") + "</i></button></div>" +
      '<div class="pxe-stage"><div class="pxe-wrap"><canvas class="pxe-cv"></canvas><canvas class="pxe-ov"></canvas></div></div><div class="pxe-opt"></div>' +
      '<div class="pxe-tools">' + [["pen", "Pen"], ["hl", "Marker"], ["erase", "Eraser"], ["text", "Text"], ["shape", "Shape"], ["sel", "Select"], ["crop", "Crop"], ["size", "Size"], ["img", "Picture"], ["paste", "Paste"]].map(function (t) { return '<button type="button" class="pxe-b" data-t="' + t[0] + '">' + svg(t[0]) + "<i>" + t[1] + "</i></button>"; }).join("") +
      '<button type="button" class="pxe-b" data-a="rot">' + svg("rot") + "<i>Rotate</i></button><button type=\"button\" class=\"pxe-b\" data-a=\"reset\">" + svg("reset") + "<i>Reset</i></button></div>";
    document.body.appendChild(R); STACK.push(R);
    R.querySelector(".pxe-title").textContent = opts.title || "Edit photo";
    var stage = R.querySelector(".pxe-stage"), wrap = R.querySelector(".pxe-wrap"), cv = R.querySelector(".pxe-cv"), ov = R.querySelector(".pxe-ov"), optb = R.querySelector(".pxe-opt"), tools = R.querySelector(".pxe-tools");
    var ptrs = {}, nptr = 0, pinch = null, lock = false;
    var szBg = el("div"), szFg = el("div");   // the new size while you drag the edges (drawn with plain page elements, so it can go outside the picture)
    szBg.style.cssText = "position:absolute;display:none;pointer-events:none"; szFg.style.cssText = "position:absolute;display:none;pointer-events:none;border:2px dashed #fff;box-sizing:border-box;box-shadow:0 0 0 1px #000";
    [["nw", 0, 0], ["n", 50, 0], ["ne", 100, 0], ["e", 100, 50], ["se", 100, 100], ["s", 50, 100], ["sw", 0, 100], ["w", 0, 50]].forEach(function (h) { var d = el("div"); d.style.cssText = "position:absolute;width:16px;height:16px;background:#fff;border:2px solid #000;border-radius:50%;box-sizing:border-box;left:" + h[1] + "%;top:" + h[2] + "%;transform:translate(-50%,-50%)"; szFg.appendChild(d); });
    stage.insertBefore(szBg, wrap); stage.appendChild(szFg);
    function layoutSize() {
      var c = S.crop, on = S.tool === "size" && c; szBg.style.display = szFg.style.display = on ? "block" : "none"; if (!on) return;
      var s = S.v.s, L = S.v.tx + c.x * s + "px", T = S.v.ty + c.y * s + "px", W = c.w * s + "px", H = c.h * s + "px";
      szBg.style.left = szFg.style.left = L; szBg.style.top = szFg.style.top = T; szBg.style.width = szFg.style.width = W; szBg.style.height = szFg.style.height = H; szBg.style.background = S.col.size;
      var i = R.querySelector("#pxeSz"); if (i) i.textContent = Math.round(c.w) + " × " + Math.round(c.h) + " px";
    }

    function vsize() { return { w: stage.clientWidth || 600, h: stage.clientHeight || 800 }; }
    function applyView() { wrap.style.transform = "translate(" + S.v.tx + "px," + S.v.ty + "px) scale(" + S.v.s + ")"; layoutSize(); }
    function fit() { var z = vsize(), s = Math.min(z.w / cv.width, z.h / cv.height) * 0.98; S.v = { s: s, tx: (z.w - cv.width * s) / 2, ty: (z.h - cv.height * s) / 2 }; applyView(); }
    function render(refit) {   // draw the picture again from the first operation to the last
      var c = copy(S.base); S.ops.forEach(function (o) { c = apply(c, o, S.pieces); });
      var d = c.width + "x" + c.height;
      cv.width = ov.width = c.width; cv.height = ov.height = c.height; wrap.style.width = c.width + "px"; wrap.style.height = c.height + "px";
      cv.getContext("2d").drawImage(c, 0, 0);
      if (refit || d !== S.dims) fit(); S.dims = d; buttons(); drawOv();
    }
    function buttons() { R.querySelector('[data-a="undo"]').disabled = !S.ops.length; R.querySelector('[data-a="redo"]').disabled = !S.redo.length; [].forEach.call(tools.querySelectorAll("[data-t]"), function (b) { b.classList.toggle("on", b.getAttribute("data-t") === S.tool); }); }
    function kpx() { var r = ov.getBoundingClientRect(); return r.width ? ov.width / r.width : 1; }   // image pixels per screen pixel
    function pt(e) { var r = ov.getBoundingClientRect(), w = r.width || ov.width, h = r.height || ov.height; return { x: (e.clientX - (r.left || 0)) * ov.width / w, y: (e.clientY - (r.top || 0)) * ov.height / h }; }
    function lw() { var u = cv.width / 900; return S.tool === "hl" ? S.size * u * 2.5 : S.tool === "erase" ? S.size * u * 3 : S.size * u; }
    function commit(o) { S.ops.push(o); S.redo = []; apply(cv, o, S.pieces); buttons(); }
    function cancelAct() { S.act = null; drawOv(); }

    // ----- overlay: live preview of the stroke / shape, the crop box, the picture being placed -----
    function drawOv() {
      var x = ov.getContext("2d"); x.clearRect(0, 0, ov.width, ov.height);
      var a = S.act, k = kpx();
      if (a && a.kind === "stroke") apply(ov, { t: "s", k: a.k, c: S.col[a.k === "erase" ? "pen" : a.k], w: lw(), pts: a.pts, pv: 1 });
      else if (a && a.kind === "shape") apply(ov, { t: "sh", k: S.shape, c: S.col.shape, w: S.size * cv.width / 900, x1: a.a.x, y1: a.a.y, x2: a.b.x, y2: a.b.y });
      if ((S.tool === "crop" || S.tool === "size") && S.crop) {
        var c = S.crop; x.save(); x.fillStyle = "rgba(0,0,0,.55)"; x.fillRect(0, 0, ov.width, ov.height); x.clearRect(c.x, c.y, c.w, c.h);
        if (S.tool === "crop") { x.strokeStyle = "#fff"; x.lineWidth = 2 * k; x.strokeRect(c.x, c.y, c.w, c.h); x.fillStyle = "#fff"; hpts(c).forEach(function (h) { x.fillRect(h[1] - 7 * k, h[2] - 7 * k, 14 * k, 14 * k); }); }
        x.restore();
      }
      if (S.tool === "sel" && S.crop) {
        var q = S.crop; x.save(); x.lineWidth = 2 * k; x.strokeStyle = "#000"; x.strokeRect(q.x, q.y, q.w, q.h); x.strokeStyle = "#fff"; x.setLineDash([8 * k, 6 * k]); x.strokeRect(q.x, q.y, q.w, q.h); x.setLineDash([]); x.fillStyle = "#fff";
        hpts(q).forEach(function (h) { x.fillRect(h[1] - 6 * k, h[2] - 6 * k, 12 * k, 12 * k); }); x.restore();
      }
      layoutSize();
      if (S.tool === "place" && S.place) {
        var p = S.place; x.save(); if (p.src && p.cut) { x.fillStyle = "#fff"; x.fillRect(p.src.x, p.src.y, p.src.w, p.src.h); } x.drawImage(p.cv, p.x, p.y, p.w, p.h); x.strokeStyle = "#fff"; x.lineWidth = 2 * k; x.setLineDash([8 * k, 6 * k]); x.strokeRect(p.x, p.y, p.w, p.h); x.setLineDash([]); x.fillStyle = "#fff";
        hpts(p, true).forEach(function (h) { x.fillRect(h[1] - 8 * k, h[2] - 8 * k, 16 * k, 16 * k); }); x.restore();
      }
    }
    function hpts(r, corners) { var a = [["nw", r.x, r.y], ["ne", r.x + r.w, r.y], ["sw", r.x, r.y + r.h], ["se", r.x + r.w, r.y + r.h]]; return corners ? a : a.concat([["n", r.x + r.w / 2, r.y], ["s", r.x + r.w / 2, r.y + r.h], ["w", r.x, r.y + r.h / 2], ["e", r.x + r.w, r.y + r.h / 2]]); }
    function hit(r, p, corners) { var k = kpx(), best = null, bd = 30 * k; hpts(r, corners).forEach(function (h) { var d = Math.hypot(p.x - h[1], p.y - h[2]); if (d < bd) { bd = d; best = h[0]; } }); if (best) return best; return (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) ? "move" : null; }

    // ----- options bar (changes with the tool) -----
    function options() {
      var t = S.tool, h = "";
      function sw() { var c = S.col[t === "erase" ? "pen" : t]; return COLORS.map(function (k) { return '<button type="button" class="sw' + (k === c ? " on" : "") + '" data-c="' + k + '" style="background:' + k + '" aria-label="Colour"></button>'; }).join("") + '<input type="color" data-cc value="' + c + '" aria-label="Other colour">'; }
      if (t === "pen" || t === "hl") h = sw() + '<input type="range" min="1" max="40" value="' + S.size + '" data-sz aria-label="Size">';
      else if (t === "erase") h = '<span class="pxe-hint">Paints white. Size:</span><input type="range" min="1" max="40" value="' + S.size + '" data-sz aria-label="Size">';
      else if (t === "shape") h = ["line", "arrow", "rect", "ellipse"].map(function (k) { return '<button type="button" class="pxe-btn' + (S.shape === k ? " on" : "") + '" data-sh="' + k + '">' + { line: "Line", arrow: "Arrow", rect: "Box", ellipse: "Oval" }[k] + "</button>"; }).join("") + sw() + '<input type="range" min="1" max="30" value="' + S.size + '" data-sz aria-label="Size">';
      else if (t === "text") h = '<span class="pxe-hint">Tap the picture where the text should go.</span>' + sw();
      else if (t === "sel") h = S.crop ? '<button type="button" class="pxe-btn p" data-a="selcut">Cut &amp; move</button><button type="button" class="pxe-btn" data-a="selcopy">Copy &amp; move</button><button type="button" class="pxe-btn" data-a="seldel">Delete</button><button type="button" class="pxe-btn" data-a="selx">Deselect</button>' : '<span class="pxe-hint">Drag on the picture to select an area.</span>';
      else if (t === "crop") h = '<span class="pxe-hint">Drag the corners or sides, then:</span><button type="button" class="pxe-btn p" data-a="cropok">Crop</button><button type="button" class="pxe-btn" data-a="cropx">Cancel crop</button>';
      else if (t === "size") h = '<span class="pxe-hint">Drag the round handles: outward adds space, inward cuts.</span><b class="pxe-hint" id="pxeSz"></b><span class="pxe-hint">Space colour:</span>' + sw() + '<button type="button" class="pxe-btn p" data-a="cropok">Apply</button><button type="button" class="pxe-btn" data-a="cropx">Cancel</button>';
      else if (t === "place") h = '<span class="pxe-hint">Drag it to move, drag a corner to resize.</span>' + (S.place && !S.place.src ? '<button type="button" class="pxe-btn" data-a="placecrop">Crop first</button>' : '') + '<label><input type="checkbox" data-bd' + (S.place && S.place.b ? " checked" : "") + '> Border</label><button type="button" class="pxe-btn p" data-a="placeok">Place here</button><button type="button" class="pxe-btn" data-a="placex">Cancel</button>';
      optb.innerHTML = h;
    }
    function setTool(t) {
      S.tool = t; S.act = null; S.place = t === "place" ? S.place : null;
      if (t === "crop") S.crop = { x: cv.width * 0.05, y: cv.height * 0.05, w: cv.width * 0.9, h: cv.height * 0.9 }; else if (t === "size") S.crop = { x: 0, y: 0, w: cv.width, h: cv.height }; else S.crop = null;
      options(); buttons(); drawOv();
    }

    // ----- actions -----
    function crop() { var c = S.crop; if (!c) return; var o = { t: "crop", x: Math.round(c.x), y: Math.round(c.y), w: Math.max(8, Math.round(c.w)), h: Math.max(8, Math.round(c.h)), f: S.tool === "size" ? S.col.size : "#fff" }; S.ops.push(o); S.redo = []; S.crop = null; setTool("pen"); render(true); }
    function startPlace(pc, src, cut) {   // src = the area it was picked up from (Select tool); without it = a picture from outside
      var w, h, x, y;
      if (src) { w = src.w; h = src.h; x = src.x + (cut ? 0 : 16 * kpx()); y = src.y + (cut ? 0 : 16 * kpx()); }
      else { w = Math.min(cv.width * 0.6, pc.width); h = w * pc.height / pc.width; if (h > cv.height * 0.8) { h = cv.height * 0.8; w = h * pc.width / pc.height; } x = (cv.width - w) / 2; y = (cv.height - h) / 2; }
      S.place = { cv: pc, x: x, y: y, w: w, h: h, src: src || null, cut: !!(src && cut), b: !src };
      setTool("place");
    }
    function placeOk() {
      var p = S.place; if (!p) return; var idx = S.pieces.push(p.cv) - 1;
      var o = { t: p.src ? "mv" : "im", p: idx, x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h), b: p.b ? Math.max(2, Math.round(cv.width / 450)) : 0 };
      if (p.src) { o.sx = p.src.x; o.sy = p.src.y; o.sw = p.src.w; o.sh = p.src.h; o.cut = p.cut ? 1 : 0; }
      S.place = null; commit(o); setTool("pen");
    }
    function pickPiece(file) {   // a screenshot / photo from outside: it goes straight onto the picture, ready to move and resize ("Crop first" is there if you only want a part)
      decode(file, 1600).then(function (pc) { startPlace(pc); }).catch(function (e) { alert((e && e.message) || "Could not open that picture."); });
    }
    function pasteBtn() {
      if (!(navigator.clipboard && navigator.clipboard.read)) { alert("Press Ctrl+V to paste a picture you copied."); return; }
      navigator.clipboard.read().then(function (items) {
        var found = false;
        items.forEach(function (it) { var t = (it.types || []).filter(function (x) { return /^image\//.test(x); })[0]; if (t && !found) { found = true; it.getType(t).then(function (b) { pickPiece(new File([b], "pasted.png", { type: t })); }); } });
        if (!found) alert("There is no picture in the clipboard. Copy or screenshot one first.");
      }).catch(function () { alert("Your browser did not allow reading the clipboard. Press Ctrl+V instead."); });
    }
    function askText(p) {
      var m = el("div", "pxe-modal", '<div class="pxe-box"><b>Text</b><textarea rows="3" placeholder="Type here…"></textarea><label>Size <input type="range" min="12" max="120" value="' + S.tsize + '" data-ts></label><label><input type="checkbox" checked data-tb> White box behind the text</label><div class="pxe-row"><button type="button" class="pxe-btn" data-k="x">Cancel</button><button type="button" class="pxe-btn p" data-k="ok">Add</button></div></div>');
      R.appendChild(m); var ta = m.querySelector("textarea"); setTimeout(function () { try { ta.focus(); } catch (e) {} }, 30);
      m.addEventListener("click", function (e) {
        var k = e.target.getAttribute && e.target.getAttribute("data-k"); if (!k) return;
        if (k === "ok") { var s = ta.value.replace(/\s+$/, ""); if (s) { S.tsize = +m.querySelector("[data-ts]").value; commit({ t: "tx", x: p.x, y: p.y, s: s, c: S.col.text, fs: Math.round(S.tsize * cv.width / 900), bg: m.querySelector("[data-tb]").checked ? 1 : 0 }); } }
        m.remove();
      });
    }
    function undo() { var o = S.ops.pop(); if (!o) return; S.redo.push(o); S.crop = null; render(true); if (S.tool === "crop" || S.tool === "size") setTool(S.tool); }
    function redo() { var o = S.redo.pop(); if (!o) return; S.ops.push(o); render(true); }
    function close(res) {
      document.removeEventListener("keydown", key, true); window.removeEventListener("paste", onPaste, true);
      STACK.splice(STACK.indexOf(R), 1); R.remove(); resolve(res);
    }
    function done() { var out = copy(cv); close(S.ops.length || opts.always ? out : null); }
    function key(e) {
      if (STACK[STACK.length - 1] !== R) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); R.querySelector('[data-a="close"]').click(); }
      else if ((e.ctrlKey || e.metaKey) && /^[zy]$/i.test(e.key) && !/TEXTAREA|INPUT/.test((e.target || {}).tagName || "")) { e.preventDefault(); (e.key.toLowerCase() === "z" && !e.shiftKey) ? undo() : redo(); }
    }
    function onPaste(e) {   // Ctrl+V of a copied picture = add it on top
      if (STACK[STACK.length - 1] !== R) return; var cd = e.clipboardData; if (!cd) return; var f = null;
      if (cd.files && cd.files.length) f = cd.files[0]; else if (cd.items) [].forEach.call(cd.items, function (it) { if (!f && it.kind === "file") f = it.getAsFile(); });
      if (f && /^image\//.test(f.type || "")) { e.preventDefault(); pickPiece(f); }
    }

    // ----- clicks -----
    R.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button,input"); if (!b) return;
      var a = b.getAttribute("data-a"), t = b.getAttribute("data-t"), c = b.getAttribute("data-c"), sh = b.getAttribute("data-sh");
      if (t) { if (t === "paste") { pasteBtn(); return; } if (t === "img") { var fi = el("input"); fi.type = "file"; fi.accept = "image/*"; fi.onchange = function () { if (fi.files[0]) pickPiece(fi.files[0]); }; fi.click(); return; } setTool(t); return; }
      if (c) { S.col[S.tool === "erase" ? "pen" : S.tool] = c; options(); layoutSize(); return; }
      if (sh) { S.shape = sh; options(); return; }
      if (a === "close") { if (S.ops.length && !confirm("Throw away your changes?")) return; close(null); }
      else if (a === "done") done();
      else if (a === "undo") undo(); else if (a === "redo") redo();
      else if (a === "rot") { if (S.tool === "place") return; S.ops.push({ t: "rot", d: 90 }); S.redo = []; S.crop = null; render(true); if (S.tool === "crop" || S.tool === "size") setTool(S.tool); }
      else if (a === "reset") { if (!S.ops.length) return; if (!confirm("Remove all your changes to this photo?")) return; S.redo = []; S.ops = []; S.place = null; setTool("pen"); render(true); }
      else if (a === "cropok") crop(); else if (a === "cropx") setTool("pen");
      else if (a === "placeok") placeOk(); else if (a === "placex") { S.place = null; setTool("pen"); }
      else if (a === "placecrop") { var pl = S.place; if (!pl) return; open(pl.cv, { title: "Crop the part you want, then tap Use this", doneLabel: "Use this", startTool: "crop", always: true }).then(function (res) { if (!res || S.place !== pl) return; var f = pl.w / pl.cv.width, nw = res.width * f, nh = res.height * f; pl.x += (pl.w - nw) / 2; pl.y += (pl.h - nh) / 2; pl.w = nw; pl.h = nh; pl.cv = res; drawOv(); }); }
      else if (a === "selcut" || a === "selcopy") { var c0 = S.crop; if (!c0) return; var r0 = { x: Math.round(c0.x), y: Math.round(c0.y), w: Math.max(1, Math.round(c0.w)), h: Math.max(1, Math.round(c0.h)) }, pc = mk(r0.w, r0.h); pc.getContext("2d").drawImage(cv, -r0.x, -r0.y); startPlace(pc, r0, a === "selcut"); }
      else if (a === "seldel") { var c2 = S.crop; if (!c2) return; commit({ t: "fill", x: Math.round(c2.x), y: Math.round(c2.y), w: Math.round(c2.w), h: Math.round(c2.h), c: "#fff" }); S.crop = null; options(); drawOv(); }
      else if (a === "selx") { S.crop = null; options(); drawOv(); }
    });
    R.addEventListener("input", function (e) {
      var t = e.target;
      if (t.hasAttribute("data-sz")) S.size = +t.value;
      else if (t.hasAttribute("data-cc")) { S.col[S.tool === "erase" ? "pen" : S.tool] = t.value; [].forEach.call(optb.querySelectorAll(".sw"), function (s) { s.classList.remove("on"); }); layoutSize(); }
      else if (t.hasAttribute("data-bd")) { if (S.place) S.place.b = t.checked; }
    });

    // ----- fingers: one finger = the tool, two fingers = zoom and move -----
    function down(e) {
      var p = pt(e), t = S.tool;
      if (t === "pen" || t === "hl" || t === "erase") S.act = { kind: "stroke", k: t, pts: [[p.x, p.y]] };
      else if (t === "shape") S.act = { kind: "shape", a: p, b: p };
      else if (t === "text") { askText(p); return; }
      else if ((t === "crop" || t === "size") && S.crop) { var h = hit(S.crop, p); if (t === "size" && h === "move") h = null; if (h) S.act = { kind: "crop", mode: t === "size" ? "size" : "crop", m: h, p0: p, r0: { x: S.crop.x, y: S.crop.y, w: S.crop.w, h: S.crop.h } }; }
      else if (t === "sel") { var hs = S.crop ? hit(S.crop, p) : null; if (hs) S.act = { kind: "crop", mode: "crop", m: hs, p0: p, r0: { x: S.crop.x, y: S.crop.y, w: S.crop.w, h: S.crop.h } }; else { S.crop = null; S.act = { kind: "newsel", p0: p }; options(); } }
      else if (t === "place" && S.place) { var h2 = hit(S.place, p, true); if (h2) S.act = { kind: "place", m: h2, p0: p, r0: { x: S.place.x, y: S.place.y, w: S.place.w, h: S.place.h } }; }
      drawOv();
    }
    function move(e) {
      var a = S.act; if (!a) return; var p = pt(e);
      if (a.kind === "stroke") { var l = a.pts[a.pts.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) >= 1.5 * kpx()) a.pts.push([p.x, p.y]); }
      else if (a.kind === "shape") a.b = p;
      else if (a.kind === "crop") dragRect(S.crop, a, p, a.mode);
      else if (a.kind === "place") dragRect(S.place, a, p, "place");
      else if (a.kind === "newsel") { var x1 = Math.max(0, Math.min(a.p0.x, p.x)), y1 = Math.max(0, Math.min(a.p0.y, p.y)), x2 = Math.min(cv.width, Math.max(a.p0.x, p.x)), y2 = Math.min(cv.height, Math.max(a.p0.y, p.y)); S.crop = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; }
      drawOv();
    }
    function dragRect(r, a, p, mode) {   // mode: "crop" (stays inside the picture), "size" (may go outside: that is the space you add), "place" (a placed picture keeps its shape)
      var keepRatio = mode === "place", ext = mode === "size", dx = p.x - a.p0.x, dy = p.y - a.p0.y, r0 = a.r0, m = a.m, W = cv.width, H = cv.height, MIN = 24;
      if (m === "move") { r.x = Math.max(keepRatio ? -r0.w * 0.8 : 0, Math.min(keepRatio ? W - r0.w * 0.2 : W - r0.w, r0.x + dx)); r.y = Math.max(keepRatio ? -r0.h * 0.8 : 0, Math.min(keepRatio ? H - r0.h * 0.2 : H - r0.h, r0.y + dy)); return; }
      if (keepRatio) {   // a placed picture keeps its shape: the corner you drag decides the size
        var ar = r0.h / r0.w, w;
        if (m === "se" || m === "ne") w = r0.w + dx; else w = r0.w - dx;
        w = Math.max(MIN, Math.min(W * 2, w)); var h = w * ar;
        r.w = w; r.h = h; r.x = (m === "nw" || m === "sw") ? r0.x + r0.w - w : r0.x; r.y = (m === "nw" || m === "ne") ? r0.y + r0.h - h : r0.y; return;
      }
      var x1 = r0.x, y1 = r0.y, x2 = r0.x + r0.w, y2 = r0.y + r0.h;
      var lx = ext ? -W : 0, hx = ext ? 2 * W : W, ly = ext ? -H : 0, hy = ext ? 2 * H : H;
      if (/w/.test(m)) x1 = Math.max(lx, Math.min(x2 - MIN, r0.x + dx)); if (/e/.test(m)) x2 = Math.min(hx, Math.max(x1 + MIN, x2 + dx));
      if (/n/.test(m)) y1 = Math.max(ly, Math.min(y2 - MIN, r0.y + dy)); if (/s/.test(m)) y2 = Math.min(hy, Math.max(y1 + MIN, y2 + dy));
      if (ext && (x2 - x1 > 4000 || y2 - y1 > 4000 || (x2 - x1) * (y2 - y1) > 12e6)) return;   // keep the picture a size a phone can handle
      r.x = x1; r.y = y1; r.w = x2 - x1; r.h = y2 - y1;
    }
    function up() {
      var a = S.act; S.act = null; if (!a) return;
      if (a.kind === "stroke") commit({ t: "s", k: a.k, c: S.col[a.k === "erase" ? "pen" : a.k], w: lw(), pts: a.pts });
      else if (a.kind === "newsel") { if (S.crop && (S.crop.w < 8 || S.crop.h < 8)) S.crop = null; options(); }
      else if (a.kind === "shape") { if (Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y) > 4 * kpx()) commit({ t: "sh", k: S.shape, c: S.col.shape, w: S.size * cv.width / 900, x1: a.a.x, y1: a.a.y, x2: a.b.x, y2: a.b.y }); }
      drawOv();
    }
    function pcount() { return Object.keys(ptrs).length; }
    function dist() { var k = Object.keys(ptrs); return Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y); }
    function mid() { var k = Object.keys(ptrs), r = stage.getBoundingClientRect(); return { x: (ptrs[k[0]].x + ptrs[k[1]].x) / 2 - (r.left || 0), y: (ptrs[k[0]].y + ptrs[k[1]].y) / 2 - (r.top || 0) }; }
    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button > 0) return;
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pcount() === 2) { cancelAct(); var m = mid(); pinch = { d0: dist(), s0: S.v.s, px: (m.x - S.v.tx) / S.v.s, py: (m.y - S.v.ty) / S.v.s }; lock = true; return; }
      if (pcount() === 1) { lock = false; down(e); }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && pcount() >= 2) { var m = mid(), s = Math.max(0.15, Math.min(10, pinch.s0 * dist() / pinch.d0)); S.v = { s: s, tx: m.x - pinch.px * s, ty: m.y - pinch.py * s }; applyView(); return; }
      if (!lock && pcount() === 1) move(e);
    });
    function end(e) {
      if (!ptrs[e.pointerId]) return; delete ptrs[e.pointerId];
      if (pinch) { if (pcount() < 2) pinch = null; return; }   // fingers left after a pinch do not draw
      if (!lock) up();
    }
    stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
    stage.addEventListener("wheel", function (e) { e.preventDefault(); var r = stage.getBoundingClientRect(), mx = e.clientX - (r.left || 0), my = e.clientY - (r.top || 0), s0 = S.v.s, s = Math.max(0.15, Math.min(10, s0 * Math.exp(-e.deltaY / 300))); S.v = { s: s, tx: mx - (mx - S.v.tx) / s0 * s, ty: my - (my - S.v.ty) / s0 * s }; applyView(); }, { passive: false });
    document.addEventListener("keydown", key, true); window.addEventListener("paste", onPaste, true);

    render(true); setTool(S.tool);
    setTimeout(function () { if (S.dims) fit(); }, 60);   // once the screen has its real size
  });
}

window.photoEdit = function (file, opts) {
  opts = opts || {};
  return decode(file, MAXS).then(function (c) { return open(c, { title: opts.title || file.name || "Edit photo", doneLabel: "Done" }); }).then(function (res) {
    if (!res) return null;
    return new Promise(function (ok) { res.toBlob(function (b) { ok(b ? new File([b], (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() }) : null); }, "image/jpeg", 0.92); });
  });
};
window.photoEdit.open = open;
})();