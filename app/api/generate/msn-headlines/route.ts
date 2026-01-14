import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText || !articleText.trim()) {
      return NextResponse.json({ error: 'Article text is required' }, { status: 400 });
    }

    const prompt = `
You are a headline writer creating MSN-style headlines in Column A format: short, punchy, action-driven headlines with strong verbs.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 9 headlines total - no more, no less
- Format: 3 headlines at Level 1, then 3 at Level 2, then 3 at Level 3
- Each headline must be 7-12 words (typically 8-9 words)
- Use direct statements only - NO questions, NO hooks, NO explainers
- Action-oriented, immediate impact language
- Sensational but factually accurate

LEVEL 1 (MODERATE STRENGTH) - Generate 3 headlines:
- 7-9 words
- Action verbs: "Faces", "Signals", "Shows", "Announces", "Considers", "Rules"
- Direct statement, factual tone
- Example: "Trump Faces Manufacturing Deal Challenge"

LEVEL 2 (STRONG STRENGTH) - Generate 3 headlines:
- 8-10 words
- Action verbs: "Wins", "Delivers", "Defies", "Strikes", "Secures", "Forces"
- Use "Blow to [Entity]" pattern when appropriate
- More dramatic tone
- Example: "Trump Wins Major Deal in Blow to Mexico"

LEVEL 3 (MAXIMUM STRENGTH) - Generate 3 headlines:
- 8-11 words
- Action verbs: "Crushes", "Devastates", "Shatters", "Annihilates", "Demolishes", "Obliterates"
- Include specific numbers/quantifiers when available from article
- Maximum drama with consequences
- Example: "Trump Wins $2 Billion Deal That Crushes Mexico Trade"

COLUMN A STYLE PATTERNS:
- Short and punchy (7-12 words)
- Strong action verbs at the start
- "Blow to [Entity]" pattern for Level 2 and 3
- Direct statements, no questions
- Action-oriented, immediate impact
- Sensational but factual

ACTION VERB LIBRARY BY LEVEL:
Level 1: Faces, Signals, Shows, Announces, Considers, Rules, Continues, Begins
Level 2: Wins, Delivers, Defies, Strikes, Secures, Forces, Rejects, Blocks
Level 3: Crushes, Devastates, Shatters, Annihilates, Demolishes, Obliterates, Destroys, Ruins

AVOID:
- Questions (What, How, Why, Is, etc.)
- Hooks or explainers at the end
- Long, detailed headlines (Column B style)
- Generic news reporting tone
- Overly polite or diplomatic language
- Colons and dashes (unless in "Blow to" pattern)

AIM FOR:
- Direct, punchy statements
- Strong action verbs
- Immediate impact language
- Breaking news feel
- Maximum drama at Level 3

DIVERSITY REQUIREMENTS:
- Each headline must use different language and structure
- Vary the action verbs across headlines
- Use different angles and perspectives
- Include numbers/quantifiers in Level 3 when available

CRITICAL ACCURACY:
- Headlines must be factually accurate to article content
- Don't overstate or dramatize beyond what facts support
- Use exact company names and key figures from article
- Include specific numbers only when mentioned in article

Article:
${articleText}

Respond with exactly 9 headlines in this exact format:
LEVEL 1 (MODERATE):
1. [headline]
2. [headline]
3. [headline]

LEVEL 2 (STRONG):
1. [headline]
2. [headline]
3. [headline]

LEVEL 3 (MAXIMUM):
1. [headline]
2. [headline]
3. [headline]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.8,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const text = completion.choices[0].message?.content || '';
    
    // Parse the response to extract headlines by level
    // Using [\s\S] instead of . with s flag for ES2017 compatibility
    const level1Matches = text.match(/LEVEL 1[\s\S]*?1\.\s*(.+?)\n2\.\s*(.+?)\n3\.\s*(.+?)(?=\n\n|LEVEL 2|$)/i);
    const level2Matches = text.match(/LEVEL 2[\s\S]*?1\.\s*(.+?)\n2\.\s*(.+?)\n3\.\s*(.+?)(?=\n\n|LEVEL 3|$)/i);
    const level3Matches = text.match(/LEVEL 3[\s\S]*?1\.\s*(.+?)\n2\.\s*(.+?)\n3\.\s*(.+?)(?=\n\n|$)/i);

    const parseHeadlines = (matches: RegExpMatchArray | null): string[] => {
      if (!matches) return [];
      return [
        matches[1]?.trim() || '',
        matches[2]?.trim() || '',
        matches[3]?.trim() || '',
      ].filter(Boolean);
    };

    // Fallback: if structured parsing fails, try to extract numbered headlines
    const fallbackParse = (text: string, level: string): string[] => {
      const levelSection = text.split(new RegExp(`${level}[\\s\\S]*?`, 'i'))[1];
      if (!levelSection) return [];
      
      const headlines = levelSection
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
      
      return headlines;
    };

    const level1 = parseHeadlines(level1Matches).length === 3 
      ? parseHeadlines(level1Matches) 
      : fallbackParse(text, 'LEVEL 1');
    const level2 = parseHeadlines(level2Matches).length === 3 
      ? parseHeadlines(level2Matches) 
      : fallbackParse(text, 'LEVEL 2');
    const level3 = parseHeadlines(level3Matches).length === 3 
      ? parseHeadlines(level3Matches) 
      : fallbackParse(text, 'LEVEL 3');

    // If still no results, try simple numbered list parsing
    if (level1.length === 0 && level2.length === 0 && level3.length === 0) {
      const allHeadlines = text
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0 && !line.match(/^LEVEL \d/i))
        .slice(0, 9);
      
      return NextResponse.json({
        level1: allHeadlines.slice(0, 3),
        level2: allHeadlines.slice(3, 6),
        level3: allHeadlines.slice(6, 9),
      });
    }

    return NextResponse.json({
      level1: level1.length === 3 ? level1 : [],
      level2: level2.length === 3 ? level2 : [],
      level3: level3.length === 3 ? level3 : [],
    });
  } catch (error) {
    console.error('Error generating MSN headlines:', error);
    return NextResponse.json(
      { error: 'Failed to generate MSN headlines' },
      { status: 500 }
    );
  }
}
