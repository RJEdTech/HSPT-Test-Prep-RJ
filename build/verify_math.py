#!/usr/bin/env python3
"""
verify_math.py — re-derive the answers to the Mathematics and Quantitative Skills
questions from the questions themselves, and complain when the key does not follow.

    python3 build/verify_math.py            # check both maths banks
    python3 build/verify_math.py -v         # also list what it could not check

Why this exists: a wrong answer key on a maths question is the one defect a reader
cannot catch by eye, and the one that does the most damage to a student. Three of the
five checks below solve the question independently and compare; the other two look for
the structural faults that make a question unanswerable no matter what the key says.

Nothing here is clever. It only handles the question shapes this bank actually uses,
and it says plainly which questions it could not check rather than passing them
silently. Run it after any edit to data/math.json or data/quantitative.json.
"""
import json, re, sys, math, itertools, os
from fractions import Fraction

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = '-v' in sys.argv or '--verbose' in sys.argv

problems, checked, skipped = [], 0, []


def fail(q, msg):
    problems.append(f"{q['id']} [{q['topic']}] {msg}\n      {q['stem'][:100]}")


# ---------------------------------------------------------------- number parsing
def to_num(s):
    """Read a number out of an option or a series term. None if it is not one."""
    if s is None:
        return None
    t = str(s).strip()
    t = re.sub(r'\\[,;:!]', '', t)
    t = t.replace('\\(', '').replace('\\)', '').replace('$', '')
    t = t.replace('\\left', '').replace('\\right', '').replace('\\!', '')
    t = t.replace('−', '-').replace('–', '-').replace(',', '')
    t = t.strip()
    m = re.fullmatch(r'(-?)\\d?frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}', t)      # \frac{a}{b}
    if m:
        v = Fraction(m.group(2)).__float__() / float(m.group(3))
        return -v if m.group(1) else v
    m = re.fullmatch(r'(-?[\d.]+)\s*\\d?frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}', t)   # mixed number
    if m:
        whole = float(m.group(1))
        frac = float(m.group(2)) / float(m.group(3))
        return whole + frac if whole >= 0 else whole - frac
    m = re.fullmatch(r'(-?[\d.]+)\s*/\s*(-?[\d.]+)', t)
    if m:
        return float(m.group(1)) / float(m.group(2))
    m = re.fullmatch(r'(-?[\d.]+)\s*%', t)
    if m:
        return float(m.group(1)) / 100
    m = re.fullmatch(r'-?\d+(?:\.\d+)?', t)
    if m:
        return float(t)
    return None


def latex_to_expr(t):
    """Turn the small subset of LaTeX this bank uses into a Python expression."""
    t = t.replace('\\(', '').replace('\\)', '').replace('\\left', '').replace('\\right', '')
    t = t.replace('\\times', '*').replace('\\cdot', '*').replace('\\div', '/')
    t = t.replace('\\pi', 'math.pi').replace('−', '-').replace('^', '**')
    t = re.sub(r'\\d?frac\{([^{}]+)\}\{([^{}]+)\}', r'((\1)/(\2))', t)
    t = re.sub(r'\\sqrt\{([^{}]+)\}', r'(( \1 )**0.5)', t)
    t = re.sub(r'\\sqrt(\d+)', r'((\1)**0.5)', t)
    t = re.sub(r'(\d)\s*%', r'(\1/100)', t)
    t = t.replace('{', '(').replace('}', ')')
    return t.strip()


def safe_eval(expr):
    if not re.fullmatch(r'[0-9\s\.\+\-\*/\(\)%math\.pi]*', expr) or not expr.strip():
        return None
    if re.search(r'\d\s*\(|\)\s*\(|\)\s*\d', expr):   # implied multiplication we will not guess at
        return None
    try:
        v = eval(expr, {'__builtins__': {}, 'math': math})
        return float(v) if isinstance(v, (int, float)) else None
    except Exception:
        return None


# ------------------------------------------------- 1. compound-relation comparisons
REL = {'equals': '==', 'is equal to': '==', 'is greater than': '>', 'is less than': '<'}


def parse_quantities(stem):
    """Pull 'A. expr B. expr C. expr' out of a comparison stem."""
    body = re.split(r'(?:Choose|Find|Then choose) the best answer\.?', stem)[-1]
    parts = re.split(r'(?:^|\s)([ABC])[.)]\s+', ' ' + body)
    out = {}
    for i in range(1, len(parts) - 1, 2):
        out[parts[i]] = parts[i + 1].strip()
    return out if set(out) == {'A', 'B', 'C'} else None


def option_truth(opt, vals):
    """Evaluate an option like 'A = C and B < A' or the long English form."""
    o = opt.strip().rstrip('.')
    o = re.sub(r'\bthe (?:area|perimeter|value|measure) of\b', '', o, flags=re.I)
    o = re.sub(r'\bangle\b', '', o, flags=re.I)
    for word, sym in REL.items():
        o = re.sub(word, sym, o, flags=re.I)
    o = o.replace('=', '==').replace('>==', '>=').replace('<==', '<=')
    o = o.replace('====', '==').replace('===', '==')
    clauses = re.split(r',?\s+and\s+', o)
    results = []
    for c in clauses:
        c = c.strip()
        m = re.fullmatch(r'([ABC])\s*(==|<|>|<=|>=)\s*([ABC])(?:\s*(==|<|>|<=|>=)\s*([ABC]))?', c)
        if not m:
            return None
        a, op1, b, op2, d = m.groups()
        ok = compare(vals[a], op1, vals[b])
        if op2:
            ok = ok and compare(vals[b], op2, vals[d])
        results.append(ok)
    return all(results) if results else None


def compare(x, op, y):
    eps = 1e-9
    if op == '==': return abs(x - y) < eps
    if op == '<':  return x < y - eps
    if op == '>':  return x > y + eps
    if op == '<=': return x <= y + eps
    if op == '>=': return x >= y - eps
    return False


def check_comparison(q):
    global checked
    qs = parse_quantities(q['stem'])
    if not qs:
        return False
    vals = {}
    for k, v in qs.items():
        n = safe_eval(latex_to_expr(v))
        if n is None:
            return False
        vals[k] = n
    truths = [option_truth(o, vals) for o in q['options']]
    if any(t is None for t in truths):
        return False
    checked += 1
    true_ones = [i for i, t in enumerate(truths) if t]
    if len(true_ones) != 1:
        fail(q, f"{len(true_ones)} of the four options are true (A={vals['A']:g}, B={vals['B']:g}, C={vals['C']:g})")
    elif true_ones[0] != q['answer']:
        fail(q, f"key is {chr(65+q['answer'])} but only {chr(65+true_ones[0])} is true "
                f"(A={vals['A']:g}, B={vals['B']:g}, C={vals['C']:g})")
    return True


# --------------------------------------------------------------- 2. number series
def fit_rule(terms):
    """Return a function giving the next term, for the rules this bank uses."""
    n = len(terms)
    if n < 3:
        return None
    d = [terms[i + 1] - terms[i] for i in range(n - 1)]
    if all(abs(x - d[0]) < 1e-9 for x in d):                       # constant difference
        return lambda seq: seq[-1] + d[0]
    dd = [d[i + 1] - d[i] for i in range(len(d) - 1)]
    if len(dd) >= 2 and all(abs(x - dd[0]) < 1e-9 for x in dd):    # constant second difference
        return lambda seq, dd=dd[0], d=d: seq[-1] + (d[-1] + dd)
    if all(abs(t) > 1e-12 for t in terms[:-1]):
        r = [terms[i + 1] / terms[i] for i in range(n - 1)]
        if all(abs(x - r[0]) < 1e-9 for x in r):                   # constant ratio
            return lambda seq: seq[-1] * r[0]
    # multiply by a, then add b — covers 2,5,11,23,47 (x2+1) and 4,10,28,82 (x3-2)
    if n >= 4 and all(abs(t) > 1e-12 for t in terms[:-1]):
        for a in [x / 2 for x in range(2, 21)]:
            if abs(terms[1] - terms[0]) < 1e-12:
                continue
            b = terms[1] - a * terms[0]
            if all(abs(terms[i + 1] - (a * terms[i] + b)) < 1e-7 for i in range(n - 1)):
                return lambda seq, a=a, b=b: a * seq[-1] + b

    if n >= 5:                                     # two independent strands taking turns
        odd, even = terms[0::2], terms[1::2]
        if len(odd) >= 2 and len(even) >= 2 and fit_simple(odd) and fit_simple(even):
            def nxt(seq):
                strand = seq[0::2] if len(seq) % 2 == 0 else seq[1::2]
                return fit_simple(strand)(strand)
            return nxt
    return None


def fit_simple(t):
    if len(t) < 2:
        return None
    d = [t[i + 1] - t[i] for i in range(len(t) - 1)]
    if all(abs(x - d[0]) < 1e-9 for x in d):
        return lambda s: s[-1] + d[0]
    if all(abs(x) > 1e-12 for x in t[:-1]):
        r = [t[i + 1] / t[i] for i in range(len(t) - 1)]
        if all(abs(x - r[0]) < 1e-9 for x in r):
            return lambda s: s[-1] * r[0]
    return None


TERM = r'(?:-?[\d.]+|_{2,}|___)'

def fill_middle(raw, b):
    """Work out the term at index b, given the rest of the series.

    Tries the whole series as one sequence, and also as two interleaved strands — the
    5a1907cd3b shape (2, 5, 6, 10, 18, __, 54, 40) is two strands, and fitting it as one
    gives the wrong number.
    """
    nums = [to_num(t) for t in raw]

    # (a) two interleaved strands: fit the strand the blank sits in
    if len(raw) >= 6:
        strand_idx = [i for i in range(len(raw)) if i % 2 == b % 2]
        strand = [nums[i] for i in strand_idx]
        pos = strand_idx.index(b)
        known = [v for v in strand if v is not None]
        if len(known) >= 3:
            f = fit_simple(known) or fit_rule(known)
            if f:
                seq = known[:pos] if pos > 0 else None
                if seq and len(seq) >= 2:
                    g = fit_simple(seq) or fit_rule(seq)
                    if g:
                        try:
                            cand = g(seq)
                        except Exception:
                            cand = None
                        # confirm it against the term after the blank in that strand
                        after = strand[pos + 1] if pos + 1 < len(strand) else None
                        if cand is not None and after is not None:
                            chk = fit_simple(seq + [cand])
                            if chk and abs(chk(seq + [cand]) - after) < 1e-7:
                                return cand
                        elif cand is not None and after is None:
                            return cand

    # (b) one sequence: fit on the terms before the blank, confirm with the term after
    pre = [v for v in nums[:b] if v is not None]
    if len(pre) >= 3:
        f = fit_rule(pre)
        if f:
            try:
                cand = f(pre)
            except Exception:
                return None
            after = nums[b + 1] if b + 1 < len(nums) else None
            if after is None:
                return cand
            g = fit_rule(pre + [cand])
            if g:
                try:
                    if abs(g(pre + [cand]) - after) < 1e-7:
                        return cand
                except Exception:
                    pass
    return None


SERIES_RE = re.compile(rf'((?:{TERM})(?:\s*,\s*(?:{TERM})){{3,}})')


def extract_series(stem):
    """Find the longest comma-separated run of numbers and blanks anywhere in the stem.

    Stems are phrased a dozen different ways ("Look at this series:", "What comes next in
    the sequence:", "In the sequence 1, 4, 13, 40, what comes next?"), so match the run of
    terms itself rather than the wording around it."""
    best = None
    for m in SERIES_RE.finditer(stem.replace('\u2026', '...')):
        run = m.group(1)
        if best is None or len(run) > len(best):
            best = run
    return best


def consistent(seq):
    """True if the completed run follows a single rule, or two interleaved ones."""
    if len(seq) < 4:
        return False
    d = [seq[i + 1] - seq[i] for i in range(len(seq) - 1)]
    if all(abs(x - d[0]) < 1e-7 for x in d):
        return True
    dd = [d[i + 1] - d[i] for i in range(len(d) - 1)]
    if len(dd) >= 2 and all(abs(x - dd[0]) < 1e-7 for x in dd):
        return True
    if all(abs(t) > 1e-12 for t in seq[:-1]):
        r = [seq[i + 1] / seq[i] for i in range(len(seq) - 1)]
        if all(abs(x - r[0]) < 1e-7 for x in r):
            return True
    if all(abs(t) > 1e-12 for t in seq[:-1]):
        for a in [x / 2 for x in range(2, 21)] + [-2.0, -1.0, 0.5]:
            b = seq[1] - a * seq[0]
            if all(abs(seq[i + 1] - (a * seq[i] + b)) < 1e-7 for i in range(len(seq) - 1)):
                return True
    # each term is the sum of the two before it
    if len(seq) >= 5 and all(abs(seq[i] + seq[i + 1] - seq[i + 2]) < 1e-7 for i in range(len(seq) - 2)):
        return True
    # the multiplier itself grows by a fixed step: 3, 6, 18, 72 is x2, x3, x4
    if len(seq) >= 4 and all(abs(t) > 1e-12 for t in seq[:-1]):
        mult = [seq[i + 1] / seq[i] for i in range(len(seq) - 1)]
        gaps = [mult[i + 1] - mult[i] for i in range(len(mult) - 1)]
        if len(gaps) >= 2 and all(abs(g - gaps[0]) < 1e-7 for g in gaps):
            return True
    if len(seq) >= 6:
        odd, even = seq[0::2], seq[1::2]
        if len(odd) >= 3 and len(even) >= 3 and simple_ok(odd) and simple_ok(even):
            return True
    # three strands taking turns
    if len(seq) >= 9:
        strands = [seq[i::3] for i in range(3)]
        if all(len(st) >= 3 and simple_ok(st) for st in strands):
            return True
    # the gaps themselves follow a growing pattern one level deeper: 3, 4, 8, 17, 33, 58
    # has gaps 1, 4, 9, 16, 25 - the square numbers - which shows up as a constant third
    # difference. Six terms make this two equations against one unknown, so it stays tight.
    if len(seq) >= 6:
        d1 = [seq[i + 1] - seq[i] for i in range(len(seq) - 1)]
        d2 = [d1[i + 1] - d1[i] for i in range(len(d1) - 1)]
        d3 = [d2[i + 1] - d2[i] for i in range(len(d2) - 1)]
        if len(d3) >= 2 and all(abs(x - d3[0]) < 1e-7 for x in d3):
            return True
    # each term is the square of the one before it: 2, 4, 16, 256
    if len(seq) >= 3 and all(abs(seq[i] ** 2 - seq[i + 1]) < 1e-7 for i in range(len(seq) - 1)):
        return True
    # alternating operations: one rule on the odd steps, another on the even steps.
    # Covers 2, 4, 7, 14, 17, 34, 37 — times two, then add three, repeating.
    if len(seq) >= 5:
        for phase in (0, 1):
            steps_a = [(seq[i], seq[i + 1]) for i in range(len(seq) - 1) if i % 2 == phase]
            steps_b = [(seq[i], seq[i + 1]) for i in range(len(seq) - 1) if i % 2 != phase]
            if len(steps_a) >= 2 and len(steps_b) >= 2 and op_fits(steps_a) and op_fits(steps_b):
                return True
    return False


def op_fits(pairs):
    """True if one 'add k' or 'times k' rule takes x to y for every pair."""
    diffs = [y - x for x, y in pairs]
    if all(abs(d - diffs[0]) < 1e-7 for d in diffs):
        return True
    if all(abs(x) > 1e-12 for x, _ in pairs):
        rs = [y / x for x, y in pairs]
        return all(abs(r - rs[0]) < 1e-7 for r in rs)
    return False


def simple_ok(t):
    if len(t) < 3:
        return False
    d = [t[i + 1] - t[i] for i in range(len(t) - 1)]
    if all(abs(x - d[0]) < 1e-7 for x in d):
        return True
    if all(abs(x) > 1e-12 for x in t[:-1]):
        r = [t[i + 1] / t[i] for i in range(len(t) - 1)]
        if all(abs(x - r[0]) < 1e-7 for x in r):
            return True
    dd = [d[i + 1] - d[i] for i in range(len(d) - 1)]
    return len(dd) >= 2 and all(abs(x - dd[0]) < 1e-7 for x in dd)


def check_series(q):
    """Fill the blank with each option in turn and keep the ones that leave a consistent series.

    This works wherever the blank sits — first, middle or last — and it never has to guess
    which rule the author intended: a wrong option almost always breaks the pattern, and if
    two options both leave it consistent the question is ambiguous and gets reported.
    """
    global checked
    if 'two terms' in q['stem'].lower() or 'two numbers' in q['stem'].lower():
        return False
    run = extract_series(q['stem'])
    if not run:
        return False
    raw = [t.strip().rstrip('.') if re.fullmatch(r'-?\d+\.', t.strip()) else t.strip()
           for t in run.split(',') if t.strip() and t.strip() != '...']
    blanks = [i for i, t in enumerate(raw) if '_' in t]
    if len(blanks) > 1:
        return False
    if not blanks:
        if 'next' not in q['stem'].lower() and '...' not in q['stem']:
            return False
        raw.append('___')
        blanks = [len(raw) - 1]
    b = blanks[0]
    nums = [None if i == b else to_num(t) for i, t in enumerate(raw)]
    if any(v is None for i, v in enumerate(nums) if i != b):
        return False
    if len(nums) - 1 < 4:
        return False
    vals = [to_num(o) for o in q['options']]
    if any(v is None for v in vals):
        return False

    checked += 1
    works = []
    for i, v in enumerate(vals):
        trial = list(nums)
        trial[b] = v
        if consistent(trial):
            works.append(i)
    if not works:
        fail(q, f"no option leaves {raw} following a rule this checker recognises")
    elif len(works) > 1:
        fail(q, "more than one option leaves the series consistent, so it has two answers: "
                + ", ".join(f"{chr(65+i)}={vals[i]:g}" for i in works))
    elif works[0] != q['answer']:
        fail(q, f"key is {chr(65+q['answer'])}={vals[q['answer']]:g}, but only "
                f"{chr(65+works[0])}={vals[works[0]]:g} leaves the series consistent")
    return True


# ---------------------------------------------------- 3. geometric comparison figures
DIM = re.compile(r'(?:radius|side|wide|tall|long|high|base|height)\s+(?:of\s+)?([\d.]+)\s*cm', re.I)


def check_figure(q):
    """Read the aria-label, work out each figure, and test the compound options."""
    global checked
    fig = q.get('figure')
    if not fig:
        return False
    aria = re.search(r'aria-label="([^"]+)"', fig)
    if not aria:
        fail(q, "figure has no aria-label, so it is unreadable with a screen reader")
        return True
    txt = aria.group(1)
    want_area = 'area' in q['options'][0].lower()
    want_per = 'perimeter' in q['options'][0].lower()
    if not (want_area or want_per):
        return False
    vals = {}
    for letter in 'ABC':
        m = re.search(rf'Figure {letter} is an? ([^.]+)\.', txt)
        if not m:
            return False
        v = shape_value(m.group(1), want_area)
        if v is None:
            return False
        vals[letter] = v
    truths = [option_truth(o, vals) for o in q['options']]
    if any(t is None for t in truths):
        return False
    checked += 1
    true_ones = [i for i, t in enumerate(truths) if t]
    if len(true_ones) != 1:
        fail(q, f"{len(true_ones)} options are true from the figure labels "
                f"(A={vals['A']:.2f}, B={vals['B']:.2f}, C={vals['C']:.2f})")
    elif true_ones[0] != q['answer']:
        fail(q, f"key is {chr(65+q['answer'])} but the labels make {chr(65+true_ones[0])} the true one "
                f"(A={vals['A']:.2f}, B={vals['B']:.2f}, C={vals['C']:.2f})")
    return True


def shape_value(desc, area):
    d = desc.lower()
    nums = [float(x) for x in re.findall(r'([\d.]+)\s*cm', d)]
    if 'circle' in d and len(nums) == 1:
        r = nums[0]
        return math.pi * r * r if area else 2 * math.pi * r
    if 'square' in d and len(nums) >= 1:
        s = nums[0]
        return s * s if area else 4 * s
    if 'rectangle' in d and len(nums) >= 2:
        w, h = nums[0], nums[1]
        return w * h if area else 2 * (w + h)
    if 'triangle' in d and len(nums) >= 2 and area and ('base' in d and 'height' in d):
        return 0.5 * nums[0] * nums[1]
    return None


# --------------------------------------------------- 4. options that collide in value
# Questions that ask for a different FORM of the same number — lowest terms, another way to
# write it — offer options of equal value on purpose. Equal values are the point there.
SAME_VALUE_OK = re.compile(r'lowest terms|another way to write|equivalent to|equal to', re.I)


def check_duplicate_values(q):
    if SAME_VALUE_OK.search(q['stem']):
        return
    vals = [to_num(o) for o in q['options']]
    seen = {}
    for i, v in enumerate(vals):
        if v is None:
            continue
        for j, w in seen.items():
            if abs(v - w) < 1e-9:
                fail(q, f"options {chr(65+j)} and {chr(65+i)} are the same number ({v:g}), "
                        f"so one of them can never be chosen")
        seen[i] = v


# ------------------------------------------------------------- 5. structural checks
def check_structure(q):
    o = q['options']
    if len(set(o)) != len(o):
        fail(q, "two options are identical")
    if not isinstance(q['answer'], int) or not 0 <= q['answer'] < len(o):
        fail(q, "answer index is out of range")
    if not q.get('explanation'):
        fail(q, "no explanation, so a student who misses it learns nothing")
    blob = q['stem'] + ''.join(o) + q.get('explanation', '')
    if blob.count('\\(') != blob.count('\\)'):
        fail(q, "unbalanced \\( \\) — the maths will not render")
    # The site renders \( \) only, so a bare $ is currency and is left alone. What does
    # break is a $ *inside* a maths span, where it must be escaped as \$.
    for seg in re.findall(r'\\\((.*?)\\\)', blob, re.S):
        if re.search(r'(?<!\\)\$', seg):
            fail(q, f"unescaped $ inside a maths span: {seg[:40]}")


# ------------------------------------------------------------------------- run it
def main():
    global skipped
    for name in ('math', 'quantitative'):
        path = os.path.join(ROOT, 'data', f'{name}.json')
        bank = json.load(open(path))
        print(f"\n{name}.json — {len(bank['questions'])} questions")
        for q in bank['questions']:
            check_structure(q)
            check_duplicate_values(q)
            done = check_comparison(q) or check_series(q) or check_figure(q)
            if not done:
                skipped.append(f"{q['id']} [{q['topic']}] {q['stem'][:70]}")

    print(f"\n{'='*70}")
    print(f"solved independently and compared against the key: {checked}")
    print(f"structure and duplicate-value checks: every question")
    print(f"not machine-solvable, so read by a person instead: {len(skipped)}")
    if V:
        for s in skipped:
            print("   " + s)
    else:
        print("   (run with -v to list them)")
    print(f"{'='*70}")
    if problems:
        print(f"\n{len(problems)} PROBLEMS\n")
        for p in problems:
            print("  - " + p)
        return 1
    print("\nNo problems found.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
