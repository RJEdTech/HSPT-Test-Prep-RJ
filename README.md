# HSPT Test Prep — Regis Jesuit High School

A free, public HSPT practice site. Static HTML, CSS and JavaScript with no build step and no
dependencies to install — edit a file, commit, and GitHub Pages redeploys it.

## Publishing

1. Push these files to the repository root.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`.**
3. The site appears at `https://rjedtech.github.io/HSPT-Test-Prep-RJ/` within a minute or two.

For a Regis Jesuit address instead, add a file named `CNAME` at the root containing one line —
for example `hspt.regisjesuit.com` — and ask whoever manages DNS for a CNAME record pointing that
host at `rjedtech.github.io`.

## Brand

Colours and type follow the **RJHS Core Logo Usage Standards** and **Stylebook**, v.08.2026. Both are owned
by Jessica Riles, Director of Marketing & Communications (jriles@regisjesuit.com, 303.269.8041) — new logo
files, permissions and style questions go to her.

| Token | Value | Source |
|---|---|---|
| `--rj-red` | `#C41130` | Raider Red, Pantone 187 C |
| `--rj-red-dark` | `#772330` | Red Accent, Pantone 188 C |
| `--ink` | `#363636` | Jet — the standards note this is the colour used on the website |
| `--line` | `#D1D1D4` | Gray, Pantone 427 C |
| `--slate` | `#394A59` | Charcoal Blue, Pantone 7546 C |

Headings are **Roboto Slab**, body is **Lato**, both loaded from Google Fonts. The standards specify fonts
for the marks only (Baker Signet for the logo, Zapfino for the motto) and codify no body typeface;
these two match what regisjesuit.com renders, which is the defensible choice absent a published standard.

### Logo rules that constrain this site

- The official logo may be used on the website with essentially no restrictions.
- On a coloured background the crest and flame **must be reversed to white**. Use `images/rj-logo-reversed.png`
  if you ever put the lockup on a red panel — never the black-text version.
- Do **not** pull elements out of the crest to use as decoration, and do not split the name from the crest.
- Minimum size for the horizontal logo is 1.0in wide / 0.5in high. The header renders it at 40px tall, above that.
- The full-colour logo and full-colour crest need permission from Marketing & Communications. The red/black
  and reversed-white versions shipped here do not.

### Required footer text

The stylebook requires the non-discriminatory policy language in **all admissions materials**, per IRS rules
for non-profits. This site is admissions material. That paragraph and the trademark line are rendered by
`chrome()` in `assets/app.js` as the `POLICY` and `TRADEMARK` constants — **reproduced verbatim. Do not
paraphrase, shorten or reformat them.**

### House style applied to the copy

- No serial comma — "bread, eggs and milk".
- Numbers one to ten spelled out; numerals for 11 and above.
- First reference "Regis Jesuit High School", then Regis Jesuit, RJ or RJHS. Never "Regis" alone.
- "your student", not "your child".
- Admissions Welcome Center / Admissions Office — not "Admissions Department".
- Phone as 303.269.8000. Time as 9:00 am. Lowercase website, online, email, internet.

If you add copy, apply the same rules.

## Layout

```
index.html         landing page
guide.html         section-by-section guide and study advice
diagnostic.html    40 questions across all five sections, with a weak-area report
practice.html      skill index, and one practice set per skill via ?topic=
mock.html          five-section timed practice test
resources.html     outside resources, with the not-vetted disclaimer
images/            official logos — see Brand below
assets/style.css   all styling
assets/app.js      shared quiz engine used by all three quiz pages
data/*.json        the question banks
```

## Editing questions

Everything students see comes from the four files in `data/`. You never need to touch JavaScript
to change a question. Each one looks like this:

```json
{
  "id": "a1b2c3d4e5",
  "stem": "Frugal means the opposite of:",
  "options": ["wasteful", "thrifty", "careful", "economical"],
  "answer": 0,
  "topic": "Antonyms",
  "source": "antonym_diagnostic_test_remake",
  "explanation": "Frugal means careful with money, so its opposite is wasteful."
}
```

- `answer` is a **zero-based index** into `options` — `0` is the first option, `3` the fourth.
  This is the field to check twice.
- `explanation` is optional. When present it is shown after the student answers in practice mode
  and in the review list at the end of a test.
- `topic` groups questions in the practice picker and in every score report, so keep the spelling
  consistent with what is already there.
- `id` only needs to be unique. Any short string works for a hand-added question.
- Maths may use LaTeX between dollar signs — `$\frac{3}{4}$` — which KaTeX renders in the browser.

`data/reading.json` also carries the passages:

```json
"passages": {
  "bonsai": { "title": "The Art of Bonsai", "paragraphs": ["…", "…"] }
}
```

Each reading question has a `"passage"` field matching one of those keys. Several questions refer to
numbered paragraphs, so **inserting or removing a paragraph will break them** — check the questions for
that passage before editing one.

To add a question, append an object to the `questions` array in the right file. To retire one, delete it.
There is nothing else to update.

## Linking to a single skill

Every skill has its own address, so you can link one directly from the Canva site or an email:

```
practice.html?topic=Antonyms
practice.html?topic=Verbal%20Logic
practice.html?topic=Punctuation
practice.html?topic=Problem%20Solving
practice.html?topic=bonsai
```

The `topic` value is the question's `topic` field from `data/*.json`, URL-encoded. Anything unrecognised
falls back to the full skill index, so a typo degrades gracefully rather than erroring. The diagnostic and
practice-test reports build these links automatically, so a student is one click from the thing they just
scored badly on.

Student-facing names for skills live in `TOPIC_LABELS` at the top of `assets/app.js`, and the one-line
descriptions in `TOPIC_BLURBS` beside it. Renaming a skill there changes it everywhere without touching
the data.

## Outside resources

`resources.html` lists third-party study sites. It carries a disclaimer that Regis Jesuit has not vetted
them. **Click every link before publishing, and re-check them each year** — third-party sites move,
go paid, or disappear, and a dead link on a school page reflects on the school.

## Timing

Every quiz page can run untimed or at real HSPT pace. The allowances live in `SECTIONS` at the top of
`assets/app.js` as `secsPerQ`, derived from the real test — Verbal 16min/60Q = 16s, Quantitative 30/52 = 35s,
Reading 25/62 = 24s, Mathematics 45/64 = 42s, Language 25/60 = 25s.

- **Practice** defaults to untimed; timed mode also hides feedback until the end, since you cannot read an
  explanation and keep to the clock at the same time.
- **The diagnostic** defaults to timed, because an untimed diagnostic overstates what a student can do on
  the day. Its limit is the sum of the per-section allowances for its exact question mix.
- **The practice test** is always timed, per section.

Every result — timed or not — reports actual seconds per question against the allowance, so a student can
watch their margin change. Untimed runs still count up rather than hiding the clock.

## Adjusting the practice test

The section sizes and timings live at the top of the `<script>` block in `mock.html`:

```js
const PLAN = [
  { key: 'verbal',   n: 30, mins:  8 },
  …
];
```

Seconds per question currently match the real HSPT for each section. If you add questions to a bank
you can raise `n` toward a full-length form. The diagnostic's mix is set the same way in
`diagnostic.html`.

## How the banks were built

The questions were recovered from Canvas QTI exports and CSV question banks, normalised into JSON, then
checked by an independent review pass and repaired. That pipeline is kept outside this repository; what
matters here is that `data/` is the source of truth and edits to it are safe.

Two known items were left out on purpose because they are style questions rather than errors, and the
bank answered them inconsistently: **singular "they"** and **the serial comma**. If the site adopts a
convention for either, those questions can be reinstated.

## Privacy

The site has no backend, no analytics, no cookies and no accounts. A student's progress is written to
`localStorage` in their own browser and never leaves the device. Clearing site data clears it.
