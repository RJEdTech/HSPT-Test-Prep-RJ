/* Landing-page behaviour: the five-question taster, and the "pick up where you left off" block. */
/* Five questions on the landing page — the first thing a student sees.

   Deliberately hand-picked rather than sampled: the point is one gettable question from
   each section so a student finishes with a small win and knows what the test looks like.
   A random draw can open on a hard one, and a student who misses the first question they
   ever see on the site is a student who closes the tab.

   Nothing here is scored or saved. It exists to get someone from reading to answering. */

(function () {
  const PICKS = [
    { id: 'c2322d5572', file: 'verbal',   section: 'Verbal Skills' },
    { id: 'd07ee7a381', file: 'math',     section: 'Quantitative Skills' },
    { id: 'b025913ba6', file: 'verbal',   section: 'Reading' },
    { id: '91e5b8dc53', file: 'math',     section: 'Mathematics' },
    { id: '2721c14595', file: 'language', section: 'Language Skills' }
  ];

  /* Written for this widget: a student who gets one wrong here has had no teaching yet,
     so the reason has to stand on its own. */
  const WHY = {
    c2322d5572: 'Frigid means very cold — think “refrigerator.” Synonym questions are asking for the closest meaning, not the perfect one.',
    d07ee7a381: 'Each number is half the one before: 64, 32, 16, 8, so next is 4. With a number series, always find what happens between two terms first.',
    b025913ba6: 'Mundane means everyday or ordinary. You can often get these from the rest of the phrase even when the word is new to you.',
    '91e5b8dc53': 'A foot is 12 inches, so 19 inches is a bit over a foot and a half — closest to 2 feet. Estimating beats exact arithmetic on questions like this.',
    '2721c14595': '“Fammous” should be “famous” — one m. In Language Skills, read each sentence on its own instead of comparing them.'
  };

  const box = document.getElementById('taster-box');
  if (!box) return;

  let questions = [], i = 0, right = 0, answered = false;

  async function load() {
    const files = [...new Set(PICKS.map(p => p.file))];
    const banks = {};
    await Promise.all(files.map(async f => { banks[f] = await HSPT.loadBank(f); }));
    questions = PICKS.map(p => {
      const q = banks[p.file].questions.find(x => x.id === p.id);
      if (!q) return null;
      return { ...HSPT.shuffleOptions(q), sectionLabel: p.section };
    }).filter(Boolean);

    if (!questions.length) { box.closest('section').hidden = true; return; }
    render();
  }

  function render() {
    const q = questions[i];
    box.innerHTML = `
      <div class="t-head">
        <span class="t-count">Question ${i + 1} of ${questions.length}</span>
        <span class="t-sec">${HSPT.esc(q.sectionLabel)}</span>
      </div>
      <p class="t-stem">${HSPT.esc(q.stem)}</p>
      <div class="t-opts">
        ${q.options.map((o, n) => `
          <button class="t-opt" data-n="${n}">
            <span class="t-letter">${'ABCD'[n]}</span><span>${HSPT.esc(o)}</span>
          </button>`).join('')}
      </div>
      <div class="t-feedback" hidden></div>
      <div class="t-actions" hidden></div>`;
    answered = false;
    box.querySelectorAll('.t-opt').forEach(b =>
      b.addEventListener('click', () => choose(Number(b.dataset.n))));
    if (window.HSPT && HSPT.typeset) HSPT.typeset(box);
  }

  function choose(n) {
    if (answered) return;
    answered = true;
    const q = questions[i];
    const ok = n === q.answer;
    if (ok) right++;

    box.querySelectorAll('.t-opt').forEach(b => {
      const m = Number(b.dataset.n);
      b.disabled = true;
      if (m === q.answer) b.classList.add('is-right');
      else if (m === n) b.classList.add('is-wrong');
    });

    const fb = box.querySelector('.t-feedback');
    fb.hidden = false;
    fb.className = 't-feedback ' + (ok ? 'good' : 'bad');
    fb.innerHTML = `<p><b>${ok ? 'That’s right.' : 'Not this time.'}</b> ${HSPT.esc(WHY[q.id] || '')}</p>`;

    const act = box.querySelector('.t-actions');
    act.hidden = false;
    act.innerHTML = i < questions.length - 1
      ? `<button class="btn" id="t-next">Next question</button>`
      : `<button class="btn" id="t-next">See how you did</button>`;
    document.getElementById('t-next').addEventListener('click', () => {
      if (i < questions.length - 1) { i++; render(); box.scrollIntoView({ block: 'nearest' }); }
      else finish();
    });
  }

  function finish() {
    /* Every ending points at the same next step. Getting them wrong is the argument for
       studying, and getting them right is the argument for a harder test — so neither
       outcome is allowed to be a dead end. */
    const msg = right === questions.length
      ? 'All five. The real test is longer and faster, so the next step is finding out where you actually stand.'
      : right >= 3
        ? `${right} out of ${questions.length}. That is a normal first go — and the ones you missed are the ones worth studying.`
        : `${right} out of ${questions.length}. Completely normal before you have studied — now you know it is worth doing.`;

    box.innerHTML = `
      <div class="t-done">
        <p class="t-score">${right} / ${questions.length}</p>
        <p>${msg}</p>
        <div class="btn-row">
          <a class="btn" href="diagnostic.html">Find out what to study</a>
          <a class="btn plain" href="practice.html">Practice a skill instead</a>
        </div>
        <p class="small muted"><button class="linkish" id="t-again">Try five more</button></p>
      </div>`;
    document.getElementById('t-again').addEventListener('click', () => {
      i = 0; right = 0;
      questions = questions.map(q => HSPT.shuffleOptions(q));
      render();
    });
  }

  load().catch(() => { box.closest('section').hidden = true; });
})();

/* ---------------------------------------------------------------------------
   "Pick up where you left off."

   Results are already stored in this browser by saveResult(); nothing here sends
   anything anywhere. The point is that a student returning on Tuesday should not
   have to remember what Saturday told them — the site should just say it.
   --------------------------------------------------------------------------- */

(function () {
  const box = document.getElementById('resume');
  if (!box || !window.HSPT) return;

  const diag = HSPT.results('diagnostic');
  const prac = HSPT.results('practice');
  const mock = HSPT.results('mock');
  if (!diag.length && !prac.length && !mock.length) return;   // first visit: stay quiet

  const done = new Set(prac.map(r => r.topic));
  const last = diag[0];
  const when = ts => {
    const d = Math.floor((Date.now() - ts) / 86400000);
    return d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
  };

  let lead, actions = '';

  if (last && last.weak && last.weak.length) {
    const todo = last.weak.filter(t => !done.has(t));
    const list = (todo.length ? todo : last.weak);
    lead = todo.length
      ? `Your diagnostic ${when(last.at)} said these are worth your time next:`
      : `You have practiced everything your diagnostic flagged. Nice. Worth taking it again to see what moved:`;
    actions = `<div class="btn-row wrapy">${list.map(t =>
      `<a class="btn plain" href="${HSPT.practiceLink(t)}">${HSPT.esc(HSPT.topicLabel(t))}</a>`).join('')}
      <a class="btn" href="${todo.length ? HSPT.practiceLink(list[0]) : 'diagnostic.html'}">${
        todo.length ? 'Start with ' + HSPT.esc(HSPT.topicLabel(list[0])) : 'Find your starting point again'}</a></div>`;
  } else if (prac.length) {
    const p = prac[0];
    lead = `You last practiced <b>${HSPT.esc(p.label || HSPT.topicLabel(p.topic))}</b> ${when(p.at)} and got
            ${p.correct} of ${p.total}. If you have not found your starting point yet, it will tell you what to do next.`;
    actions = `<div class="btn-row"><a class="btn" href="diagnostic.html">Find out what to study</a>
               <a class="btn plain" href="${HSPT.practiceLink(p.topic)}">Practice that again</a></div>`;
  } else {
    const m = mock[0];
    lead = `You took the full practice test ${when(m.at)} and got ${m.correct} of ${m.total}.`;
    actions = `<div class="btn-row"><a class="btn" href="practice.html">Practice a skill</a></div>`;
  }

  box.innerHTML = `<section class="resume">
      <h2>Where you left off</h2>
      <p>${lead}</p>
      ${actions}
      <p class="small muted">${done.size} of 17 skills practiced on this device.
      This is stored in this browser only — nobody else can see it.</p>
    </section>`;
})();
