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

function renderSentence(sentence) {
  document.getElementById("sentence-en").textContent = sentence.en;
}

function renderProgress(currentIndex, total, title) {
  document.getElementById("book-title").textContent = title;
  document.getElementById("progress-text").textContent = `${currentIndex + 1} / ${total}文`;
  const pct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  document.getElementById("progress-bar").style.width = `${pct}%`;
}

function renderTranslationPanel(sentence, bookTitle, onAddVocab) {
  const jaEl = document.getElementById("translation-ja");
  jaEl.textContent = sentence.ja || "（和訳データがありません）";

  const wordsEl = document.getElementById("translation-words");
  clearChildren(wordsEl);
  if (sentence.words && sentence.words.length > 0) {
    sentence.words.forEach((w) => {
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
      wordsEl.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "（単語データがありません）";
    wordsEl.appendChild(li);
  }

  const structureEl = document.getElementById("translation-structure");
  structureEl.textContent = sentence.structure || "（文構造データがありません）";
}

function setTranslationPanelVisible(visible) {
  document.getElementById("translation-panel").hidden = !visible;
  document.getElementById("btn-translate").textContent = visible ? "翻訳を閉じる" : "翻訳";
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
  renderSentence,
  renderProgress,
  renderTranslationPanel,
  setTranslationPanelVisible,
  renderVocabList,
  showView,
};
