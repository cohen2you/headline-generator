import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ ideas: [], error: 'Article text is required.' });
    }

    const prompt = `You are a creative visual designer helping create compelling images for financial news articles.

CRITICAL INSTRUCTION: You MUST read the article carefully and create images that reference SPECIFIC DETAILS from this article. Do NOT create generic stock/finance images!

ARTICLE/HEADLINE:
${articleText}

STEP 1 - IDENTIFY SPECIFIC DETAILS:
Extract these from the article:
- Specific products/shows mentioned (e.g., "Squid Game Season 3", "Stranger Things", specific NFL games)
- Specific locations mentioned (e.g., Brazil, specific cities)
- Specific numbers/stats (e.g., 67.1M subscribers, 8% stock drop, $2.6B cash flow)
- Specific events (e.g., live sports debut, Christmas Day NFL games, partnerships with Hasbro/Mattel)
- Industry context (e.g., vs Hulu, Disney+, competition details)

STEP 2 - CREATE CONCEPTS USING THOSE DETAILS:
Your image concepts MUST incorporate the actual details you identified above. Be LITERAL and SPECIFIC, not abstract!

For each image concept, provide:
1. A short title (3-5 words)
2. A detailed description (15-25 words) explaining EXACTLY what elements will be in the image
3. An ULTRA-DETAILED DALL-E prompt (4-6 sentences) with cinematic quality specifications

CRITICAL REQUIREMENTS FOR DALL-E PROMPTS:
- MUST reference specific details from the article (actual shows, locations, products, events mentioned)
- DO NOT include company names in prompts (DALL-E can't render real logos/text accurately)
- Focus on VISUAL ELEMENTS, not brand names (e.g., "streaming content" not "Netflix", "pink-suited guards" not "Squid Game logo")
- Start with technical specs: "Ultra-realistic cinematic widescreen image" or "Photorealistic editorial style 3:2 aspect ratio"
- Include SPECIFIC scene details from the article: exact shows, locations, events mentioned (but describe them visually, not by name)
- Specify lighting: "golden hour", "dramatic side lighting", "soft ambient glow", "lens flares", "volumetric rays"
- Add atmospheric details: fog, depth of field, atmospheric haze, particle effects
- Include texture details: "fine surface textures", "hyperreal materials", "detailed reflections"
- Specify technical quality: "cinematic contrast", "atmospheric depth", "sharp focus", "professional color grading"
- ALWAYS end with: "No text or logos."
- Avoid abstract concepts - be CONCRETE and LITERAL
- Each concept should visualize a different aspect of the story:
  * Concept 1: The product/service aspect (specific shows, content, viewing experience)
  * Concept 2: The business/market aspect (subscriber growth, competition, market position)
  * Concept 3: The future/strategic aspect (upcoming events, expansion, new initiatives)
- Professional quality suitable for financial news

FORBIDDEN: 
- Do NOT include company names/brands in DALL-E prompts (causes fake text)
- Do NOT create generic images like "abstract waves", "data streams", "executive offices", "market dynamics"

EXAMPLES OF ARTICLE-SPECIFIC CONCEPTS:

Article: "Netflix stock drops 8% after Brazil tax settlement, but Squid Game Season 3 and NFL Christmas games drive strong subscriber growth to 67.1M"

❌ BAD (too generic, could be any streaming company):
- "Streaming Data Visualization" - Digital display with stock charts
- "Abstract Market Dynamics" - Swirling patterns symbolizing growth
- "Cinematic Streaming Hub" - Generic living room with TV

✅ GOOD (uses actual details from this specific Netflix article):

Concept 1: "Popular Series Viewing"
Description: "Living room with family watching dramatic streaming content on large TV during evening, intense scene visible on screen, cozy atmosphere"
Prompt: "Ultra-realistic cinematic 3:2 widescreen photograph of modern living room at evening time. Large flat-screen TV displaying a dramatic scene with people in distinctive pink uniforms in a dark arena setting. Family of four sitting on gray sectional sofa viewing the screen, bowls of popcorn, warm ambient lighting from floor lamps. City skyline visible through windows in background showing nighttime. Photorealistic details on TV screen, comfortable home setting, cinematic depth of field focusing on TV and viewers. Professional interior photography style with natural color grading. No text or logos."

Concept 2: "Football Stadium Christmas Prep"
Description: "NFL stadium decorated for Christmas with snowfall and dramatic lighting, preparing for streaming broadcast with camera crews"
Prompt: "Photorealistic 3:2 widescreen image of a massive NFL football stadium during late afternoon in winter. Light snowfall visible against dramatic stadium lights. Christmas decorations visible including wreaths and garland on railings. Professional broadcast cameras positioned on sideline with crew members in winter gear. Empty green field with yard lines visible. Dramatic golden hour lighting mixed with bright stadium lights creating lens flares. Cold weather atmosphere with visible breath condensation. Professional sports photography aesthetic with cinematic color grading. No text or logos."

Concept 3: "Brazilian Metropolis Dusk"
Description: "Major Brazilian city skyline at dusk with modern buildings and vibrant sunset, representing the South American market"
Prompt: "Ultra-realistic cinematic aerial photograph of a major Brazilian city skyline at golden hour. Modern glass skyscrapers and unique curved architecture silhouetted against dramatic orange and purple sunset sky. Dense urban landscape with mix of contemporary and historic buildings. Warm ambient city lights beginning to illuminate. Atmospheric haze between buildings creating depth. Wide avenue visible cutting through the city center. Photorealistic architectural details, professional cityscape photography with rich color grading capturing the vibrant South American atmosphere. No text or logos."

Return a JSON object with an "ideas" array containing exactly 3 objects, each with: title, description, prompt

REMEMBER: Extract specific details from the article and use them literally in your image concepts!

Return JSON format:
{
  "ideas": [
    {
      "title": "[3-5 words based on specific article detail]",
      "description": "[15-25 words describing exact visual elements from article]",
      "prompt": "[Ultra-detailed 4-6 sentence DALL-E prompt incorporating specific article details. No text or logos.]"
    },
    {
      "title": "[Different specific detail from article]",
      "description": "[Different visual elements from article]",
      "prompt": "[Different ultra-detailed prompt with article specifics. No text or logos.]"
    },
    {
      "title": "[Third specific detail from article]",
      "description": "[Third set of visual elements from article]",
      "prompt": "[Third ultra-detailed prompt with article specifics. No text or logos.]"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message?.content?.trim() || '{}';
    const parsed = JSON.parse(responseText);
    
    // Extract ideas array
    const ideas = parsed.ideas || [];

    if (!Array.isArray(ideas) || ideas.length === 0) {
      console.error('Invalid response format:', parsed);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate each idea has required fields
    const validIdeas = ideas.filter(idea => 
      idea.title && idea.description && idea.prompt
    ).slice(0, 3);

    if (validIdeas.length === 0) {
      throw new Error('No valid ideas returned from OpenAI');
    }

    return NextResponse.json({ ideas: validIdeas });
  } catch (error) {
    console.error('Error generating image ideas:', error);
    return NextResponse.json(
      { ideas: [], error: 'Failed to generate image ideas.' },
      { status: 500 }
    );
  }
}

