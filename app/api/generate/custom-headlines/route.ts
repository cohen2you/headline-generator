import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { articleText, selectedHeadline = '', generateSimilar = false } = await request.json();

    if (!articleText || !articleText.trim()) {
      return NextResponse.json({ headlines: [] });
    }

    let prompt = '';

    if (generateSimilar && selectedHeadline) {
      // Generate 3 headlines similar to the selected one
      prompt = `
You are a financial journalist writing clean, analytical headlines. Create exactly 3 headlines that are variations of the selected headline, maintaining the same style and approach.

SELECTED HEADLINE: "${selectedHeadline}"

CRITICAL REQUIREMENTS FOR VARIATIONS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 12 words
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Use numerals for any data points
- MAINTAIN the same structural pattern as the selected headline
- MAINTAIN the same tone and urgency level
- Use SIMILAR but DIFFERENT action verbs and vocabulary
- Use the SAME company name and key numbers from the article
- MANDATORY: DO NOT use analyst names or firm names at all
- MANDATORY: DO NOT use "price target" or "target" in headlines

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

Respond with exactly 3 headlines, numbered 1-3, that are clear variations of the selected headline.`;
    } else {
      // Generate 3 completely different headlines
      prompt = `
You are a financial journalist writing attention-grabbing, hooky headlines that make readers want to click.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 12 words
- Create attention-grabbing openings that hint at the story without revealing everything
- Pose questions or present surprising angles that make readers want to discover more
- Use vivid, specific language that grabs attention
- Include specific numbers in only ONE headline per set
- Focus on what's really at stake or what's surprising about this story
- Make each headline feel urgent and compelling
- MANDATORY: Start at least 2 headlines with the key company name or person
- MANDATORY: Start at least 1 headline with a broader market/industry angle

HEADLINE APPROACHES TO CHOOSE FROM:
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

HEADLINE STRUCTURE REQUIREMENTS:
- At least 2 headlines must start with the key company name or person
- At least 1 headline should start with a broader market/industry angle
- Use strong action verbs after the company name: "Just," "Secures," "Faces," "Braces," "Shows," etc.

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

MANDATORY: Include specific numbers, facts, and details from the article
MANDATORY: Use the exact company name and key figures mentioned
MANDATORY: DO NOT use analyst names or firm names
MANDATORY: DO NOT use "price target" or "target" in headlines

Article:
${articleText}

Respond with exactly 3 headlines, numbered 1-3, each using a different hooky approach.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using gpt-4o for better accuracy and reasoning
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800, // Increased for better quality and more detailed headlines
      temperature: 0.7, // Slightly higher for more creative but still accurate headlines
      top_p: 0.9, // Higher for better creativity while maintaining accuracy
      frequency_penalty: 0.2, // Higher penalty to avoid repetitive language
      presence_penalty: 0.2, // Higher penalty to encourage diverse angles
    });

    const text = completion.choices[0].message?.content || '';
    const headlines = text
      .split('\n')
      .map(line => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ headlines });
  } catch (error) {
    console.error('Error generating custom headlines:', error);
    return NextResponse.json({ error: 'Failed to generate custom headlines' }, { status: 500 });
  }
} 