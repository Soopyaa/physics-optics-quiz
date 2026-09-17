#!/usr/bin/env python3
"""把转录好的简答题 JSON 拼成 sa-data.js。

用法：

    python3 tools/sa-build.py            # 读 tools/sa-src/*.json，写 sa-data.js
    python3 tools/sa-build.py --check    # 只做校验，不写文件

源 JSON 的格式见 tools/sa-src/README.md。每个年份一个文件，文件名是 <年>.json。
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sa-src")
OUT = os.path.join(HERE, os.pardir, "sa-data.js")

FIGDIR = os.path.join(HERE, os.pardir, "assets", "sa")

# 主页年份卡片下面那行小字。写给人看的，所以跟转录 JSON 里给维护者看的长 note 分开写：
# 2018 年之后的卷子都是回忆版（卷首标了「（回忆版）」），2017 那份还更进一步 ——
# 连题目都不是原题，是资料自己整理的常见题汇总。
YEAR_NOTES = {
    2012: "简答题 6 题：前 3 题各 4 分、后 3 题各 6 分，共 30 分。",
    2013: "简答题 6 题，每题 5 分，共 30 分。",
    2014: "简答题 6 题，每题 5 分，共 30 分。",
    2015: "简答题 5 题，每题 6 分，共 30 分。",
    2016: "简答题 6 题，每题 5 分，共 30 分。",
    2017: "回忆版，而且这一年卷面上的「简答题」不是原题，是资料自己整理的"
          "《常见简答题汇总》——「部分为 17 考查过的知识点，部分为重点」。"
          "题面里的（17）是资料标的「2017 考过」。",
    2018: "回忆版。本卷没有选择题，第一道大题就是简答题，共 5 题，卷面未标分值。",
    2019: "回忆版。简答题 5 题，卷面未标分值。",
    2020: "回忆版。简答题 6 题，每题 5 分，共 30 分。第 4、6 题答案册没给答案。",
    2021: "回忆版。本卷没有选择题，第一道大题就是简答题，共 6 题。",
    2022: "回忆版。简答题 8 题，卷面未标分值。",
    2023: "回忆版。简答题 6 题，每题 6 分，共 36 分。",
}

HEAD = """/* 李承霖大王的光学复习 · 简答真题题库（2012~2023）
 * 内容来源：电子科技大学 840 物理光学考研真题的简答题部分，
 * 题干从扫描件逐题转录，参考答案取自配套的《真题答案解析》。
 *
 * 2017 年是回忆版，卷面「二、简答题」其实是这份资料自己整理的「常见简答题汇总」，
 * 不是当年原卷，kind 记作 collection，主页卡片上有说明。
 * 2008~2011 四年的卷面写的是「二、计算、简答题」，计算与问答混在一段里，未收录。
 *
 * 图在 assets/sa/ 下；题干里的 <span class="blank"></span> 是原卷的填空下划线。
 *
 * 源 JSON 里只有 note 会渲染到题目上方（题面自带的标注、原书糊了之类）；
 * src_note 是给维护者看的备注（「这里的错字已订正」），不进 sa-data.js。
 *
 * 本文件由 tools/sa-build.py 从 tools/sa-src/*.json 生成，不要手改。
 */
"""


def js(v):
    """Python 值 → JS 字面量（字符串按 JSON 转义，中文不转义）"""
    return json.dumps(v, ensure_ascii=False)


def load():
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".json"))
    out = []
    for f in files:
        with open(os.path.join(SRC, f), encoding="utf-8") as fh:
            out.append(json.load(fh))
    out.sort(key=lambda d: d["year"])
    return out


def check(docs):
    """返回 (错误列表, 警告列表)"""
    errs, warns = [], []
    seen = set()
    for d in docs:
        year = d["year"]
        if year in seen:
            errs.append("%d 年出现了两份 JSON" % year)
        seen.add(year)

        if year not in YEAR_NOTES:
            errs.append("%d 年还没在 YEAR_NOTES 里写卡片说明" % year)

        nums = [it["num"] for it in d["items"]]
        if len(set(nums)) != len(nums):
            errs.append("%d 年题号有重复：%s" % (year, nums))
        if nums != sorted(nums):
            warns.append("%d 年题号不是递增的：%s" % (year, nums))

        for it in d["items"]:
            tag = "%d-%d" % (year, it["num"])
            if not str(it.get("q", "")).strip():
                errs.append("%s 题面是空的" % tag)
            if not it.get("a"):
                # 2020 年第 4、6 题答案册本身就缺答案，页面上会显示一句说明
                if not (it.get("note") or "").strip():
                    errs.append("%s 没有答案，也没在 note 里说明原因" % tag)
                else:
                    warns.append("%s 没有答案（note 已说明）" % tag)
            else:
                for b in it["a"]:
                    if b.get("t") not in ("p", "list"):
                        errs.append("%s 出现未知答案块 %r" % (tag, b.get("t")))
                    if b.get("t") == "list" and not b.get("v"):
                        errs.append("%s 的空列表块" % tag)
            for fig in it.get("figs", []):
                if not os.path.exists(os.path.join(FIGDIR, fig)):
                    errs.append("%s 的插图 %s 不在 assets/sa/ 里" % (tag, fig))
            for field in ("q", "note"):
                txt = it.get(field) or ""
                if "\n" in txt:
                    errs.append("%s 的 %s 里有换行，应该改用 <br>" % (tag, field))
                if "余哥" in txt or "成电考研" in txt or "微信公众号" in txt:
                    errs.append("%s 的 %s 里还留着水印" % (tag, field))
            for b in it.get("a") or []:
                vals = b["v"] if b["t"] == "list" else [b["v"]]
                for v in vals:
                    if "余哥" in v or "学长解析" in v or "成电考研" in v:
                        warns.append("%s 的答案里可能还留着水印/署名" % tag)
    return errs, warns


def render(docs):
    lines = [HEAD]
    lines.append("var SA_YEARS = [")
    for d in docs:
        coll = d.get("kind") == "collection"
        title = "常见简答题汇总" if coll else "真题简答题"
        lines.append(
            "  { id: %s, title: %s, kind: %s, sub: \"840 物理光学\", n: %d, note: %s },"
            % (d["year"], js(title), js("collection" if coll else "exam"),
               len(d["items"]), js(YEAR_NOTES[d["year"]]))
        )
    lines.append("];\n")

    lines.append("var SA = [")
    for d in docs:
        year = d["year"]
        for it in d["items"]:
            lines.append("  {")
            lines.append('    id: "s%d-%d",' % (year, it["num"]))
            lines.append("    y: %d," % year)
            lines.append("    num: %d," % it["num"])
            lines.append("    q: %s," % js(it["q"]))
            lines.append("    a: [")
            for b in it["a"]:
                if b["t"] == "list":
                    lines.append("      { t: \"list\", v: [")
                    for x in b["v"]:
                        lines.append("        %s," % js(x))
                    lines.append("      ] },")
                else:
                    lines.append("      { t: \"p\", v: %s }," % js(b["v"]))
            lines.append("    ],")
            if it.get("figs"):
                lines.append("    fig: [%s]," % ", ".join(js(x) for x in it["figs"]))
            if (it.get("note") or "").strip():
                lines.append("    note: %s," % js(it["note"]))
            lines.append("  },")
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main():
    docs = load()
    errs, warns = check(docs)
    for w in warns:
        print("警告: " + w)
    if errs:
        for e in errs:
            print("错误: " + e)
        print("\n有 %d 处错误，没有写出 sa-data.js" % len(errs))
        return 1

    total = sum(len(d["items"]) for d in docs)
    js_text = render(docs)
    if "--check" in sys.argv:
        print("校验通过：%d 个年份、%d 道题" % (len(docs), total))
        return 0
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(js_text)
    print("写好 %s：%d 个年份、%d 道题，%d 字节"
          % (os.path.relpath(OUT, HERE), len(docs), total, len(js_text.encode("utf-8"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
