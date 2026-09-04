/* HSPT Test Prep — shared engine
   No framework, no build step. Loads question banks from /data/*.json.
   Nothing is sent anywhere; progress lives in this browser only. */

const HSPT = (() => {

  /* ---------------- data ---------------- */

  /* secsPerQ is the real HSPT allowance for that section, rounded to the second:
     Verbal 16min/60Q, Quantitative 30/52, Reading 25/62, Maths 45/64, Language 25/60. */
  const SECTIONS = {
    verbal:   { label: 'Verbal Skills',       file: 'verbal',   secsPerQ: 16 },
    quant:    { label: 'Quantitative Skills', file: 'math',     secsPerQ: 35 },
    reading:  { label: 'Reading',             file: 'reading',  secsPerQ: 24 },
    math:     { label: 'Mathematics',         file: 'math',     secsPerQ: 42 },
    language: { label: 'Language Skills',     file: 'language', secsPerQ: 25 }
  };

  // The math bank covers both HSPT math sections. Split it by topic.
  const QUANT_TOPICS = ['Patterns in Numbers', 'Mathematic Comparisons', 'Skills Check 2: Quantitative Skills'];

  /* Student-facing names. The bank's internal topic strings stay as they are so the
     data files and every saved result keep working; this is presentation only. */
  const TOPIC_LABELS = {
    'Patterns in Numbers': 'Number Series & Patterns',
    'Mathematic Comparisons': 'Comparisons',
    'Skills Check 2: Quantitative Skills': 'Quantitative Reasoning',
    'Math Principles': 'Number Sense',
    'Problem Solving': 'Word Problems',
    'Skills Check 4: Mathematic Skills': 'Computation & Geometry',
    'Usage': 'Grammar & Usage',
    'Composition': 'Composition & Paragraphs',
    'Vocabulary': 'Vocabulary in Context',
    'Verbal Logic': 'Verbal Logic'
  };

  /* One line telling a student what the skill actually asks of them. */
  const TOPIC_BLURBS = {
    'Synonyms': 'Pick the word closest in meaning.',
    'Antonyms': 'Pick the word that means the opposite — watch for the synonym hiding in the choices.',
    'Analogies': 'Work out the relationship in the first pair, then apply it to the second.',
    'Classification': 'Find what three words share; the fourth is the odd one out.',
    'Verbal Logic': 'If the first two statements are true, is the third true, false or uncertain?',
    'Vocabulary': 'Work out a word’s meaning from the phrase it sits in.',
    'Spelling': 'One misspelled word among three sentences — or none at all.',
    'Capitalization': 'Proper nouns, titles, seasons and the things that only look like proper nouns.',
    'Punctuation': 'Commas, semicolons, apostrophes and quotation marks.',
    'Usage': 'Subject–verb agreement, pronoun case, comparatives and the rest.',
    'Composition': 'Topic sentences, concluding sentences and which sentence does not belong.',
    'Patterns in Numbers': 'Find the step between terms, then check whether the step itself changes.',
    'Mathematic Comparisons': 'Work out each quantity before you look at the answer choices.',
    'Skills Check 2: Quantitative Skills': 'Mixed reasoning — series, comparisons and short problems.',
    'Math Principles': 'Place value, rounding, averages, factors and estimation.',
    'Problem Solving': 'Word problems: rates, percents, ratios and money.',
    'Skills Check 4: Mathematic Skills': 'Computation, proportions, area and perimeter.'
  };

  const topicLabel = t => TOPIC_LABELS[t] ||
    (/^[a-z-]+$/.test(t) ? t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : t);

  const cache = {};
  async function loadBank(file) {
    if (!cache[file]) {
      const res = await fetch(`data/${file}.json`);
      if (!res.ok) throw new Error(`Could not load ${file}.json`);
      cache[file] = await res.json();
    }
    return cache[file];
  }

  /** Questions for one of the five HSPT sections. */
  async function section(key) {
    const spec = SECTIONS[key];
    const bank = await loadBank(spec.file);
    let qs = bank.questions;
    if (key === 'quant') qs = qs.filter(q => QUANT_TOPICS.includes(q.topic));
    if (key === 'math')  qs = qs.filter(q => !QUANT_TOPICS.includes(q.topic));
    return qs.map(q => ({ ...q, section: key }));
  }

  async function passages() { return (await loadBank('reading')).passages; }

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
  function shuffleOptions(q) {
    const correct = q.options[q.answer];
    const options = shuffle(q.options);
    return { ...q, options, answer: options.indexOf(correct) };
  }

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtTime = secs => {
    const m = Math.floor(Math.abs(secs) / 60), s = Math.abs(secs) % 60;
    return `${secs < 0 ? '−' : ''}${m}:${String(s).padStart(2, '0')}`;
  };

  /** Turn simple LaTeX into readable text, for when KaTeX is unavailable.
      Not a renderer — just enough that a question is still answerable. */
  const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ' };
  function latexToText(s) {
    return s
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\d?frac(\d)(\d)/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
      .replace(/\\sqrt(\d+)/g, '√$1')
      .replace(/\\left|\\right/g, '')
      .replace(/\^\{([^{}]*)\}/g, (m, g) => g.split('').every(c => SUP[c]) ? g.split('').map(c => SUP[c]).join('') : '^' + g)
      .replace(/\^(\w)/g, (m, g) => SUP[g] || '^' + g)
      .replace(/\\times/g, '×').replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·').replace(/\\circ/g, '°')
      .replace(/\\le(?![a-z])/g, '≤').replace(/\\ge(?![a-z])/g, '≥')
      .replace(/\\ne(?![a-z])/g, '≠').replace(/\\pi(?![a-z])/g, 'π')
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
        // \( \) only — a bare $ in these questions is currency, not maths.
        window.renderMathInElement(el, {
          delimiters: [{ left: '\\(', right: '\\)', display: false }],
          throwOnError: false
        });
        return;
      } catch (e) { /* fall through to the text fallback */ }
    }
    // KaTeX did not load — show readable maths rather than raw source.
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
          ? `<div class="explain"><p>${esc(q.explanation)}</p></div>`
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
        const head = linkTopics
          ? `<a href="${practiceLink(k)}">${name}</a>`
          : `<b>${name}</b>`;
        return `<div class="bar-row">
          <div class="bar-top"><b>${head}</b><span class="val">${v.right}/${v.total} · ${pct}%</span></div>
          <div class="bar ${cls}"><span style="width:${pct}%"></span></div>
        </div>`;
      }).join('');
  }

  /** Deep link to a single skill's practice set. */
  const practiceLink = topic => `practice.html?topic=${encodeURIComponent(topic)}`;

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
        wrong answer, filling them in with a guess costs nothing and can only help. Practise this set
        again and try to reach the end, even if some of the later answers are rough.</p>`;
    }

    const pace = `${mine.toFixed(1)}s a question against the ${Math.round(secsPerQ)}s allowed in ${esc(sectionLabel)}`;
    if (mine <= secsPerQ * 0.75) {
      verdict = `Comfortably inside the limit. You have room to slow down and read more carefully.`;
      cls = 'good';
    } else if (mine <= secsPerQ) {
      verdict = `Inside the limit, but not by much. Worth building a little more margin.`;
      cls = '';
    } else {
      verdict = `Over the limit. At this pace you would not finish the section in time.`;
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

  function reviewList(answers, onlyWrong = true) {
    const items = answers.filter(a => !onlyWrong || !a.correct);
    if (!items.length) return '<p class="muted">Nothing missed — every answer was correct.</p>';
    return items.map(a => `
      <div class="review-item">
        <p class="stem">${esc(a.q.stem)}</p>
        <p class="ans"><span class="lbl">Correct answer</span> <b>${esc(a.q.options[a.q.answer])}</b></p>
        ${a.pick === null
          ? '<p class="ans muted"><span class="lbl">You</span> skipped this one</p>'
          : `<p class="ans muted"><span class="lbl">You answered</span> ${esc(a.q.options[a.pick])}</p>`}
        ${a.q.explanation ? `<div class="explain" style="margin-top:10px"><p>${esc(a.q.explanation)}</p></div>` : ''}
      </div>`).join('');
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

  function chrome(current) {
    const nav = [
      ['index.html', 'Start here'],
      ['guide.html', 'The test'],
      ['diagnostic.html', 'Diagnostic'],
      ['practice.html', 'Practice'],
      ['mock.html', 'Practice test'],
      ['resources.html', 'More help']
    ];
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="site"><div class="inner">
        <a class="mark" href="index.html">
          <img src="images/rj-logo-horizontal.png" alt="Regis Jesuit High School">
          <span class="lockup-text">HSPT Practice</span>
        </a>
        <nav>${nav.map(([h, t]) =>
          `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      </div></header>`);
    document.body.insertAdjacentHTML('beforeend', `
      <footer class="site"><div class="wrap-wide">
        <img class="crest" src="images/rj-crest.png" alt="Regis Jesuit High School crest">
        <p>Free HSPT practice from <a href="https://www.regisjesuit.com">Regis Jesuit High School</a>,
        Aurora, Colorado. Open to any student preparing for the High School Placement Test — you do not
        need to be applying to Regis Jesuit to use it.</p>
        <p>Questions about test dates, registration or accommodations go to the Admissions Welcome Center
        at <a href="tel:+13032698000">303.269.8000</a>.</p>
        <div class="policy">
          <p>${POLICY.replace(/\s+/g, ' ')}</p>
          <p>${TRADEMARK.replace(/\s+/g, ' ')}</p>
          <p>Practice questions were written for this site. Nothing you do here is recorded or sent
          anywhere; your progress is stored in this browser only. HSPT is a registered trademark of
          Scholastic Testing Service, Inc., which does not endorse and is not affiliated with this site.</p>
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

  return { SECTIONS, QUANT_TOPICS, TOPIC_LABELS, TOPIC_BLURBS, topicLabel, practiceLink,
           section, passages, loadBank, shuffle, sample, skillIndex,
           shuffleOptions, esc, fmtTime, typeset, latexToText, run, bars, reviewList,
           paceReport, saveResult, results, chrome };
})();
