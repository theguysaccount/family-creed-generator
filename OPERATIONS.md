# Operations

Family Creed Generator runs with no human in the loop. This file lists every automated job, how each one fails safely, what to watch, and the keys a human can turn later.

**Live:** https://theguysaccount.github.io/family-creed-generator/ (GitHub Pages, deployed by Actions from `main`).

## Automated jobs

| Job | File | When | What it does | How it fails safely |
|---|---|---|---|---|
| Build, test and deploy | `.github/workflows/deploy.yml` | every push to `main`; **weekly, Mondays 06:17 UTC**; by hand | unit and build tests → build `dist/` → draw share cards → **end-to-end self-test in headless Chrome** (every page on desktop and phone, a three-person session, a relative answering by link, PDF/PNG/crest/SVG exports, share link) → deploy to Pages → smoke-test the live site → IndexNow for changed pages | Any failed step stops before `deploy`, so the last good version stays live. The smoke test and IndexNow run after deploy and never roll anything back; IndexNow errors are ignored. |
| Weekly content | same workflow, scheduled run | Mondays | the build publishes every example in `src/content/examples.js` whose `publish` date has arrived, so a new example page appears each week, with its share card, sitemap entry and IndexNow ping | An example that breaks a test is never published; the previous week's site stays up. |
| Weekly self-test samples | same workflow | every run | saves `selftest-out/` (sample crests for this week's seed, a sample Letter PDF, an 8×10 PNG, phone screenshots, `report.txt`) as the run artifact `selftest-<n>`, kept 30 days | Read-only. |
| Site health | `.github/workflows/health.yml` | **daily, 09:41 UTC**; by hand | fetches every sitemap page and every file they link to (scripts, styles, fonts, share cards, icons) | Never changes the site. On failure it opens one issue labelled `site-health` (or comments on the open one); when the check passes again it closes the issue. |
| Keep-alive | `.github/scripts/keepalive.sh`, called by both scheduled workflows | every scheduled run | re-enables every workflow through the API, and if the last commit is 45+ days old pushes an empty commit, so GitHub's 60-day inactivity rule never disables the schedules | Runs even when the build fails (`if: always()`). Pushes made with `GITHUB_TOKEN` never trigger other workflows, so it cannot loop. |

The examples backlog has 26 entries: 8 published at launch, then one every Monday until **2027-03-01**. After that the weekly job still rebuilds, self-tests and redeploys; it just has no new example to publish. See "Content routine" below to extend it.

## What to watch

- **Actions tab** (https://github.com/theguysaccount/family-creed-generator/actions). A red weekly run means nothing was deployed that week; the site is unchanged. GitHub emails failures of scheduled runs to the account owner.
- **Issues labelled `site-health`** (https://github.com/theguysaccount/family-creed-generator/issues?q=label%3Asite-health). An open one means the live site has a broken page or file right now.
- **Self-test artifacts**: open the latest `selftest-<n>` artifact on a run page to see this week's sample crests and the sample PDF.
- **Analytics**, once the GoatCounter key below is set: the activation event is any `export_*` or `share` event in a session (a family downloaded or shared its design).

## Recovering by hand

- A bad deploy that passed every test: re-run the last good "Build, test and deploy" run from the Actions tab ("Re-run all jobs" redeploys that commit), or `git revert` the bad commit and push.
- A schedule that GitHub disabled anyway: Actions tab → the workflow → "Enable workflow", then "Run workflow".
- Local check of anything: `npm test && node scripts/build.mjs && node scripts/og.mjs && node scripts/selftest.mjs`.

## Keys Jack can turn later

Nothing below is needed for the site to work. Each key adds one thing.

### 1. A custom domain

Candidates (no domain in the 2026-08-30 portfolio fits; availability checked by public RDAP on 2026-10-25):

1. **familycreed.app** (unregistered): the product name; `.app` forces HTTPS, which Pages and Cloudflare both provide.
2. **makeyourcrest.com** (unregistered): matches what people search for ("make your own family crest").
3. **crestandcreed.org** (unregistered): the two things the family gets.

Steps once one is bought (this is the only part that costs money and needs a human):

1. In the registrar's DNS, for an apex domain add four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, four `AAAA` records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`, and a `CNAME` for `www` → `theguysaccount.github.io`.
2. Tell Pages the domain: `gh api -X PUT repos/theguysaccount/family-creed-generator/pages -f cname=familycreed.app`, then tick "Enforce HTTPS" once the certificate is issued (Settings → Pages).
3. Set the repository variable so canonical URLs, share links, the sitemap and IndexNow use the new domain: `gh variable set FCG_SITE_URL --body https://familycreed.app --repo theguysaccount/family-creed-generator`, then run the deploy workflow. The build switches from the `/family-creed-generator/` path to the root automatically (tested).
4. Optional: verify the domain in Google Search Console with a DNS `TXT` record and submit `https://familycreed.app/sitemap.xml`. Bing and the other IndexNow engines are already notified on every deploy.

Until then, the only robots.txt crawlers read is `https://theguysaccount.github.io/robots.txt`, which does not exist (that means "allow everything"); the sitemap is still found through IndexNow and links. A custom domain fixes this.

### 2. Money: framed prints, shirts and mugs

GitHub Pages is for non-commercial sites, so the shop slot is **off**. To switch it on:

1. Move hosting off Pages first (Cloudflare Pages is free and allows commercial use): connect the repo in Cloudflare Pages with build command `node scripts/build.mjs && node scripts/og.mjs`, output `dist`, environment variable `FCG_BASE_URL=https://<your domain>`, and point the custom domain there instead of at GitHub (step 1 above, with Cloudflare's records).
2. Open a print-on-demand store that accepts a customer's own image (for example Printful or Gelato connected to a Shopify or Etsy shop with "personalization: upload a file" turned on), with products sized for the downloads: 8×10, 11×14 and 16×20 framed prints (PDF), and shirts and mugs (the transparent crest PNG).
3. Set the repository variable `FCG_SHOP_URL` to the store link (Cloudflare: the same variable in its project settings) and redeploy. The editor then shows "Want it framed or on a shirt? Order a print" under the downloads.

A lighter option that is fine on Pages today: set `FCG_SUPPORT_URL` to a GitHub Sponsors or Buy Me a Coffee page; the footer then shows "Support this free tool".

### 3. Privacy-respecting analytics

Create a free GoatCounter site (https://www.goatcounter.com, no cookies, no personal data), then `gh variable set FCG_GOATCOUNTER --body https://<code>.goatcounter.com/count --repo theguysaccount/family-creed-generator` and redeploy. The site then counts page views and these events: `setup_start`, `member_done`, `generated`, `voted`, `chosen`, `export_pdf`, `export_png`, `export_crest`, `export_svg`, `print`, `share`, `invite_created`, `answers_imported`, `view_open`, `view_cta`. It skips counting for Do Not Track and Global Privacy Control. Activation = a session that reaches any `export_*` or `share`.

### 4. Content routine (new examples after March 2027)

Recurring AI-written content cannot run inside Actions (no API key). To keep the weekly drip going, schedule a Claude Code routine (claude.ai → Code → routines, or `/schedule` in Claude Code) on this repository, monthly:

> In theguysaccount/family-creed-generator, append four new entries to `src/content/examples.js`, one for each of the next four Mondays after the last `publish` date. Each needs a family situation not already covered, five value ids from `src/assets/js/engine/values.js` in order of importance, an animal, color, activity, hard-times and legacy answer from the lists in `src/assets/js/engine/creed.js` and `values.js`, a tone and occasion, and an original 100–130 word intro in the style of the existing ones (no invented statistics or testimonials). Run `npm test && node scripts/build.mjs && node scripts/og.mjs && node scripts/selftest.mjs`, fix anything that fails, and open a pull request.

Merge the pull request and the weekly job publishes them on their dates.

### 5. Root robots.txt for every theguysaccount project site (optional)

A public repo named `theguysaccount.github.io` with a `robots.txt` listing each project's sitemap would let crawlers find the sitemap directly. It is a separate public repo, so it is left for a human decision.

## Configuration reference

| Variable | Where | Effect |
|---|---|---|
| `FCG_SITE_URL` | repo variable | public base URL; default `https://theguysaccount.github.io/family-creed-generator` |
| `FCG_SHOP_URL` | repo variable | shows the print-shop slot in the editor (only after moving off Pages) |
| `FCG_SUPPORT_URL` | repo variable | shows "Support this free tool" in the footer |
| `FCG_GOATCOUNTER` | repo variable | turns on cookieless analytics |
| `FCG_TODAY` | env, local only | build as if on another date (preview future examples) |
| `FCG_OUT` | env, local only | build into another folder |
