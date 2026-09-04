#!/usr/bin/env python3
"""
Two defects in the answer explanations, both about the letters A/B/C.

1. Nine "Examine A, B, and C" comparison items computed the three quantities
   but never stated the comparison, so a student who got one wrong saw three
   lines of arithmetic and had to finish the reasoning themselves. Each now
   ends with the conclusion, and each quantity gets its own line.

2. One item ("Answer choice C shows...") cited an OPTION letter. Options are
   shuffled on every render, so that letter was wrong most of the time.
   Rewritten to name the rule instead of a position.
"""
import json, sys

NEW = {
  '60d212d097':
    "A) 25% of 80 = 20\n"
    "B) 40% of 50 = 20\n"
    "C) 30% of 60 = 18\n"
    "A and B both come to 20, so A = B. C is the odd one out at 18.",

  '893bb5b80a':
    "A) \\(\\sqrt{64}+\\sqrt{36}=8+6=14\\)\n"
    "B) \\(\\sqrt{144}=12\\)\n"
    "C) \\(2\\sqrt{49}=2\\left(7\\right)=14\\)\n"
    "A and C are both 14 and B is 12, so A = C and A is greater than B. Take the "
    "square roots one at a time in A: \\(\\sqrt{64}+\\sqrt{36}\\) is 14, not \\(\\sqrt{100}\\).",

  'e6e5739deb':
    "A. \\(3^4=81\\)\n"
    "B. \\(4^3=64\\)\n"
    "C. \\(3\\times4=12\\)\n"
    "81 is bigger than 64, which is bigger than 12, so C is less than B and B is less "
    "than A. The trap is reading \\(3^4\\) and \\(4^3\\) as the same thing — they are not.",

  'e3b6e7b307':
    "A. \\(6\\left(4+2\\right)=6\\times6=36\\)\n"
    "B. \\(\\left(4+2\\right)^2=6^2=36\\)\n"
    "C. \\(\\left(6\\times4\\right)+2=24+2=26\\)\n"
    "A and B are both 36 and C is 26, so C is less than A and B. Work inside the "
    "parentheses first in every one.",

  '24be35e43f':
    "A. \\(0.03\\times10^3=30\\)\n"
    "B. \\(0.003\\times10^4=30\\)\n"
    "C. \\(0.3\\times10^2=30\\)\n"
    "All three come to 30, so A = B = C. Each time the decimal moves right by the "
    "power of ten.",

  'e689d572ee':
    "A. \\(2\\div\\frac{1}{10}\\div5=20\\div5=4\\)\n"
    "B. \\(2\\div\\left(\\frac{1}{10}\\div5\\right)=2\\div\\frac{1}{50}=100\\)\n"
    "C. \\(\\left(2\\div\\frac{1}{10}\\right)\\div5=20\\div5=4\\)\n"
    "A and C are both 4 and B is 100, so A = C and both are less than B. The "
    "parentheses in B change which division happens first, and that changes everything.",

  'a5a165994d':
    "A. \\(\\left(7-3\\right)^2=4^2=16\\)\n"
    "B. \\(7^2-3^2=49-9=40\\)\n"
    "C. \\(\\left(3-7\\right)^2=\\left(-4\\right)^2=16\\)\n"
    "A and C are both 16 and B is 40, so A = C and both are less than B. Squaring a "
    "negative gives a positive, which is why C matches A.",

  'f0cd50c3e2':
    "A. \\(6\\times10^2=600\\)\n"
    "B. \\(\\frac{6}{10}=0.60\\)\n"
    "C. \\(0.60\\)\n"
    "B and C are both 0.60, so B is equal to C. A is 600, nowhere near either.",

  '2c30cc9b0b':
    "A. Four times the square of 4: \\(4\\cdot4^2=4\\times16=64\\)\n"
    "B. Half the cube of 4: \\(\\frac{1}{2}\\left(4^3\\right)=\\frac{1}{2}\\left(64\\right)=32\\)\n"
    "C. Twice the cube of 3: \\(2\\cdot3^3=2\\times27=54\\)\n"
    "64 is bigger than 54, which is bigger than 32, so A is greater than C and C is "
    "greater than B.",

  '86aef55eeb':
    "The distributive property says the multiplier outside the parentheses has to reach "
    "every term inside: \\(a\\left(x+b\\right)=a\\left(x\\right)+ab\\). Only one of the four "
    "does that. \\(a\\left(x+b\\right)=ax+b\\) drops the \\(a\\) off the second term, and "
    "division does not distribute over addition at all.",
}

path = 'data/math.json'
data = json.load(open(path))
found = set()

def walk(o):
    if isinstance(o, dict):
        if o.get('id') in NEW:
            o['explanation'] = NEW[o['id']]
            found.add(o['id'])
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)

walk(data)

missing = set(NEW) - found
if missing:
    sys.exit(f'ERROR: ids not found in {path}: {sorted(missing)}')

json.dump(data, open(path, 'w'), ensure_ascii=False, indent=2)
print(f'Rewrote {len(found)} explanations in {path}')
