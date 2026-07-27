---
name: convert-book
description: Convert a plain-text English novel (typically from Project Gutenberg) into this project's reading-app JSON format — sentence-by-sentence English/Japanese translation, vocabulary notes, and grammar-structure notes. Use when the user provides a novel .txt file and asks to convert it, add it to the reader, or turn it into a book JSON.
---

# Convert a novel txt into the reader's JSON format

This project (English_reader) is a static, API-free English-reading app. It
never calls a translation API at runtime — instead, book data files are
produced once, by hand, in a Claude Code conversation like this one, using
the model's own judgment for translation and grammar explanation. This skill
is that authored process, formalized so it doesn't need to be re-explained
each time.

Read `docs/json-format.md` first — it defines the exact JSON schema
(`title` + `sentences[]`, each with `en`/`ja`/`words`/`structure`) that the
app consumes. Everything below produces data in that shape.

## Why this is manual, not scripted

Translation quality, natural Japanese phrasing, picking which 3-5 vocabulary
items are worth glossing, and writing a useful (not exhaustive) grammar note
all require judgment. Only the mechanical cleanup (encoding fixes, stripping
license boilerplate, chapter splitting) is scripted. Do not try to automate
the translation step — that is the point of doing this inside a
conversation instead of a pipeline.

## Steps

1. **Get the source txt.** Ask the user for the file (or its path) if not
   already provided. Save it under `books/raw/<slug>.txt` in the project.

2. **Clean it.** Run:
   ```
   node scripts/clean-source.js books/raw/<slug>.txt books/raw/<slug>-chapters
   ```
   This strips the Gutenberg header/license and footer, fixes the "â"
   mojibake that commonly replaces curly quotes/apostrophes, strips
   `_italic_` underscore markup, removes scene-break asterisk rows, and
   splits the book into `chapter-01.txt`, `chapter-02.txt`, ... in the output
   directory.

   Check the console output. If it warns "No CHAPTER headers found," open
   the source and see how chapters are actually marked (e.g. "Chapter 1",
   "PART ONE") — adjust `chapterRegex` in `scripts/clean-source.js`
   accordingly, or split manually for a one-off book.

   Skim a chapter file afterward to confirm quotes/apostrophes look right
   (no stray "â" left) and no license text leaked in at the edges.

3. **Process ONE chapter at a time.** Do not attempt an entire multi-chapter
   novel in one pass — it produces too much output at once and quality
   suffers. For the current chapter file:

   a. Read it and mentally split it into sentences. Rule: a sentence
      boundary is where the **outer narrative sentence** ends — not every
      period inside a quotation. Long compound sentences joined by
      semicolons stay as one entry if the original only has a period at the
      end; don't invent extra sentence breaks the author didn't write. Short
      standalone lines ("Down, down, down.") stay short.

   b. For each sentence, write:
      - `en`: the exact original sentence (already cleaned of mojibake and
        underscores).
      - `ja`: a natural, faithful Japanese translation — not a paraphrase,
        not overly literal either.
      - `words`: 3-5 notable vocabulary items, phrasal verbs, or idioms from
        that sentence with a short Japanese gloss. Skip trivial words. Skip
        this array (or leave it short) for very simple sentences.
      - `structure`: 1-3 sentences (in Japanese) naming the non-obvious
        grammar at play — inversion, subjunctive, a formal-subject `it`,
        an elliptical clause, etc. Don't restate what's already obvious from
        the translation.

   c. Append the finished sentences to the book's JSON file at
      `books/<slug>.json` (create it with `{"title": "...", "sentences": []}`
      on the first chapter). Continue the `id` sequence across chapters.
      An optional `"chapter"` field (e.g. `"II. The Pool of Tears"`) on each
      sentence is fine for your own bookkeeping — the app ignores unknown
      fields — but is not required by the schema.

   d. Validate the file parses: `node -e "require('./books/<slug>.json')"`.

4. **Test in the app after the first chapter, then periodically.** Load
   `books/<slug>.json` in `index.html` (a local static server or even
   `file://` works, since the app has no build step) and click through a
   few sentences, open the translation panel, and confirm nothing looks
   broken (stray underscores, mismatched quotes, overly long unreadable
   blocks). This is cheap insurance against carrying a formatting bug
   through 11 more chapters.

5. **Repeat step 3 for the next chapter**, in a new pass, until the user has
   what they need. It's fine — expected, even — to do this over multiple
   conversation turns or sessions rather than all at once; the JSON file
   accumulates incrementally and there's no reason to rush a whole novel
   through in one sitting.

## Reference example

`books/alice-in-wonderland.json`, Chapter I ("Down the Rabbit-Hole", 45
sentences) is a worked example of the target quality and format — use it to
calibrate translation style, vocabulary selection, and how much detail goes
in a `structure` note.
