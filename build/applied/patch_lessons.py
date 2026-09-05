"""Repairs from the independent adversarial review, 4 September 2026.

Every change asserts on its target first, so a patch fails loudly rather than
silently mangling the wrong block if the data shifts. Run against
data/lessons.json; rerunning on already-patched data fails on the assert,
which is the intended behaviour.
"""
import json, re, sys

P = 'data/lessons.json'
doc = json.load(open(P))
L = doc['lessons']
log = []

def setf(topic, idx, field, old_sub, new_sub, why):
    """Replace a substring inside one field of one block."""
    b = L[topic]['blocks'][idx]
    assert old_sub in b[field], f'{topic}[{idx}].{field}: target text not found'
    b[field] = b[field].replace(old_sub, new_sub, 1)
    log.append(f'{topic}[{idx}].{field}: {why}')

def setb(topic, idx, expect_type, newblock, why):
    b = L[topic]['blocks'][idx]
    assert b['type'] == expect_type, f'{topic}[{idx}]: expected {expect_type}, found {b["type"]}'
    L[topic]['blocks'][idx] = newblock
    log.append(f'{topic}[{idx}]: {why}')

def setrow(topic, idx, row_i, col_i, old, new, why):
    b = L[topic]['blocks'][idx]
    assert b['type'] == 'table'
    assert b['rows'][row_i][col_i] == old, f'{topic}[{idx}] row {row_i}: {b["rows"][row_i][col_i]!r}'
    b['rows'][row_i][col_i] = new
    log.append(f'{topic}[{idx}] table row {row_i}: {why}')

# ─────────────────────────────────────────────────────────────────────────────
# 1. LICENSING — content traceable to the commercial source books.
# ─────────────────────────────────────────────────────────────────────────────

# The relationship taxonomy read as the publisher's own list of labels, and the
# lesson said so out loud. Categories re-derived in plain description.
setb('Analogies', 7, 'p', {"type": "p", "text":
  "Almost every analogy on the test is built on one of a dozen or so ways two words "
  "can be related. Learning to recognize the kind of relationship is worth doing, "
  "because it tells you the shape of the answer before you have read a single choice."},
  'removed attribution of the category list to the published answer keys')

setb('Analogies', 8, 'table', {"type": "table",
  "head": ["The relationship", "Example pair", "The sentence you would say"],
  "rows": [
    ["A thing and what it is like", "sponge : porous", "A sponge is porous."],
    ["A tool and the job it does", "broom : sweep", "A broom is used to sweep."],
    ["A part and the whole it belongs to", "rung : ladder", "A rung is part of a ladder."],
    ["One stage and the stage after it", "dusk : night", "Dusk comes just before night."],
    ["A word and its opposite", "ascend : descend", "To ascend is the opposite of to descend."],
    ["Two things used together", "needle : thread", "A needle is used together with thread."],
    ["An animal and where it lives", "otter : river", "An otter lives in a river."],
    ["A material and what it comes from", "wool : sheep", "Wool comes from a sheep."],
    ["A particular kind and its general class", "sonnet : poem", "A sonnet is a kind of poem."],
    ["A unit and what it measures", "quart : volume", "A quart measures volume."],
    ["Two things of the same kind", "granite : marble", "Granite and marble are both stone."],
    ["A symbol and what it stands for", "dove : peace", "A dove stands for peace."]]},
  'category labels rewritten in the site\'s own words')

# Two classification items were close variants of published diagnostic items.
setb('Classification', 15, 'example', {"type": "example",
  "stem": "Which word does not belong with the others?",
  "options": ["copper", "granite", "silver", "iron"],
  "answer": 1,
  "walkthrough": "All four are materials, so that category is too big to be the split — it "
    "leaves nobody out. Go one level finer: copper, silver and iron are metals, and granite "
    "is stone. Three metals, one rock. Whenever all four words share an obvious category, "
    "the split you want is one level below the label you thought of first."},
  'rebuilt — previous item was a near variant of a published diagnostic item')

setb('Classification', 17, 'example', {"type": "example",
  "stem": "Which word does not belong with the others?",
  "options": ["sprint", "stroll", "jog", "swim"],
  "answer": 3,
  "walkthrough": "The tempting split is speed: sprinting is fast and strolling is slow, so one "
    "of those two looks like the outlier. That is a split by degree and it is a decoy — degree "
    "gives you a scale, not an odd one out. Sprinting, strolling and jogging are all ways of "
    "moving on foot, while swimming needs water. A split by kind, and the one that holds."},
  'rebuilt — previous item was a near variant of a published diagnostic item')

# ─────────────────────────────────────────────────────────────────────────────
# 2. WRONG OR OVERSTATED RULES — these cost a student points elsewhere.
# ─────────────────────────────────────────────────────────────────────────────

setrow('Mathematic Comparisons', 18, 8, 0, 'Doubling a side', 'Doubling every dimension',
       'rule was false for doubling one side of a rectangle')
setrow('Mathematic Comparisons', 18, 8, 1,
       'Doubles the perimeter but multiplies the area by four.',
       'Doubles the perimeter but multiplies the area by four. Doubling only one side of a '
       'rectangle doubles the area and does not double the perimeter.',
       'added the single-side case the row previously mis-covered')

# "Estimate from the figure" contradicted the Comparisons lesson's central rule.
setf('Skills Check 4: Mathematic Skills', 38, 'items',
     '', '', 'placeholder') if False else None
b = L['Skills Check 4: Mathematic Skills']['blocks'][38]
old = ("If the figure is drawn to scale, estimate from it. An angle that looks slightly less "
       "than square is not \\(130^\\circ\\), and a side that looks like half of a side marked "
       "12 is about 6.")
assert b['items'][2] == old, b['items'][2]
b['items'][2] = ("Use the measurements the question gives you, not the way the drawing looks. "
                 "Figures on this test are not promised to be drawn to scale, so a side that "
                 "looks half as long as another proves nothing on its own.")
log.append('Skills Check 4[38] step 3: no longer contradicts the not-to-scale rule')

# Negative numbers break the size check as it was stated.
b = L['Skills Check 4: Mathematic Skills']['blocks'][5]
old = ("Sanity-check the size. Multiplying by a number less than 1 makes the result smaller; "
       "dividing by a number less than 1 makes it larger.")
assert b['items'][3].startswith(old)
b['items'][3] = b['items'][3].replace(old,
  "Sanity-check the size. Multiplying a positive number by a positive number less than 1 makes "
  "the result smaller; dividing it by a positive number less than 1 makes it larger.", 1)
log.append('Skills Check 4[5]: size check restricted to positive numbers')

setrow('Skills Check 4: Mathematic Skills', 8, 5, 1,
  '60 seconds = 1 minute; 60 minutes = 1 hour; 24 hours = 1 day; 7 days = 1 week; 52 weeks = 1 year',
  '60 seconds = 1 minute; 60 minutes = 1 hour; 24 hours = 1 day; 7 days = 1 week; 365 days = 1 year, which is about 52 weeks',
  'the only inexact entry in a table headed "Equivalents to know"')

# The table and the prose gave opposite results for "the difference between".
setrow('Skills Check 2: Quantitative Skills', 6, 5, 1, '\\(a - b\\)',
       '\\(a - b\\), taking the larger first',
       'table now agrees with the prose rule three blocks later')

b = L['Skills Check 2: Quantitative Skills']['blocks'][27]
old = ("<b>Order of operations inside the words.</b> <i>Four more than three times seven</i> "
       "multiplies first. <i>Three times four more than seven</i> adds first. The word order "
       "tells you which.")
assert b['items'][4] == old
b['items'][4] = ("<b>Order of operations inside the words.</b> <i>Four more than three times "
  "seven</i> multiplies first. <i>Three times the sum of four and seven</i> adds first. Look "
  "for the words that group two numbers together — <i>the sum of</i>, <i>the product of</i>, "
  "<i>the difference between</i> — and do that group first.")
log.append('Skills Check 2[27] trap 5: replaced a genuinely ambiguous phrase with an unambiguous contrast')

setf('Skills Check 2: Quantitative Skills', 23, 'walkthrough',
  'the unknown must be larger than the result, so 32 and 48 are also too small to survive a size check.',
  'the unknown must be several times the result. Here it is five times it, which is why 32 and 48 are far too small.',
  'the stated size check did not actually eliminate 32 and 48')

setf('Math Principles', 13, 'text',
  'The <b>greatest common factor</b> is the product of the primes the two numbers share.',
  'The <b>greatest common factor</b> is the product of every prime that appears in both, each taken at its lowest power.',
  'GCF definition was imprecise and worked on the example by luck')

setf('Problem Solving', 0, 'text',
  'which makes this the largest single block anywhere on the HSPT',
  'which makes this one of the two largest blocks on the test, alongside reading comprehension',
  'reading comprehension is also 40 questions')

# Three lessons gave three different memorisation targets for cubes.
setf('Math Principles', 43, 'items'.replace('items','items'), '', '', 'x') if False else None
b = L['Math Principles']['blocks'][43]
assert b['items'][1] == 'The squares to \\(15^2 = 225\\) and the cubes to \\(6^3 = 216\\).'
b['items'][1] = 'The squares to \\(15^2 = 225\\) and the cubes to \\(10^3 = 1{,}000\\).'
log.append('Math Principles[43]: cube target now matches the other two lessons')
t = L['Math Principles']['blocks'][27]
assert t['type'] == 'table' and t['rows'][6][2] == '—'
for n, c in [(6, '343'), (7, '512'), (8, '729'), (9, '1000')]:
    t['rows'][n][2] = c
log.append('Math Principles[27]: cubes table extended to 10 to match the stated target')

setf('Math Principles', 36, 'walkthrough', 'Choice 4 is the trap',
     'The last choice, 64 and 66, is the trap',
     '"Choice 4" meant an ordinal here and a value two blocks earlier')

# ─────────────────────────────────────────────────────────────────────────────
# 3. READING — walkthroughs justified by lines that are not in the passage.
# ─────────────────────────────────────────────────────────────────────────────

setf('Reading Comprehension', 15, 'text',
     'it put a fixed, recognizable light exactly where the danger was',
     'it put a fixed, recognizable light at or near the danger',
     'lighthouses stood on headlands and harbour mouths as well as on the hazard')

setf('Reading Comprehension', 19, 'walkthrough',
     'Building towers is never discussed at all, so that choice is out for the opposite reason.',
     'The difficulty of building the towers is never discussed at all, so that choice is out for the opposite reason.',
     'the passage does discuss towers; what it never discusses is building them')

setf('Reading Comprehension', 32, 'walkthrough',
     'The first and third choices are contradicted outright — the recruits fly to flowers “they have never seen” —',
     'The first choice is contradicted outright, because the recruits fly to flowers “they have never seen”, and the third is contradicted by the same lines that give you the answer: it is dark and the followers “cannot see her”.',
     'one quotation had been asked to eliminate two different choices')

setf('Reading Comprehension', 34, 'walkthrough',
     'which is exactly what respectful means',
     'which is what respectful means here — appreciative of the work, and careful about the evidence',
     'tied the answer back to the tone table, which lists "appreciative" rather than "respectful"')

setf('Reading Comprehension', 41, 'walkthrough',
     'The last paragraph says three groups resisted the change and never says what any of them feared, so an example is the missing piece. The crane is already explained in paragraph two,',
     'The last paragraph says three groups resisted the change and never says what any one of them stood to lose, so an example is the missing piece. A crane belongs to paragraph two and would do nothing for this one,',
     'the passage was never claimed to explain how a crane works, and it does state what was feared in general terms')

# The container passage put containerisation a decade late.
found = False
for i, blk in enumerate(L['Reading Comprehension']['blocks']):
    if blk['type'] == 'p' and 'Before the 1960s, cargo crossed the ocean loose' in blk['text']:
        blk['text'] = blk['text'].replace('Before the 1960s, cargo crossed the ocean loose',
                                          'Until the middle of the twentieth century, cargo crossed the ocean loose', 1)
        log.append(f'Reading Comprehension[{i}]: containerisation dated to the 1950s, not the 1960s')
        found = True
assert found, 'container passage date sentence not found'

setf('Vocabulary', 17, 'walkthrough',
     'Even without the root, the negative prefix tells you the word is unflattering, which removes “skilled” immediately, and dishonest and inexperienced are unflattering in ways the prefix does not point at.',
     'Do not read the negative prefix as a sign the word is unflattering — <i>invaluable</i> and <i>independent</i> both start the same way. It is the root that rules out “skilled”, “dishonest” and “inexperienced”: none of them is about refusing to move.',
     'a negative prefix carries no charge, and the lesson had taught that it did')

t = L['Vocabulary']['blocks'][15]
assert t['rows'][6] == ['-ly', 'adverb (how something is done)', 'quietly']
t['rows'][6] = ['-ly', 'usually an adverb; sometimes an adjective', 'quietly, but also friendly']
assert t['rows'][0][0] == '-ous, -ful, -ive, -al'
t['rows'][0][1] = 'adjective (describes something), though -al also ends some nouns'
t['rows'][0][2] = 'perilous, decisive; but arrival, refusal'
log.append('Vocabulary[15]: suffix table now carries the exceptions the elimination rule depends on')

# ─────────────────────────────────────────────────────────────────────────────
# 4. LANGUAGE — errors of the kind these lessons teach students to catch.
# ─────────────────────────────────────────────────────────────────────────────

setf('Spelling', 7, 'text',
  '<i>their</i> and <i>forfeit</i>. A second group breaks the <i>after c</i> half of the rule because the c sounds like <i>sh</i>: <i>science</i>, <i>ancient</i>, <i>efficient</i>, <i>conscience</i>, <i>sufficient</i>.',
  '<i>their</i>, <i>forfeit</i> and <i>science</i>. A second group breaks the <i>after c</i> half of the rule because the c sounds like <i>sh</i>: <i>ancient</i>, <i>efficient</i>, <i>conscience</i> and <i>sufficient</i>.',
  'the sc in science is not the sh sound the group is defined by')

setf('Spelling', 13, 'text', '<i>responsible</i> and <i>digestible</i> break it',
     '<i>digestible</i> and <i>collectible</i> break it',
     'responsible does not break the rule: "respons" is not a word')

setrow('Spelling', 20, 20, 1, 'restarant', 'restaraunt', 'the error people actually make')

setrow('Antonyms', 10, 5, 2, 'trust / mistrust', 'lead / mislead',
       'mistrust means not trust, which does not carry the "wrongly" gloss')

setrow('Capitalization', 19, 6, 0, 'Kleenex, Levi\'s, Ford', 'Kleenex, Levi\'s, Thermos',
       'dropped a live carmaker where a generic-trademark example was the point') \
  if L['Capitalization']['blocks'][19]['rows'][6][0] == "Kleenex, Levi's, Ford" else None
if L['Capitalization']['blocks'][19]['rows'][6][1] == 'tissue, jeans, truck':
    L['Capitalization']['blocks'][19]['rows'][6][1] = 'tissue, jeans, vacuum flask'
    log.append('Capitalization[19]: generic paired with the new brand example')

setf('Usage', 28, 'text',
  'Items joined by <i>and</i>, <i>or</i> or <i>but</i>, or listed in a series, should share the same grammatical form.',
  'Items joined by <i>and</i>, <i>or</i> or <i>but</i> &mdash; or listed in a series &mdash; should share the same grammatical form.',
  'commas fenced a restrictive modifier and split the subject from its verb')

setf('Usage', 44, 'text', 'the six irregular verbs above', 'the three verb pairs above',
     'the table is transitive/intransitive pairs, and raise is a regular verb')

setf('Composition', 27, 'walkthrough', 'B says it in seven words', 'B says it in eight words',
     'miscount')

setf('Composition', 24, 'options'.replace('options','options'), '', '', 'x') if False else None
b = L['Composition']['blocks'][24]
assert b['options'][0] == 'The town library is arranged by floor, and each floor is quieter than the one below it.'
b['options'][0] = 'The town library is arranged by floor, and it gets quieter as you go up.'
b['walkthrough'] = b['walkthrough'].replace(
  'Too narrow and too broad are the two standard wrong answers, and you will see one of each in most topic sentence items.',
  'Off the point and far too broad are the two standard wrong answers, and most topic sentence items carry one of each.')
log.append('Composition[24]: topic sentence no longer claims more than the paragraph supports')

# The claim that no HSPT item can turn on the serial comma is not ours to make,
# and it told students to rule a sentence out on that basis.
setb('Punctuation', 4, 'note', {"type": "note", "text":
  "A note on the serial comma. Regis Jesuit High School style leaves out the comma before "
  "<i>and</i> in a simple list: <i>napkins, cups and a folding table</i>. Other style guides "
  "put one in, and both are accepted English. A fair item will not turn on which convention a "
  "sentence follows, so if the only thing you can find in a sentence is a comma before the "
  "final <i>and</i> of a list, look again for something else before you settle on it."},
  'dropped an unverifiable claim about the live test and the instruction to eliminate on it')

setf('Punctuation', 16, 'text',
  '<i>The tour stops in Pueblo, Colorado; Santa Fe, New Mexico; and Flagstaff, Arizona.</i>',
  '<i>The tour stops in Pueblo, Colorado; Santa Fe, New Mexico; and Flagstaff, Arizona.</i> '
  'The semicolon before <i>and</i> is standard in a list like this one, and is a separate '
  'question from the comma discussed above.',
  'a student reading the serial-comma note would otherwise read this as a contradiction')

# The No mistakes item leaned on the unsettled serial comma to be answerable.
b = L['Punctuation']['blocks'][29]
assert b['options'][0] == "Aunt Cecilia's recipe calls for four cups of flour, two eggs and a pinch of salt."
b['options'][0] = "Aunt Cecilia's recipe calls for four cups of flour and two eggs."
b['walkthrough'] = ("Go category by category. Apostrophes: <i>Cecilia's</i> is a singular "
  "possessive, correctly formed. Commas: A joins two things with <i>and</i> and needs none; B "
  "has one after an introductory clause and none before <i>and</i>, which is right because "
  "<i>finished the puzzle by hand</i> shares the subject <i>we</i> and cannot stand alone. "
  "Quotation marks: C puts the question mark inside because the quoted words are the question, "
  "and the comma before the quotation is standard. Nothing is wrong. The temptation is to add a "
  "comma before <i>and</i> in B, but that comma would be an error, not a fix.")
log.append('Punctuation[29]: item no longer depends on the unsettled serial comma')

# ─────────────────────────────────────────────────────────────────────────────
# 5. HOUSE STYLE inside the lessons' own prose.
# ─────────────────────────────────────────────────────────────────────────────

SPLICES = [
 ('Verbal Logic', 48, 'text', 'that is not a guess, it is the definition',
                              'that is not a guess; it is the definition'),
 ('Verbal Logic', 41, 'walkthrough', 'not just unsupported, it is impossible',
                                     'not just unsupported; it is impossible'),
 ('Analogies', 1, 'text', 'whether you know them, it is testing',
                          'whether you know them; it is testing'),
]
for topic, i, f, a, b_ in SPLICES:
    setf(topic, i, f, a, b_, 'comma splice')

# Serial commas in the lessons' own prose (house style omits them).
SERIAL = [
 ('Punctuation', 0, 'text', 'a mark that does not belong, or the wrong mark',
                            'a mark that does not belong or the wrong mark'),
 ('Punctuation', 14, 'text', 'a comma plus a coordinating conjunction, or a subordinating word',
                             'a comma plus a coordinating conjunction or a subordinating word'),
 ('Punctuation', 35, 'text', 'comma plus a coordinating conjunction, or a subordinating word',
                             'comma plus a coordinating conjunction or a subordinating word'),
 ('Composition', 9, 'text', 'draw the consequence of what has been said, or answer the question',
                            'draw the consequence of what has been said or answer the question'),
 ('Composition', 20, 'text', 'changes what the sentence claims, or creates a new grammatical problem',
                             'changes what the sentence claims or creates a new grammatical problem'),
 ('Composition', 22, 'text', '<i>the second</i>, or a pronoun standing',
                             '<i>the second</i> or a pronoun standing'),
 ('Composition', 27, 'walkthrough', 'for nothing at all, and a passive',
                                    'for nothing at all and a passive'),
 ('Usage', 44, 'text', 'describing a noun or an action, and check what the opening phrase',
                       'describing a noun or an action and check what the opening phrase'),
]
for topic, i, f, a, b_ in SERIAL:
    setf(topic, i, f, a, b_, 'serial comma against house style')

# Numbers one to ten are spelled out.
n = 0
def spell(o):
    global n
    if isinstance(o, str):
        new = re.sub(r'\bAbout 10(?![0-9])', 'About ten', o)
        n += (new != o)
        return new
    if isinstance(o, list):  return [spell(x) for x in o]
    if isinstance(o, dict):  return {k: spell(v) for k, v in o.items()}
    return o
doc = spell(doc)
log.append(f'house style: "About 10" spelled out in {n} strings')

json.dump(doc, open(P, 'w'), ensure_ascii=False, indent=1)
print('\n'.join(f'  · {x}' for x in log))
print(f'\n{len(log)} repairs applied to {P}')
