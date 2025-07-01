export function headlinePrompt(articleText: string) {
    return `
  You are a headline editor for a high-traffic financial news site. Based on the article below, write 3 suspenseful, emotionally engaging, and click-worthy headlines. Each headline should:
  
  - Tease a surprising development or turning point without revealing the full outcome
  - Spark curiosity by raising a question, highlighting conflict, or implying big implications
  - Use strong action verbs (e.g. “slams,” “soars,” “warns,” “backs”)
  - Be under 12 words and easy to read on mobile
  - Include stock tickers or company names only when helpful for SEO or clarity
  - Avoid excessive jargon unless it adds intrigue (e.g. “AI,” “valuation,” “recession,” “DevOps”)
  - Mirror the tone of top headlines on CNBC, Bloomberg, or Fortune
  
  Important: Base your headlines strictly on the article content. Don’t speculate or introduce facts not in the source.
  
  Article:
  ${articleText}
  
  Respond with a numbered list of 3 headlines only.
  `.trim();
  }
  
  export function punchyHeadlinePrompt(articleText: string) {
    return `
  You are a headline editor for a high-traffic financial news site. Based on the article below, write 3 highly clicky and punchy headlines that grab immediate attention. Each headline should:
  
  - Be even more emotionally engaging and suspenseful than usual
  - Use strong action verbs and vivid language
  - Be short and snappy, under 10 words
  - Avoid jargon unless it adds intrigue
  - Include stock tickers or company names only when helpful for SEO or clarity
  - Mirror the tone of viral headlines on CNBC, Bloomberg, or Fortune
  
  Important: Base your headlines strictly on the article content. Don’t speculate or introduce facts not in the source.
  
  Article:
  ${articleText}
  
  Respond with a numbered list of 3 headlines only.
  `.trim();
  }
  
  export function noColonHeadlinePrompt(articleText: string) {
    return `
  You are a headline editor for a high-traffic financial news site. Based on the article below, write 3 suspenseful, emotionally engaging, and click-worthy headlines. Do NOT use colons or punctuation that separates clauses. Vary the headline styles to include questions, statements, and unique formats.
  
  Article:
  ${articleText}
  
  Respond with a numbered list of 3 headlines only.
  `.trim();
  }
  
  export function creativeHeadlinePrompt(articleText: string) {
    return `
  You are a headline editor for a high-traffic financial news site. Based on the article below, write 3 creative and unique headlines that stand out. Use metaphors, intriguing questions, or unexpected phrasing. Be suspenseful and emotionally engaging.
  
  Article:
  ${articleText}
  
  Respond with a numbered list of 3 headlines only.
  `.trim();
  }
  
  export function similarHeadlinePrompt(headline: string, articleText: string) {
    return `
  You are a headline editor for a high-traffic financial news site.
  
  Based on the article text below and the headline provided, generate 3 alternative headlines that:
  
  - Are similar in style and topic to the given headline
  - Are strictly based on facts and information contained in the article text
  - Do NOT include any information not present in the article
  - Avoid speculation or introducing new ideas
  - Maintain suspense and emotional engagement appropriate for financial news headlines
  
  Headline:
  "${headline}"
  
  Article:
  ${articleText}
  
  Respond with a numbered list of 3 headlines only.
  `.trim();
  }
  
  export function seoHeadlinePrompt(headline: string) {
    return `
  You are an SEO expert creating headlines for a financial news website. Based on the headline below, generate 1 SEO-optimized headline no longer than 8 words, clear and compelling for search engines:
  
  "${headline}"
  
  Respond with the SEO headline only, no explanation.
  `.trim();
  }
  