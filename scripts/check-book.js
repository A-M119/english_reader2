// 本のJSONの parse データを検証する。
// - parse.tokens が原文中で順番どおりに見つかるか
// - 原文の英単語がすべて tokens で覆われているか（品詞の付け漏れ）
// - glossary の単語が原文中にあるか（下線表示されるか）
// 使い方: node scripts/check-book.js books/<slug>.json
const fs = require("fs");

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (w, flags) =>
  new RegExp(`${/^[A-Za-z]/.test(w) ? "(?<![A-Za-z])" : ""}${escapeRegExp(w)}${/[A-Za-z]$/.test(w) ? "(?![A-Za-z])" : ""}`, flags);

const POS = new Set(["名", "代", "動", "助", "形", "副", "冠", "前", "接", "間"]);
const ROLES = new Set(["S", "V", "O", "C", "M"]);

const book = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
let problems = 0;
const report = (s, msg) => {
  problems++;
  console.log(`#${s.id}: ${msg}`);
};

let withParse = 0;
book.sentences.forEach((s) => {
  (s.glossary || []).forEach((g) => {
    if (!wordRe(g.word, "i").test(s.en)) report(s, `glossary "${g.word}" が原文に見つからない`);
  });
  if (!s.parse) return;
  withParse++;
  const covered = new Array(s.en.length).fill(false);
  let cursor = 0;
  for (const t of s.parse.tokens) {
    if (!POS.has(t.pos)) report(s, `"${t.w}" の品詞 "${t.pos}" が不正`);
    if (t.role && !ROLES.has(t.role)) report(s, `"${t.w}" の成分 "${t.role}" が不正`);
    const re = wordRe(t.w, "g");
    re.lastIndex = cursor;
    const m = re.exec(s.en);
    if (!m) {
      report(s, `token "${t.w}" が位置 ${cursor} 以降に見つからない`);
      return;
    }
    for (let i = m.index; i < m.index + m[0].length; i++) covered[i] = true;
    cursor = m.index + m[0].length;
  }
  const missed = [];
  s.en.replace(/[A-Za-z]+/g, (w, i) => {
    if (!covered[i]) missed.push(w);
  });
  if (missed.length) report(s, `品詞なしの語: ${missed.join(", ")}`);
});

console.log(`${withParse} / ${book.sentences.length} 文に parse あり、問題 ${problems} 件`);
process.exitCode = problems ? 1 : 0;
