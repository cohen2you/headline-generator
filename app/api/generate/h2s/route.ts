import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cleanH2(text: string) {
  // Remove markdown ** or other symbols, trim, and capitalize each word
  const noMarkdown = text.replace(/\*\*/g, '').trim();
  return noMarkdown
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ articleWithH2s: '', error: 'Article text is required.' });
    }

    const prompt = `
    You Are A Top-Tier Financial Journalist Writing For A Leading Financial News Website.
    
    Given The Article Below, Insert Exactly 3 Short, Compelling, And Unique H2 Headings Into The Article Text.
    
    Requirements:
    - Do NOT place any H2 heading before the lead paragraph (assumed to be the first paragraph).
    - Insert H2 headings only *after* the lead, at natural points where the article shifts topic or highlights key insights.
    - Each H2 must be no longer than 4 words.
    - H2s should be very clicky and engaging, previewing the specific upcoming content with energy and unique perspective.
    - Avoid generic, bland, or obvious headings.
    - Capitalize the first letter of every word in each H2 heading.
    - Each of the three H2s must have a different structure or style, for example:
      - One could be a question,
      - One could be a bold statement,
      - One could be a how-to or insight teaser,
      - Do not use the same format twice.
    - Format the article with the H2 headings as plain text lines, followed by exactly one blank line, then the paragraph that follows.
    - Preserve the original article text except for adding these 3 H2 headings.
    
    Article:
    ${articleText}
    
    Article With Engaging H2 Headings Inserted:
    `.trim();
    

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    let articleWithH2s = completion.choices[0].message?.content?.trim() ?? '';

    // Remove any markdown from H2s (like **)
    // Assume H2s are lines without leading whitespace and are short (<30 chars)
    // We'll process lines, clean headings, then rejoin

    const lines = articleWithH2s.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Identify likely H2 lines: not empty, short, no punctuation, not a normal paragraph
      if (
        line &&
        line.length <= 30 &&
        !line.endsWith('.') &&
        !line.endsWith('!') &&
        !line.endsWith('?') &&
        line === line.toUpperCase() // If GPT outputs uppercase for emphasis
      ) {
        // Clean line (remove **, fix capitalization)
        lines[i] = cleanH2(line);
      }
      // Also check if line includes markdown **, clean it anyway
      else if (line.includes('**')) {
        lines[i] = cleanH2(line);
      }
    }
    articleWithH2s = lines.join('\n');

    return NextResponse.json({ articleWithH2s });
  } catch (error) {
    console.error('Error generating H2 headings:', error);
    return NextResponse.json({ articleWithH2s: '', error: 'Failed to generate H2 headings.' }, { status: 500 });
  }
}
