// 本のJSONを、プリミティブ値だけのオブジェクトは1行にまとめる形式で整形し直す
// 使い方: node scripts/format-book.js books/<slug>.json
const fs = require("fs");

function format(value, indent) {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => inner + format(v, indent + 1)).join(",\n")}\n${pad}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.every(([, v]) => v === null || typeof v !== "object")) {
      return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }`;
    }
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${format(v, indent + 1)}`).join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(value);
}

const file = process.argv[2];
fs.writeFileSync(file, format(JSON.parse(fs.readFileSync(file, "utf8")), 0) + "\n");
