import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ optimizedPrompt: '', error: 'Prompt is required.' });
    }

    console.log('Optimizing prompt with GPT-4:', prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `You are a DALL-E 3 prompt optimization expert. Your job is to transform simple prompts into detailed, effective DALL-E 3 prompts that produce high-quality, accurate images.

USER'S SIMPLE PROMPT:
"${prompt}"

OPTIMIZATION RULES:

1. SUBJECT ACCURACY (Critical for people/brands/specific things):
   - If it mentions a SPECIFIC PERSON: Emphasize their recognizable features, distinctive appearance, and likeness
   - If it mentions a SPECIFIC OBJECT/BRAND: Describe its characteristic design and visual elements
   - If it's a SCENE/LOCATION: Focus on composition, atmosphere, and key visual elements

2. TECHNICAL QUALITY:
   - Always start with: "Ultra-realistic 3:2 widescreen image of..."
   - Include: "Photorealistic quality", "professional photography", "sharp focus"
   - Add appropriate lighting: "natural lighting", "golden hour", "dramatic lighting", etc.
   - Add depth/composition terms: "depth of field", "cinematic composition"

3. SPECIFIC DETAILS:
   - Be specific about setting, time of day, angle, mood
   - Describe materials, textures, colors where relevant
   - Include atmospheric details: fog, lens flares, etc. (where appropriate)

4. FORMAT REQUIREMENTS:
   - Keep under 400 characters
   - Always end with: "No text or logos."
   - Make it suitable for 3:2 widescreen aspect ratio

EXAMPLES:

Input: "Elon Musk driving a Tesla"
Output: "Ultra-realistic 3:2 widescreen photograph of Elon Musk with his distinctive facial features and expression, sitting in the driver's seat of a modern Tesla electric vehicle. Clear focus on facial likeness and details. Contemporary automotive interior with minimalist design visible. Professional portrait photography, natural lighting, sharp focus on subject. No text or logos."

Input: "Bull and bear on Wall Street"
Output: "Ultra-realistic 3:2 widescreen photograph of a powerful bull and bear statue facing each other on Wall Street in New York City. Iconic financial district skyscrapers in background, morning light creating dramatic shadows. Bronze metal sculptures with detailed textures, cobblestone street visible. Professional cityscape photography, cinematic composition, golden hour lighting. No text or logos."

Input: "Futuristic city at sunset"
Output: "Ultra-realistic 3:2 widescreen aerial photograph of a futuristic metropolitan cityscape at golden hour sunset. Gleaming glass and steel skyscrapers with modern architecture, warm orange and purple sky. Flying vehicles and holographic advertisements visible. Dramatic volumetric light rays, atmospheric haze between buildings. Professional architectural photography, cinematic composition, rich color grading. No text or logos."

Return ONLY the optimized prompt, nothing else. No explanations, no quotes around it, just the prompt text.`
      }],
      max_tokens: 250,
      temperature: 0.7,
    });

    const optimizedPrompt = completion.choices[0].message?.content?.trim() || prompt;

    console.log('Optimized prompt:', optimizedPrompt);

    return NextResponse.json({ optimizedPrompt });
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    // Fallback to original prompt if optimization fails
    return NextResponse.json({ optimizedPrompt: prompt });
  }
}

