import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline, articleText } = await request.json();

    if (!headline?.trim() || !articleText?.trim()) {
      return NextResponse.json({ 
        accuracy: { score: 0, breakdown: 'Headline or article text missing.' },
        engagement: { score: 0, breakdown: 'Headline or article text missing.' },
        recommendation: { needsChange: true, reason: 'Missing input', improvedHeadline: '' },
        seoHeadline: ''
      });
    }

    const prompt = `You are an expert headline editor for a financial news website.

Analyze the headline for accuracy and engagement, then provide a detailed breakdown and recommendations.

Return a JSON object in this exact format:
{
  "accuracy": {
    "score": 8,
    "breakdown": "What's Accurate:\\n• Claim A\\n• Claim B\\n\\nWhat's Inaccurate:\\n• Issue A\\n• Issue B"
  },
  "engagement": {
    "score": 7,
    "breakdown": "What's Engaging:\\n• Element A\\n• Element B\\n\\nWhat Could Be Better:\\n• Improvement A\\n• Improvement B"
  },
  "recommendation": {
    "needsChange": true,
    "reason": "Brief explanation of why change is needed",
    "improvedHeadline": "More accurate version of the headline"
  },
  "seoHeadline": "SEO optimized version under 8 words"
}

Instructions:
- Accuracy score (1-10): How factually correct is the headline vs article content?
- Engagement score (1-10): How compelling and clickable is the headline?
- Breakdown: Use "\\n" for line breaks, "• " for bullet points
- Recommendation: Only suggest changes if accuracy score < 7 or engagement score < 6
- If no change needed, set needsChange: false and leave improvedHeadline empty
- SEO headline: Must be under 8 words, include key terms, be search-friendly

Article:
${articleText}

Headline:
"${headline}"

Respond with JSON only, no code blocks.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const text = completion.choices[0].message?.content?.trim() || '';

    try {
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanedText);

      // Ensure all required fields exist
      if (!result.accuracy) result.accuracy = { score: 0, breakdown: 'Analysis failed' };
      if (!result.engagement) result.engagement = { score: 0, breakdown: 'Analysis failed' };
      if (!result.recommendation) result.recommendation = { needsChange: false, reason: '', improvedHeadline: '' };
      if (!result.seoHeadline) result.seoHeadline = '';

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error parsing response:', error, '\nRaw response:', text);
      return NextResponse.json({ 
        accuracy: { score: 0, breakdown: 'Failed to parse analysis' },
        engagement: { score: 0, breakdown: 'Failed to parse analysis' },
        recommendation: { needsChange: false, reason: 'Analysis failed', improvedHeadline: '' },
        seoHeadline: ''
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json({ 
      accuracy: { score: 0, breakdown: 'Failed to process request' },
      engagement: { score: 0, breakdown: 'Failed to process request' },
      recommendation: { needsChange: false, reason: 'Request failed', improvedHeadline: '' },
      seoHeadline: ''
    }, { status: 500 });
  }
}
