import json, re, glob, os, sys, html
from collections import defaultdict

def norm(s):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    s = s.replace('’',"'").replace('“','"').replace('”','"')
    s = s.replace('—',' ').replace('–',' ')
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

# ---- source corpus (licensed) ----
src_words, src_shingles = {}, {}
N = 8
for p in sorted(glob.glob('/home/claude/src/*.txt')):
    name = re.sub(r'^[0-9a-f]{8}-', '', os.path.basename(p)).replace('_',' ')[:-4]
    w = norm(open(p, errors='ignore').read()).split()
    src_words[name] = w
    src_shingles[name] = {' '.join(w[i:i+N]) for i in range(len(w)-N+1)}
ALL = set().union(*src_shingles.values())
print(f'source corpus: {len(src_words)} chapters, {sum(len(v) for v in src_words.values()):,} words, {len(ALL):,} distinct {N}-grams\n')

def scan(label, items):
    """items: list of (where, text)"""
    hits = defaultdict(list)
    for where, text in items:
        w = norm(text).split()
        if len(w) < N: continue
        for i in range(len(w)-N+1):
            sh = ' '.join(w[i:i+N])
            if sh in ALL:
                who = [c for c,s in src_shingles.items() if sh in s]
                hits[where].append((sh, who[0]))
    print(f'=== {label}: {len(items)} strings checked, {len(hits)} with an {N}-word match against the source books')
    for where, hs in sorted(hits.items())[:40]:
        seen=set(); out=[]
        for sh,who in hs:
            if sh not in seen: seen.add(sh); out.append(f'      "{sh}"  [{who}]')
        print(f'   {where}'); print('\n'.join(out[:4]))
    print()

# ---- lessons ----
d = json.load(open('/home/claude/merged/data/lessons.json'))['lessons']
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
for f in ['verbal','language','math','reading']:
    bank = json.load(open(f'../data/{f}.json'))
    for q in bank['questions']:
        qitems.append((f"{f}:{q['id']}:stem", q['stem']))
        for j,o in enumerate(q['options']): qitems.append((f"{f}:{q['id']}:opt{j}", o))
        if q.get('explanation'): qitems.append((f"{f}:{q['id']}:expl", q['explanation']))
    for k,p in (bank.get('passages') or {}).items():
        qitems.append((f'{f}:passage:{k}', ' '.join(p['paragraphs'])))
scan('QUESTION BANKS', qitems)
