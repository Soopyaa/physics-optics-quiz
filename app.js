/* 李承霖大王的光学复习 —— 单页应用 */
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

  /* ---------------- 课后题（图片题库） ---------------- */
  function hwChapterOf(id) {
    for (var i = 0; i < HW_CHAPTERS.length; i++) if (HW_CHAPTERS[i].id === id) return HW_CHAPTERS[i];
    return null;
  }
  function hwById(id) {
    for (var i = 0; i < HW.length; i++) if (HW[i].id === id) return HW[i];
    return null;
  }
  function hwPoolOf(chId) {
    return chId === "all" ? HW.slice() : HW.filter(function (q) { return q.ch === chId; });
  }
  /* ---------------- 选择题真题 ---------------- */
  function mcYearOf(id) {
    for (var i = 0; i < MC_YEARS.length; i++) if (MC_YEARS[i].id === id) return MC_YEARS[i];
    return null;
  }
  function mcById(id) {
    for (var i = 0; i < MC.length; i++) if (MC[i].id === id) return MC[i];
    return null;
  }
  function mcPoolOf(y) {
    return y === "all" ? MC.slice() : MC.filter(function (q) { return q.y === y; });
  }
  /* ---------------- 简答真题（按年份，作答方式同简答题） ---------------- */
  function saYearOf(id) {
    for (var i = 0; i < SA_YEARS.length; i++) if (SA_YEARS[i].id === id) return SA_YEARS[i];
    return null;
  }
  /* 2017 那份不是原卷、是资料整理的「常见简答题汇总」，题号那行不能跟着写「真题简答」 */
  function saWord(id) {
    var y = saYearOf(id);
    return y && y.kind === "collection" ? "汇总" : "真题简答";
  }
  function saById(id) {
    for (var i = 0; i < SA.length; i++) if (SA[i].id === id) return SA[i];
    return null;
  }
  function saPoolOf(y) {
    return y === "all" ? SA.slice() : SA.filter(function (q) { return q.y === y; });
  }
  /* ---------------- 知识点（叶玉堂教材整理） ---------------- */
  function kpById(id) {
    for (var i = 0; i < KP.length; i++) if (KP[i].id === id) return KP[i];
    return null;
  }
  function kpPoolOf(chId) {
    return chId === "all" ? KP.slice() : KP.filter(function (k) { return k.ch === chId; });
  }
  /* 知识点挂在简答题那套章节上，所以直接借用 CHAPTERS 的标题和小标题 */
  var KP_CHAPTERS = CHAPTERS.filter(function (c) {
    return KP.some(function (k) { return k.ch === c.id; });
  });

  /* 课后题的 q 是图片文件名数组，简答题的 q 是 HTML 字符串，选择题多一个 o 选项数组，
     知识点则是 t 标题 + a 字符串要点（没有 q、也没有 o），
     简答真题的 q 是 HTML 字符串、但分组字段是年份 y（不是章 ch） */
  function isHW(item) { return !!(item && item.q && typeof item.q !== "string"); }
  function isMC(item) { return !!(item && item.o && item.o.length); }
  function isKP(item) {
    return !!(item && item.t && typeof item.a === "string" && !item.q && !item.o);
  }
  function isSA(item) { return !!(item && item.y && typeof item.q === "string" && !item.o); }
  function anyById(id) {
    return qById(id) || hwById(id) || mcById(id) || kpById(id) || saById(id);
  }
  function poolFor(mode, chId) {
    return mode === "hw" ? hwPoolOf(chId)
         : mode === "mc" ? mcPoolOf(chId)
         : mode === "sa" ? saPoolOf(chId)
         : mode === "kp" ? kpPoolOf(chId) : poolOf(chId);
  }
  function chapterFor(mode, chId) {
    return mode === "hw" ? hwChapterOf(chId)
         : mode === "mc" ? mcYearOf(chId)
         : mode === "sa" ? saYearOf(chId)
         : mode === "kp" ? chapterOf(chId) : chapterOf(chId);
  }
  function byIdFor(mode, id) {
    return mode === "hw" ? hwById(id)
         : mode === "mc" ? mcById(id)
         : mode === "sa" ? saById(id)
         : mode === "kp" ? kpById(id) : qById(id);
  }
  /* 简答题按章、课后题按章、选择题和简答真题按年份、知识点按章 —— 标签不一样 */
  function chLabelFor(mode, chId) {
    if (mode !== "mc" && mode !== "sa") return chLabel(chId);
    return chId === "all" ? "全部年份" : chId + " 年";
  }
  function poolLabel(mode, chId) {
    return chLabelFor(mode, chId) +
      (mode === "hw" ? " · 课后题" : mode === "mc" ? " · 选择题"
       : mode === "sa" ? " · 简答真题"
       : mode === "kp" ? " · 知识点" : "");
  }
  /* 知识点是「条」不是「题」，量词单独给一个口子 */
  function unitOf(mode) { return mode === "kp" ? "条" : "题"; }
  function routeBase(mode) {
    return mode === "hw" ? "hw/" : mode === "mc" ? "mc/"
         : mode === "sa" ? "sa/" : mode === "kp" ? "kp/" : "quiz/";
  }
  function modeHome(mode) {
    return mode === "hw" ? "#/hw" : mode === "mc" ? "#/mc"
         : mode === "sa" ? "#/sa" : mode === "kp" ? "#/kp" : "#/";
  }

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

  /* 课后题的题目与答案都是切好的图，按顺序铺开即可 */
  function hwImgs(files, alt) {
    return files.map(function (f) {
      return '<img class="hwimg" src="assets/hw/' + f + '" alt="' + esc(alt) + '" loading="lazy">';
    }).join("");
  }
  function qBodyHTML(item) {
    if (isHW(item)) return hwImgs(item.q, "题目");
    if (isMC(item)) {
      var fig = (item.fig || []).map(function (f) {
        return '<img class="mcfig" src="assets/mc/' + f + '" alt="题目插图" loading="lazy">';
      }).join("");
      return '<div class="qtext mc">' + item.q + "</div>" + fig + optsHTML(item);
    }
    /* 知识点自测：题面只有标题，要点藏在「看要点」后面 */
    if (isKP(item)) return '<div class="kptitle">' + item.t + "</div>";
    /* 简答真题：正文和简答题一样是真文字，个别题带卷面插图 */
    if (isSA(item)) {
      var safig = (item.fig || []).map(function (f) {
        return '<img class="mcfig" src="assets/sa/' + f + '" alt="题目插图" loading="lazy">';
      }).join("");
      return '<div class="qtext">' + item.q + "</div>" + safig;
    }
    return item.q;
  }
  function aBodyHTML(item) {
    if (isHW(item)) return hwImgs(item.a, "参考答案");
    if (isMC(item)) return optsHTML(item, null, true);   /* 收藏页/答案区：直接标出正确项 */
    if (isKP(item)) return kpAnsHTML(item);
    /* 真题答案册偶尔整道题没给答案（2020 第 4、6 题），别让答案区空着 */
    return blocksHTML(item.a) || '<p class="note">答案册里这道题没有给答案。</p>';
  }

  /* ---------------- 知识点：要点 + 易错注 + 考过它的真题 ---------------- */
  function kpAnsHTML(item) {
    return '<div class="kpa">' + item.a + "</div>" +
      (item.tip ? '<p class="note">' + item.tip + "</p>" : "") +
      refHTML(item);
  }

  /* ref 里的 id 指向别的板块 —— 选择题跳 #/mc/年份/题号，简答题跳 #/quiz/章/题号。
     链接目标不在题库里就默默丢掉，不让一条错 id 把整段渲染搞坏。 */
  function refHTML(item) {
    var links = (item.ref || []).map(function (id) {
      var q = anyById(id);
      if (!q || isKP(q)) return "";
      if (isMC(q)) return '<a href="#/mc/' + q.y + "/" + q.id + '">' + q.y + " 年第 " + q.num + " 题</a>";
      if (isSA(q)) return '<a href="#/sa/' + q.y + "/" + q.id + '">' + q.y + " 年简答第 " + q.num + " 题</a>";
      return '<a href="#/quiz/' + q.ch + "/" + q.id + '">第 ' + q.ch + " 章第 " + q.num + " 题</a>";
    }).filter(Boolean);
    if (!links.length) return "";
    return '<p class="kpref">考过的题：' + links.join("、") + "</p>";
  }

  var KEYS = ["A", "B", "C", "D", "E", "F"];

  /* 选择题选项。chosen 是用户已选下标（未选传 -1），showAns 为真时把正确项标绿。
     选项内容里可能带公式 HTML（.m/.frac/.rad），所以用 innerHTML 塞进去。 */
  function optsHTML(item, chosen, showAns) {
    var chosenI = typeof chosen === "number" ? chosen : -1;
    var ansI = typeof item.a === "number" ? item.a : -1;
    return '<div class="opts">' + item.o.map(function (t, i) {
      var cls = "opt";
      if (showAns && i === ansI) cls += " ok";
      if (chosenI === i) {
        cls += " picked";
        if (!showAns && ansI >= 0) cls += i === ansI ? " ok" : " no";
        if (!showAns && ansI < 0) cls += " neutral";
      }
      return '<div class="' + cls + '" data-i="' + i + '">' +
        '<span class="key">' + (KEYS[i] || i + 1) + "</span>" +
        '<span class="val">' + t + "</span></div>";
    }).join("") + "</div>";
  }

  /* 选择题解析存在 mc-exp.js 的 MC_EXP 里，键是题号；缺了就当作没有 */
  function expOf(item) {
    if (!item || typeof MC_EXP === "undefined") return "";
    return MC_EXP[item.id] || "";
  }
  function expBlockHTML(item) {
    var t = expOf(item);
    if (!t) return "";
    return '<div class="exp"><div class="lead">解析</div>' + t + "</div>";
  }

  /* 简答题 / 知识点 / 选择题 / 课后题 / 简答真题 切换 */
  function modeSwitch(mode) {
    return '<div class="modesw">' +
      '<a href="#/" class="' + (mode === "quiz" ? "on" : "") + '">简答题</a>' +
      '<a href="#/sa" class="' + (mode === "sa" ? "on" : "") + '">简答真题</a>' +
      '<a href="#/kp" class="' + (mode === "kp" ? "on" : "") + '">知识点</a>' +
      '<a href="#/mc" class="' + (mode === "mc" ? "on" : "") + '">选择题</a>' +
      '<a href="#/hw" class="' + (mode === "hw" ? "on" : "") + '">课后题</a>' +
    "</div>";
  }

  /* ---------------- 主页 ---------------- */
  function renderHome(mode) {
    mode = mode || "quiz";
    var hw = mode === "hw", mc = mode === "mc", kp = mode === "kp", sa = mode === "sa";
    var byYear = mc || sa;
    var unit = unitOf(mode);
    var all = hw ? HW : mc ? MC : sa ? SA : kp ? KP : QUESTIONS;
    var chs = hw ? HW_CHAPTERS : mc ? MC_YEARS : sa ? SA_YEARS : kp ? KP_CHAPTERS : CHAPTERS;
    var total = all.length;
    var served = seenCount(all);
    var known = all.filter(function (q) {
      return state.progress[q.id] && state.progress[q.id].known === true; }).length;
    var weak = all.filter(function (q) {
      return state.progress[q.id] && state.progress[q.id].known === false; }).length;

    var cards = chs.map(function (c) {
      var pool = poolFor(mode, c.id);
      var s = seenCount(pool);
      var pct = pool.length ? Math.round((s / pool.length) * 100) : 0;
      var head = byYear ? c.id + " 年 · " + c.title
                        : "第" + c.id + "章 · " + c.title;
      return '<div class="chapter">' +
        '<a class="chapter-main" href="#/' + routeBase(mode) + c.id + '">' +
          '<span class="badge' + (byYear ? " year" : "") + '">' + c.id + "</span>" +
          '<span class="meta"><span class="t">' + head + "</span>" +
          '<span class="s">' + c.sub + " · 共 " + pool.length + " " + unit + "</span></span>" +
          '<span class="go">' + s + "/" + pool.length +
          '<span class="bar"><i style="width:' + pct + '%"></i></span></span>' +
        "</a>" +
        (mode === "quiz" ?
          '<a class="notesbtn" href="#/notes/' + c.id + '">📄 手写笔记 ' + c.notes.length + " 页</a>" : "") +
        /* 回忆版卷子有不少「卷面就这样」的怪处，摊在卡片下面说清楚，别让人以为是站点出错了 */
        (byYear && c.note ? '<p class="cnote">' + c.note + "</p>" : "") +
      "</div>";
    }).join("");

    var allPct = Math.round((served / total) * 100);
    var hero = hw ? "课后计算题" : mc ? "真题选择题" : sa ? "真题简答题"
             : kp ? "知识点自测" : "今天刷几道？";
    var heroSub = hw ? "第 4~8 章 · 共 " + total + " 道计算题（题目与答案分开）"
                     : mc ? "2008~2024 · 共 " + total + " 道选择题"
                     : sa ? chs[0].id + "~" + chs[chs.length - 1].id +
                            " · 共 " + total + " 道简答题（答案来自真题答案册）"
                     : kp ? "第 " + chs[0].id + "~" + chs[chs.length - 1].id +
                            " 章 · 共 " + total + " 条知识点（按叶玉堂《光学教程》整理）"
                          : "第 4~8 章 · 共 " + total + " 道简答题";

    view.innerHTML =
      /* 主页是三个板块共用的入口，标题就不再跟着板块变 */
      '<div class="topbar"><h1>李承霖大王的光学复习</h1></div>' +
      '<div class="page">' +
        modeSwitch(mode) +
        '<div class="hero"><h2>' + hero + "</h2><p>" + heroSub + "</p></div>" +
        '<div class="stats">' +
          "<div><b>" + served + "/" + total + "</b><span>" + (kp ? "已看" : "已刷") + "</span></div>" +
          "<div><b>" + known + "</b><span>已掌握</span></div>" +
          "<div><b>" + state.fav.length + "</b><span>收藏</span></div>" +
        "</div>" +
        '<div class="section-title">' + (byYear ? "按年份刷" : kp ? "按章节过" : "按章节刷") + "</div>" + cards +
        '<div class="chapter all"><a class="chapter-main" href="#/' + routeBase(mode) + 'all">' +
          '<span class="badge">全部</span>' +
          '<span class="meta"><span class="t">' + (byYear ? "全部年份" : "全部章节") + "</span>" +
          '<span class="s">打乱所有 ' + total + " " + (kp ? "条知识点" : "道题") +
            (weak ? " · 其中 " + weak + " " + (kp ? "条" : "道") + "还不熟" : "") + "</span></span>" +
          '<span class="go">' + served + "/" + total +
          '<span class="bar"><i style="width:' + allPct + '%"></i></span></span></a></div>' +
        '<p class="hint">优先抽没' + (kp ? "看" : "刷") + '过的' + unit + '；全部过完后优先复习「还不熟」的</p>' +
        (hw ? '<p class="hint">题目和答案都是原书切图，点图可放大细看</p>' : "") +
        (mc ? '<p class="hint">选项点一下就算作答，答对自动记「已掌握」、答错记「还不熟」</p>' : "") +
        (sa ? '<p class="hint">先自己在纸上分条作答，再点「显示答案」对照答案册的解析</p>' : "") +
        (kp ? '<p class="hint">先自己回想，再点「看要点」对照；每条底下挂着考过它的真题，点一下就能跳过去</p>' : "") +
      "</div>";
    syncHomeHref(mode);
    setTab("home");
  }

  /* ---------------- 刷题页 ---------------- */
  var cur = { ch: null, q: null, revealed: false, mode: "quiz", chosen: null };

  function pickNext(mode, chId, excludeId) {
    var pool = poolFor(mode, chId);
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

  function renderQuiz(chId, qid, mode) {
    mode = mode || "quiz";
    var pool = poolFor(mode, chId);
    if (!pool.length) { location.hash = modeHome(mode); return; }

    /* 给了题号就用那一题；否则重新抽（同一章内尽量避免和上一题重复） */
    var q = qid ? byIdFor(mode, qid) : null;
    if (!q || pool.indexOf(q) < 0) q = pickNext(mode, chId, cur.q && cur.q.id);

    cur.ch = chId;
    cur.mode = mode;
    cur.q = q;
    cur.revealed = false;
    cur.chosen = null;
    drawQuiz();

    /* 深链进入时把 hash 补成具体题号，刷新/回退不会换题 */
    var want = "#/" + routeBase(mode) + chId + "/" + q.id;
    if (location.hash !== want) history.replaceState(null, "", want);
  }

  function drawQuiz() {
    var q = cur.q, chId = cur.ch, mode = cur.mode || "quiz";
    var pool = poolFor(mode, chId);
    var s = seenCount(pool);
    var pct = Math.round((s / pool.length) * 100);
    var ch = chId === "all" ? null : chapterFor(mode, chId);
    var fav = isFav(q.id);
    var p = state.progress[q.id] || { seen: 0, known: null };
    var hw = isHW(q), mc = isMC(q), kp = isKP(q), sa = isSA(q);
    var head = ch ? ((mc || sa) ? chLabelFor(mode, chId) + " · " + ch.title
                                : chLabel(chId) + " · " + ch.title)
                  : chLabelFor(mode, chId);

    /* 选择题的题面里已经带了可点的选项，不再需要「显示答案」那一步；
       知识点反着来 —— 题面只有标题，要点必须手动点开，才好自测；
       简答真题跟简答题一样要点「显示答案」，但题面可能带卷面插图，走 qBodyHTML */
    var body = hw ? '<div class="qimgs">' + qBodyHTML(q) + "</div>"
                  : (mc || kp || sa) ? qBodyHTML(q)
                                     : '<div class="qtext">' + q.q + "</div>";

    var markRow = '<div class="markrow">' +
        '<button class="mark' + (p.known === false ? " on-no" : "") + '" id="mno">还不熟</button>' +
        '<button class="mark' + (p.known === true ? " on-ok" : "") + '" id="mok">已掌握</button>' +
      "</div>";

    var action = mc
      ? '<div class="verdict" id="res" hidden></div>' +
        '<div id="after" hidden>' +
          expBlockHTML(q) +          /* 解析跟「答题后」的东西放在一起，选完选项才露出来 */
          markRow +
          '<div class="btnrow"><button class="btn primary" id="next">下一题 →</button></div>' +
        "</div>" +
        '<p class="hint" id="prehint">点一下选项就是作答</p>'
      : '<div class="btnrow"><button class="btn primary" id="reveal">' +
          (kp ? "看要点" : "显示答案") + "</button></div>" +
        '<div id="after" hidden>' +
          markRow +
          '<div class="btnrow"><button class="btn primary" id="next">' +
            (kp ? "下一条 →" : "下一题 →") + "</button></div>" +
        "</div>" +
        (kp ? '<p class="hint" id="prehint">先自己回想一遍，再点「看要点」</p>' : "");

    view.innerHTML =
      '<div class="topbar">' +
        '<button class="iconbtn" id="back" aria-label="返回">' +
          '<svg viewBox="0 0 24 24"><path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6z"/></svg></button>' +
        "<h1>" + head + "</h1>" +
        '<button class="iconbtn star' + (fav ? " on" : "") + '" id="fav" aria-label="收藏">' +
          '<svg viewBox="0 0 24 24"><path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/></svg></button>' +
      "</div>" +
      '<div class="quiz-wrap">' +
        '<div class="progress-line"><span>' + poolLabel(mode, chId) + " " + s + "/" + pool.length + "</span>" +
          '<span class="track"><i style="width:' + pct + '%"></i></span></div>' +
        '<div class="qcard">' +
          '<div class="qno">' +
            '<span class="qno-line">' +
              (mc ? q.y + " 年真题"
                  : sa ? q.y + " 年" + saWord(q.y)
                  : chLabel(q.ch) + (hw ? " 课后题" : kp ? " 知识点" : "")) +
              " · 第 " + q.num + (kp ? " 条" : " 题") +
              '<span id="know">' + (p.known === true ? " · 已掌握" : p.known === false ? " · 还不熟" : "") +
              "</span></span>" +
            (q.note ? '<span class="qnote">' + q.note + "</span>" : "") +
          "</div>" +
          body +
          (mc ? "" : '<div class="answer" id="ans" hidden><div class="lead">' +
                       (kp ? "要点" : "参考答案") + "</div>" +
                     aBodyHTML(q) + "</div>") +
        "</div>" +
        action +
        '<p class="hint">' +
          '<a href="' + modeHome(mode) + '" style="color:inherit">返回主页</a>' +
        "</p>" +
      "</div>";

    syncHomeHref(mode);
    setTab("quiz");   /* 刷题时隐藏底部导航，专注做题 */

    document.getElementById("back").addEventListener("click", goBack);
    document.getElementById("fav").addEventListener("click", function () {
      var i = state.fav.indexOf(q.id);
      if (i >= 0) state.fav.splice(i, 1); else state.fav.push(q.id);
      save();
      this.classList.toggle("on", i < 0);
    });
    document.getElementById("next").addEventListener("click", nextQ);
    document.getElementById("mno").addEventListener("click", function () { mark(false); });
    document.getElementById("mok").addEventListener("click", function () { mark(true); });

    if (mc) {
      view.querySelectorAll(".opts .opt").forEach(function (el) {
        el.addEventListener("click", function () { chooseOpt(parseInt(el.getAttribute("data-i"), 10)); });
      });
    } else {
      document.getElementById("reveal").addEventListener("click", reveal);
    }

    bindZoom(view);   /* 课后题的题目图也要能点开放大 */
  }

  /* 选择题：点选项即作答，当场判对错，并把结果写进进度 */
  function chooseOpt(i) {
    if (cur.chosen !== null) return;
    cur.chosen = i;
    var q = cur.q;
    var p = prog(q.id);
    p.seen += 1;
    p.ts = Date.now();
    p.pick = i;                                  /* 记下选了什么，回看时能还原 */
    var has = typeof q.a === "number";
    var right = has && i === q.a;
    if (has) p.known = right;                    /* 答对自动记「已掌握」，答错记「还不熟」 */
    save();
    restorePick(i);
  }

  /* 把选项涂成「已选 + 对错」的样子，并显示结论条 */
  function restorePick(i) {
    var q = cur.q;
    var has = typeof q.a === "number";
    var right = has && i === q.a;
    var els = view.querySelectorAll(".opts .opt");
    els.forEach(function (el) {
      var k = parseInt(el.getAttribute("data-i"), 10);
      el.classList.remove("picked", "ok", "no", "neutral");
      el.classList.add("locked");
      if (has && k === q.a) el.classList.add("ok");
      if (k === i) {
        el.classList.add("picked");
        if (has && !right) el.classList.add("no");
        if (!has) el.classList.add("neutral");
      }
    });

    var res = document.getElementById("res");
    if (res) {
      res.hidden = false;
      res.className = "verdict " + (!has ? "unknown" : right ? "ok" : "no");
      res.innerHTML = !has
        ? "已选 <b>" + KEYS[i] + "</b> —— 答案册未收录这道题的答案"
        : right ? "✓ 答对了"
                : "✗ 答错了，正确答案是 <b>" + KEYS[q.a] + "</b>";
    }
    var pre = document.getElementById("prehint");
    if (pre) pre.hidden = true;

    document.getElementById("after").hidden = false;
    var p = state.progress[q.id] || { known: null };
    document.getElementById("mno").classList.toggle("on-no", p.known === false);
    document.getElementById("mok").classList.toggle("on-ok", p.known === true);

    /* 进度条与题号跟着更新（首次作答会影响统计） */
    var pool = poolFor(cur.mode, cur.ch);
    var track = view.querySelector(".progress-line .track i");
    var label = view.querySelector(".progress-line span");
    if (track) track.style.width = Math.round((seenCount(pool) / pool.length) * 100) + "%";
    if (label) label.textContent = poolLabel(cur.mode, cur.ch) + " " + seenCount(pool) + "/" + pool.length;
    var know = document.getElementById("know");
    if (know) know.textContent = p.known === true ? " · 已掌握" : p.known === false ? " · 还不熟" : "";
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
    var pre = document.getElementById("prehint");
    if (pre) pre.hidden = true;          /* 知识点的那句「先自己回想一遍」看过要点就撤掉 */
    bindZoom(ans);

    /* 更新进度条与左上角题号（首次刷过会影响统计） */
    var pool = poolFor(cur.mode, cur.ch);
    var track = view.querySelector(".progress-line .track i");
    var label = view.querySelector(".progress-line span");
    if (track) track.style.width = Math.round((seenCount(pool) / pool.length) * 100) + "%";
    if (label) label.textContent = poolLabel(cur.mode, cur.ch) + " " + seenCount(pool) + "/" + pool.length;

    ans.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function mark(known) {
    var p = prog(cur.q.id);
    p.known = p.known === known ? null : known;
    if (p.seen === 0) { p.seen = 1; p.ts = Date.now(); }
    save();
    document.getElementById("mno").classList.toggle("on-no", p.known === false);
    document.getElementById("mok").classList.toggle("on-ok", p.known === true);
    /* 题目左上角那行也带「已掌握 / 还不熟」，跟着一起翻 */
    var know = document.getElementById("know");
    if (know) know.textContent = p.known === true ? " · 已掌握" : p.known === false ? " · 还不熟" : "";
  }

  function nextQ() {
    var q = pickNext(cur.mode, cur.ch, cur.q && cur.q.id);
    if (!q) return;
    cur.q = q;
    cur.revealed = false;
    cur.chosen = null;
    history.replaceState(null, "", "#/" + routeBase(cur.mode) + cur.ch + "/" + q.id);
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
      var q = anyById(id);
      if (!q) return "";
      var mc = isMC(q), hw = isHW(q), kp = isKP(q), sa = isSA(q);
      var tag = (sa ? q.y + " 年" + saWord(q.y) : mc ? q.y + " 年" : chLabel(q.ch)) +
                (hw ? " 课后题" : mc ? " 选择题" : kp ? " 知识点" : "") +
                " · 第 " + q.num + (kp ? " 条" : " 题");
      /* 选择题、简答真题和知识点的题干里有公式，不能像简答题那样剥成纯文本，
         否则 <sub>、分数和「____」都会丢 */
      var txt = hw ? esc(q.t) : (mc || sa) ? q.q : kp ? esc(q.t) : esc(plain(q.q));
      /* 收藏页里选择题直接把选项连同答案一起列出来（顺手标出上次选了哪个），剩下的题还是折叠的 */
      var body = mc ? optsHTML(q, (state.progress[id] || {}).pick, true)
               : kp ? kpAnsHTML(q)
               : sa ? aBodyHTML(q) : "";
      return '<div class="item" data-id="' + id + '">' +
        '<div class="tag">' + tag + "</div>" +
        '<div class="txt">' + txt + "</div>" +
        (mc ? body : '<div class="fav-answer" hidden>' + body + "</div>") +
        (mc ? expBlockHTML(q) : "") +
        (q.note ? '<div class="qnote">' + q.note + "</div>" : "") +
        '<div class="btnrow"><button class="btn" data-del="' + id + '">取消收藏</button>' +
        (mc ? "" : '<button class="btn primary" data-toggle="' + id + '">' +
                   (kp ? "看要点" : "显示答案") + "</button>") +
        "</div>" +
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
        var word = btn.closest(".item").querySelector(".tag").textContent.indexOf("知识点") >= 0
          ? ["看要点", "收起要点"] : ["显示答案", "收起答案"];
        btn.textContent = box.hidden ? word[0] : word[1];
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
    root.querySelectorAll(".qimgs img, .answer img, .fav-answer img, .note-page img")
      .forEach(function (img) {
        if (img.dataset.zoom) return;
        img.dataset.zoom = "1";
        img.style.cursor = "zoom-in";
        img.addEventListener("click", function () {
          boxImg.src = img.src;
          boxImg.alt = img.alt;
          /* 宽扁的公式长条按高度放大、横向拖动；其余按宽度铺满 */
          var ratio = img.naturalWidth && img.naturalHeight
            ? img.naturalWidth / img.naturalHeight : 1;
          boxImg.classList.remove("z2", "z3");
          boxImg.classList.toggle("wide", ratio > 2.2);
          zoomLv = 0;
          box.hidden = false;
          box.scrollLeft = 0;
          box.scrollTop = 0;
          document.body.style.overflow = "hidden";
        });
      });
  }

  /* 点图循环放大 1x → 2x → 3x，放大时保持视线中心不跑偏 */
  var zoomLv = 0, ZCLS = ["", "z2", "z3"];
  function cycleZoom(e) {
    e.stopPropagation();                 /* 别把点击冒泡给背景，否则会关掉 */
    var fx = box.scrollWidth ? (box.scrollLeft + box.clientWidth / 2) / box.scrollWidth : 0.5;
    var fy = box.scrollHeight ? (box.scrollTop + box.clientHeight / 2) / box.scrollHeight : 0.5;
    zoomLv = (zoomLv + 1) % ZCLS.length;
    boxImg.classList.remove("z2", "z3");
    if (ZCLS[zoomLv]) boxImg.classList.add(ZCLS[zoomLv]);
    void boxImg.offsetWidth;             /* 强制重排后再算滚动位置 */
    box.scrollLeft = fx * box.scrollWidth - box.clientWidth / 2;
    box.scrollTop = fy * box.scrollHeight - box.clientHeight / 2;
  }
  boxImg.addEventListener("click", cycleZoom);

  function closeBox() {
    box.hidden = true;
    boxImg.removeAttribute("src");
    boxImg.classList.remove("wide", "z2", "z3");
    zoomLv = 0;
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

  /* 底部「章节」按回哪个板块 —— 在知识点栏里刷题时就该回知识点主页，别一脚踹回简答题 */
  function syncHomeHref(mode) {
    var a = tabbar.querySelector('[data-tab="home"]');
    if (a) a.setAttribute("href", modeHome(mode));
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);

    if (!parts.length) return renderHome("quiz");

    if (parts[0] === "hw") {
      if (!parts[1]) return renderHome("hw");
      var hwCh = parts[1] === "all" ? "all" : parseInt(parts[1], 10);
      if (hwCh !== "all" && !hwChapterOf(hwCh)) return renderHome("hw");
      if (cur.ch !== hwCh && !parts[2]) cur.q = null;
      if (parts[2]) cur.ch = hwCh;
      return renderQuiz(hwCh, parts[2] || null, "hw");
    }
    if (parts[0] === "mc") {
      if (!parts[1]) return renderHome("mc");
      var y = parts[1] === "all" ? "all" : parseInt(parts[1], 10);
      if (y !== "all" && !mcYearOf(y)) return renderHome("mc");
      if (cur.ch !== y && !parts[2]) cur.q = null;
      if (parts[2]) cur.ch = y;
      return renderQuiz(y, parts[2] || null, "mc");
    }
    if (parts[0] === "sa") {
      if (!parts[1]) return renderHome("sa");
      var sy = parts[1] === "all" ? "all" : parseInt(parts[1], 10);
      if (sy !== "all" && !saYearOf(sy)) return renderHome("sa");
      if (cur.ch !== sy && !parts[2]) cur.q = null;
      if (parts[2]) cur.ch = sy;
      return renderQuiz(sy, parts[2] || null, "sa");
    }
    if (parts[0] === "kp") {
      if (!parts[1]) return renderHome("kp");
      var kpCh = parts[1] === "all" ? "all" : parseInt(parts[1], 10);
      if (kpCh !== "all" && !chapterOf(kpCh)) return renderHome("kp");
      if (cur.ch !== kpCh && !parts[2]) cur.q = null;
      if (parts[2]) cur.ch = kpCh;
      return renderQuiz(kpCh, parts[2] || null, "kp");
    }
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
