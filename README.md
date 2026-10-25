# Family Creed Generator

**Live:** https://theguysaccount.github.io/family-creed-generator/ · **Screens:** [desktop and phone](docs/screens/) · **Operations:** [OPERATIONS.md](OPERATIONS.md)

A family passes one phone around the table. Each person privately picks the values that matter most, an animal, a color, what the family loves doing together and what it does when things get hard. In about ten minutes the family votes on three designs, each a creed, a motto (English or Latin) and a heraldic crest, then edits the winner and prints it.

Everything runs in the browser. No account, no server, no AI calls at runtime: creeds are assembled from about 400 hand-written lines in three tones, mottos from curated English and Latin phrase banks, and crests are drawn procedurally from 5 shields, 12 field divisions, 7 partition lines, 12 layouts and 48 original heraldic charges. Every design comes with its correct blazon.

## What a visitor gets

- **The session** (`/make/`): pass-the-phone questions with private answers and counts-only results; three options to vote on; an editor for every line, the motto, the colors, the symbols and the poster.
- **Downloads**: print-ready PDF at Letter, A4, 5×7, 8×10, 11×14 (300 dpi) and 16×20 (200 dpi); PNG poster; transparent crest PNG for shirts and mugs; SVG with embedded fonts; browser print.
- **Remote relatives**: an invite link; they answer on their own phone and send back a link that merges their answers into the organizer's session. Nothing passes through a server.
- **Share link** (`/c/#…`): the finished design travels in the URL fragment, which browsers never send to a server. The page shows the poster, the blazon, what each symbol means and a "make one for your family" button.
- **Search pages**: 36 family-value pages (mottos, Latin, creed lines, symbols, questions), family motto ideas, Latin mottos with a grammar table, a heraldry guide, a gift guide, a how-to, and an examples library that publishes one new example a week from a pre-written backlog.

## Layout

```
src/
  assets/js/engine/   pure ES modules, shared by the browser, the build and the tests
    values.js         36 values: creed lines (3 tones x 3), mottos, Latin forms, tinctures, symbols
    creed.js          tally answers; assemble creed and mottos; curated Latin mottos
    charges.js        48 original heraldic charges as SVG paths (14 animals, 34 objects)
    crest.js          shields, divisions, lines, ordinaries, layouts, counterchange, blazon, SVG
    design.js         family tally -> crest spec (rule of tincture enforced)
    poster.js         printable poster layout, 6 sizes x 4 styles
    share.js          share-link codec with strict sanitizing
    pdf.js            dependency-free JPEG-in-PDF writer
    meanings.js       what each color, band and symbol traditionally stands for
  assets/js/app/      browser UI: make.js (session + editor), view.js (share page), export.js
  content/            page copy: value pages, examples backlog, guides
scripts/
  build.mjs           dist/: pages, sitemap, robots, IndexNow key, manifest, share-card jobs
  og.mjs              draws share cards (1200x630 JPEG) and the touch icon in headless Chrome
  selftest.mjs        end-to-end test in headless Chrome (pages, session, exports, share, remote)
  screens.mjs         docs/screens/ at 1280 px and 390 px
  linkcheck.mjs       live-site check: sitemap pages and every linked file
  indexnow.mjs        changed-page detection and IndexNow submission
  serve.mjs           local static server that mimics GitHub Pages paths
tests/                node:test unit and build tests
.github/workflows/    deploy.yml (push + weekly), health.yml (daily)
```

## Run, test, deploy

Needs Node 20+ (CI uses 22) and, for share cards, screenshots and the self-test, Google Chrome. No npm packages.

```bash
npm test                                   # 27 unit + build tests
node scripts/build.mjs                     # → dist/ (FCG_BASE_URL sets canonical URLs)
node scripts/og.mjs                        # share cards and touch icon into dist/
node scripts/selftest.mjs                  # headless Chrome end-to-end; samples in selftest-out/
node scripts/serve.mjs 4747                # http://127.0.0.1:4747/family-creed-generator/
node scripts/screens.mjs                   # refresh docs/screens/
```

Deploys are automatic: every push to `main` runs tests, build, share cards and the browser self-test, then deploys to GitHub Pages. Nothing deploys if any step fails. See [OPERATIONS.md](OPERATIONS.md) for the scheduled jobs and the keys a human can turn later.

## Privacy and honesty

- Answers and designs stay in the browser's local storage. There are no accounts and no uploads.
- Results show counts, never who picked what, so a session can't single anyone out.
- Crests are family emblems you design, not historical coats of arms, and the site says so on every page.
- Meanings of colors and symbols follow W. Cecil Wade, *The Symbolism of Heraldry* (1898, public domain), presented as associations, not rules.

## License

Code, text and every heraldic charge: CC0 1.0 (public domain), see [LICENSE](LICENSE). Fonts: Cinzel and EB Garamond under the SIL Open Font License 1.1 (license files in `src/assets/fonts/`).
