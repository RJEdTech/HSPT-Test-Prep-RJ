"""Reconcile the short primers with the full lessons, 4 September 2026.

Two layers of teaching content now sit on the same skill: the primer above the
drill and the lesson behind it. An independent pass found places where they told
a student different things. Each edit asserts on its target first.
"""
import json
log = []

PP, LP = 'data/primers.json', 'data/lessons.json'
pdoc = json.load(open(PP)); P = pdoc['lessons']
ldoc = json.load(open(LP)); L = ldoc['lessons']

def sub(container, path, old, new, why):
    node = container
    for k in path[:-1]: node = node[k]
    assert node[path[-1]] == old or old in str(node[path[-1]]), f'{path}: target not found'
    if node[path[-1]] == old: node[path[-1]] = new
    else: node[path[-1]] = node[path[-1]].replace(old, new, 1)
    log.append(why)

# ── 1. Quantitative Reasoning: the lesson denied the topic's own drills. ────────
b = L['Skills Check 2: Quantitative Skills']['blocks'][0]
assert b['text'].startswith('These items give you one sentence.')
b['text'] = ("This topic mixes the three Quantitative Skills shapes, and its biggest share is the "
  "one taught here: an item that gives you a single sentence. No diagram, no story about trains "
  "— just a relationship between numbers, written out in English, with one number left unnamed. "
  "<i>What number is four more than three times seven?</i> The arithmetic is easy. Turning the "
  "sentence into an equation is the whole test. The other two shapes have lessons of their own: "
  "number series and letter series are in <b>Number Series &amp; Patterns</b>, and items that ask "
  "you to rank A, B and C are in <b>Comparisons</b>.")
log.append('Quantitative Reasoning[0]: no longer denies the series and comparison items in its own drill set')

# ── 2. Reading: the primer and the lesson gave opposite reading orders. ────────
r = P['_reading']
assert r['how'][0] == 'Read the whole passage first, reasonably quickly. Do not take notes.'
r['how'][0] = ('Skim the question stems first, not the choices, so you know what you are reading for. '
               'Then read the passage once at a steady pace.')
r['how'].insert(1, 'Give each paragraph a two-word job title as you pass it. That map is what makes '
                   'the main-idea and detail questions quick.')
log.append('_reading primer: reading order aligned with the lesson (stems first, then a paragraph map)')

# ── 3. Punctuation: the primer stated the quotation rule wrongly. ──────────────
sub(P, ['Punctuation','how',3],
    'Check that end punctuation sits inside the quotation marks.',
    'Check the quotation marks: periods and commas always go inside, but a question mark goes '
    'inside only when the quoted words are themselves the question.',
    'Punctuation primer: end-punctuation rule corrected — a question mark is not always inside')

sub(P, ['Punctuation','how',0],
    "It's always means it is.",
    "It's is short for it is or it has.",
    'Punctuation primer: it\'s also contracts "it has"')

# ── 4. Usage: the lesson claimed one item format; the bank has two. ────────────
b = L['Usage']['blocks'][0]
assert 'it uses the same format as capitalization and punctuation' in b['text']
b['text'] = b['text'].replace(
  'and it uses the same format as capitalization and punctuation: three sentences labeled A, B and C, '
  'and a fourth choice reading <i>No mistakes.</i> One of the four is right.',
  'and it comes in two shapes. Most items use the same format as capitalization and punctuation: '
  'three sentences labeled A, B and C, and a fourth choice reading <i>No mistakes.</i> Others give '
  'you four versions of one sentence and ask which is written correctly — the same knowledge, asked '
  'the other way round, so read the instruction before you start hunting for an error.', 1)
log.append('Usage[0]: now covers both item formats the bank actually contains')

# ── 5. Comparisons: two or three quantities, not always three. ─────────────────
sub(L, ['Mathematic Comparisons','blocks',0,'text'],
    'A comparison item hands you three things labelled A, B and C and asks for the best answer.',
    'A comparison item hands you two or three things, usually labelled A, B and C, and asks for the '
    'best answer.',
    'Comparisons[0]: item can present two quantities as well as three')
sub(L, ['Mathematic Comparisons','blocks',0,'text'],
    'Your job is to work out what A, B and C actually are',
    'Your job is to work out what each of them actually is',
    'Comparisons[0]: wording follows the two-or-three correction')

# ── 6. Vocabulary in context: where it sits on the test vs on this site. ───────
sub(L, ['Vocabulary','blocks',0,'text'],
    'The last 22 questions of the Reading section are vocabulary.',
    'The last 22 questions of the Reading section are vocabulary. On this site they sit with the '
    'other word questions, because that is how you will want to practise them.',
    'Vocabulary[0]: explains why the drill lives with the verbal sets rather than the reading ones')

# ── 7. Problem Solving: opposite entry points into a word problem. ─────────────
sub(P, ['Problem Solving','how',0],
    'Read it once for the story, then again for the numbers.',
    'Read the last sentence first and find the question mark — that is what you are solving for. '
    'Then read the whole thing for the numbers.',
    'Problem Solving primer: entry point aligned with the lesson')

# ── 8. Composition: shortest is not automatically best. ───────────────────────
sub(P, ['Composition','how',3],
    'For clearest wording, prefer the short active sentence over the long roundabout one.',
    'For clearest wording, prefer the short active sentence over the long roundabout one — but check '
    'that the short one still says everything the original did.',
    'Composition primer: added the caveat the lesson spends a section on')

# ── 9. Capitalization: religious services are keyed in the bank, untaught. ─────
t = next(b for b in L['Capitalization']['blocks']
         if b['type'] == 'table' and any('Kleenex' in r[0] for r in b['rows']))
assert not any('Mass' in r[0] for r in t['rows'])
t['rows'].append(['Mass, Advent, Lent, the Bible', 'a church service, the liturgy, a hymnal'])
log.append('Capitalization table: named religious services and seasons added — the bank keys them and the lesson never taught them')

# ── 10. Two lessons gave different starting points for testing choices. ────────
found = False
for i, b in enumerate(L['Skills Check 2: Quantitative Skills']['blocks']):
    for f in ('text', 'walkthrough'):
        if f in b and 'second-smallest choice' in b[f]:
            b[f] = b[f].replace('second-smallest choice', 'middle choice'); found = True
    for f in ('items',):
        for j, it in enumerate(b.get(f, [])):
            if 'second-smallest choice' in it:
                b[f][j] = it.replace('second-smallest choice', 'middle choice'); found = True
assert found, '"second-smallest choice" not found'
log.append('Quantitative Reasoning: substitution now starts at the middle choice, matching Word Problems')

json.dump(pdoc, open(PP,'w'), ensure_ascii=False, indent=2)
json.dump(ldoc, open(LP,'w'), ensure_ascii=False, indent=1)
print('\n'.join(f'  · {x}' for x in log)); print(f'\n{len(log)} reconciliations applied')
