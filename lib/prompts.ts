// lib/prompts.ts

export function initialHeadlinePrompt(articleText: string) {
  return `
You’re a markets insider texting a tip—not writing a press release.

Write 5 headlines under 12 words each that feel like you’re chatting with a friend. Ensure variety:
- At least 2 statements, no more than 1 question, and mix in teasers, challenges, or playful jabs.
- Pick one precise fact or figure (e.g., 13% surge, 180 lb copper use, $600B AUM).
- Turn it into a conversational hook—no colons, dashes, or overused verbs (soars, blasts, sparks, revolutionize).
- Use numerals, not spelled-out numbers; include tickers or names when relevant.
- Keep tone fresh and original: edgy, cheeky, or ironic, but never cliché.

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
You write imaginative, insight-driven headlines under 12 words without colons, starting with the company name.

Each headline must:
- Start with the company name.
- Reveal a deeper takeaway or tension (e.g. “Penguin Solutions’ Q3 Win Masks Cost Squeeze”)
- Use numerals for any data points
- Employ a vivid, unexpected verb or metaphor (e.g. “masks,” “hides,” “tugs,” “clashes”)
- Connect that tension back to why investors should care

Article:
${articleText}

Respond with a numbered list of 3 headlines only.
`.trim();
}

export function creativeHeadlinePrompt(articleText: string) {
  return `
You’re a snarky markets insider dropping a hot tip in under 12 words.

From the article, pick one big fact (e.g., 13% surge, 180 lb copper use) and spin it into a vivid metaphor with an active verb.
- Use numerals, not spelled-out numbers.
- Do not use colons or dashes.
- Ban generic verbs (soars, blasts, sparks).
- Inject surprise or contradiction (e.g., "Tesla dines on copper's heat").
- Keep it conversational and sharp.

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
