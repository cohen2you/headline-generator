import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { articleText, version } = await request.json();

    if (!articleText || !articleText.trim()) {
      return NextResponse.json({ headlines: [] });
    }

    // Define different focus areas for variety
    const focusAreas = [
      {
        focus: 'PERFORMANCE & NUMBERS',
        instruction: 'Focus on earnings, revenue, growth metrics, and financial performance. Use specific numbers and data points.',
        examples: ['Paramount Beats Earnings by 29% as Streaming Revenue Soars', 'Revenue Jumps 14.9% as Subscribers Surge']
      },
      {
        focus: 'COMPETITION & MARKET POSITION',
        instruction: 'Focus on competitive advantages, market share, industry positioning, and how the company compares to rivals.',
        examples: ['Paramount Outperforms Netflix in Subscriber Growth Race', 'Streaming Wars: Paramount Gains Ground on Disney']
      },
      {
        focus: 'STRATEGY & OUTLOOK',
        instruction: 'Focus on future plans, analyst predictions, strategic moves, and forward-looking statements.',
        examples: ['Analyst Upgrades Paramount: Strong Content Pipeline Ahead', 'Paramount\'s Strategic Shift: From TV to Streaming Dominance']
      },
      {
        focus: 'INVESTOR IMPACT',
        instruction: 'Focus on stock performance, investor sentiment, price targets, and market reactions.',
        examples: ['Paramount Stock Soars 15% on Strong Earnings Beat', 'Investors Bet Big on Paramount\'s Streaming Future']
      },
      {
        focus: 'INDUSTRY TRENDS',
        instruction: 'Focus on broader industry shifts, market trends, and how this fits into larger sector movements.',
        examples: ['Traditional TV\'s Death Spiral: Paramount Leads Streaming Revolution', 'Cord-Cutting Accelerates: Paramount Captures Market Share']
      }
    ];

    // Select focus area based on version number (cycles through different approaches)
    const focusIndex = (version || 0) % focusAreas.length;
    const selectedFocus = focusAreas[focusIndex];

    const prompt = `
You are an expert headline writer for a top-tier financial publication. Create 1 thoughtful, context-rich headline that provides insight while being highly engaging.

FOCUS AREA: ${selectedFocus.focus}
SPECIFIC INSTRUCTION: ${selectedFocus.instruction}

Your headline should follow these principles:

1. **Use vivid, specific language** - Avoid generic terms. Use "Sledgehammer Policies" instead of "tough policies"
2. **Strong action verbs** - Use words like "ignited," "crushing," "unhinged," "dominating"
3. **Historical or comparative context** when relevant - "More Unhinged Than Dot-Com," "Crushing The US At Its Own Game"
4. **Balanced tone** - Informative but engaging, not hysterical
5. **Insight-driven** - Reveal deeper meaning, not just report facts
6. **Use metaphors and personification** - "AI Brains," "Wall Street's Hottest Trade"
7. **Create intrigue** while providing enough context to understand the topic

Examples of the style you should aim for (${selectedFocus.focus} focus):
${selectedFocus.examples.map(ex => `- "${ex}"`).join('\n')}

Focus on:
- The single biggest investor takeaway from the ${selectedFocus.focus.toLowerCase()} perspective
- Unexpected angles or ironies
- Market implications and context
- Vivid, memorable language
- Under 15 words

Article:
${articleText}

Respond with exactly 1 headline only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8,
    });

    const text = completion.choices[0].message?.content || '';
    const headline = text.trim();

    return NextResponse.json({ headlines: [headline] });
  } catch (error) {
    console.error('Error generating custom headlines:', error);
    return NextResponse.json({ error: 'Failed to generate custom headlines' }, { status: 500 });
  }
} 