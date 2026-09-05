"""Three bank explanations that contradicted the lessons, 4 September 2026."""
import json
P = 'data/language.json'
doc = json.load(open(P)); log = []
by = {q['id']: q for q in doc['questions']}

def fix(qid, old, new, why):
    q = by[qid]
    assert old in q['explanation'], f'{qid}: target not found'
    q['explanation'] = q['explanation'].replace(old, new, 1)
    log.append(f'{qid}: {why}')

# The site's house style omits the serial comma and the Punctuation lesson says so.
# This explanation modelled the opposite in the very sentence it held up as correct.
fix('c3510bffb9',
    'so it should read "Paris, London, and Berlin."',
    'so it should read "Paris, London and Berlin."',
    'model sentence used the serial comma the house style omits')

# "It's" contracts "it has" as well as "it is". Teaching "always" makes the read-it-aloud
# test fail on a sentence like "it\'s been raining".
fix('8fec40e25f',
    'The word "it\'s" always means "it is,"',
    'The word "it\'s" is short for "it is" or "it has," never a possessive,',
    'it\'s also contracts "it has"')
fix('aad21d5035',
    '"it\'s" always means "it is,"',
    '"it\'s" is short for "it is" or "it has,"',
    'it\'s also contracts "it has"')

json.dump(doc, open(P, 'w'), ensure_ascii=False, indent=1)
print('\n'.join(f'  · {x}' for x in log)); print(f'\n{len(log)} explanations corrected')
