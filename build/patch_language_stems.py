#!/usr/bin/env python3
"""Repair three shipped defects in the question banks.

1. 143 Language items carried an empty stem, so the student saw four sentences and
   no instruction. They are TWO different item types and need opposite directions:
     - 115 items offer "No mistakes" as a fourth choice  -> find the sentence WITH an error
     -  28 Usage items are four versions of one sentence -> pick the CORRECT one
   Applying one blanket stem would invert the second group.

2. Four items the QA pass recorded as dropped are still in the data (three singular
   "they", one "taller than me"). They are style disputes the bank answers
   inconsistently, so they are removed here as the QA pass intended.

Each change asserts on its target first, so the patch fails loudly rather than
silently mangling the wrong question if the data shifts.
"""
import json, sys

SENTINEL = ('no mistakes', 'no errors', 'no mistake', 'none of these')

FIND_THE_ERROR = {
    'Usage':          'Which sentence has a mistake in grammar or usage?',
    'Punctuation':    'Which sentence has a punctuation mistake?',
    'Capitalization': 'Which sentence has a capitalization mistake?',
    'Spelling':       'Which sentence has a spelling mistake?',
}
TAIL = " If all three are correct, choose “No mistakes.”"
PICK_CORRECT = 'Which sentence is written correctly?'

# Style disputes the bank answers inconsistently. See question-bank-qa.md.
DROP = {
    '448b613e0e': 'singular "they" — keyed as an error while other items accept it',
    '460b3132ca': 'singular "they" — keyed as an error while other items accept it',
    '1ea8c5b4aa': 'singular "they" — keyed as an error while other items accept it',
    'c9f82a0fec': '"taller than me" — defensible on traditional rules, universal in speech',
}

def has_sentinel(q):
    return any(o.lower().strip(' .') in SENTINEL for o in q['options'])

def main():
    path = 'data/language.json'
    d = json.load(open(path))
    qs = d['questions']

    before = len(qs)
    dropped = [q for q in qs if q['id'] in DROP]
    assert len(dropped) == 4, f'expected 4 language items to drop, found {len(dropped)}'
    qs = [q for q in qs if q['id'] not in DROP]

    stemmed = 0
    for q in qs:
        if q.get('stem', '').strip():
            continue
        topic = q['topic']
        if has_sentinel(q):
            assert topic in FIND_THE_ERROR, f'unexpected topic with sentinel: {topic}'
            assert q['options'][-1].lower().strip(' .') in SENTINEL, \
                f'{q["id"]}: sentinel is not the last option in the source data'
            q['stem'] = FIND_THE_ERROR[topic] + TAIL
        else:
            assert topic == 'Usage', f'unexpected stemless non-sentinel topic: {topic}'
            q['stem'] = PICK_CORRECT
        stemmed += 1

    assert not [q for q in qs if not q.get('stem', '').strip()], 'stems remain empty'
    d['questions'] = qs
    json.dump(d, open(path, 'w'), indent=2, ensure_ascii=False)
    print(f'language.json: {before} -> {len(qs)} questions, {stemmed} stems added, {len(dropped)} dropped')

    # all four disputed items live in the language bank; verify none stray into verbal
    path = 'data/verbal.json'
    d = json.load(open(path))
    n = len(d['questions'])
    d['questions'] = [q for q in d['questions'] if q['id'] not in DROP]
    if len(d['questions']) != n:
        json.dump(d, open(path, 'w'), indent=2, ensure_ascii=False)
        print(f'verbal.json: {n} -> {len(d["questions"])}')

if __name__ == '__main__':
    main()

def strip_markdown():
    """10 Capitalization items carry raw *asterisks* around book titles. The quiz engine
    escapes HTML, so they render literally as asterisks on screen — noise in an item whose
    whole point is the capitalization of the title."""
    import glob, re
    total = 0
    for path in glob.glob('data/*.json'):
        d = json.load(open(path)); changed = 0
        for q in d['questions']:
            for i, o in enumerate(q['options']):
                new = re.sub(r'\*([^*]+)\*', r'\1', o)
                if new != o: q['options'][i] = new; changed += 1
            for k in ('stem', 'explanation'):
                if k in q and q[k]:
                    new = re.sub(r'\*([^*]+)\*', r'\1', q[k])
                    if new != q[k]: q[k] = new; changed += 1
        if changed:
            json.dump(d, open(path, 'w'), indent=2, ensure_ascii=False)
            print(f'{path}: stripped markdown from {changed} fields')
            total += changed
    return total
