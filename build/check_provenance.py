#!/usr/bin/env python3
"""Licensing check: does anything we publish share an 8-word run with the source books?

This is the one script in build/ that is still meant to be run. Everything under
build/applied/ is spent. Run it from the repo root before publishing lesson or bank
changes:

    HSPT_SRC=~/hspt-src python3 build/check_provenance.py

HSPT_SRC is a directory of .txt text layers extracted from the licensed chapters. Those
files are deliberately NOT in this repo — they are the copyrighted material this check
exists to keep us clear of. Without them the script tells you so and exits, rather than
reporting a clean run it did not actually perform.
"""
import json, re, glob, os, sys, html
from collections import defaultdict

# Repo root, so the script works from anywhere.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.environ.get('HSPT_SRC') or (sys.argv[1] if len(sys.argv) > 1 else '')

# Phrases the test itself uses: its standard prompts, and the compound-relation option
# wording the comparison item types force. These are nobody's protected expression, and
# leaving them in the report buries the matches that actually matter.
BOILERPLATE = [
    'which word does not belong with the others',
    'if the first two statements are true the third is',
    'examine a b and c and choose the best answer',
    'examine a b and c choose the best answer a',
    'examine figures a b and c choose the best answer',
    'examine the figures a b and c and choose',
    'compare the areas and choose the statement that is true',
    'compare the perimeters and choose the statement that is true',
    'the area of a', 'the area of b', 'the area of c',
    'area of a is', 'area of b is', 'area of c is',
    'is less than the area of', 'is greater than the area of',
    'equals the area of', 'all have the same area',
    'the perimeter of a', 'the perimeter of b', 'the perimeter of c',
    'choose the best word to join the thoughts together',
    'which of these expresses the idea most clearly',
    'choose the sentence that demonstrates correct usage',
    'which sentence does not belong in the paragraph',
    'choose the pair of sentences that best develops',
    'most nearly means', 'no mistakes',
    'choose the word that best completes this sentence',
    'which of these sentences offers the least support to the topic',
    'sentences offers the least support to the topic',
    'and the two angles opposite those sides are',
    'a b and c all have the same',
    'should end with a question mark not a period',
    'end with a question mark not a period',
    'a question so it should end with a',
    'what number should come next in this series',
    'which of the following is not mentioned in the passage',
]

def is_boilerplate(sh):
    return any(b in sh or sh in b for b in BOILERPLATE)


def norm(s):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    s = s.replace('’',"'").replace('“','"').replace('”','"')
    s = s.replace('—',' ').replace('–',' ')
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

# ---- source corpus (licensed) ----
src_words, src_shingles = {}, {}
N = int(os.environ.get('HSPT_N', '8'))
if not SRC_DIR or not os.path.isdir(SRC_DIR):
    sys.exit('No source corpus. Set HSPT_SRC to the folder of extracted chapter .txt files,\n'
             'or pass it as the first argument. Refusing to report a clean run without it.')

paths = sorted(glob.glob(os.path.join(SRC_DIR, '*.txt')))
if not paths:
    sys.exit(f'No .txt files in {SRC_DIR} — nothing to check against.')

for p in paths:
    name = re.sub(r'^[0-9a-f]{8}-', '', os.path.basename(p)).replace('_',' ')[:-4]
    w = norm(open(p, errors='ignore').read()).split()
    src_words[name] = w
    src_shingles[name] = {' '.join(w[i:i+N]) for i in range(len(w)-N+1)}
ALL = set().union(*src_shingles.values())
print(f'source corpus: {len(src_words)} chapters, {sum(len(v) for v in src_words.values()):,} words, {len(ALL):,} distinct {N}-grams\n')

def scan(label, items):
    """items: list of (where, text). Reports the LONGEST contiguous run of words each
    string shares with the source books, ignoring the test's own stock phrasing. A long
    run is a lift; a short one is usually coincidence or a formula the format forces."""
    rows = []
    for where, text in items:
        w = norm(text).split()
        if len(w) < N:
            continue
        hit = [False] * len(w)
        who = {}
        for i in range(len(w) - N + 1):
            sh = ' '.join(w[i:i+N])
            if sh in ALL and not is_boilerplate(sh):
                for j in range(i, i+N):
                    hit[j] = True
                for c, ss in src_shingles.items():
                    if sh in ss:
                        who[c] = who.get(c, 0) + 1
                        break
        if not any(hit):
            continue
        best, cur, start, bstart = 0, 0, 0, 0
        for i, h in enumerate(hit):
            if h:
                if cur == 0:
                    start = i
                cur += 1
                if cur > best:
                    best, bstart = cur, start
            else:
                cur = 0
        chapter = max(who, key=who.get) if who else '?'
        rows.append((best, where, ' '.join(w[bstart:bstart+best]), chapter))
    rows.sort(reverse=True)
    print(f'=== {label}: {len(items)} strings checked, {len(rows)} with a non-boilerplate '
          f'{N}-word match')
    if rows:
        print(f'    longest shared run: {rows[0][0]} words')
    for best, where, run, chapter in rows[:25]:
        print(f'   {best:3d}w  {where}')
        print(f'         "{run[:150]}"  [{chapter}]')
    if len(rows) > 25:
        print(f'   ... and {len(rows)-25} more, all shorter')
    print()


# ---- lessons ----
d = json.load(open(os.path.join(ROOT, 'data', 'lessons.json')))['lessons']
items=[]
for t, les in d.items():
    for i, b in enumerate(les['blocks']):
        for f in ('text','stem','walkthrough'):
            if f in b: items.append((f'{t}[{i}].{f}', b[f]))
        for f in ('items','options'):
            if f in b:
                for j,x in enumerate(b[f]): items.append((f'{t}[{i}].{f}[{j}]', x))
        if b['type']=='table':
            for r,row in enumerate(b['rows']):
                for c,cell in enumerate(row): items.append((f'{t}[{i}].row{r}c{c}', cell))
scan('LESSONS', items)

# ---- question banks ----
qitems=[]
for f in ['verbal','language','math','quantitative','reading']:
    bank = json.load(open(os.path.join(ROOT, 'data', f'{f}.json')))
    for q in bank['questions']:
        qitems.append((f"{f}:{q['id']}:stem", q['stem']))
        for j,o in enumerate(q['options']): qitems.append((f"{f}:{q['id']}:opt{j}", o))
        if q.get('explanation'): qitems.append((f"{f}:{q['id']}:expl", q['explanation']))
    for k,p in (bank.get('passages') or {}).items():
        qitems.append((f'{f}:passage:{k}', ' '.join(p['paragraphs'])))
scan('QUESTION BANKS', qitems)
