# Spent migrations — history, not build steps

Everything in this folder has **already been applied** to `data/`. None of it is part of building
or deploying the site. It lives here because it is the record of *why* particular published text
reads the way it does — which matters most for the licensing repairs, where the answer to "why did
this lesson change?" is one you would want to be able to produce.

Nothing here should be run again. All of it was applied on **4 September 2026**.

The one script still meant to be run is `build/check_provenance.py`, one level up.

## What each one did

Grouped by what it touched. Where the docstrings state an order, it is noted; otherwise these are
not a sequence to replay.

### Against `data/lessons.json`

| Script | What it did | Guarded? |
|---|---|---|
| `patch_lessons.py` | First repair pass, from an independent adversarial review. Includes the **licensing repairs** — places where lesson content was still traceable to the commercial source books, most notably a relationship taxonomy that read as the publisher's own list of labels and said so out loud. | Yes — asserts on every target |
| `patch_lessons_2.py` | Second pass, from cross-checking against the source chapters once their text layers became readable. Only items that made something already published *wrong*. | Yes |
| `patch_reconcile.py` | Reconciled the short primers above each drill with the full lessons behind them, where an independent pass found the two telling a student different things. | Yes |

**Why there are two `patch_lessons` files:** the second one fixes a mistake the first one made. Its
first item corrects the "difference between *a* and *b*" rule, which pass one reconciled the wrong
way round — teaching "larger first" would have silently reversed any stem that names the smaller
number first. Pass two restored "take the numbers in the order the sentence names them."

### Against the question banks

| Script | What it did | Guarded? |
|---|---|---|
| `apply_explanations.py` | Merged the written explanations into the banks. Before it ran, 67 of 524 questions (13%) carried an explanation and all of them were math — so for verbal, language and reading the site's promise that reading the explanations *is* the studying was empty. | Needs `build/exp/_merged.json`, which is not in the repo — so it cannot run |
| `patch_language_stems.py` | Repaired 143 Language items shipped with an empty stem. Two different item types needing opposite instructions, which is why one blanket stem would have inverted the second group. | Yes |
| `patch_explanations.py` | Three bank explanations that contradicted the lessons. | Yes |
| `patch_abc_explanations.py` | Two defects around the letters A/B/C — nine "Examine A, B and C" comparison items that computed the quantities but never stated the comparison. | **NO — see below** |

## ⚠️ `patch_abc_explanations.py` has no guard

Every other script here asserts on its target first, so re-running one aborts and writes nothing.
This one does not. Run against already-patched data it **succeeds and silently mutates the banks
again**. Verified on 4 Sept 2026: a rerun against a clean checkout modified `data/`, with no error
and no warning.

It has been applied. Do not run it. If it ever needs to be re-derived, add an assert on its targets
first.

## Verified spent

Each script here was run once against a clean copy of `data/` on 4 Sept 2026 to establish which are
safe. Six aborted on their own asserts or a missing input, writing nothing.
`patch_abc_explanations.py` was the exception, as above; the test data was discarded and `data/`
confirmed byte-identical to the published copy afterwards.
