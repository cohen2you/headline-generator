// lib/prompts.ts

export function initialHeadlinePrompt(articleText: string) {
  return `
You’re a markets insider texting a tip—not scripting a press release. Write 5 **unique** headlines (under 15 words each), **each in a different format**:

1. **Question**: Pose an urgent question about the key event or risk.  
2. **Statement–But**: State the main fact, then contrast with a “but” clause.  
3. **How/Why**: Begin with “How” or “Why” to explain the impact.  
4. **Metaphor/Action**: Use a vivid metaphor or action verb to dramatize the shift.  
5. **Number/List**: Open with a number or list style (e.g. “3 Reasons …”).

**Rules for all headlines**  
- Start with the full company name (no “Inc.” or tickers)  
- Focus on the single biggest investor takeaway (acquisition, upgrade/downgrade, pivot, cost/revenue impact, valuation risk)  
- Use plain, everyday language—no jargon  
- Use numerals for any data points  
- Sparingly use an em-dash or colon for suspense  
- End with a clear kicker phrase if it adds punch (e.g. “…but Analysts Remain Wary”)

Article: 
${articleText}

Respond with a numbered list of 5 headlines only.`;
}

// alias for backward compatibility
export const headlinePrompt = initialHeadlinePrompt;

export function punchyHeadlinePrompt(articleText: string) {
  return `
You’re a markets insider texting a tip—write 3 punchy headlines (each under 12 words) in three **distinct** formats. **Do not use colons** or dashes in any headline.

Article:
${articleText}

1. **Question**  
   Pose a tight, urgent question about the core event or risk (e.g. “Will CoreWeave’s deal survive cost pressure?”)

2. **Statement But**  
   Make a bold statement then add but for tension (e.g. “CoreWeave wins big but investors stay cautious”)

3. **Action Metaphor**  
   Use a vivid verb or metaphor to dramatize the shift (e.g. “CoreWeave rides a cost wave with warning undercurrents”)

**Rules for all headlines**  
- Start with the full company name (no “Inc.” or tickers)  
- Use clear, everyday language—no jargon  
- Include one core takeaway (acquisition, downgrade, pivot, cost impact)  
- Use numerals for any figures  
- End with a quick hook or twist if it adds punch (e.g. “…but questions linger”)

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
