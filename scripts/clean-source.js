// Cleans a raw Project Gutenberg (or similarly formatted) plain-text novel:
// - strips the Gutenberg header/license and footer/license blocks
// - fixes the common "â" mojibake that replaces curly quotes/apostrophes
// - removes "*  *  *  *" scene-break marker lines
// - splits the remaining body into per-chapter .txt files
//
// Usage:
//   node scripts/clean-source.js <input.txt> <outputDir>
//
// Notes:
// - Chapter detection assumes headers of the form "CHAPTER <roman-numeral>."
//   on their own line, followed by a title line (typical of classic Gutenberg
//   texts). If a book uses a different heading style (e.g. "Chapter 1",
//   "PART ONE"), adjust `chapterRegex` below before running.
// - This script does NOT do sentence splitting or translation — that part is
//   done by hand (or by Claude, per the convert-book skill) after cleaning,
//   since it requires judgment that a regex can't provide.

const fs = require('fs');
const path = require('path');

const [, , inputPath, outputDir] = process.argv;

if (!inputPath || !outputDir) {
  console.error('Usage: node scripts/clean-source.js <input.txt> <outputDir>');
  process.exit(1);
}

let text = fs.readFileSync(inputPath, 'utf8');

// Strip Gutenberg header/footer boilerplate if present.
const startMarker = /\*\*\*\s*START OF THE PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;
const endMarker = /\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;
const startMatch = text.match(startMarker);
const endMatch = text.match(endMarker);
if (startMatch) text = text.slice(startMatch.index + startMatch[0].length);
if (endMatch) text = text.slice(0, text.indexOf(endMatch[0]));

// Fix mojibake: "â" stands in for U+2018/2019 (single quotes/apostrophe) and
// U+201C/201D (double quotes) that got mangled during a lossy re-encoding.
// Heuristic: letter-â-letter => apostrophe (Alice's, don't). Anything else
// (start/end of a quoted phrase) => a straight double quote.
text = text.replace(/([A-Za-z])â([A-Za-z])/g, "$1'$2");
text = text.replace(/â/g, '"');

// Strip italic/emphasis underscores from the Gutenberg plain-text convention
// (_very_ -> very) so they don't show up literally in the reading app.
text = text.replace(/_([A-Za-z][A-Za-z .,'-]*?)_/g, '$1');

// Remove scene-break asterisk rows and collapse extra blank lines.
text = text.replace(/^[ \t]*\*(?:[ \t]+\*)+[ \t]*$/gm, '');
text = text.replace(/\n{3,}/g, '\n\n');

fs.mkdirSync(outputDir, { recursive: true });

// Split into chapters using "CHAPTER <roman numeral>.\n<title>" headers.
const chapterRegex = /^CHAPTER\s+([IVXLCDM]+)\.?\s*\n([^\n]+)\n/gim;
let match;
const chapters = [];
let lastHeader = null;

while ((match = chapterRegex.exec(text)) !== null) {
  if (lastHeader) {
    chapters.push({ ...lastHeader, body: text.slice(lastHeader.bodyStart, match.index).trim() });
  }
  lastHeader = { num: match[1], title: match[2].trim(), bodyStart: chapterRegex.lastIndex };
}
if (lastHeader) {
  chapters.push({ ...lastHeader, body: text.slice(lastHeader.bodyStart).trim() });
}

if (chapters.length === 0) {
  console.warn('No "CHAPTER <roman numeral>." headers found — check the heading style and adjust chapterRegex.');
  fs.writeFileSync(path.join(outputDir, 'full-text.txt'), text.trim() + '\n', 'utf8');
  console.log(`Wrote ${path.join(outputDir, 'full-text.txt')} (no chapter split applied)`);
  process.exit(0);
}

chapters.forEach((ch, i) => {
  const fname = path.join(outputDir, `chapter-${String(i + 1).padStart(2, '0')}.txt`);
  fs.writeFileSync(fname, `${ch.title}\n\n${ch.body}\n`, 'utf8');
  console.log(`Wrote ${fname} (${ch.body.length} chars)`);
});

console.log(`Total chapters: ${chapters.length}`);
