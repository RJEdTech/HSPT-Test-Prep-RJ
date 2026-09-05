/* HSPT Test Prep — shared engine
   No framework, no build step. Loads question banks from /data/*.json.
   Nothing is sent anywhere; progress lives in this browser only. */

const HSPT = (() => {

  /* ---------------- data ---------------- */

  /* Every fetch of a data file carries this. GitHub Pages caches assets for ten minutes, so
     without it a returning visitor can run a fresh app.js against a stale bank — which is worse
     than either being old alone, because the engine and the data disagree about what a topic is
     called and a whole section quietly comes up empty. Bump it, and the query string in the
     <script> and <link> tags in every page, on any deploy that changes app.js or data/. */
  const BUILD = '2026-09-05';

  /* secsPerQ is the real HSPT allowance for that section, rounded to the second:
     Verbal 16min/60Q, Quantitative 30/52, Reading 25/62, Math 45/64, Language 25/60. */
  const SECTIONS = {
    verbal:   { label: 'Verbal Skills',       file: 'verbal',       secsPerQ: 16 },
    quant:    { label: 'Quantitative Skills', file: 'quantitative', secsPerQ: 35 },
    reading:  { label: 'Reading',             file: 'reading',      secsPerQ: 24 },
    math:     { label: 'Mathematics',         file: 'math',         secsPerQ: 42 },
    language: { label: 'Language Skills',     file: 'language',     secsPerQ: 25 }
  };

  /* Quantitative Skills and Mathematics are separate sections of the real test that ask for
     different things, so they are separate files now. They used to share math.json and be
     split by topic at runtime. */

  /* Student-facing names, where the bank's topic string is not already the right one. */
  const TOPIC_LABELS = {
    'Usage': 'Grammar & Usage',
    'Composition': 'Composition & Paragraphs'
  };

  /* One line telling a student what the skill actually asks of them. */
  const TOPIC_BLURBS = {
    'Synonyms': 'Pick the word closest in meaning — two of the four choices will be close.',
    'Antonyms': 'Pick the word that means the opposite — watch for the synonym hiding in the choices.',
    'Analogies': 'Work out the relationship in the first pair, then apply it to the second.',
    'Classification': 'Find what three words share; the fourth is the odd one out.',
    'Verbal Logic': 'If the first two statements are true, is the third true, false or uncertain?',

    'Number Series': 'Find the step between terms, then check whether the step itself changes.',
    'Letter Series': 'Letters and letter-number pairs move by their own rules — track each separately.',
    'Comparisons': 'Work out all three quantities before you look at the answer choices.',
    'Geometric Comparison': 'Compare areas, perimeters, angles or lengths using the figure and its labels.',
    'Number Manipulation': 'Arithmetic hidden in awkward English — translate one piece at a time.',

    'Number Sense': 'Place value, rounding, factors, multiples and estimation.',
    'Fractions, Decimals and Percents': 'Moving between the three, and working out percent of, percent off and percent more than.',
    'Ratios and Proportions': 'Set the proportion up with matching units on top.',
    'Computation': 'Order of operations, negatives, and arithmetic in mixed units.',
    'Algebra': 'Solve for the unknown, and know what to call each part of an expression.',
    'Geometry and Measurement': 'Area, perimeter, angles, circles and unit conversion.',
    'Data and Probability': 'Mean, median, mode, probability and counting combinations.',
    'Word Problems': 'Money, rates, distance and interest — read for what is actually asked.',

    'Vocabulary in Context': 'Work out a word\u2019s meaning from the phrase it sits in.',
    'Spelling': 'One misspelled word among three sentences — or none at all.',
    'Capitalization': 'Proper nouns, titles, seasons and the things that only look like proper nouns.',
    'Punctuation': 'Commas, semicolons, apostrophes and quotation marks.',
    'Usage': 'Does the verb match the subject? Is it <i>me</i> or <i>I</i>? Is it <i>fewer</i> or <i>less</i>?',
    'Composition': 'Topic sentences, joining words, clarity and which sentence does not belong.'
  };

  const topicLabel = t => TOPIC_LABELS[t] ||
    (/^[a-z-]+$/.test(t) ? t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : t);

  const cache = {};
  async function loadBank(file) {
    if (!cache[file]) {
      const res = await fetch(`data/${file}.json?v=${BUILD}`);
      if (!res.ok) throw new Error(`Could not load ${file}.json`);
      cache[file] = await res.json();
    }
    return cache[file];
  }

  /** Questions for one of the five HSPT sections. */
  async function section(key) {
    const spec = SECTIONS[key];
    const bank = await loadBank(spec.file);
    return bank.questions.map(q => ({ ...q, section: key }));
  }

  async function passages() { return (await loadBank('reading')).passages; }

  /* Reading topics are passage slugs (bonsai, coral-reefs...), and one lesson covers them all. */
  const READING_TOPIC = t => /^[a-z][a-z-]*$/.test(t);

  /* Spread a section's questions across its skills rather than clustering, then top up from
     what is left so a short skill never leaves the section under its target count. */
  function buildTopicSpread(qs, n) {
    const byTopic = {};
    qs.forEach(q => (byTopic[q.topic] = byTopic[q.topic] || []).push(q));
    const topics = Object.keys(byTopic);
    const per = Math.ceil(n / topics.length);
    let picked = [];
    shuffle(topics).forEach(t => { picked = picked.concat(sample(byTopic[t], per)); });
    picked = shuffle(picked).slice(0, n);
    if (picked.length < n) {
      const have = new Set(picked.map(q => q.id));
      picked = picked.concat(sample(qs.filter(q => !have.has(q.id)), n - picked.length));
    }
    return shuffle(picked);
  }

  /* The real Reading section is 62 questions: 40 comprehension across four passages and 22
     standalone vocabulary items. Keep that ratio at whatever size a page asks for, and take
     passages whole so a student never meets a question whose passage was not shown. */
  function buildReading(qs, n) {
    const nVocab = Math.round(n * 22 / 62);
    const comp = qs.filter(q => q.passage), vocab = qs.filter(q => !q.passage);
    const bySlug = {};
    comp.forEach(q => (bySlug[q.passage] = bySlug[q.passage] || []).push(q));
    let picked = [];
    for (const slug of shuffle(Object.keys(bySlug))) {
      if (picked.length >= n - nVocab) break;
      picked = picked.concat(bySlug[slug]);
    }
    return shuffle(picked.slice(0, n - nVocab).concat(sample(vocab, nVocab)));
  }

  /* ---------------- full lessons ---------------- */

  /* The long version of each primer: method, worked examples, traps and reference tables,
     rendered as its own page by learn.html. Keyed by the same topic strings as the question
     banks, so a lesson, its practice set and its bar on a score report all find each other
     with nothing to keep in step. */
  let fullCache = null;
  async function lessons() {
    if (!fullCache) {
      const res = await fetch(`data/lessons.json?v=${BUILD}`);
      if (!res.ok) throw new Error('Could not load lessons.json');
      fullCache = await res.json();
    }
    return fullCache;
  }
  /* Reading practice topics are passage slugs, and one lesson covers the lot — the same
     mapping primerFor() makes for the short version. */
  const lessonTopicFor = topic => (fullCache && fullCache.lessons[topic]) ? topic
    : (READING_TOPIC(topic) && fullCache && fullCache.lessons['Reading Comprehension'])
      ? 'Reading Comprehension' : null;
  const lessonLink = topic => `learn.html?topic=${encodeURIComponent(topic)}`;
  /** True once the bank has loaded and it holds a lesson for this topic. */
  const hasLesson = topic => !!(fullCache && fullCache.lessons[topic]);

  /* ---------------- helpers ---------------- */

  const shuffle = (arr, rnd = Math.random) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const sample = (arr, n) => shuffle(arr).slice(0, n);

  /** Shuffle a question's options, keeping the answer pointed at the same text. */
  /* Options that must stay in place no matter how the rest are shuffled. On the real
     HSPT "No mistakes" is always the last choice, and the item only makes sense read
     that way — three sentences, then the fallback. Shuffling it into position B turns
     a coherent question into a nonsensical one, and 115 items in the bank carry it. */
  const PINNED_LAST = ['no mistakes', 'no mistake', 'no errors', 'none of these',
                       'all of the above', 'none of the above'];
  const isPinned = o => PINNED_LAST.includes(String(o).toLowerCase().trim().replace(/[.\s]+$/, ''));

  function shuffleOptions(q) {
    const correct = q.options[q.answer];
    const pinned = q.options.filter(isPinned);
    const options = shuffle(q.options.filter(o => !isPinned(o))).concat(pinned);
    return { ...q, options, answer: options.indexOf(correct) };
  }

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Explanations for the A/B/C comparison items are written one quantity per line,
     so line breaks have to survive into the HTML. */
  const explHTML = str => esc(str).replace(/\n/g, '<br>');

  const fmtTime = secs => {
    const m = Math.floor(Math.abs(secs) / 60), s = Math.abs(secs) % 60;
    return `${secs < 0 ? '−' : ''}${m}:${String(s).padStart(2, '0')}`;
  };

  /** Turn simple LaTeX into readable text, for when KaTeX is unavailable.
      Not a renderer — just enough that a question is still answerable. */
  const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ' };
  const SUB = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ' };
  function latexToText(s) {
    return s
      // Degrees before the generic superscript rule, or 180^\circ reads as 180^°. The braced
      // form is matched separately: an optional trailing } would otherwise swallow the brace
      // closing a \frac numerator, and the fraction bar would vanish with it.
      .replace(/\^\{\s*\\circ\s*\}/g, '°')
      .replace(/\^\s*\\circ/g, '°')
      // A mixed number must keep its gap: 5\frac{1}{4} is 5 1/4, never 51/4. The digit has to
      // be adjacent — a space before \frac belongs to the surrounding sentence.
      .replace(/(\d)\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, lead, a, b) => lead + ' ' + a + '/' + b)
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\d?frac(\d)(\d)/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
      .replace(/\\sqrt(\d+)/g, '√$1')
      .replace(/\\left|\\right/g, '')
      .replace(/\^\{([^{}]*)\}/g, (m, g) => g.split('').every(c => SUP[c]) ? g.split('').map(c => SUP[c]).join('') : '^' + g)
      .replace(/\^(\w)/g, (m, g) => SUP[g] || '^' + g)
      .replace(/_\{([^{}]*)\}/g, (m, g) => g.split('').every(c => SUB[c]) ? g.split('').map(c => SUB[c]).join('') : '_' + g)
      .replace(/_(\w)/g, (m, g) => SUB[g] || '_' + g)
      .replace(/\\times/g, '×').replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·').replace(/\\circ/g, '°')
      .replace(/\\le(?![a-z])/g, '≤').replace(/\\ge(?![a-z])/g, '≥')
      .replace(/\\ne(?![a-z])/g, '≠').replace(/\\pi(?![a-z])/g, 'π')
      .replace(/\\lt(?![a-z])/g, '<').replace(/\\gt(?![a-z])/g, '>')
      .replace(/\\approx(?![a-z])/g, '≈').replace(/\\angle(?![a-z])/g, '∠')
      .replace(/\\%/g, '%').replace(/\\\$/g, '$')
      .replace(/\\overline\{([^{}]*)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}]/g, '')
      .replace(/\\:|\\,|\\;/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /** Render any LaTeX in a container. Falls back to readable text if KaTeX is missing. */
  function typeset(el) {
    if (window.renderMathInElement) {
      try {
        // \( \) only — a bare $ in these questions is currency, not math.
        window.renderMathInElement(el, {
          delimiters: [{ left: '\\(', right: '\\)', display: false }],
          throwOnError: false
        });
        return;
      } catch (e) { /* fall through to the text fallback */ }
    }
    // KaTeX did not load — show readable math rather than raw source.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.includes('\\(')) hits.push(walker.currentNode);
    hits.forEach(node => {
      node.nodeValue = node.nodeValue.replace(/\\\(([\s\S]*?)\\\)/g, (m, tex) => latexToText(tex));
    });
  }

  /* ---------------- storage (this browser only) ---------------- */

  const KEY = 'hspt-rj-v1';
  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }
  function saveResult(kind, data) {
    const s = readStore();
    (s[kind] = s[kind] || []).unshift({ ...data, at: Date.now() });
    s[kind] = s[kind].slice(0, 25);
    writeStore(s);
  }
  const results = kind => (readStore()[kind] || []);

  /* ---------------- quiz runner ---------------- */

  /**
   * opts:
   *   mount        element to render into
   *   questions    array
   *   mode         'practice' (feedback after each) | 'test' (no feedback until the end)
   *   passages     map of slug -> {title, paragraphs}, for reading
   *   seconds      optional time limit; calls onTimeUp when it runs out
   *   onDone(res)  called with {total, correct, answers[], byTopic{}, bySection{}}
   *   label        text for the status bar
   */
  function run(opts) {
    const { mount, questions, mode = 'practice', passages = null, label = '' } = opts;
    let i = 0, answered = false;
    const picks = new Array(questions.length).fill(null);
    let timeLeft = opts.seconds || null, timerId = null;
    let elapsed = 0, elapsedId = null;
    const startedAt = Date.now();

    mount.innerHTML = `
      <div class="quiz-bar"><div class="inner">
        <span class="qcount"></span>
        <span class="spacer"></span>
        ${label ? `<span class="muted">${esc(label)}</span>` : ''}
        <span class="timer"></span>
      </div><div class="wrap"><div class="progress"><span></span></div></div></div>
      <div class="wrap"><div class="qbody"></div></div>`;

    const $ = sel => mount.querySelector(sel);
    const body = $('.qbody');

    if (timeLeft) {
      const tick = () => {
        timeLeft--;
        const t = $('.timer');
        if (t) {
          t.textContent = fmtTime(timeLeft);
          t.classList.toggle('warn', timeLeft <= 60);
        }
        if (timeLeft <= 0) { clearInterval(timerId); finish(); }
      };
      $('.timer').textContent = fmtTime(timeLeft);
      timerId = setInterval(tick, 1000);
    } else {
      // No limit — still count up, so a student can see their own pace.
      $('.timer').classList.add('muted');
      $('.timer').textContent = '0:00';
      elapsedId = setInterval(() => {
        elapsed++;
        const t = $('.timer');
        if (t) t.textContent = fmtTime(elapsed);
      }, 1000);
    }

    function draw() {
      const q = questions[i];
      answered = false;
      $('.qcount').textContent = `Question ${i + 1} of ${questions.length}`;
      $('.progress > span').style.width = `${(i / questions.length) * 100}%`;

      let passageHtml = '';
      if (passages && q.passage && passages[q.passage]) {
        const p = passages[q.passage];
        const prev = i > 0 ? questions[i - 1] : null;
        // Show the passage on the first question of each new passage, and keep it available after.
        passageHtml = `<div class="passage">
          <h2>${esc(p.title)}</h2>
          ${p.paragraphs.map((t, n) => `<p><span class="pnum">${n + 1}</span>${esc(t)}</p>`).join('')}
        </div>`;
        if (prev && prev.passage === q.passage) {
          passageHtml = `<details class="passage" style="padding:14px 18px">
            <summary style="cursor:pointer;font-weight:600">${esc(p.title)} — show passage</summary>
            <div style="margin-top:12px">${p.paragraphs.map((t, n) => `<p><span class="pnum">${n + 1}</span>${esc(t)}</p>`).join('')}</div>
          </details>`;
        }
      }

      body.innerHTML = `
        ${passageHtml}
        <div class="qnum">${esc(q.topic || '')}</div>
        <p class="stem">${esc(q.stem)}</p>
        ${q.figure ? `<div class="figure">${q.figure}</div>` : ''}
        <ul class="choices">
          ${q.options.map((o, n) => `
            <li><button class="choice" data-n="${n}">
              <span class="ltr">${String.fromCharCode(65 + n)}</span>
              <span class="txt">${esc(o)}</span>
            </button></li>`).join('')}
        </ul>
        <div class="after"></div>
        <div class="btn-row">
          <button class="btn next" ${mode === 'practice' ? 'disabled' : ''}>
            ${i === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
          ${mode === 'test' ? '<button class="btn plain skip">Skip</button>' : ''}
          ${mode === 'test' && i > 0 ? '<button class="btn plain back">Back</button>' : ''}
        </div>`;

      typeset(body);

      body.querySelectorAll('.choice').forEach(btn => {
        btn.addEventListener('click', () => choose(Number(btn.dataset.n)));
      });
      const nextBtn = body.querySelector('.next');
      nextBtn.addEventListener('click', advance);
      const skip = body.querySelector('.skip');
      if (skip) skip.addEventListener('click', () => { picks[i] = null; advance(); });
      const back = body.querySelector('.back');
      if (back) back.addEventListener('click', () => { i--; draw(); window.scrollTo(0, 0); });

      if (picks[i] !== null && mode === 'test') {
        const b = body.querySelector(`.choice[data-n="${picks[i]}"]`);
        if (b) b.classList.add('picked');
      }
    }

    function choose(n) {
      const q = questions[i];
      picks[i] = n;
      const btns = body.querySelectorAll('.choice');

      if (mode === 'test') {
        btns.forEach(b => b.classList.toggle('picked', Number(b.dataset.n) === n));
        return;
      }

      if (answered) return;
      answered = true;
      btns.forEach(b => {
        const bn = Number(b.dataset.n);
        b.disabled = true;
        if (bn === q.answer) b.classList.add('right');
        else if (bn === n) b.classList.add('wrong');
      });

      const ok = n === q.answer;
      const after = body.querySelector('.after');
      after.innerHTML = `
        <p class="verdict ${ok ? 'right' : 'wrong'}">${ok ? 'Correct' : 'Not quite'}</p>
        ${q.explanation
          ? `<div class="explain"><p>${explHTML(q.explanation)}</p></div>`
          : (!ok ? `<div class="explain"><p>The answer is <b>${String.fromCharCode(65 + q.answer)}) ${esc(q.options[q.answer])}</b>.</p></div>` : '')}`;
      typeset(after);
      body.querySelector('.next').disabled = false;
      body.querySelector('.next').focus();
    }

    function advance() {
      if (i === questions.length - 1) return finish();
      i++; draw(); window.scrollTo(0, 0);
    }

    function finish() {
      if (timerId) clearInterval(timerId);
      if (elapsedId) clearInterval(elapsedId);
      const took = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const answers = questions.map((q, n) => ({
        q, pick: picks[n], correct: picks[n] === q.answer
      }));
      const byTopic = {}, bySection = {};
      answers.forEach(a => {
        for (const [map, key] of [[byTopic, a.q.topic], [bySection, a.q.section]]) {
          if (!key) continue;
          map[key] = map[key] || { right: 0, total: 0 };
          map[key].total++;
          if (a.correct) map[key].right++;
        }
      });
      opts.onDone({
        total: questions.length,
        correct: answers.filter(a => a.correct).length,
        answers, byTopic, bySection,
        seconds: took,
        perQuestion: took / questions.length,
        ranOutOfTime: Boolean(opts.seconds) && timeLeft !== null && timeLeft <= 0
      });
    }

    draw();
    return { finish };
  }

  /* ---------------- results rendering ---------------- */

  function bars(map, labels = {}, linkTopics = false) {
    return Object.entries(map)
      .sort((a, b) => (a[1].right / a[1].total) - (b[1].right / b[1].total))
      .map(([k, v]) => {
        const pct = Math.round((v.right / v.total) * 100);
        const cls = pct >= 80 ? 'good' : pct >= 60 ? '' : 'weak';
        const name = esc(labels[k] || topicLabel(k));
        // Below 80% the fix is usually the method rather than more reps, so point at the
        // lesson too. hasLesson() is false until the bank loads, so a report that renders
        // first degrades to practice links rather than breaking.
        // Reading bars are keyed by passage slug, so resolve through lessonTopicFor rather
        // than assuming the bar's key is itself a lesson key.
        const lk = linkTopics ? lessonTopicFor(k) : null;
        const head = linkTopics
          ? `<a href="${practiceLink(k)}">${name}</a>` +
            (pct < 80 && lk ? ` <a class="lesson-tip" href="${lessonLink(lk)}">lesson</a>` : '')
          : `<b>${name}</b>`;
        return `<div class="bar-row">
          <div class="bar-top"><b>${head}</b><span class="val">${v.right}/${v.total} · ${pct}%</span></div>
          <div class="bar ${cls}"><span style="width:${pct}%"></span></div>
        </div>`;
      }).join('');
  }

  /** Deep link to a single skill's practice set. */
  const practiceLink = topic => `practice.html?topic=${encodeURIComponent(topic)}`;

  /* ---------------- score sheet ---------------- */

  /* The paper score sheet this replaces did three jobs: score every skill, rank the weakest,
     and name what to study for each one. Same three jobs here, in one table, with our own
     lessons and drill sets standing in for chapter numbers.

     A skill needs at least MIN_ITEMS questions behind it before it is allowed to be ranked.
     One or two questions is noise, not a diagnosis, and telling a student to spend three
     weeks on a skill because they missed the only question about it is worse than saying
     nothing. Those rows still appear, marked honestly. */
  const MIN_ITEMS = 3;
  const WEAK_PCT  = 70;
  const TOP_N     = 5;

  /** One row per skill, reading's passage slugs collapsed into the single reading skill. */
  function skillRows(answers) {
    const rows = {};
    answers.forEach(a => {
      const t = a.q.topic;
      if (!t) return;
      const skill = READING_TOPIC(t) ? 'Reading Comprehension' : t;
      const r = rows[skill] || (rows[skill] = { skill, section: a.q.section, right: 0, total: 0 });
      r.total++;
      if (a.correct) r.right++;
    });
    const all = Object.values(rows);
    all.forEach(r => { r.pct = Math.round((r.right / r.total) * 100); });
    return all;
  }

  /** The weakest skills that have enough questions behind them to mean something. */
  function rankWeak(rows, n = TOP_N) {
    /* Ties are common — four skills at 1 of 3 is an ordinary result. Break them the same
       way the chart does (more questions first, then by name) so the numbered list and the
       bars never disagree about which skill is third. */
    const ranked = rows
      .filter(r => r.total >= MIN_ITEMS && r.pct < WEAK_PCT)
      .sort((a, b) => (a.pct - b.pct) || (b.total - a.total) || a.skill.localeCompare(b.skill))
      .slice(0, n);
    ranked.forEach((r, i) => { r.priority = i + 1; });
    return ranked;
  }

  function statusOf(r) {
    if (r.total < MIN_ITEMS) return ['thin', 'Too few to tell'];
    if (r.pct >= 85) return ['good', 'Strong'];
    if (r.pct >= WEAK_PCT) return ['ok', 'Solid'];
    if (r.pct >= 40) return ['weak', 'Shaky'];
    return ['weak', 'Needs work'];
  }

  /** What to do about this skill: the lesson, then the drill set. */
  function studyCell(r) {
    const label = topicLabel(r.skill);
    const links = [];
    if (hasLesson(r.skill)) links.push(`<a href="${lessonLink(r.skill)}">Lesson</a>`);
    if (r.section === 'reading') {
      links.push(`<a href="practice.html">Pick a passage</a>`);
    } else {
      links.push(`<a href="${practiceLink(r.skill)}">Practice</a>`);
    }
    return links.join(' <span class="ss-sep">·</span> ');
  }

  /* Five bands, so the chart can say the same thing the table says. statusOf() keeps the
     three CSS classes the table already styles; bandOf() splits "weak" into shaky and
     needs-work, because a student at 55% and a student at 20% need different amounts of
     convincing. */
  function bandOf(r) {
    if (r.total < MIN_ITEMS) return { cls: 'thin',   word: 'Too few to tell' };
    if (r.pct >= 85)         return { cls: 'strong', word: 'Strong' };
    if (r.pct >= WEAK_PCT)   return { cls: 'solid',  word: 'Solid' };
    if (r.pct >= 40)         return { cls: 'shaky',  word: 'Shaky' };
    return { cls: 'need', word: 'Needs work' };
  }

  /* The headline commits to three. Five is a list a student skims; three is a list they
     work through. Weaknesses four and five still appear, lower down, under "if you have
     time" — visible, but not competing with the thing they should do on Monday. */
  const HEADLINE_N = 3;

  /** One sentence naming the first move, because that is the question a student came with. */
  function verdictHTML(res, all, weak) {
    const pct    = Math.round((res.correct / res.total) * 100);
    const scored = all.filter(r => r.total >= MIN_ITEMS).length;
    const score  = `<p class="verdict-score">Overall: ${res.correct} of ${res.total} answered correctly
      &middot; ${pct}%. <span class="muted">The number is not the point &mdash; what is above it is.</span></p>`;

    if (!weak.length) {
      return `<div class="verdict clear">
        <p class="verdict-line">Nothing came out as a weak spot.</p>
        <p class="verdict-sub">Every skill with enough questions behind it scored ${WEAK_PCT}% or better.
          Your next move is <a href="mock.html">the full timed practice test</a> &mdash; at this level the
          clock is likelier to cost you points than the content is.</p>
        ${score}
      </div>`;
    }

    const first = weak[0];
    const extra = Math.min(weak.length - 1, HEADLINE_N - 1);
    return `<div class="verdict">
      <p class="verdict-eyebrow">Your starting point</p>
      <p class="verdict-line">Start with <b>${esc(topicLabel(first.skill))}</b>.</p>
      <p class="verdict-sub">You got ${first.right} of ${first.total} right there &mdash; the weakest of the
        ${scored} skills this test could score.${extra ? ` ${extra === 1
          ? 'One more skill is worth your time after it.'
          : 'Two more are worth your time after it.'}` : ''}</p>
      ${score}
    </div>`;
  }

  /** The three moves, each with what the skill asks and where to go. */
  function movesHTML(weak) {
    const head = weak.slice(0, HEADLINE_N);
    if (!head.length) return '';
    const word = head.length === 1 ? 'move' : `${head.length === 2 ? 'two' : 'three'} moves`;
    return `<h2 class="moves-h">Your first ${word}, in this order</h2>
      <ol class="moves">${head.map((r, i) => {
        const drill = r.section === 'reading' ? 'practice.html' : practiceLink(r.skill);
        const blurb = TOPIC_BLURBS[r.skill];
        return `<li class="move ${bandOf(r).cls}">
          <div class="move-n">${i + 1}</div>
          <div class="move-body">
            <h3>${esc(topicLabel(r.skill))}</h3>
            <p class="move-score"><b>${r.right} of ${r.total} right</b> &middot; ${r.pct}%
              &middot; <span class="move-word">${bandOf(r).word}</span></p>
            ${blurb ? `<p class="move-blurb">${esc(blurb)}</p>` : ''}
            <p class="move-do no-print">${
              hasLesson(r.skill) ? `<a class="btn small" href="${lessonLink(r.skill)}">Read the lesson</a> ` : ''
            }<a class="btn small plain" href="${drill}">Practice it</a></p>
            <p class="move-do print-only small">Lesson and practice for this skill are on the site.</p>
          </div>
        </li>`;
      }).join('')}</ol>
      <p class="moves-note">Work down that list in order. One skill per session beats skimming all
        ${head.length === 1 ? 'of it' : 'three'} &mdash; number one is where the points are.</p>`;
  }

  /** Every scored skill as one bar, worst first, so the shape of the problem reads at a glance. */
  function skillChart(all) {
    const rows = all.slice().sort((a, b) => {
      const aThin = a.total < MIN_ITEMS, bThin = b.total < MIN_ITEMS;
      if (aThin !== bThin) return aThin ? 1 : -1;   // unscorable rows sink to the bottom
      return a.pct - b.pct || (b.total - a.total) || a.skill.localeCompare(b.skill);
    });
    return `<div class="skillchart">${rows.map(r => {
      const b = bandOf(r), thin = r.total < MIN_ITEMS;
      return `<div class="sc-row">
        <div class="sc-name">${esc(topicLabel(r.skill))}</div>
        <div class="sc-track"><span class="sc-fill ${b.cls}" style="width:${thin ? 0 : r.pct}%"></span></div>
        <div class="sc-val">${thin ? '&mdash;' : r.pct + '%'}</div>
        <div class="sc-word ${b.cls}">${b.word}</div>
      </div>`;
    }).join('')}</div>
    <p class="sc-key small muted"><span class="sc-chip need"></span>Needs work
      <span class="sc-chip shaky"></span>Shaky
      <span class="sc-chip solid"></span>Solid
      <span class="sc-chip strong"></span>Strong
      <span class="sc-chip thin"></span>Too few questions to judge</p>`;
  }

  /** Verdict, the three moves, and the chart — everything a student needs before scrolling. */
  function resultsTop(res) {
    const all  = skillRows(res.answers);
    const weak = rankWeak(all);
    return verdictHTML(res, all, weak) + movesHTML(weak) + planHandoff(weak) +
      `<h2>Every skill, weakest first</h2>
       <p class="small muted">How much of each skill you got right. Gray means this test did not ask
       enough questions about it to judge you fairly.</p>
       ${skillChart(all)}`;
  }

  /* Naming three skills and stopping leaves the student's next question — "when?" —
     unanswered. The plan page turns the three into dates. */
  function planHandoff(weak) {
    if (!weak.length) return '';
    const d = daysToTest();
    const when = d > 0
      ? `Your ${weak.length === 1 ? 'skill' : weak.length === 2 ? 'two skills' : 'three skills'},
         spread across the ${d} days until ${TEST_DATE_LABEL}.`
      : `Your ${weak.length === 1 ? 'skill' : 'skills'}, laid out in the order to work through them.`;
    return `<div class="plan-handoff no-print">
      <a class="btn" href="plan.html">Put this on a calendar</a>
      <p class="small muted">${when}</p>
    </div>`;
  }

  /** The full sheet: every skill scored by section, plus weaknesses four and five. */
  function scoreSheet(res) {
    const all = skillRows(res.answers);
    const weak = rankWeak(all);
    const thin = all.filter(r => r.total < MIN_ITEMS);

    const body = Object.keys(SECTIONS).map(key => {
      const mine = all.filter(r => r.section === key);
      if (!mine.length) return '';
      mine.sort((a, b) => a.pct - b.pct
        || (a.priority || 99) - (b.priority || 99)
        || a.skill.localeCompare(b.skill));
      const right = mine.reduce((n, r) => n + r.right, 0);
      const total = mine.reduce((n, r) => n + r.total, 0);
      return `<tr class="ss-sec">
          <th scope="row">${esc(SECTIONS[key].label)}</th>
          <td class="num">${right} of ${total}</td>
          <td class="num">${Math.round((right / total) * 100)}%</td>
          <td></td><td></td>
        </tr>` +
        mine.map(r => {
          const [cls, word] = statusOf(r);
          return `<tr>
            <td class="ss-skill">${r.priority ? `<span class="ss-rank">${r.priority}</span>` : ''}${esc(topicLabel(r.skill))}</td>
            <td class="num">${r.right} of ${r.total}</td>
            <td class="num">${r.total < MIN_ITEMS ? '&mdash;' : r.pct + '%'}</td>
            <td><span class="ss-tag ${cls}">${word}</span></td>
            <td class="ss-do">${studyCell(r)}</td>
          </tr>`;
        }).join('');
    }).join('');

    /* Weaknesses beyond the headline three. Named, but kept out of the way of the first three. */
    const rest = weak.slice(HEADLINE_N);
    const restHTML = rest.length ? `<h3>After those, if you have time</h3>
      <ol class="ss-plan" start="${HEADLINE_N + 1}">${rest.map(r => `<li>
          <b>${esc(topicLabel(r.skill))}</b> &mdash; ${r.right} of ${r.total} right.
          ${hasLesson(r.skill) ? `Read <a href="${lessonLink(r.skill)}">the lesson</a>, then ` : ''}
          <a href="${r.section === 'reading' ? 'practice.html' : practiceLink(r.skill)}">drill it</a>.
        </li>`).join('')}</ol>` : '';

    return `<div class="scoresheet">
      <div class="table-scroll"><table class="ss-table">
        <caption class="ss-caption">Every skill this test asked about, weakest first within each section.</caption>
        <thead><tr>
          <th>Skill</th><th class="num">Right</th><th class="num">Score</th>
          <th>How it looks</th><th>What to study</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      ${thin.length ? `<p class="small muted">${thin.length === 1 ? 'One skill' : `${thin.length} skills`}
        had fewer than ${MIN_ITEMS} questions here, so ${thin.length === 1 ? 'it is' : 'they are'} marked
        &ldquo;too few to tell&rdquo; rather than ranked. The <a href="diagnostic.html?full=1">full version</a>
        gives every skill enough questions to score properly.</p>` : ''}
      ${restHTML}
    </div>`;
  }

  /** How the student's pace compares with the real HSPT allowance. */
  function paceReport(res, secsPerQ, sectionLabel) {
    if (!secsPerQ) return '';
    const mine = res.perQuestion;
    let verdict, cls;

    if (res.ranOutOfTime) {
      // The clock cut them off, so elapsed time says nothing about their pace —
      // what matters is how far they got.
      const missed = res.answers.filter(a => a.pick === null).length;
      const reached = res.total - missed;
      const pct = Math.round((reached / res.total) * 100);
      return `<h2>Your pace</h2>
        <div class="bar-row">
          <div class="bar-top"><b>Time ran out</b><span class="val">${reached} of ${res.total} reached</span></div>
          <div class="bar weak"><span style="width:${pct}%"></span></div>
        </div>
        <p>You got through ${reached} of ${res.total} questions before the clock stopped.
        ${missed} went unanswered — on the real test those score zero, and since there is no penalty for a
        wrong answer, filling them in with a guess costs nothing and can only help. Practice this set
        again and try to reach the end, even if some of the later answers are rough.</p>`;
    }

    const pace = `${mine.toFixed(1)}s a question against the ${Math.round(secsPerQ)}s allowed in ${esc(sectionLabel)}`;
    const scorePct = res.total ? (res.correct / res.total) * 100 : 0;
    if (mine <= secsPerQ * 0.4 && scorePct < 60) {
      // Far under the allowance and getting them wrong: the student did not read the
      // questions. Telling them they have "room to slow down" reads as praise for guessing.
      verdict = `You went much faster than you needed to. There is time to read every question and
        every choice — take it, and the score climbs on its own.`;
      cls = 'weak';
    } else if (mine <= secsPerQ * 0.75) {
      verdict = `Comfortably inside the limit. You have room to slow down and read more carefully.`;
      cls = 'good';
    } else if (mine <= secsPerQ) {
      verdict = `Inside the limit, but not by much. Worth building a little more margin.`;
      cls = '';
    } else {
      verdict = `Over the limit. At this speed you would run out of time before the section ended.
        Do this set again untimed until the method is automatic, then time yourself again — speed
        comes from knowing the method, not from hurrying.`;
      cls = 'weak';
    }
    const pct = Math.min(100, Math.round((mine / secsPerQ) * 100));
    return `<h2>Your pace</h2>
      <div class="bar-row">
        <div class="bar-top"><b>${fmtTime(res.seconds)} total</b><span class="val">${pace}</span></div>
        <div class="bar ${cls}"><span style="width:${pct}%"></span></div>
      </div>
      <p>${verdict}</p>`;
  }

  /* The review after a diagnostic, practice set or mock test. It shows the whole
     lettered choice set, not just two bare lines, so a student who remembers
     "I put C" can find C, see why it was wrong and see which letter was right.
     The colors and letter chips are the same ones used during the quiz. */
  function reviewList(answers, onlyWrong = true) {
    const items = answers.filter(a => !onlyWrong || !a.correct);
    if (!items.length) return '<p class="muted">Nothing missed — every answer was correct.</p>';

    return items.map(a => {
      const q = a.q;
      const rightLtr = String.fromCharCode(65 + q.answer);

      const choices = q.options.map((o, n) => {
        const isRight = n === q.answer;
        const isMine  = n === a.pick;
        const cls = isRight ? 'right' : (isMine ? 'wrong' : '');
        const tag = isRight
          ? '<span class="rtag ok">Correct answer</span>'
          : (isMine ? '<span class="rtag no">You picked this</span>' : '');
        return `<li><div class="choice ${cls}">
            <span class="ltr">${String.fromCharCode(65 + n)}</span>
            <span class="txt">${esc(o)}</span>${tag}
          </div></li>`;
      }).join('');

      return `<div class="review-item">
        ${q.topic ? `<div class="qnum">${esc(topicLabel(q.topic))}</div>` : ''}
        <p class="stem">${esc(q.stem)}</p>
        ${q.figure ? `<div class="figure">${q.figure}</div>` : ''}
        <ul class="choices review-choices">${choices}</ul>
        ${a.pick === null ? '<p class="ans muted">You skipped this one.</p>' : ''}
        ${q.explanation
          ? `<div class="explain"><p><b>Why choice ${rightLtr} is the answer.</b> ${explHTML(q.explanation)}</p></div>`
          : ''}
        ${q.topic ? `<p class="small"><a href="${lessonLink(q.topic)}">Read the full lesson on ${esc(topicLabel(q.topic))}</a></p>` : ''}
      </div>`;
    }).join('');
  }

  /* ---------------- page furniture ---------------- */

  /* Required in all admissions materials per the RJHS Stylebook and IRS rules for
     non-profits. Reproduced verbatim — do not paraphrase or shorten. */
  const POLICY = `Regis Jesuit High School admits students of any race, color, national and ethnic origin
    to all the rights, privileges, programs and activities generally accorded or made available to students
    at the school. It does not discriminate on the basis of race, color, national and ethnic origin in
    administration of its educational policies, admissions policies, scholarship and loan programs, athletic
    and other school-administered programs.`;

  const TRADEMARK = `Regis Jesuit®, the Crest and RJ logos are federally registered trademarks owned by
    Regis Jesuit High School. All rights reserved.`;

  /* ---------------- primers ---------------- */

  /* A short primer per skill, shown above the questions. Practicing a skill you have never
     been taught is just repeated failure, so the site teaches first and drills second.
     The primer is the thirty-second version; the full lesson behind it lives in
     data/lessons.json and is rendered by learn.html. Content lives in data/primers.json
     and can be edited without touching this file. */
  let primerCache = null;
  async function primers() {
    if (!primerCache) {
      try {
        const res = await fetch(`data/primers.json?v=${BUILD}`);
        primerCache = res.ok ? (await res.json()).lessons : {};
      } catch (e) { primerCache = {}; }
    }
    return primerCache;
  }

  async function primerFor(topic) {
    const all = await primers();
    return all[topic] || (READING_TOPIC(topic) ? all._reading : null) || null;
  }

  function primerHTML(l, topicLabelText, lessonHref) {
    if (!l) return '';
    const steps = (l.how || []).map(h => `<li>${esc(h)}</li>`).join('');
    const ex = l.example
      ? `<div class="lesson-eg">
           <p class="eg-label">Worked example</p>
           <p class="eg-q">${esc(l.example.q)}</p>
           <p class="eg-work">${esc(l.example.work)}</p>
           <p class="eg-a"><b>Answer:</b> ${esc(l.example.a)}</p>
         </div>` : '';
    const trap = l.trap
      ? `<div class="lesson-trap"><p><b>Where students lose points.</b> ${esc(l.trap)}</p></div>` : '';
    const more = lessonHref
      ? `<p class="lesson-more"><a href="${lessonHref}">Read the full ${esc(topicLabelText)} lesson</a>
         &mdash; the method in detail, more worked examples and every trap this skill sets.</p>` : '';
    return `<details class="lesson" open>
        <summary><span class="lesson-tag">How ${esc(topicLabelText)} works</span><span class="lesson-hint">hide</span></summary>
        <div class="lesson-body">
          <p class="lesson-what">${esc(l.what)}</p>
          ${steps ? `<p class="lesson-h">What to do</p><ol class="lesson-steps">${steps}</ol>` : ''}
          ${ex}${trap}${more}
        </div>
      </details>`;
  }

  /* The public front door lives on the Canva site, which Marketing owns. This site is the
     practice engine behind it. These are the five Canva page anchors, so any page here can
     send a student back to dates, logistics or the study plans without duplicating them. */
  /* ---------------- the test date ---------------- */

  /* One place, because the results screen, the plan page and the front-door copy all count
     from it. Update these three lines once per admissions cycle and everything follows. */
  const TEST_DATE         = new Date(2026, 11, 5);        // Saturday 5 December 2026
  const TEST_DATE_LABEL   = 'Saturday, December 5';
  const TEST_MAKEUP_DATE  = new Date(2026, 11, 12);       // Saturday 12 December 2026
  const TEST_MAKEUP       = 'Saturday, December 12';

  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (a, b) => Math.round((midnight(a) - midnight(b)) / 86400000);

  /** Whole days from today to the main sitting. Negative once it has passed. */
  function daysToTest(from = new Date()) { return daysBetween(TEST_DATE, from); }

  /* Once the main sitting has passed, the make-up is the date that still means something
     to a student reading a plan. Returns null once both are behind us, so pages can drop
     the countdown rather than print a negative number. */
  function activeTest(from = new Date()) {
    if (daysBetween(TEST_DATE, from) >= 0)
      return { date: TEST_DATE, label: TEST_DATE_LABEL, days: daysBetween(TEST_DATE, from), makeup: false };
    if (daysBetween(TEST_MAKEUP_DATE, from) >= 0)
      return { date: TEST_MAKEUP_DATE, label: TEST_MAKEUP, days: daysBetween(TEST_MAKEUP_DATE, from), makeup: true };
    return null;
  }

  const FRONT = 'https://rjhs.my.canva.site/hspt';
  const FRONT_PAGES = {
    start:   FRONT,
    plans:   FRONT + '#page-PBkjwvcLgGC0CC4k',
    quizzes: FRONT + '#page-PBYRS8ZCxSlzgMbC',
    test:    FRONT + '#page-PBYvLDYz1mDjNZYC',
    tips:    FRONT + '#page-PBHyf32W8r4f6lwl'
  };

  function chrome(current) {
    /* Labels say what the page does, not what it is called. "Diagnostic" is a word a
       13-year-old has to decode; "What should I study?" is the question they arrived with. */
    const nav = [
      ['index.html', 'Start here'],
      ['diagnostic.html', 'What should I study?'],
      ['plan.html', 'Your study plan'],
      ['learn.html', 'Learn a skill'],
      ['practice.html', 'Practice a skill'],
      ['vocab.html', 'Vocabulary'],
      ['mock.html', 'Full practice test'],
      ['guide.html', 'How the test works'],
      ['resources.html', 'More help']
    ];
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="site"><div class="inner">
        <a class="mark" href="index.html">
          <img src="images/rj-logo-horizontal.png" alt="Regis Jesuit High School">
          <span class="lockup-text">HSPT Practice</span>
        </a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav id="site-nav">${nav.map(([h, t]) =>
          `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
          <a class="back" href="${FRONT_PAGES.start}">Test dates &amp; study plans &rarr;</a></nav>
      </div></header>`);
    const tog = document.querySelector('.nav-toggle');
    tog.addEventListener('click', () => {
      const open = tog.getAttribute('aria-expanded') === 'true';
      tog.setAttribute('aria-expanded', String(!open));
      document.querySelector('header.site').classList.toggle('nav-open', !open);
    });
    document.body.insertAdjacentHTML('beforeend', `
      <footer class="site"><div class="wrap-wide">
        <img class="crest" src="images/rj-crest.png" alt="Regis Jesuit High School crest">
        <p>Free HSPT practice from <a href="https://www.regisjesuit.com">Regis Jesuit High School</a>,
        Aurora, Colorado. Open to any student preparing for the High School Placement Test — you do not
        need to be applying to Regis Jesuit to use it.</p>
        <p>Test dates, what to bring and the study plans are on the
        <a href="${FRONT_PAGES.start}">main HSPT page</a>. Questions about registration, fee waivers or
        accommodations go to the Admissions Welcome Center at <a href="tel:+13032698000">303.269.8000</a>
        or <a href="mailto:admissions@regisjesuit.com">admissions@regisjesuit.com</a>.</p>
        <div class="policy">
          <p><b>This site is free and open to any student, and nothing you do here is recorded or
          sent anywhere</b> — your progress is stored in this browser only.</p>
          <p>Every question here was written for this site. It is practice material built to
          resemble the HSPT in format, timing and level of difficulty — it is not the exam, not a copy
          of any past exam, and not drawn from one. The real test may prove harder or easier than what
          you meet here, and a score on this site does not predict a score on the HSPT. HSPT is a
          registered trademark of Scholastic Testing Service, Inc., which neither endorses nor is
          affiliated with this site or Regis Jesuit High School's use of it.</p>
          <p>${POLICY.replace(/\s+/g, ' ')}</p>
          <p>${TRADEMARK.replace(/\s+/g, ' ')}</p>
        </div>
      </div></footer>`);
  }

  /** Every skill in the site: [{section, sectionLabel, topic, label, blurb, count}] */
  async function skillIndex() {
    const out = [];
    for (const key of ['verbal', 'quant', 'reading', 'math', 'language']) {
      const qs = await section(key);
      const byTopic = {};
      qs.forEach(q => (byTopic[q.topic] = (byTopic[q.topic] || 0) + 1));
      Object.entries(byTopic).sort().forEach(([topic, count]) => {
        out.push({
          section: key, sectionLabel: SECTIONS[key].label,
          topic, label: topicLabel(topic),
          blurb: TOPIC_BLURBS[topic] || '', count,
          href: practiceLink(topic)
        });
      });
    }
    return out;
  }

  return { BUILD, SECTIONS, buildTopicSpread, buildReading, TOPIC_LABELS, TOPIC_BLURBS, topicLabel, practiceLink,
           section, passages, loadBank, shuffle, sample, skillIndex,
           shuffleOptions, esc, fmtTime, typeset, latexToText, run, bars, reviewList, scoreSheet, resultsTop, skillChart, skillRows, rankWeak,
           paceReport, saveResult, results, chrome, FRONT, FRONT_PAGES,
           primers, primerFor, primerHTML,
           lessons, lessonLink, hasLesson, lessonTopicFor,
           TEST_DATE, TEST_DATE_LABEL, TEST_MAKEUP_DATE, TEST_MAKEUP, daysToTest, activeTest, MIN_ITEMS_FOR_RANK: 3 };
})();

/* ---------------------------------------------------------------------------
   "Found a mistake?" — adds a report link to the site footer on every page.
   It points at the Microsoft Form and pre-fills question 2 ("Which page were
   you on?") with this page's name and, on a practice run, the skill — so a
   13-year-old never has to describe where they were for us to find it.
   --------------------------------------------------------------------------- */

(function () {
  const FORM = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx' +
    '?id=4SwuQZc-CEClZjjFdYLisQzihhIB-7hPp9L3AOSeJONUM1NKUEZDNjU2R1VFVUpMNVAzMVo5VElIQy4u';
  /* Pre-fill key for "Which page were you on?". Regenerate from Forms →
     ... → Get Pre-filled URL if that question is ever deleted and re-added. */
  const PAGE_FIELD = 'r7e39387e0bfe4c9493e1dc208ac3ee19';

  const PAGE_NAMES = {
    'index.html': 'Start here',
    'diagnostic.html': 'What should I study?',
    'plan.html': 'Your study plan',
    'learn.html': 'Learn a skill',
    'practice.html': 'Practice a skill',
    'vocab.html': 'Vocabulary',
    'mock.html': 'Full practice test',
    'guide.html': 'How the test works',
    'resources.html': 'More help'
  };

  function whereAmI() {
    const file = location.pathname.split('/').pop() || 'index.html';
    const name = PAGE_NAMES[file] || file;
    let topic = '';
    try { topic = new URLSearchParams(location.search).get('topic') || ''; } catch (e) {}
    return topic ? `${name} — ${topic} (${file})` : `${name} (${file})`;
  }

  function addReportLink() {
    const foot = document.querySelector('footer.site .wrap-wide');
    if (!foot || foot.querySelector('.report')) return;
    const href = `${FORM}&${PAGE_FIELD}=${encodeURIComponent(whereAmI())}`;
    const p = document.createElement('p');
    p.className = 'report';
    p.innerHTML = `<a class="btn plain small" href="${href}" target="_blank" rel="noopener">` +
      `Found a mistake on this page? Tell us</a> ` +
      `<span class="small muted">Takes a minute. No sign-in, and you do not have to give your name.</span>`;
    const policy = foot.querySelector('.policy');
    if (policy) foot.insertBefore(p, policy); else foot.appendChild(p);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addReportLink);
  } else {
    addReportLink();
  }
})();
