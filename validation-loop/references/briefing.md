# Briefing do revisor

```text
Review only. Do not edit, commit, push, comment externally, or delegate.
<briefing header from review-scope: repo, base, scope and the git commands>
Intent: <expected behavior>. Out of scope: <limits>.
User decisions (do not reopen): <decisions already taken by the user>.
Instructions: <applicable profile and repository constraints, plus the `implementation` criteria the change touches (types, external data validation, effects at the edges)>. Local verification: <results and limitations>.
Security checklist: <applicable shared checks and environment constraints, when the security pass applies>.
Read surrounding code and callers. Find concrete bugs, regressions and unnecessary complexity.
When a finding is one instance of a pattern, name the class and list the other instances in scope, labeling old ones pre-existing.
Flag comments, docs and agent instructions (AGENTS.md, CLAUDE.md, skills) that the change makes stale.
Skip style. Recommend the smallest complete correction.
Prioritize by impact and plausible trigger; rare security or data-loss cases may block.
blocker = unsafe or broken intended behavior. should = actionable correctness or regression issue in this change. nit = optional.
pre-existing = real issue the change did not introduce; it never blocks. If the change makes an old issue reachable or worse, classify it by the change.
Reply: VERDICT: APPROVE (also when only nits or pre-existing findings remain) or CHANGES
R1 [blocker|should|nit|pre-existing] file:line — claim, trigger, impact, evidence. Fix: suggestion.
Use stable IDs and state verification limitations.
```
