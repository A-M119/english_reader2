// アップロードされたJSONファイルの読み込み・バリデーションを行う

function validateBookData(data) {
  if (!data || typeof data !== "object") {
    return "JSONの形式が正しくありません。";
  }
  if (!Array.isArray(data.sentences) || data.sentences.length === 0) {
    return "\"sentences\" 配列が見つからないか、空です。";
  }
  for (let i = 0; i < data.sentences.length; i++) {
    const s = data.sentences[i];
    if (!s || typeof s.en !== "string" || s.en.trim() === "") {
      return `${i + 1}番目の文に "en" (原文) がありません。`;
    }
  }
  return null;
}

function normalizeBookData(data) {
  return {
    title: typeof data.title === "string" && data.title.trim() !== "" ? data.title : "無題の本",
    sentences: data.sentences.map((s, i) => ({
      id: typeof s.id === "number" ? s.id : i,
      en: s.en,
      ja: typeof s.ja === "string" ? s.ja : null,
      words: Array.isArray(s.words) ? s.words : [],
      structure: typeof s.structure === "string" ? s.structure : null,
    })),
  };
}

function loadBookFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("ファイルが選択されていません。"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        reject(new Error("JSONとして読み込めませんでした。ファイル形式を確認してください。"));
        return;
      }
      const error = validateBookData(data);
      if (error) {
        reject(new Error(error));
        return;
      }
      resolve(normalizeBookData(data));
    };
    reader.onerror = () => {
      reject(new Error("ファイルの読み込み中にエラーが発生しました。"));
    };
    reader.readAsText(file);
  });
}

const FileLoader = {
  loadBookFile,
};
