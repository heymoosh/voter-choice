# AI Advice Requires Requested Judgment

**Learning from the Claude Code blueprint detour.**

The model does not reliably bring judgment out of the gate. It often answers the request as stated, especially when the request asks for something comprehensive, production-ready, strategic, or expert-shaped.

If I do not explicitly say that I lack domain judgment, the model may assume I know what I am asking for. It may treat my framing as valid and optimize inside that frame, instead of challenging whether the frame fits my actual situation.

## Core Lesson

Do not ask AI for "the best plan." Ask it to help make a good decision under my actual constraints.

Most bad AI advice is not obviously false. It is often true but mis-scoped:

- enterprise advice for a solo builder
- mature-team advice for a greenfield project
- production advice for a hackathon prototype
- comprehensive advice when I need the minimum useful version
- aspirational advice when I need a reversible next step

The missing step is fit.

## The Pattern

Separate four things:

1. **Goal** — what am I actually trying to make true?
2. **Context** — what stage, constraints, resources, skill level, risks, and timeline matter?
3. **Advice** — what are the possible strategies?
4. **Fit** — which advice applies to my context now?

AI often does fine on #3. The danger is #4. It may not aggressively test whether the advice fits unless asked.

## Why I Got Led Astray

I wanted Claude Code to build responsibly: verified behavior, privacy, security, evals, less rework. Those were valid goals.

But the advice engine converted those goals into a comprehensive automation/control system. It used the right nouns — CI, OWASP, evals, release gates, routines, architecture drift — so it sounded expert.

The failure was not that those concerns were fake. The failure was sequencing and fit. I needed a lean control system for a solo hackathon builder, not a simulated production software organization.

## The Important Self-Disclosure

When I lack expertise, I should tell the model directly:

> I may be too naive to know whether this advice fits my situation. Do not assume I know what I am asking for. Challenge the premise before answering.

If I do not disclose that, the model may assume:

- I understand the tradeoffs.
- I know the maturity level of the advice.
- I can distinguish useful from overbuilt.
- I am asking for implementation because I already made the right strategic decision.

Those assumptions can be wrong.

## Universal Prompt

```text
I may be too naive to know whether this advice fits my situation.

Act as a skeptical expert. Do not optimize for comprehensiveness. Optimize for fit.

Context:
- My goal:
- My constraints:
- My current stage:
- My resources:
- My risk tolerance:
- My time horizon:
- What I am considering:

Tasks:
1. Challenge the premise.
2. Identify hidden assumptions.
3. Separate advice into:
   - Do now
   - Do later
   - Do only if X becomes true
   - Do not do
4. For each recommendation, explain:
   - What problem it solves
   - What evidence I have that this problem exists now
   - Cost/downsides
   - Failure mode
   - Smallest reversible version
5. Tell me what a naive person would likely misunderstand.
```

## The Key Table

Use this for business, engineering, life, productivity, strategy, and major decisions:

```md
| Advice | Problem it solves | Evidence I have this problem now | Cost | Failure mode | Reversible first step | Do now/later/drop |
| ------ | ----------------- | -------------------------------- | ---- | ------------ | --------------------- | ----------------- |
```

If "evidence I have this problem now" is weak, the advice is probably later, not now.

## Watch For AI Failure Modes

### Comprehensive-List Trap

I ask what matters. The model gives everything that could matter.

### Best-Practice Laundering

Generic best practices get presented as if they fit my context.

### Maturity Mismatch

Advice for a large company, expert, or stable system gets applied to an early-stage person/project.

### Aspirational Overbuild

The model designs the system for who I want to become, not who I am this week.

### Action Bias

The model produces things to do, even when the best move is to decide, observe, simplify, or stop.

### Vocabulary Seduction

The advice uses serious nouns, so it feels serious: strategy, governance, metrics, architecture, scaling, optimization.

### No Opportunity-Cost Accounting

It recommends good things without asking what they displace.

## Good Advice Has This Shape

Good advice usually says:

- Given your current stage...
- The bottleneck is probably...
- Do not do X yet...
- Start with the smallest version of Y...
- This becomes worth doing when Z signal appears...
- The failure mode is...
- Here is how to know if it is working...

Bad advice often says:

- Here is a comprehensive framework...
- Best practices are...
- You need a system for...
- Set up all these categories...
- Automate everything...
- Optimize across these dimensions...

## Better Default Ask

```text
Give me the smallest useful next step, the trigger for the next stage, and the signs I should stop.
```

This prevents a lot of damage.

## Use AI As A Decision Harness, Not An Oracle

When I lack judgment:

1. Generate options.
2. Ask for objections.
3. Ask what does not apply.
4. Ask for the smallest reversible test.
5. Ask what evidence would change the recommendation.
6. Decide only after the model has argued against itself.

## Domain Translation

Engineering: ask for a skeptical staff engineer.

Business: ask for a skeptical operator/investor.

Life/productivity: ask for a wise coach who will challenge fit, not generate routines.

Health/legal/finance: ask for domain-grounded caution and professional escalation.

The role changes, but the pattern is the same:

> Do not just answer my question. First check whether I am asking the right question for my situation.

## Meta-Rule

Advice is only good relative to a situation. Make the model prove fit before letting it plan.
