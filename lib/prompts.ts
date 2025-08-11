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

Respond with a numbered list of 5 headlines only.

CRITICAL ADDITIONAL RULES:
- Do NOT mention analyst names, firm names, or specific ratings in headlines
- Focus on the business impact, market reaction, or investor implications
- Create original headlines that don't directly copy article content`;
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

CRITICAL ADDITIONAL RULES:
- Do NOT mention analyst names, firm names, or specific ratings in headlines
- Focus on the business impact, market reaction, or investor implications
- Create original headlines that don't directly copy article content
`.trim();
}

export function creativeHeadlinePrompt(articleText: string) {
  return `
You are an expert headline writer for a top-tier financial publication.

Given the following article, generate 3 suspenseful, narrative-style headlines that follow these principles:

1. **Reversal of Fortune**: Highlight an underdog (company, market, or country) once ignored or struggling—but now outperforming.  
2. **Surprise Comparison**: Show that underdog beating a respected benchmark (Nasdaq 100, S&P 500, Big Tech, etc.).  
3. **Vagueness for Curiosity**: Leave the subject unnamed if it adds intrigue (e.g., “The Market Everyone Gave Up On…”).  
4. **Emotive Power Verbs**: Use dynamic verbs like “crushing,” “upending,” “defying,” “toppling,” “surging past.”  
5. **Time Relevance**: Include the current year or relevant timeframe (e.g., “in 2025”) to ground the headline.  
6. **Tension & Contrast**: Emphasize the gap between expectations vs. outcome (e.g., “Everyone wrote it off… now it’s dominating”).  
7. **Optional Framing**: If it fits naturally, pit against known names (e.g., “Outpacing Tesla and Apple combined”).
 
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
