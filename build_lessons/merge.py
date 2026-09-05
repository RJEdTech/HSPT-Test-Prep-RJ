import json, re, collections

ORDER = [
 ("Verbal Skills", "verbal", ["Synonyms","Antonyms","Analogies","Classification","Verbal Logic"]),
 ("Quantitative Skills", "quant", ["Number Series","Letter Series","Comparisons","Geometric Comparison","Number Manipulation"]),
 ("Reading", "reading", ["Reading Comprehension","Vocabulary in Context"]),
 ("Mathematics", "math", ["Number Sense","Fractions, Decimals and Percents","Ratios and Proportions","Computation","Algebra","Geometry and Measurement","Data and Probability","Word Problems"]),
 ("Language Skills", "language", ["Capitalization","Punctuation","Usage","Spelling","Composition"]),
]

src = {}
for f in ["verbal","quant","reading","math","language"]:
    src.update(json.load(open(f"build_lessons/{f}.json")))

# The site renders maths with \( \) delimiters. Lessons were authored with $ … $.
# Convert, respecting escaped \$ (used for currency inside a maths span).
MATH = re.compile(r'\$((?:\\.|[^\\$])*?)\$')
def conv(s):
    return MATH.sub(lambda m: '\\(' + m.group(1) + '\\)', s)

def walk(o):
    if isinstance(o, str):  return conv(o)
    if isinstance(o, list): return [walk(x) for x in o]
    if isinstance(o, dict): return {k: walk(v) for k, v in o.items()}
    return o

ALLOWED = {"p","h","ul","ol","table","note","example"}
order, lessons, problems = [], {}, []
for label, key, topics in ORDER:
    for t in topics:
        if t not in src:
            problems.append(f"MISSING lesson {t}"); continue
        L = walk(src[t])
        L["section"] = key
        L.setdefault("sectionLabel", label)
        for b in L["blocks"]:
            if b["type"] not in ALLOWED:
                problems.append(f"{t}: bad block type {b['type']}")
            if b["type"] == "example":
                if not isinstance(b.get("answer"), int) or not (0 <= b["answer"] < len(b["options"])):
                    problems.append(f"{t}: answer index out of range")
                if len(set(b["options"])) != len(b["options"]):
                    problems.append(f"{t}: duplicate options")
        order.append(t); lessons[t] = L

json.dump({"order": order, "lessons": lessons}, open("data/lessons.json","w"),
          ensure_ascii=False, indent=1)

ex = sum(1 for t in order for b in lessons[t]["blocks"] if b["type"]=="example")
words = sum(len(json.dumps(lessons[t]).split()) for t in order)
print(f"{len(order)} lessons, {ex} worked examples, ~{words:,} tokens of JSON")
print("blocks:", collections.Counter(b['type'] for t in order for b in lessons[t]['blocks']))
print("PROBLEMS:", problems or "none")
