// lib/prompts.ts

export function initialHeadlinePrompt(articleText: string) {
  return `
You write bold, engaging headlines that grab attention.

Create 5 unique headlines under 12 words each. Use sharp, active verbs and concrete details:
- Include one specific detail per headline (e.g., ALRG, 0.28%, $600B AUM, launch date).
- Use numerals (e.g., 3, not three).
- Vary styles: statement, question, metaphor, warning, “X stakes rise as Y shifts,” etc.
- Inject urgency or surprise (e.g., “bets,” “crushes,” “abrupt,” “edge”).
- Avoid generic hype; favor vivid, unexpected word choices.
- Highlight the twist: actively managed, tax-free income, model edge.

Article:
${articleText}

Respond with a numbered list of 5 headlines only.`;
}

// alias for backward compatibility
export const headlinePrompt = initialHeadlinePrompt;

export function punchyHeadlinePrompt(articleText: string) {
  return `
You write bold, punchy headlines under 10 words.

Based on the article, write 3 headlines:
- One urgent question (e.g., “Can ALRG beat the ETF crowd?”).
- One strong statement (e.g., “ASCE crushes growth stocks”).
- One metaphor or warning (e.g., “AUSM is your safe haven bomb”).

Use:
- Numerals and tickers (ALRG, ASCE, AUSM).
- Sharp verbs (bets, surges, defies).
- One detail each (expense ratio, model name, AUM).
- Surprise or stakes-driven tone.

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function noColonHeadlinePrompt(articleText: string) {
  return `
You write gripping headlines under 12 words without colons.

Create 3 headlines that:
- Use numerals and tickers.
- Highlight a surprising fact (0.18% ratio, $600B AUM).
- Evoke urgency or intrigue with active verbs.

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function creativeHeadlinePrompt(articleText: string) {
  return `
You write standout headlines under 12 words.

Draft 3 creative headlines that:
- Use vivid metaphors or unexpected twists.
- Reference a concrete detail (launch, fund name, AUM).
- Show why this matters now (rate drop, tax-free edge).

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function similarHeadlinePrompt(headline: string, articleText: string) {
  return `
You write sharp, aligned headlines.

Given the original, produce 3 alternatives that:
- Mirror its style and tone.
- Use numerals and one article detail.
- Maintain urgency and clarity.

Original Headline:
"${headline}"

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function seoHeadlinePrompt(headline: string) {
  return `
You are an SEO pro.

Turn the headline into a clear, SEO-ready title under 8 words:
- Use the main ticker or figure.
- Include a compelling verb or hook.

Original Headline:
"${headline}"

Respond with the optimized headline only.`;
}
