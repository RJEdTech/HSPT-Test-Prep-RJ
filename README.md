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
index.html         landing page — five-question taster, then the study path
guide.html         section-by-section guide
diagnostic.html    50 questions across all five sections, with a weak-area report
learn.html         lesson index, and one full lesson per skill via ?topic=
practice.html      skill index, and one practice set per skill via ?topic=
vocab.html         vocabulary flashcards, from data/vocab.json
mock.html          full-length, 298-question timed practice test
resources.html     outside resources, with the not-vetted disclaimer
images/            official logos — see Brand below
assets/style.css   all styling
assets/app.js      shared quiz engine, site chrome, the primer renderer and the lesson bank
assets/home.js     the landing-page taster and the "where you left off" block
data/verbal.json       Verbal Skills — 170 questions
data/quantitative.json Quantitative Skills — 135 questions
data/reading.json      Reading — 175 questions, and the 12 passages
data/math.json         Mathematics — 167 questions
data/language.json     Language Skills — 176 questions
data/primers.json  one short primer per skill, shown above the practice questions
data/lessons.json  the 25 full lessons behind those primers, rendered by learn.html
data/vocab.json    the 140 words the banks test, plus a few more at the same level
build/*.py         the repair scripts, plus verify_math.py — see Checking the maths below
```

## This site and the Canva page

The public front door is the Canva site at **https://rjhs.my.canva.site/hspt**, which owns the test
dates, what to bring, the study plans and the test-taking tips. This site is the practice engine behind
it and owns the questions, the diagnostic, the drills and the vocabulary.

Keep that split. Anything about the test *day* belongs on Canva; anything a student *does* belongs here.
Duplicating a fact across both is how they drift apart. The header link back to Canva and the five page
anchors are in `FRONT_PAGES` at the bottom of `assets/app.js`.

## Editing questions

Everything students see comes from the five question files in `data/`, one per section of the
real test. Quantitative Skills and Mathematics used to share `math.json` and be split by topic at
runtime; they are separate files now, because they are separate sections that test different things. You never need to touch JavaScript
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
- `explanation` is **required**. It is shown after the student answers in practice mode and in the
  review list at the end of a test, and the front page tells students that reading them is the
  actual studying. A question without one is a question a student cannot learn from.
- `topic` groups questions in the practice picker and in every score report, so keep the spelling
  consistent with what is already there.
- `id` only needs to be unique. Any short string works for a hand-added question.
- Maths uses LaTeX between `\(` and `\)` — `\(\frac{3}{4}\)`. **Not dollar signs.** A bare `$` is
  currency and is left alone, so `$12` is safe to type; a `$` *inside* a maths span must be escaped
  as `\$`. If KaTeX fails to load, `latexToText` in `app.js` renders the maths as readable text
  (`3/4`, `√141`, `x²`) rather than raw source, so a question stays answerable either way.
- A question may carry a `figure` field holding inline SVG, used by the Quantitative Skills
  geometric-comparison questions. It is injected as markup, so it is trusted — only ever put your
  own SVG there. Draw with `stroke="currentColor"` and no width or height on the `<svg>` so it
  scales and works on any background, and give it an `aria-label` describing the figure and its
  dimensions in words, so the question is answerable with a screen reader.
- In the Language section the fallback option is the literal string `"No mistakes"`, always last.
  `PINNED_LAST` in `app.js` keeps it there when the other choices shuffle.

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
learn.html?topic=Antonyms
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
  { key: 'verbal',   n: 60, mins: 16 },
  …
];
```

This is a genuine full-length form — 298 questions in 2 hours 21 minutes, at the real section sizes
and the real per-section timing. Each sitting draws fresh questions from banks about twice that size,
so a second attempt is a different test. The diagnostic's mix is set the same way in `diagnostic.html`.

Reading is built differently from the other four, by `buildReading` in `app.js`: the real section is
62 questions made of 40 comprehension items across four passages plus 22 standalone vocabulary items,
and that 40:22 ratio is held at whatever size a page asks for. Passages are taken whole, so a student
never meets a question whose passage was not shown.

## Writing for the reader

Every student-facing string on this site is read by a 13- or 14-year-old, often a nervous one, on a
phone. Three rules came out of a pass that read the whole site at that age and at that width, and
they are worth keeping:

**Lead with the move, not the number.** A result screen opens with the sentence that says what to do
next — "Read the Antonyms lesson next." — and the score sits under it as a plain line. It used to
open with a large red percentage, which is the worst thing to show a student who has just done badly
and which pushed the useful advice below the fold on a phone. The primary button follows the same
rule: under 70% it becomes the lesson, because at that score more questions rarely help, and a button
saying "Practice this again" directly above advice saying the opposite is a contradiction the student
has to resolve. `diagnostic.html` already worked this way; `practice.html` and `mock.html` now match.

**Never praise a guess.** `paceReport` treats a run far under the time allowance *with a low score*
as rushing rather than as headroom, because "comfortably inside the limit" is the wrong thing to tell
someone who answered ten questions in six seconds. The one verdict with a real problem in it — over
the limit — carries an instruction, since a verdict without a next step is just bad news.

**The student's sentence comes before the school's.** The footer still carries the
non-discrimination policy and the trademark text verbatim, as required, but the plain line a student
actually needs — free, open to anyone, nothing recorded — is now first. The same applies to the
practice-test page, where a legal paragraph sat between a nervous student and the start button.

Plain words throughout: no *caveat*, *vetted*, *allowance*, *register*, *consolidate*, *sittings*,
*nongeometric*. US spelling, since this is a US school. Sentences under about 25 words. Error and
empty states say what to do, not what failed — a raw JavaScript error message is not a message.

## Teaching content — two layers

Practising a skill nobody has explained is just repeated failure, so the site teaches first and drills
second. It does that twice over, at two lengths, and the split is deliberate: **nobody reads 1,200 words
before a ten-question drill, and nobody fixes a skill they are bad at in 80.**

### The primer — `data/primers.json`

One short primer per skill: what the question type asks, the method in steps, a worked example and the
mistake that costs students the most points. Rendered above the questions on every practice page, open
by default, and it links on to the full lesson.

```json
"Antonyms": {
  "what": "...",
  "how": ["step one", "step two"],
  "example": { "q": "...", "work": "...", "a": "..." },
  "trap": "..."
}
```

The seven reading passages share one primer, stored under the key `_reading`.

### The lesson — `data/lessons.json`

The long version: 18 lessons, 100 worked examples, 33 reference tables. Reached from the primer, from
the nav, from `guide.html`, and from any weak bar on a diagnostic or practice-test report.

Lessons are keyed by the **same topic strings as the question banks and the primers**. Nothing maps one
to another, so nothing can drift out of step — a lesson finds its practice set, a practice page finds
its lesson, and a score report finds both. A topic with no lesson silently falls back to a practice
link. `order` at the top of the file sets the index sequence and the previous/next links.

```json
"Antonyms": {
  "title": "Antonyms",
  "sectionLabel": "Verbal Skills",
  "weight": "About nine of the 60 Verbal Skills questions",
  "oneLine": "Shown on the index card and as the lesson's opening line.",
  "practiceTopic": "Antonyms",
  "blocks": [ ... ]
}
```

Blocks are one of seven types, rendered by `block()` in `learn.html`:

| type | fields | notes |
|---|---|---|
| `p` | `text` | paragraph |
| `h` | `text` | subheading |
| `ul` / `ol` | `items` | bullets, numbered steps |
| `table` | `head`, `rows` | scrolls sideways on a phone |
| `note` | `text` | the red-bordered box — one per lesson, for the thing that matters most |
| `example` | `stem`, `options`, `answer`, `walkthrough` | working hidden behind a button |

`answer` is a zero-based index, same as the banks. `<b>`, `<i>` and `<code>` are allowed in any text
field and are rendered as written — **lesson prose is trusted content, so anything pasted in from
elsewhere must be escaped by hand.** Maths uses `\(` and `\)`, the same delimiters as the banks.

A lesson may set `practiceTopic: null` and `practiceHref` instead, which is how the reading lesson
points at the section rather than one topic. Reading *practice* topics are passage slugs, so
`lessonTopicFor()` in `app.js` maps any of them to the one Reading Comprehension lesson.

### Keeping the two in step

They are separate files written at different times, so they can contradict each other, and they have.
A pass in September 2026 found 12 places where they did — opposite reading orders, a quotation rule
stated wrongly in the primer, a lesson denying the existence of item types its own drill set contains.
All are fixed in `build/patch_reconcile.py`. **If you edit one layer, read the other.**

### Where the lessons came from

Written from scratch. The commercial books — Peterson's and McGraw-Hill — are reference-only and none
of their text, examples or exercises appear here. That is measured, not asserted:
`build/check_provenance.py` shingles every string in the lessons, the primers, all five banks and the
vocabulary list against the full text of the source chapters. The last run found **no shared phrase of
12 words or more anywhere**. The only shorter matches are the test's own standard prompts, such as
*Which word does not belong with the others?*, which are nobody's protected expression.

Verbatim matching is necessary and not sufficient — a separate structural review caught an analogy
category table that used the publisher's own labels and two classification items that were near
variants of published ones, all original word for word. **Run both checks on new content: the script,
and a person asking whether it is derivative in shape.**

## The question-bank expansion

A third pass took the bank from 719 questions to 823 and the passages from nine to 12, so that every
skill now holds **at least two and a half questions for every one a full-length form uses**. At that
depth a student can sit the 298-question practice test three times and meet mostly fresh material,
and a ten-question drill never repeats.

- **104 new questions**, written to the per-skill counts in `claude/next-session-plan.md`: 40 across
  Mathematics and Quantitative Skills, 30 across three new reading passages, 12 Classification, 5
  Geometric Comparison and the rest as top-ups in Usage, Vocabulary in Context, Synonyms,
  Punctuation and Analogies.
- **Three new reading passages** — an older-prose field memoir, a contemporary narrative and an
  expository piece on map projections — 400-450 words each, ten questions each spanning the nine
  Peterson's question types, at most two stated-detail items apiece. Twelve passages means three
  non-overlapping forms.
- **46 Mathematics questions now carry a drawn figure.** The real test prints a diagram for its
  geometry items and the bank described them in words only. The `figure` field already existed for
  Quantitative Skills; the same conventions now apply in `data/math.json` — `viewBox` only,
  `stroke="currentColor"`, and an `aria-label` naming every dimension in words. A figure never shows
  the answer: an item that gives the area and asks for the perimeter labels the area and leaves the
  sides bare.

### Provenance, checked properly this time

Fifteen items were caught and rewritten as **re-skins** — not copied word for word, but the licensed
item's structure with the nouns, the numbers or the sentence swapped. A verbatim scan finds none of
these, which is why the structural read matters. Three were in the new work; the rest were older
items the earlier passes had cleared. Two examples of what a re-skin looks like: a containers-and-
contents classification item keyed on the contents, with every noun changed; an eight-term
interleaved number series with the blank in the sixth slot and only the step rules changed.

`build/check_provenance.py` was also repaired. It had been scanning four banks — the list predates
the `math.json` / `quantitative.json` split, so **`quantitative.json` was never checked at all**. It
now scans all five, filters the test's own stock prompts, and ranks hits by the longest contiguous
shared run so a real lift sorts above the formulas the format forces. Run it with the extracted
source text:

```
HSPT_SRC=~/hspt-src python3 build/check_provenance.py        # 8-word runs
HSPT_SRC=~/hspt-src HSPT_N=12 python3 build/check_provenance.py
```

Current state: **zero non-boilerplate matches of 12 words or more** in the lessons or in any of the
five banks. The only 8-word hits are two Language stems using the test's own printed prompt.

`build/verify_math.py` learned two new series rules while checking this work — a gap that grows as
the square numbers (a constant third difference), and a term that is the square of the one before.

### What was verified

- **Every one of the 104 new questions was re-solved from scratch with the keys removed**, by passes
  that did not write them, and every item edited afterwards was re-solved again. Zero unresolved
  disagreements.
- `python3 build/verify_math.py` — clean.
- Structural sweep — keys in range, no duplicate ids or options, an explanation on all 823, balanced
  LaTeX, no unescaped `$` inside a maths span, every reading question pointed at a passage that
  exists, every cited paragraph number checked, every drawn dimension present in its figure's
  `aria-label`, "No mistakes" last wherever it is offered and keyed on 20% of those items.
- Browser — all nine pages load with no JavaScript errors, a full 298-question form builds with the
  right section counts and the right reading split, and the figures render at size in both themes.

## How the banks were built

The questions were recovered from Canvas QTI exports and CSV question banks, normalised into JSON, then
checked by an independent review pass and repaired. `data/` is the source of truth and edits to it are safe.

**Every question carries an explanation.** That was not true until recently — only the 67 maths items had
one, while the front page told students that reading the explanations was the actual studying. The other
457 were written and checked in a pass that also surfaced the defects listed below.

Repairs live in `build/` and each asserts on its target before changing anything, so a patch fails loudly
rather than silently mangling the wrong question if the data shifts.

### The leveling rebuild

A second audit checked every question for **level** — whether it discriminates the way a real HSPT
question does — against the school's licensed Peterson's diagnostic, and rebuilt most of the bank.
The full findings are in `claude/leveling-audit.md` in the project. In short:

- **306 of the 509 questions were retired** as under-levelled, off-format, ambiguous or duplicated,
  and **561 new ones were written.** The bank is 719 questions now and supports a genuine
  full-length form with roughly two questions for every one a sitting uses.
- **Verbal logic was the wrong item type.** Thirty-one of 40 items were categorical syllogisms
  ("All clouds are white…"); Peterson's uses only ordering and comparison relations in that section.
  Rebuilt, and `guide.html` was corrected — it taught the syllogism form too.
- **A third of the Reading section did not exist.** Reading is 62 questions: 40 comprehension plus
  22 standalone vocabulary. The bank had 70 comprehension and no vocabulary at all. Fifty-one
  vocabulary items were added, and two new passages, including one written in the older, denser
  register the real test uses for its hardest passage.
- **The maths banks are now original throughout.** Ten questions were found to be verbatim
  transcriptions of the licensed Peterson's diagnostic; a later provenance scan found six more among
  the questions inherited from the Canvas export. Since `claude/source-material-inventory.md` records
  that those Canvas questions "appear to be transcribed from the same sources", **every inherited
  maths question was retired** rather than guessing which were safe, and 82 original ones written to
  replace them. `data/math.json` and `data/quantitative.json` now contain nothing but questions
  written for this site — a claim `build/check_provenance.py` can verify, and one a free public page
  needs to be able to make.
- **Quantitative Skills got its missing item types**: geometric comparison (new to the site, which
  needed the `figure` field), letter series, and number manipulation — the signature HSPT type, of
  which the old bank had four, two of them copied.
- Analogy and classification distractors were rebuilt around real traps rather than throwaways, and
  stored answer keys were evened out so no option is right more than about a third of the time.

## The level this site aims at

`build/hspt-baseline.md` records what the real test actually contains, section by section and item
type by item type, derived from the school's licensed Peterson's diagnostic: the mix of question
types in each section, the vocabulary tier, the maths content ceiling, and the passage lengths and
question types Reading uses. **Read it before writing a question.** It is the reference the whole
bank was levelled against, and it is the difference between a question that is correct and one that
belongs on this test.

It is a description of the exam's shape, in our own words. No question, passage or exercise from
those books appears in it or anywhere else in this repository.

## Checking the maths

A wrong key on a maths question is the one defect a reader cannot catch by eye, so it is checked by
machine as well as by people:

```
python3 build/verify_math.py        # both maths banks
python3 build/verify_math.py -v     # also list what it could not check
```

It re-derives the answer from the question itself and complains when the key does not follow. Series
questions are solved by filling the blank with each option and keeping the ones that leave a
consistent rule; comparison questions by evaluating all three quantities and testing each compound
option clause by clause; geometric comparisons by reading the dimensions out of the figure's
`aria-label` and computing the areas, perimeters or angles. It also checks every question for
duplicate options, out-of-range keys, unbalanced LaTeX and two options that are the same number.

It currently solves 52 of the 256 maths questions independently and structurally checks all of them.
The rest are word problems and concept questions that need a reader — those were solved from scratch
twice, by two separate passes working without the keys, both agreeing with the bank. **Run this after
any edit to `data/math.json` or `data/quantitative.json`.**

### Defects found and fixed

- **143 Language items had no stem at all** — the student saw four sentences and no question. They were
  two different types needing opposite instructions: 115 offer "No mistakes" and ask you to find the
  sentence *with* an error, while 28 give four versions of one sentence and ask for the *correct* one.
- **"No mistakes" was being shuffled into the middle.** The option is pinned last now
  (`PINNED_LAST` in `assets/app.js`), which is where the real HSPT puts it and the only order the
  item type makes sense in.
- **Two classification items were keyed to the wrong outlier** — Mountain/River/Lake/Ocean was keyed
  *Ocean*, and Knife/Fork/Bowl/Spoon was keyed *Spoon*.
- **Ten items carried raw markdown asterisks** around book titles, which rendered literally.
- **Fifteen items were dropped**: broken analogies, items with two equally defensible answers, exact
  duplicates, and style disputes the bank answered inconsistently. One punctuation item keyed the
  *absence* of the serial comma as an error, which contradicts the stylebook this site follows.

## What this site claims, and what it does not

Every question here was written for this site. It is practice material built to resemble the HSPT in
format, timing and level of difficulty. **It is not the exam, not a copy of any past exam, and not
drawn from one.** The real test may prove harder or easier than what a student meets here, and a score
on this site does not predict a score on the HSPT — what it gives a student is a reading on which
skills to work on.

HSPT is a registered trademark of Scholastic Testing Service, Inc., which neither endorses nor is
affiliated with this site. That paragraph is rendered by `chrome()` in `assets/app.js` and appears in
the footer of every page; the practice test carries a fuller version above the start button. **Keep
both.** They are the difference between offering practice and appearing to reproduce someone else's
exam.

## "Found a mistake?" — the error report link

The last block in `assets/app.js` is a self-contained IIFE that appends a report link to the footer
of every page, pointing at a Microsoft Form. It pre-fills the form's "Which page were you on?"
question with the page name and, on a practice run, the skill — so *Practice a skill — Analogies
(practice.html)* arrives with the report and nobody has to describe where they were.

- The form is owned by jbeyer@regisjesuit.com and takes anonymous responses; applicants are not in
  the RJ tenant, so requiring a sign-in would have blocked almost every reporter.
- `PAGE_FIELD` is the pre-fill key for that question. **If question 2 is ever deleted and re-created
  the key changes** and the pre-fill silently stops working: regenerate it in Forms via
  *… → Get Pre-filled URL*, type a placeholder into question 2, click *Get Prefilled Link*, and copy
  the new `r…` parameter into `PAGE_FIELD`.
- `PAGE_NAMES` maps each file to the name a student would recognise. **Add a row when you add a
  page**, or reports from it arrive labelled with the bare filename.
- The block depends on two selectors that `chrome()` emits — `footer.site .wrap-wide` and `.policy`.
  Rename either and the link stops appearing, with no error.

`claude/error-report-form.md` in the project has the form's questions and how to read responses.

## Cache-busting when you deploy

Every page loads its CSS and JavaScript with a version query — `assets/app.js?v=2026-09-05`. GitHub
Pages serves assets with `Cache-Control: max-age=600`, so without this a returning visitor can hold a
ten-minute-old `app.js` while already fetching the new `data/*.json`. That pairing is worse than
either being stale on its own: the old engine looks for Quantitative questions inside `math.json`,
which no longer holds them, so the section comes up empty with no error.

The same stamp covers the question banks. `BUILD` at the top of `assets/app.js` is appended to
every `data/*.json` fetch, so a deploy moves the engine and the banks together instead of letting a
fresh `app.js` run against a stale bank — the failure that put 204 verbal and 67 maths questions in
front of a browser that had already loaded the new engine.

**On any deploy that touches `assets/` or `data/`, bump both: `BUILD` in `assets/app.js`, and the
`?v=` in every page's script and link tags.** One command from the repo root does the pages:

```sh
V=$(date +%F); for f in *.html; do
  sed -i '' -E "s|(assets/(app|home)\.js|assets/style\.css)\?v=[0-9-]+|\1?v=$V|g" "$f"
done
```

## Privacy

The site has no backend, no analytics, no cookies and no accounts. A student's progress is written to
`localStorage` in their own browser and never leaves the device. Clearing site data clears it.
