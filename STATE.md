# State: 2026-10-25

**Works (live):**
- The family session on phone and desktop: setup, pass-the-phone questions, remote relatives by link, results, three designs, voting, editor.
- Exports: print-ready PDF (6 sizes), PNG poster, transparent crest PNG, SVG, browser print. Share links with a public view page.
- 55 static pages: home, app, share view, 36 value pages, mottos, Latin mottos, heraldry guide, gift guide, how-to, about, 8 examples (one more each Monday until 2027-03-01).
- 27 unit/build tests and a headless-Chrome self-test of the whole flow, run on every deploy and weekly.

**Origin:** the idea was one line in Jack's AI X Tools note (Nov 2025), quoted in the build prompt. There was no code, design or folder to reuse.

**Known gaps:**
- No custom domain, analytics or shop yet: all keys in OPERATIONS.md.
- Poster fonts cover Latin and Latin Extended only.
- Remote answers merge only on the organizer's own browser (by design: no server).
- Crests are original but simple designs can coincide with existing arms; the site says so.

**Worth reusing:** `src/assets/js/engine/charges.js` (48 CC0 heraldic SVG charges), `crest.js` (shields, divisions, lines, layouts, blazon), `pdf.js` (dependency-free JPEG→PDF), `scripts/lib/chrome.mjs` (zero-dependency headless Chrome driver), `scripts/selftest.mjs` pattern.
