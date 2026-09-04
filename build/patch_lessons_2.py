"""Second repair pass — corrections found by cross-checking our lessons against
the source chapters once their text layers became readable, 4 September 2026.
Only items that make something we already publish wrong are applied here;
additive coverage gaps are recorded in the project doc instead.
"""
import json
P = 'data/lessons.json'
doc = json.load(open(P)); L = doc['lessons']; log = []

# 1. "The difference between a and b." The prose and the table were reconciled the
#    wrong way round in the first pass: on this test the terms are taken in the order
#    named, and the first named is normally the larger, which is why the result comes
#    out positive. Teaching "larger first" silently reverses any stem that names the
#    smaller number first.
t = L['Skills Check 2: Quantitative Skills']['blocks'][6]
assert t['rows'][5][1] == '\\(a - b\\), taking the larger first'
t['rows'][5][1] = '\\(a - b\\)'
log.append('Skills Check 2[6]: difference row restored to order-as-named')

b = L['Skills Check 2: Quantitative Skills']['blocks'][7]
old = ('And <i>the difference between</i> is written large number first, because a difference '
       'on this test is not meant to come out negative.')
assert old in b['text']
b['text'] = b['text'].replace(old,
  'And <i>the difference between</i> takes the two numbers in the order the sentence names them. '
  'On this test the first one named is almost always the larger, which is why a difference here '
  'comes out positive — but follow the sentence, not the expectation.')
log.append('Skills Check 2[7]: difference rule now follows the sentence rather than assuming order')

# 2. A comparison item always has three determinable quantities and four comparison
#    statements. There is no "cannot be compared" choice, so hunting for one is an
#    invitation to a wrong answer.
found = False
for i, blk in enumerate(L['Mathematic Comparisons']['blocks']):
    if blk['type'] in ('ul', 'ol'):
        for j, it in enumerate(blk['items']):
            if 'the two cannot be compared. Check whether a choice says so.' in it:
                blk['items'][j] = it.replace(
                  'If a figure is missing a measurement you would need, the honest answer may be '
                  'that the two cannot be compared. Check whether a choice says so.',
                  'If a figure seems to be missing a measurement you need, you have missed '
                  'something you were given, because every quantity in a comparison item can be '
                  'worked out. Read the figure again rather than looking for a way out.')
                log.append(f'Mathematic Comparisons[{i}] item {j}: removed a non-existent answer choice')
                found = True
assert found, '"cannot be compared" bullet not found'

# 3. The site cannot draw figures, and several comparison item types are figure-based.
#    Say so rather than letting a student assume they have seen them all.
blocks = L['Mathematic Comparisons']['blocks']
ins = next(i for i, b in enumerate(blocks) if b['type'] == 'note')
blocks.insert(ins + 1, {"type": "p", "text":
  "One honest limitation of this page. Several comparison items on the real test are built on a "
  "drawing rather than on numbers: three overlapping figures where you count how many triangles "
  "or rectangles each contains, identical circles with different portions shaded where you rank "
  "the fractions, and a single figure with three labelled parts to put in order. This site cannot "
  "show you those, so practise them in a book that can. The reasoning below is the same reasoning "
  "they need — count the equal parts rather than judging by eye, and use what the figure states "
  "rather than how it looks."})
log.append('Mathematic Comparisons: added a note that figure-based comparison items exist and cannot be shown here')

json.dump(doc, open(P, 'w'), ensure_ascii=False, indent=1)
print('\n'.join(f'  · {x}' for x in log)); print(f'\n{len(log)} repairs applied')
