/* 物理光学 · 简答题 —— 单页应用 */
(function () {
  "use strict";

  var view = document.getElementById("view");
  var tabbar = document.getElementById("tabbar");
  var LS = "po_quiz_v1";

  /* ---------------- 状态 ---------------- */
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS) || "{}");
      return {
        progress: raw.progress && typeof raw.progress === "object" ? raw.progress : {},
        fav: Array.isArray(raw.fav) ? raw.fav : [],
      };
    } catch (e) {
      return { progress: {}, fav: [] };
    }
  }
  var state = load();

  function save() {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {}
  }

  function prog(id) {
    if (!state.progress[id]) state.progress[id] = { seen: 0, known: null, ts: 0 };
    return state.progress[id];
  }

  function chapterOf(id) {
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
    return null;
  }
  function qById(id) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === id) return QUESTIONS[i];
    return null;
  }
  function poolOf(chId) {
    return chId === "all" ? QUESTIONS.slice() : QUESTIONS.filter(function (q) { return q.ch === chId; });
  }
  function seenCount(pool) {
    return pool.filter(function (q) { return state.progress[q.id] && state.progress[q.id].seen > 0; }).length;
  }
  function isFav(id) { return state.fav.indexOf(id) >= 0; }

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function plain(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || "").trim();
  }
  function chLabel(chId) {
    return chId === "all" ? "全部章节" : "第" + chId + "章";
  }
  function goBack() {
    if (history.length > 1) history.back();
    else location.hash = "#/";
  }

  /* ---------------- 答案渲染 ---------------- */
  function blocksHTML(blocks) {
    return blocks.map(function (b) {
      switch (b.t) {
        case "p":    return "<p>" + b.v + "</p>";
        case "note": return '<p class="note">' + b.v + "</p>";
        case "list": return "<ul>" + b.v.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
        case "img":
          return '<figure><img src="' + b.v + '" alt="' + esc(b.cap || "") +
                 '" loading="lazy"><figcaption>' + esc(b.cap || "") + "</figcaption></figure>";
        case "svg":
          return '<figure class="svgfig">' + b.v + "<figcaption>" + esc(b.cap || "") + "</figcaption></figure>";
        default: return "";
      }
    }).join("");
  }

  /* ---------------- 主页 ---------------- */
  function renderHome() {
    var total = QUESTIONS.length;
    var served = seenCount(QUESTIONS);
    var known = QUESTIONS.filter(function (q) {
      return state.progress[q.id] && state.progress[q.id].known === true; }).length;
    var weak = QUESTIONS.filter(function (q) {
      return state.progress[q.id] && state.progress[q.id].known === false; }).length;

    var cards = CHAPTERS.map(function (c) {
      var pool = poolOf(c.id);
      var s = seenCount(pool);
      var pct = Math.round((s / pool.length) * 100);
      return '<div class="chapter">' +
        '<a class="chapter-main" href="#/quiz/' + c.id + '">' +
          '<span class="badge">' + c.id + "</span>" +
          '<span class="meta"><span class="t">第' + c.id + "章 · " + c.title + "</span>" +
          '<span class="s">' + c.sub + " · 共 " + pool.length + " 题</span></span>" +
          '<span class="go">' + s + "/" + pool.length +
          '<span class="bar"><i style="width:' + pct + '%"></i></span></span>' +
        "</a>" +
        '<a class="notesbtn" href="#/notes/' + c.id + '">📄 手写笔记 ' + c.notes.length + " 页</a>" +
      "</div>";
    }).join("");

    var allPct = Math.round((served / total) * 100);

    view.innerHTML =
      '<div class="topbar"><h1>物理光学 · 简答题</h1></div>' +
      '<div class="page">' +
        '<div class="hero"><h2>今天刷几道？</h2>' +
        "<p>第 4~8 章 · 共 " + total + " 道简答题</p></div>" +
        '<div class="stats">' +
          "<div><b>" + served + "/" + total + "</b><span>已刷</span></div>" +
          "<div><b>" + known + "</b><span>已掌握</span></div>" +
          "<div><b>" + state.fav.length + "</b><span>收藏</span></div>" +
        "</div>" +
        '<div class="section-title">按章节刷</div>' + cards +
        '<div class="chapter all"><a class="chapter-main" href="#/quiz/all">' +
          '<span class="badge">全部</span>' +
          '<span class="meta"><span class="t">全部章节</span>' +
          '<span class="s">打乱所有 ' + total + " 道题" + (weak ? " · 其中 " + weak + " 道还不熟" : "") + "</span></span>" +
          '<span class="go">' + served + "/" + total +
          '<span class="bar"><i style="width:' + allPct + '%"></i></span></span></a></div>' +
        '<p class="hint">优先抽没刷过的题；全部刷完后优先复习「还不熟」的</p>' +
      "</div>";
    setTab("home");
  }

  /* ---------------- 刷题页 ---------------- */
  var cur = { ch: null, q: null, revealed: false };

  function pickNext(chId, excludeId) {
    var pool = poolOf(chId);
    if (!pool.length) return null;
    var unseen = pool.filter(function (q) {
      return !(state.progress[q.id] && state.progress[q.id].seen > 0); });
    if (unseen.length) return rand(unseen, excludeId);
    var weak = pool.filter(function (q) {
      return state.progress[q.id] && state.progress[q.id].known === false; });
    if (weak.length) return rand(weak, excludeId);
    return rand(pool, excludeId);
  }
  function rand(arr, excludeId) {
    var c = arr.filter(function (q) { return q.id !== excludeId; });
    if (!c.length) c = arr;
    return c[Math.floor(Math.random() * c.length)];
  }

  function renderQuiz(chId, qid) {
    var pool = poolOf(chId);
    if (!pool.length) { location.hash = "#/"; return; }

    /* 给了题号就用那一题；否则重新抽（同一章内尽量避免和上一题重复） */
    var q = qid ? qById(qid) : null;
    if (!q || pool.indexOf(q) < 0) q = pickNext(chId, cur.q && cur.q.id);

    cur.ch = chId;
    cur.q = q;
    cur.revealed = false;
    drawQuiz();

    /* 深链进入时把 hash 补成具体题号，刷新/回退不会换题 */
    if (location.hash !== "#/quiz/" + chId + "/" + q.id) {
      history.replaceState(null, "", "#/quiz/" + chId + "/" + q.id);
    }
  }

  function drawQuiz() {
    var q = cur.q, chId = cur.ch;
    var pool = poolOf(chId);
    var s = seenCount(pool);
    var pct = Math.round((s / pool.length) * 100);
    var ch = chId === "all" ? null : chapterOf(chId);
    var fav = isFav(q.id);
    var p = state.progress[q.id] || { seen: 0, known: null };

    view.innerHTML =
      '<div class="topbar">' +
        '<button class="iconbtn" id="back" aria-label="返回">' +
          '<svg viewBox="0 0 24 24"><path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6z"/></svg></button>' +
        "<h1>" + chLabel(chId) + (chId === "all" ? "" : " · " + ch.title) + "</h1>" +
        '<button class="iconbtn star' + (fav ? " on" : "") + '" id="fav" aria-label="收藏">' +
          '<svg viewBox="0 0 24 24"><path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/></svg></button>' +
      "</div>" +
      '<div class="quiz-wrap">' +
        '<div class="progress-line"><span>' + chLabel(chId) + " " + s + "/" + pool.length + "</span>" +
          '<span class="track"><i style="width:' + pct + '%"></i></span></div>' +
        '<div class="qcard">' +
          '<div class="qno">' + chLabel(q.ch) + " · 第 " + q.num + " 题" +
            (p.known === true ? " · 已掌握" : p.known === false ? " · 还不熟" : "") + "</div>" +
          '<div class="qtext">' + q.q + "</div>" +
          '<div class="answer" id="ans" hidden><div class="lead">参考答案</div>' + blocksHTML(q.a) + "</div>" +
        "</div>" +
        '<div class="btnrow"><button class="btn primary" id="reveal">显示答案</button></div>' +
        '<div id="after" hidden>' +
          '<div class="markrow">' +
            '<button class="mark' + (p.known === false ? " on-no" : "") + '" id="mno">还不熟</button>' +
            '<button class="mark' + (p.known === true ? " on-ok" : "") + '" id="mok">已掌握</button>' +
          "</div>" +
          '<div class="btnrow"><button class="btn primary" id="next">下一题 →</button></div>' +
        "</div>" +
        '<p class="hint">' +
          '<a href="#/" style="color:inherit">返回主页</a>' +
        "</p>" +
      "</div>";

    setTab("quiz");   /* 刷题时隐藏底部导航，专注做题 */

    document.getElementById("back").addEventListener("click", goBack);
    document.getElementById("fav").addEventListener("click", function () {
      var i = state.fav.indexOf(q.id);
      if (i >= 0) state.fav.splice(i, 1); else state.fav.push(q.id);
      save();
      this.classList.toggle("on", i < 0);
    });
    document.getElementById("reveal").addEventListener("click", reveal);
    document.getElementById("next").addEventListener("click", nextQ);
    document.getElementById("mno").addEventListener("click", function () { mark(false); });
    document.getElementById("mok").addEventListener("click", function () { mark(true); });
  }

  function reveal() {
    var ans = document.getElementById("ans");
    if (!ans || cur.revealed) return;
    ans.hidden = false;
    cur.revealed = true;

    var p = prog(cur.q.id);
    p.seen += 1;
    p.ts = Date.now();
    save();

    document.getElementById("reveal").parentNode.hidden = true;
    document.getElementById("after").hidden = false;
    bindZoom(ans);

    /* 更新进度条与左上角题号（首次刷过会影响统计） */
    var pool = poolOf(cur.ch);
    var track = view.querySelector(".progress-line .track i");
    var label = view.querySelector(".progress-line span");
    if (track) track.style.width = Math.round((seenCount(pool) / pool.length) * 100) + "%";
    if (label) label.textContent = chLabel(cur.ch) + " " + seenCount(pool) + "/" + pool.length;

    ans.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function mark(known) {
    var p = prog(cur.q.id);
    p.known = p.known === known ? null : known;
    if (p.seen === 0) { p.seen = 1; p.ts = Date.now(); }
    save();
    document.getElementById("mno").classList.toggle("on-no", p.known === false);
    document.getElementById("mok").classList.toggle("on-ok", p.known === true);
  }

  function nextQ() {
    var q = pickNext(cur.ch, cur.q && cur.q.id);
    if (!q) return;
    cur.q = q;
    cur.revealed = false;
    history.replaceState(null, "", "#/quiz/" + cur.ch + "/" + q.id);
    drawQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- 收藏页 ---------------- */
  function renderFav() {
    if (!state.fav.length) {
      view.innerHTML =
        '<div class="topbar"><h1>收藏</h1></div>' +
        '<div class="empty"><span class="big">★</span>还没有收藏的题<br>刷题时点右上角的星号即可收藏</div>';
      setTab("fav");
      return;
    }
    var items = state.fav.map(function (id) {
      var q = qById(id);
      if (!q) return "";
      return '<div class="item" data-id="' + id + '">' +
        '<div class="tag">' + chLabel(q.ch) + " · 第 " + q.num + " 题</div>" +
        '<div class="txt">' + esc(plain(q.q)) + "</div>" +
        '<div class="fav-answer" hidden>' + blocksHTML(q.a) + "</div>" +
        '<div class="btnrow"><button class="btn" data-del="' + id + '">取消收藏</button>' +
        '<button class="btn primary" data-toggle="' + id + '">显示答案</button></div>' +
        "</div>";
    }).join("");

    view.innerHTML =
      '<div class="topbar"><h1>收藏（' + state.fav.length + "）</h1></div>" +
      '<div class="page" style="padding-top:12px">' + items + "</div>";
    setTab("fav");

    view.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var box = btn.closest(".item").querySelector(".fav-answer");
        box.hidden = !box.hidden;
        btn.textContent = box.hidden ? "显示答案" : "收起答案";
        if (!box.hidden) bindZoom(box);
      });
    });
    view.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-del");
        state.fav = state.fav.filter(function (x) { return x !== id; });
        save();
        renderFav();
      });
    });
  }

  /* ---------------- 笔记页 ---------------- */
  function renderNotesIndex() {
    var cards = CHAPTERS.map(function (c) {
      return '<div class="chapter"><a class="chapter-main" href="#/notes/' + c.id + '">' +
        '<span class="badge">' + c.id + "</span>" +
        '<span class="meta"><span class="t">第' + c.id + "章 · " + c.title + "</span>" +
        '<span class="s">手写答题笔记</span></span>' +
        '<span class="go">' + c.notes.length + " 页</span></a></div>";
    }).join("");
    view.innerHTML =
      '<div class="topbar"><h1>手写笔记</h1></div>' +
      '<div class="page" style="padding-top:16px">' +
        '<p class="hint" style="margin:0 0 14px;text-align:left">原文档前半部分是扫描的手写答题笔记，' +
        "与印刷体简答题有重叠、也有额外题目。点图片可放大。</p>" + cards + "</div>";
    setTab("notes");
  }

  function renderNotesChapter(chId) {
    var c = chapterOf(chId);
    if (!c) { location.hash = "#/notes"; return; }
    var imgs = c.notes.map(function (n, i) {
      return '<div class="note-page"><img src="assets/notes/' + n + '.jpg" alt="第' + c.id +
        "章手写笔记第 " + (i + 1) + ' 页" loading="lazy"><div class="cap">第 ' + (i + 1) + " / " +
        c.notes.length + " 页</div></div>";
    }).join("");
    view.innerHTML =
      '<div class="topbar">' +
        '<button class="iconbtn" id="back" aria-label="返回">' +
          '<svg viewBox="0 0 24 24"><path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6z"/></svg></button>' +
        "<h1>第" + c.id + "章 · " + c.title + "（手写笔记）</h1></div>" +
      '<div class="page" style="padding-top:12px">' + imgs + "</div>";
    setTab("notes");
    document.getElementById("back").addEventListener("click", goBack);
    bindZoom(view);
  }

  /* ---------------- 图片放大 ---------------- */
  var box = document.getElementById("lightbox");
  var boxImg = document.getElementById("lightbox-img");

  function bindZoom(root) {
    root.querySelectorAll(".answer img, .fav-answer img, .note-page img").forEach(function (img) {
      if (img.dataset.zoom) return;
      img.dataset.zoom = "1";
      img.style.cursor = "zoom-in";
      img.addEventListener("click", function () {
        boxImg.src = img.src;
        boxImg.alt = img.alt;
        /* 宽扁的公式原图按高度放大、横向拖动；笔记整页则按宽度铺满 */
        var ratio = img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight : 1;
        boxImg.classList.toggle("wide", ratio > 2.2);
        box.hidden = false;
        box.scrollLeft = 0;
        document.body.style.overflow = "hidden";
      });
    });
  }
  function closeBox() {
    box.hidden = true;
    boxImg.removeAttribute("src");
    document.body.style.overflow = "";
  }
  box.addEventListener("click", closeBox);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) closeBox(); });

  /* ---------------- 路由 ---------------- */
  function setTab(name) {
    tabbar.querySelectorAll("a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-tab") === name);
    });
    var showTabs = name === "home" || name === "fav" || name === "notes";
    tabbar.hidden = !showTabs;
    document.getElementById("app").classList.toggle("no-tabs", !showTabs);
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);

    if (!parts.length) return renderHome();

    if (parts[0] === "quiz") {
      var chId = parts[1] === "all" || parts[1] === undefined ? "all" : parseInt(parts[1], 10);
      if (chId !== "all" && !chapterOf(chId)) return renderHome();
      /* 换章节时重置当前题 */
      if (cur.ch !== chId && !parts[2]) cur.q = null;
      if (parts[2]) cur.ch = chId;
      return renderQuiz(chId, parts[2] || null);
    }
    if (parts[0] === "fav") return renderFav();
    if (parts[0] === "notes") {
      if (!parts[1]) return renderNotesIndex();
      return renderNotesChapter(parseInt(parts[1], 10));
    }
    renderHome();
  }

  window.addEventListener("hashchange", route);
  route();

  /* 离线缓存：失败不影响正常使用 */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
