#!/usr/bin/env python3
"""Merge the written explanations into the question banks, and act on the defects the
review pass surfaced while writing them.

Before this ran, 67 of 524 questions (13%) carried an explanation and all of them were
math. The site's practice mode is built to show an explanation after each answer, and the
front page tells students that reading them is the actual studying - so for verbal,
language and reading that promise was empty.

Two kinds of repair are applied alongside the merge:

  KEY ERRORS (2) - classification items where the keyed outlier is not the outlier.
  DROPPED (15)   - items that cannot be repaired without rewriting them: broken analogies,
                   items with two equally defensible answers, duplicates, and style
                   disputes the bank answers inconsistently. Notably one punctuation item
                   keyed the absence of a serial comma as an error, which contradicts the
                   RJHS stylebook the rest of this site follows.

Every change asserts on its target first, so the patch fails loudly rather than silently
mangling the wrong question if the data shifts.
"""
import json, glob, sys

MERGED = 'build/exp/_merged.json'

# Classification items whose keyed outlier is wrong. (id, expected current key, correct option text)
REKEY = {
    '6754d9b2b4': ('Ocean', 'Mountain'),   # river, lake and ocean are all bodies of water
    'b61326fa92': ('Spoon', 'Bowl'),       # knife, fork and spoon are the utensils
}

DROP = {
    # broken items
    '552e7cfd1e': 'analogy is inconsistent: key:lock is object-to-what-it-operates, button:shirt is part-to-whole',
    '2e13fcb00e': 'the stem word "tall" is repeated as one of the options',
    'ec319dd660': 'two defensible outliers - boat (only water vehicle) and bicycle (only one with no engine)',
    'da39657651': 'asks for a concluding sentence; the keyed option adds a new benefit instead of closing',
    '8a688c6f30': 'two options carry the same error - a question ending in a period inside the quotes',
    'e560160e52': '"not canceled" and "not delayed" both complete the sentence',
    '4a5bfaf929': 'two options are equally concise, and it contradicts 4bafd2da28 on the same point',
    # style disputes the bank answers inconsistently
    'f5f5d39a2b': 'turns on singular "their", which this site has removed elsewhere',
    '964d4c7580': '"different than" is standard American English',
    '632fddab29': '"quicker" is a standard adverb in major American dictionaries',
    '6a99177656': 'usage guides disagree on whether the verb follows "one" or "people"',
    '3654ba011f': 'keys the missing serial comma as an error - the RJHS stylebook omits the serial comma',
    '0658fb3c4d': '"the Louvre" is itself the proper name, so lowercase "museum" is defensible',
    # duplicates of an identical item elsewhere in the bank
    '34d396467c': 'duplicate of 65f3137257 ("a perilous journey")',
    'cc56994743': 'duplicate of 811855739f ("a fleeting moment")',
}

def main():
    exp = json.load(open(MERGED))['explanations']
    print(f'{len(exp)} explanations to merge')

    applied = dropped = rekeyed = 0
    seen = set()

    for path in sorted(glob.glob('data/*.json')):
        d = json.load(open(path))
        qs = d['questions']
        before = len(qs)

        for q in list(qs):
            if q['id'] in REKEY:
                want_from, want_to = REKEY[q['id']]
                assert q['options'][q['answer']] == want_from, \
                    f'{q["id"]}: expected current key {want_from!r}, found {q["options"][q["answer"]]!r}'
                assert want_to in q['options'], f'{q["id"]}: {want_to!r} not among the options'
                q['answer'] = q['options'].index(want_to)
                rekeyed += 1

        qs = [q for q in qs if q['id'] not in DROP]
        dropped += before - len(qs)

        for q in qs:
            if q['id'] in exp and not q.get('explanation', '').strip():
                q['explanation'] = exp[q['id']].strip()
                applied += 1
            seen.add(q['id'])

        d['questions'] = qs
        json.dump(d, open(path, 'w'), indent=2, ensure_ascii=False)

    unused = set(exp) - seen
    print(f'{applied} explanations applied, {rekeyed} keys repaired, {dropped} questions dropped')
    print(f'{len(unused)} explanations belonged to dropped questions')
    assert dropped == len(DROP), f'expected to drop {len(DROP)}, dropped {dropped}'
    assert rekeyed == len(REKEY), f'expected to rekey {len(REKEY)}, rekeyed {rekeyed}'

if __name__ == '__main__':
    main()
