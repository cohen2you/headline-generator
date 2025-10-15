// lib/prompts.ts

export function initialHeadlinePrompt(articleText: string) {
  return `
You are a financial journalist writing attention-grabbing, hooky headlines that make readers want to click.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 5 headlines - no more, no less
- Each headline must be under 12 words
- Create attention-grabbing openings that hint at the story without revealing everything
- Pose questions or present surprising angles that make readers want to discover more
- Use vivid, specific language that grabs attention
- Include specific numbers in only ONE headline per set
- Focus on what's really at stake or what's surprising about this story
- Make each headline feel urgent and compelling
- MANDATORY: Start at least 2 headlines with the key company name or person
- MANDATORY: Start at least 1 headline with a broader market/industry angle

HEADLINE STYLES TO CHOOSE FROM:
1. **Competitive Threat**: How this makes the company dangerous to rivals
2. **Market Disruption**: How this changes the entire industry landscape
3. **Stakes**: What's really at risk or up for grabs here?
4. **Insider Knowledge**: What do industry insiders know that others don't?
5. **Hidden Impact**: The real story behind the headlines
6. **Breaking News**: What just broke or what's about to break?
7. **Bold Claim**: Make a dramatic statement about competitive advantage
8. **Strategic Move**: What broader strategy does this reveal?
9. **Industry Shift**: How this reflects broader industry changes?
10. **Risk/Reward**: What are the stakes or opportunities involved?

EXAMPLES OF HOOKY HEADLINES:
- "Palantir Just Broke Below 50-Day Average—Is It Time To Buy The Dip?"
- "Wall Street Braces For Tech Carnage: 'Disaster' QQQ Options Tell The Story"
- "Fed's Goolsbee Shows Anxiety As Inflation Hits Non-Tariff Items"
- "Producer Inflation Shocks Markets–These 10 Stocks Took The Biggest Hit"
- "Enphase Gets Early Jump On EU Cybersecurity Deadline—Rivals Face 2025 Race"
- "The Cybersecurity Rule That Could Reshape An Entire Industry"
- "Enphase Beats EU Cybersecurity Deadline By 18 Months—Competitive Advantage Ahead"
- "The $50 Million Deal That Could Reshape Renewable Energy"
- "Solar Companies Face Cybersecurity Deadline—Enphase Already Compliant"
- "Europe's Energy Grid Faces New Threat From Unsecured Solar Systems"
- "The Hidden Stakes Behind Enphase's European Push"
- "Why This Cybersecurity Move Could Force Competitors Out Of Europe"
- "Kite Pharma Just Snapped Up Interius—Why Rivals Should Be Terrified"
- "Gilead's $350 Million Bet: Could It Disrupt Cancer Treatment Forever?"
- "Interius BioTherapeutics Faces Pivotal FDA Changes—What's Really At Stake?"
- "The Acquisition That Could Reshape Cancer Treatment"
- "Why This $350 Million Deal Changes Everything"
- "The FDA Decision That Could Make Or Break This Company"
- "This Acquisition Just Changed The Cancer Treatment Game"
- "The Hidden Stakes Behind This $350 Million Deal"
- "Why This Company Just Became A Major Threat"
- "The FDA Move That Could Reshape An Industry"

HEADLINE STRUCTURE REQUIREMENTS:
- At least 2 headlines must start with the key company name or person
- At least 1 headline should start with a broader market/industry angle
- Use strong action verbs after the company name: "Just," "Secures," "Faces," "Braces," "Shows," etc.

HEADLINE FOCUS:
- Focus on what the story MEANS, not just what it SAYS
- Emphasize implications, trends, and broader significance
- Include specific numbers in only ONE headline per set
- Use the other headlines to explore different angles and perspectives
- Ask "so what?" - what does this mean for investors, markets, or the industry?
- Look for the most compelling angle: competitive advantage, market disruption, strategic positioning, or industry transformation
- Find the "hook" that makes this story significant beyond just the facts

CRITICAL: Make headlines that make readers WANT to click. Ask yourself:
- What's really at stake here?
- Why should anyone care about this story?
- What's the most dramatic or surprising angle?
- What's the competitive or market impact?
- What's the broader significance beyond just the company?

AVOID: Generic news headlines that just report facts
AIM FOR: Headlines that reveal stakes, drama, or competitive dynamics

AVOID:
- Question headlines that start with "What," "How," "Why," "Is," etc.
- Generic news headlines that just report facts
- Boring, straightforward statements
- Headlines that don't create curiosity or urgency
- Language that sounds like a press release
- Formal, academic language
- Headlines that sound like they're from a business textbook
- Overly polite or diplomatic language

AIM FOR:
- Direct, punchy statements that grab attention immediately
- Action-oriented language that shows what just happened or is happening
- Market-focused angles that show impact on stocks, competitors, or industries
- Use strong action verbs and immediate impact language
- Make it feel like breaking news or insider information
- Focus on what's changing, threatening, or emerging
- Use dashes and colons for dramatic effect when appropriate
- Sound like market commentary or financial news
- Add real perspective and insight—not just reporting facts
- Use dramatic, emotional language that shows stakes and urgency
- Make bold claims about competitive dynamics and market impact
- Sound like someone with insider knowledge sharing a hot tip

VARY YOUR LANGUAGE - USE DIFFERENT PHRASES:
- Instead of "terrified" use: "worried," "concerned," "nervous," "anxious," "fearful"
- Instead of "disrupt" use: "reshape," "transform," "revolutionize," "change," "alter"
- Instead of "forever" use: "completely," "entirely," "fundamentally," "dramatically"
- Instead of "at stake" use: "on the line," "in jeopardy," "up for grabs," "in question"
- Instead of "major threat" use: "serious challenge," "significant risk," "real danger"
- Instead of "changes everything" use: "shifts the landscape," "alters the game," "redefines the market"

CRITICAL ACCURACY REQUIREMENTS:
- Headlines must be factually accurate to the article content
- Don't overstate competitive advantages or market impact
- If a company is "first" or "ahead," specify the context (deadline, timeline, etc.)
- If something is "threatening," explain what's actually at stake
- Avoid claiming someone is "the leader" unless the article explicitly states this
- Be specific about timing, deadlines, and competitive positioning
- Don't dramatize beyond what the facts support

DIVERSITY REQUIREMENTS:
- Each headline must use completely different language and structure
- Avoid repeating the same phrases across multiple headlines
- Use different action verbs for each headline
- Vary the emotional intensity and tone
- Mix different headline structures (statement, question, contrast, etc.)
- Don't use the same ending phrases like "Should Be Terrified" or "Changes Everything"

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
You are a financial journalist writing clean, analytical headlines. Generate 3 compelling headlines (each under 10 words) that capture the core story.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 10 words
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Include specific numbers in only ONE headline per set
- Start with the company name or key entity
- Focus on implications and meaning, not just facts

HEADLINE APPROACHES:
1. **Stakes**: What's really at risk or up for grabs?
2. **Drama**: What's the most surprising or dramatic angle?
3. **Competitive Threat**: How does this threaten or advantage rivals?

EXAMPLES OF GOOD HEADLINES:
- "New York's Office Boom Stands Alone As Most US Cities Stay Remote"
- "Tesla Faces Growing Competition In Electric Vehicle Market"
- "Federal Reserve Signals Potential Rate Cuts Ahead"

AVOID:
- Colons, dashes, or excessive punctuation
- Dramatic verbs like "sparks," "ignites," "plummets," "soars"
- Multiple data points crammed together
- Sensational or clickbait language

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function noColonHeadlinePrompt(articleText: string) {
  return `
You are a financial journalist writing clean, analytical headlines. Generate 3 compelling headlines (under 12 words each) that capture the core story.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 12 words
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Use numerals for any data points
- Start with the company name or key entity

HEADLINE APPROACHES:
1. **Direct Statement**: Clear, factual statement about the main development
2. **Question**: Thoughtful question about implications or outcomes
3. **Contrast**: "X but Y" structure showing tension or surprise

EXAMPLES OF GOOD HEADLINES:
- "New York's Office Boom Stands Alone As Most US Cities Stay Remote"
- "Tesla Faces Growing Competition In Electric Vehicle Market"
- "Federal Reserve Signals Potential Rate Cuts Ahead"

AVOID:
- Colons, dashes, or excessive punctuation
- Dramatic verbs like "sparks," "ignites," "plummets," "soars"
- Multiple data points crammed together
- Sensational or clickbait language

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
You are a financial journalist writing clean, analytical headlines. Generate 3 compelling headlines (under 12 words each) that capture the core story.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 12 words
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Use numerals for any data points
- Start with the company name or key entity

HEADLINE APPROACHES:
1. **Direct Statement**: Clear, factual statement about the main development
2. **Question**: Thoughtful question about implications or outcomes
3. **Contrast**: "X but Y" structure showing tension or surprise

EXAMPLES OF GOOD HEADLINES:
- "New York's Office Boom Stands Alone As Most US Cities Stay Remote"
- "Tesla Faces Growing Competition In Electric Vehicle Market"
- "Federal Reserve Signals Potential Rate Cuts Ahead"

AVOID:
- Colons, dashes, or excessive punctuation
- Dramatic verbs like "sparks," "ignites," "plummets," "soars"
- Multiple data points crammed together
- Sensational or clickbait language

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function similarHeadlinePrompt(headline: string, articleText: string) {
  return `
You are a financial journalist writing clean, analytical headlines. Generate 3 alternative headlines that match the style and tone of the original.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 12 words
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Use numerals for any data points
- Match the style and tone of the original headline

EXAMPLES OF GOOD HEADLINES:
- "New York's Office Boom Stands Alone As Most US Cities Stay Remote"
- "Tesla Faces Growing Competition In Electric Vehicle Market"
- "Federal Reserve Signals Potential Rate Cuts Ahead"

AVOID:
- Colons, dashes, or excessive punctuation
- Dramatic verbs like "sparks," "ignites," "plummets," "soars"
- Multiple data points crammed together
- Sensational or clickbait language

Original Headline:
"${headline}"

Article:
${articleText}

Respond with a numbered list of 3 headlines only.`;
}

export function seoHeadlinePrompt(headline: string) {
  return `
You are an SEO expert optimizing financial headlines for maximum search visibility and click-through rates.

Generate EXACTLY 3 SEO-optimized headlines, each under 8 words:

OPTION 1 (Similar to Original):
- Keep the core message and angle of the original headline
- Optimize for SEO while maintaining the main idea
- Make it clearer and more clickable

OPTION 2 (Alternative Angle):
- Take a completely different approach or angle
- Focus on a different aspect of the story
- Use different keywords and perspective

OPTION 3 (Alternative Angle):
- Another distinct approach or angle
- Emphasize different elements or implications
- Use varied keywords and framing

REQUIREMENTS FOR ALL 3 HEADLINES:
- Maximum 8 words each - this is critical
- Use the main company name or key entity
- Include compelling action verbs
- Natural sentence structure - avoid excessive colons
- SEO-friendly with strong keywords
- Clear, direct, and clickable

EXAMPLES OF GOOD SEO HEADLINES (under 8 words):
- "Tesla Faces Growing Electric Vehicle Competition"
- "Federal Reserve Signals Potential Rate Cuts"
- "Apple Stock Surges On Strong Earnings"
- "Microsoft Expands AI Capabilities With OpenAI"
- "Amazon Challenges Walmart In Grocery Market"

Original Headline:
"${headline}"

Respond with exactly 3 headlines, one per line, no numbering or extra text.`;
}
