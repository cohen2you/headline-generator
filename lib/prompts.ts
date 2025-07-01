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
  
  export function similarHeadlinePrompt(headline: string) {
    return `
  Generate 3 alternative headlines similar in style and topic to the following headline:
  
  "${headline}"
  
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
  