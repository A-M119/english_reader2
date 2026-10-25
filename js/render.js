// DOM描画をまとめた関数群。
// JSONファイルの中身（他人が作ったファイルの可能性がある）はすべてtextContentで挿入し、
// innerHTMLへの直接埋め込みは行わない（XSS対策）。

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function showUploadError(message) {
  const el = document.getElementById("upload-error");
  el.textContent = message;
  el.hidden = !message;
}

function renderSavedBooksList(books, onResume) {
  const container = document.getElementById("saved-books-list");
  clearChildren(container);

  const titles = Object.keys(books);
  if (titles.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const heading = document.createElement("h2");
  heading.textContent = "前回の続きから読む";
  container.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "saved-books";
  titles
    .sort((a, b) => new Date(books[b].lastOpenedAt) - new Date(books[a].lastOpenedAt))
    .forEach((title) => {
      const info = books[title];
      const item = document.createElement("li");

      const btn = document.createElement("button");
      btn.className = "saved-book-btn";
      btn.type = "button";

      const titleSpan = document.createElement("span");
      titleSpan.className = "saved-book-title";
      titleSpan.textContent = title;

      const progressSpan = document.createElement("span");
      progressSpan.className = "saved-book-progress";
      progressSpan.textContent = `${info.lastIndex + 1} / ${info.totalSentences}文`;

      btn.appendChild(titleSpan);
      btn.appendChild(progressSpan);
      btn.addEventListener("click", () => onResume(title));

      item.appendChild(btn);
      list.appendChild(item);
    });

  container.appendChild(list);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "再開するには、対応するJSONファイルを下からもう一度選択してください。";
  container.appendChild(hint);
}

function renderLibraryList(books, onSelect) {
  const container = document.getElementById("library-list");
  clearChildren(container);

  if (!books || books.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const heading = document.createElement("h2");
  heading.textContent = "本棚から開く";
  container.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "saved-books";
  books.forEach((book) => {
    const item = document.createElement("li");

    const btn = document.createElement("button");
    btn.className = "saved-book-btn";
    btn.type = "button";

    const titleSpan = document.createElement("span");
    titleSpan.className = "saved-book-title";
    titleSpan.textContent = book.title;

    btn.appendChild(titleSpan);
    btn.addEventListener("click", () => onSelect(book));

    item.appendChild(btn);
    list.appendChild(item);
  });

  container.appendChild(list);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 原文を描画する。highlightWords を渡すと、該当する単語（単語単位・大文字小文字無視）に下線を付ける
function renderSentence(sentence, highlightWords) {
  const el = document.getElementById("sentence-en");
  clearChildren(el);
  el.classList.remove("parsed");

  const ranges = [];
  (highlightWords || []).forEach((word) => {
    const re = new RegExp(`(?<![A-Za-z])${escapeRegExp(word)}(?![A-Za-z])`, "gi");
    let m;
    while ((m = re.exec(sentence.en)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
    }
  });
  ranges.sort((a, b) => a[0] - b[0]);

  let pos = 0;
  ranges.forEach(([start, end]) => {
    if (start < pos) return; // 重なりは先勝ち
    el.appendChild(document.createTextNode(sentence.en.slice(pos, start)));
    const mark = document.createElement("span");
    mark.className = "glossed-word";
    mark.textContent = sentence.en.slice(start, end);
    el.appendChild(mark);
    pos = end;
  });
  el.appendChild(document.createTextNode(sentence.en.slice(pos)));
}

const PARSE_ROLES = {
  S: "主語（主部）",
  V: "述語動詞",
  O: "目的語",
  C: "補語",
  M: "修飾語",
};

// parse.tokens の各語を原文中で順に探し、[{token, start, end}] を返す。見つからない語があれば null。
// 語の境界は英字のみで判定するので、短縮形は they + 'll のように分けて書ける
function locateTokens(en, tokens) {
  const located = [];
  let cursor = 0;
  for (const token of tokens) {
    const before = /^[A-Za-z]/.test(token.w) ? "(?<![A-Za-z])" : "";
    const after = /[A-Za-z]$/.test(token.w) ? "(?![A-Za-z])" : "";
    const re = new RegExp(`${before}${escapeRegExp(token.w)}${after}`, "g");
    re.lastIndex = cursor;
    const m = re.exec(en);
    if (!m) return null;
    located.push({ token, start: m.index, end: m.index + m[0].length });
    cursor = m.index + m[0].length;
  }
  return located;
}

// 原文を「上に文の成分・下に品詞」付きの語ごとのセルで描画する。
// 語と語の間の句読点は、空白より前なら直前の語の後ろ、空白より後なら直後の語の前に付ける。
// 描画できない場合（データ不整合）は false を返す
function renderParsedSentence(sentence) {
  const located = locateTokens(sentence.en, sentence.parse.tokens);
  if (!located || located.length === 0) return false;

  const el = document.getElementById("sentence-en");
  clearChildren(el);
  const showClauseNo = (sentence.parse.clauses || []).length > 1;

  const cells = [];
  let prevEnd = 0;
  let prevKey = null;
  located.forEach(({ token, start, end }, i) => {
    const gap = sentence.en.slice(prevEnd, start);
    const [, before, middle, after] = gap.match(/^(\S*)(\s*(?:\S+\s+)*?\s*)(\S*)$/);
    if (i === 0) {
      cells.push({ prefix: gap, token });
    } else {
      cells[i - 1].suffix = before + middle.trim();
      cells.push({ prefix: after, token });
    }
    const key = token.role ? `${token.role}${token.c || ""}` : null;
    cells[i].showRole = key !== null && key !== prevKey;
    prevKey = key;
    prevEnd = end;
  });
  cells[cells.length - 1].suffix = sentence.en.slice(prevEnd);

  cells.forEach(({ prefix, suffix, token, showRole }) => {
    const cell = document.createElement("span");
    // 短縮形の後半（'ll / 've など）は直前の語に詰めて表示する
    cell.className = token.w.startsWith("'") && !prefix ? "pw pw-attached" : "pw";

    const role = document.createElement("span");
    role.className = "pw-role";
    if (showRole) role.textContent = `${token.role}${showClauseNo && token.c ? token.c : ""}`;

    const word = document.createElement("span");
    word.className = "pw-word";
    if (prefix) word.appendChild(document.createTextNode(prefix));
    const core = document.createElement("span");
    core.className = token.role ? `pw-core role-${token.role}` : "pw-core";
    core.textContent = token.w;
    word.appendChild(core);
    if (suffix) word.appendChild(document.createTextNode(suffix));

    const pos = document.createElement("span");
    pos.className = "pw-pos";
    pos.textContent = token.pos || "";

    cell.appendChild(role);
    cell.appendChild(word);
    cell.appendChild(pos);
    el.appendChild(cell);
  });
  el.classList.add("parsed");
  return true;
}

function renderParsePanel(sentence) {
  const rolesEl = document.getElementById("parse-roles");
  clearChildren(rolesEl);
  Object.entries(PARSE_ROLES).forEach(([key, label]) => {
    const li = document.createElement("li");
    const mark = document.createElement("span");
    mark.className = `pw-core role-${key}`;
    mark.textContent = key;
    li.appendChild(mark);
    li.appendChild(document.createTextNode(` ${label}`));
    rolesEl.appendChild(li);
  });

  const clausesEl = document.getElementById("parse-clauses");
  clearChildren(clausesEl);
  const clauses = sentence.parse ? sentence.parse.clauses || [] : [];
  if (clauses.length === 0) {
    const li = document.createElement("li");
    li.textContent = sentence.parse ? "（節の説明はありません）" : "（この文には構造データがありません）";
    clausesEl.appendChild(li);
  }
  clauses.forEach((c) => {
    const li = document.createElement("li");
    li.value = c.id;
    li.textContent = c.label;
    clausesEl.appendChild(li);
  });
}

function setParsePanelVisible(visible) {
  document.getElementById("parse-panel").hidden = !visible;
  document.getElementById("parse-legend").hidden = !visible;
  document.getElementById("btn-parse").textContent = visible ? "構造を閉じる" : "構造";
}

function setSupplementPanelVisible(visible) {
  document.getElementById("supplement-panel").hidden = !visible;
  document.getElementById("btn-supplement").textContent = visible ? "補足を閉じる" : "補足";
}

function renderProgress(currentIndex, total, title) {
  document.getElementById("book-title").textContent = title;
  document.getElementById("progress-text").textContent = `${currentIndex + 1} / ${total}文`;
  const pct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  document.getElementById("progress-bar").style.width = `${pct}%`;
}

// 単語リスト（「わからない」ボタン付き）を描画する
function renderWordList(listEl, words, emptyText, sentence, bookTitle, onAddVocab) {
  clearChildren(listEl);
  if (words && words.length > 0) {
    words.forEach((w) => {
      const li = document.createElement("li");

      const text = document.createElement("span");
      text.className = "word-entry";
      text.textContent = `${w.word}: ${w.meaning}`;

      const btn = document.createElement("button");
      btn.className = "btn-vocab-add";
      btn.type = "button";
      btn.textContent = "わからない";
      btn.addEventListener("click", () => {
        onAddVocab({
          word: w.word,
          meaning: w.meaning,
          sentence: sentence.en,
          bookTitle,
        });
        btn.textContent = "登録済み";
        btn.disabled = true;
      });

      li.appendChild(text);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = emptyText;
    listEl.appendChild(li);
  }
}

function renderTranslationPanel(sentence, bookTitle, onAddVocab) {
  const jaEl = document.getElementById("translation-ja");
  jaEl.textContent = sentence.ja || "（和訳データがありません）";

  const wordsEl = document.getElementById("translation-words");
  renderWordList(wordsEl, sentence.words, "（単語データがありません）", sentence, bookTitle, onAddVocab);

  const structureEl = document.getElementById("translation-structure");
  structureEl.textContent = sentence.structure || "（文構造データがありません）";
}

function setTranslationPanelVisible(visible) {
  document.getElementById("translation-panel").hidden = !visible;
  document.getElementById("btn-translate").textContent = visible ? "翻訳を閉じる" : "翻訳";
}

// 単語パネル（和訳・文構造なしで単語の意味だけ）を描画する。
// glossary が無い本では words（熟語・表現メモ）で代用する
function renderWordsPanel(sentence, bookTitle, onAddVocab) {
  const words = sentence.glossary || sentence.words;
  const emptyText = sentence.glossary ? "（この文に難しい単語はありません）" : "（単語データがありません）";
  renderWordList(document.getElementById("glossary-words"), words, emptyText, sentence, bookTitle, onAddVocab);
}

function setWordsPanelVisible(visible) {
  document.getElementById("words-panel").hidden = !visible;
  document.getElementById("btn-words").textContent = visible ? "単語を閉じる" : "単語";
}

function renderVocabList(vocab, onDelete) {
  const listEl = document.getElementById("vocab-list");
  clearChildren(listEl);

  if (vocab.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ登録された単語はありません。";
    listEl.appendChild(li);
    return;
  }

  vocab
    .slice()
    .reverse()
    .forEach((entry) => {
      const originalIndex = vocab.indexOf(entry);
      const li = document.createElement("li");
      li.className = "vocab-item";

      const wordLine = document.createElement("div");
      wordLine.className = "vocab-word-line";
      wordLine.textContent = `${entry.word} — ${entry.meaning}`;

      const meta = document.createElement("div");
      meta.className = "vocab-meta";
      meta.textContent = `『${entry.bookTitle}』より: ${entry.sentence}`;

      const delBtn = document.createElement("button");
      delBtn.className = "btn-vocab-delete";
      delBtn.type = "button";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => onDelete(originalIndex));

      li.appendChild(wordLine);
      li.appendChild(meta);
      li.appendChild(delBtn);
      listEl.appendChild(li);
    });
}

function showView(viewName) {
  ["upload", "reader", "vocab"].forEach((name) => {
    document.getElementById(`view-${name}`).hidden = name !== viewName;
  });
}

const Render = {
  showUploadError,
  renderSavedBooksList,
  renderLibraryList,
  renderSentence,
  renderProgress,
  renderTranslationPanel,
  setTranslationPanelVisible,
  renderWordsPanel,
  setWordsPanelVisible,
  renderParsedSentence,
  renderParsePanel,
  setParsePanelVisible,
  setSupplementPanelVisible,
  renderVocabList,
  showView,
};
