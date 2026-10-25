# Decisions

**D1. A library of hand-written lines, not AI.** Machine-driven mode has no API key at runtime, and the brief rules out runtime AI calls. About 450 original lines (36 values × 3 tones × 3, plus activities, hard times, legacy, openings, closings and occasions) are assembled by a seeded engine, so the same answers give the same creed and every sentence was reviewed once. Each line has variants, so "say it another way" works without AI.

**D2. Pass-the-phone with counts-only results.** The brief flags family conflict. Each person answers privately; results show totals, never names; one organizer edits the final text. Remote relatives answer by link and send a link back, which keeps the "no server" rule.

**D3. Three options and a vote.** The evaluator's v1 says "the family votes". Three designs with different layouts, mottos and creed variants, with + / − vote counters for a show of hands, is faster than a second pass-the-phone round.

**D4. Original heraldic charges, drawn in code.** 48 charges (14 animals, 34 objects) are SVG paths written for this project and dedicated to CC0, so there is no attribution chain on prints and no risk of copying someone's artwork. Animals follow heraldic conventions (affronté faces, displayed eagle, caboshed stag) that read well at small sizes. Look-alike pairs (lion's face and sun, dove and olive) never share a shield.

**D5. The rule of tincture is enforced, and every design has a blazon.** Generated designs always put metal on colour; the editor allows breaking it with a warning. Writing the formal blazon builds trust and makes the heraldry guide genuinely useful.

**D6. Not a surname lookup, and says so.** Coats of arms belonged to individuals. Every page carries the note that a crest made here is a family emblem, not historical arms (and that Scotland regulates arms through the Lord Lyon). Plain designs can coincide with existing arms; layouts add a second symbol, motto and wreath to keep designs distinctive.

**D7. Raster PDF at 300 dpi, written by hand.** Posters are rendered to a canvas from SVG with the fonts embedded, then wrapped in a one-page PDF by a 60-line writer (no library). 300 dpi up to 11×14 and 200 dpi at 16×20 keep phone canvases under Safari's 16.7-megapixel limit. Vector SVG is offered for engraving.

**D8. Static site on GitHub Pages, no build dependencies.** Pages is the free host available; Node 22 in Actions builds pages from the same engine modules the browser uses. No npm packages means nothing to update and nothing to break.

**D9. Fonts: Cinzel and EB Garamond, self-hosted.** OFL-licensed Latin and Latin-Extended subsets (about 270 KB in all), served from the site rather than Google Fonts so no visitor data goes to a third party. UnifrakturMaguntia (blackletter) was dropped because its Reserved Font Name complicates redistributing a subset.

**D10. Weekly example drip from a backlog.** 26 themed examples (new parents, wedding, blended family, grandparents, reunion, ...) publish one a week from their dates in `src/content/examples.js`. Each has an original intro; creed, crest and motto come from the engine, so the pages are distinct, not templated filler.

**D11. Share links in the URL fragment.** The design is deflated and base64url-encoded after `#`, so it never reaches a server log and needs no database. Decoding validates every field against fixed lists and length limits.

**D12. Money slot built but off.** Pages is non-commercial, so the print shop link only appears when `FCG_SHOP_URL` is set, which OPERATIONS.md ties to moving hosting to Cloudflare Pages first.

**D13. Answers to the open question.** "Gift product or family app?" Both, in that order: v1 is a family activity whose output is a gift. The session takes ten minutes, the print is the gift, and nothing about it needs an account or a return visit to deliver value.
