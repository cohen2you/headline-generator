import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText, style } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ lead: '', error: 'Article text is required.' });
    }

 
    const stylePrompts: Record<string, string> = {
      standard: `You are a financial journalist writing for a broad audience.

Write a standard lead that:
- Is concise (2-3 sentences maximum).
- Provides broader context that sets up the specific story in the article.
- Creates a smooth transition into the existing first paragraph.
- CRITICAL: Does NOT repeat or reword what's already in the article's first paragraph.
- CRITICAL: Avoid using the same key phrases, terminology, or concepts that appear in the article's opening.
- Focuses on the bigger picture or trend that leads to this specific development.
- Uses simple, direct language; no jargon.
- Can be added to the beginning of the article without requiring any changes to existing content.
- IMPORTANT: Do NOT start with "In a..." or similar phrases. Vary your opening structure.
- The lead should flow naturally into the article's existing first paragraph.

FORMATTING REQUIREMENTS FOR COMPANY NAMES:
- If you mention a company name, you MUST bold ONLY the company name using markdown bold **company name** syntax
- Include the full legal company name (e.g., "Charles Schwab Corporation" not just "Charles Schwab")
- Include the stock exchange and ticker symbol in parentheses after the company name, but DO NOT bold the ticker
- Format: **Company Name** (EXCHANGE: TICKER)
- Example: **Charles Schwab Corporation** (NYSE: SCHW)

Lead:`,

      hook: `You are a financial journalist writing for a broad audience.

Write a hook lead that:
- Is concise (2-3 sentences maximum).
- Creates an attention-grabbing opening that hints at the story without revealing it.
- Poses a question or presents a surprising angle that leads to the article's topic.
- Makes readers want to continue reading to discover the answer or details.
- CRITICAL: Does NOT repeat or reword what's already in the article's first paragraph.
- CRITICAL: Avoid using the same key phrases, terminology, or concepts that appear in the article's opening.
- Can be added to the beginning of the article without requiring any changes to existing content.
- IMPORTANT: Do NOT start with "In a..." or similar phrases. Vary your opening structure.
- The hook should create curiosity that flows into the article's existing first paragraph.
- Examples: "What if the biggest story in tech isn't about AI, but about..." or "Few expected this development to reshape the industry..."

FORMATTING REQUIREMENTS FOR COMPANY NAMES:
- If you mention a company name, you MUST bold ONLY the company name using markdown bold **company name** syntax
- Include the full legal company name (e.g., "Charles Schwab Corporation" not just "Charles Schwab")
- Include the stock exchange and ticker symbol in parentheses after the company name, but DO NOT bold the ticker
- Format: **Company Name** (EXCHANGE: TICKER)
- Example: **Charles Schwab Corporation** (NYSE: SCHW)

Lead:`,

      context: `You are a financial journalist writing for a broad audience.

Write a context lead that:
- Is concise (2-3 sentences maximum).
- Provides broader market context and background that sets up the specific story.
- Explains the bigger picture or trend that leads to this particular development.
- Gives readers the necessary background to understand why this story matters.
- CRITICAL: Does NOT repeat or reword what's already in the article's first paragraph.
- CRITICAL: Avoid using the same key phrases, terminology, or concepts that appear in the article's opening.
- Uses straightforward language; no jargon.
- Can be added to the beginning of the article without requiring any changes to existing content.
- IMPORTANT: Do NOT start with "In a..." or similar phrases. Vary your opening structure.
- The context should provide background that flows naturally into the article's existing first paragraph.
- Examples: "Digital transformation continues reshaping traditional finance..." or "As blockchain technology matures, new opportunities emerge..."

FORMATTING REQUIREMENTS FOR COMPANY NAMES:
- If you mention a company name, you MUST bold ONLY the company name using markdown bold **company name** syntax
- Include the full legal company name (e.g., "Charles Schwab Corporation" not just "Charles Schwab")
- Include the stock exchange and ticker symbol in parentheses after the company name, but DO NOT bold the ticker
- Format: **Company Name** (EXCHANGE: TICKER)
- Example: **Charles Schwab Corporation** (NYSE: SCHW)

Lead:`,

      one_sentence: `You are a financial journalist writing for a broad audience.

Your task is to write a single sentence that will be ADDED BEFORE the article's existing first sentence.

Write a single, powerful lead sentence that:
- Is exactly ONE sentence (no more, no less).
- Is SHORT and PUNCHY (15-25 words maximum).
- FORESHADOWS THE ENTIRE STORY - hints at the key themes and developments that will be covered in the article.
- Read the full article and identify the main themes (analyst reactions, price target changes, growth drivers, strategic moves, etc.).
- Summarize these themes in one compelling sentence that makes readers want to learn more.
- Creates a smooth transition into the existing first sentence without repeating it.
- CAPTURES THE CORE NEWS: What specific company/entity is involved and what key development happened?
- Is SPECIFIC and INFORMATIVE - tells readers what the story is actually about.
- Uses vivid, concrete language that grabs attention.
- Uses active voice and strong verbs.
- IMPORTANT: Do NOT use "amid," "In a...," "As...," or similar formal/dated phrases. Use fresh, direct language.
- Do NOT be vague or generic - be specific about who and what.
- Avoid clichés like "navigating a dynamic landscape," "redefine expectations," "shifting tides," "renewed vitality."

FORMATTING REQUIREMENTS FOR COMPANY NAMES:
- If you mention a company name, you MUST bold ONLY the company name using markdown bold **company name** syntax
- Include the full legal company name (e.g., "Charles Schwab Corporation" not just "Charles Schwab")
- Include the stock exchange and ticker symbol in parentheses after the company name, but DO NOT bold the ticker
- Format: **Company Name** (EXCHANGE: TICKER)
- Example: **Charles Schwab Corporation** (NYSE: SCHW)

CRITICAL - FORESHADOW THE ENTIRE STORY:
- Your lead will be placed BEFORE the article's existing first sentence
- Read the ENTIRE article and identify the key themes and developments (not just the first sentence)
- Your lead should preview what the whole story is about: analyst upgrades, growth acceleration, strategic moves, competitive advantages, etc.
- DO NOT repeat the exact wording of the first sentence
- If the first sentence says "Company reported better-than-expected earnings on Thursday", your lead can reference earnings/results but focus on the broader implications
- Think: "What are the 2-3 main takeaways from this article?" Then hint at those in your lead

GOOD EXAMPLES showing how lead foreshadows the entire story:

Example 1 - Analyst Article:
Article themes: Earnings beat, analysts raising price targets, NII growth accelerating, increased buybacks
Lead: "**Charles Schwab Corporation** (NYSE: SCHW) is winning over Wall Street with accelerating growth and aggressive capital returns."
First Sentence: "Charles Schwab Corporation (NYSE: SCHW) reported better-than-expected third-quarter results on Thursday."
[Why it works: Lead hints at analyst optimism, growth acceleration, and buybacks without repeating "reported earnings on Thursday"]

Example 2 - Product Launch Article:
Article themes: New chip unveiled, analysts questioning competitive edge, pricing pressure, market share concerns
Lead: "**NVIDIA Corporation** (NASDAQ: NVDA)'s latest chip is sparking debate over pricing power and competitive positioning."
First Sentence: "NVIDIA Corporation (NASDAQ: NVDA) unveiled its new H200 GPU at the company's annual developer conference."
[Why it works: Lead foreshadows the analyst debate themes without repeating "unveiled at developer conference"]

Example 3 - Earnings Miss Article:
Article themes: Deliveries missed estimates, stock dropped, demand concerns, competition intensifying
Lead: "**Tesla Inc.** (NASDAQ: TSLA) faces growing questions about demand as delivery figures disappoint investors."
First Sentence: "Tesla Inc. (NASDAQ: TSLA) announced fourth-quarter deliveries of 405,000 vehicles, missing analyst estimates."
[Why it works: Lead captures the demand concerns theme without repeating "deliveries missed estimates"]

Example 4 - Strategic Shift Article:
Article themes: Services revenue at record, analysts raising targets, iPhone sales declining, business model shift
Lead: "**Apple Inc.** (NASDAQ: AAPL) is drawing higher price targets as its pivot to services pays off."
First Sentence: "Apple Inc. (NASDAQ: AAPL) reported services revenue hit a record $22 billion in the quarter."
[Why it works: Lead captures price target raises and strategic shift without repeating "services revenue record"]

BAD EXAMPLES (too vague and generic):
- "Investors are navigating a dynamic financial landscape as earnings surprises redefine market expectations."
- "Market participants are reassessing their positions amid shifting economic conditions."
- "The technology sector continues to evolve as companies pursue new opportunities."

CRITICAL: Be specific about the company and the key development. Don't hide behind vague language about "investors," "markets," or "landscapes." Your lead should preview what's coming and flow naturally into the existing first sentence.

Lead:`,
    };

    const key = style?.toLowerCase() in stylePrompts ? style.toLowerCase() : 'standard';
    const prompt = `${stylePrompts[key]}

Article:
${articleText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    const lead = completion.choices[0].message?.content?.trim() ?? '';

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error generating lead:', error);
    return NextResponse.json({ lead: '', error: 'Failed to generate lead paragraph.' }, { status: 500 });
  }
}
