import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiProvider, AIProvider } from '@/lib/aiProvider';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { prompt, description, provider } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ imageUrl: '', altText: '', error: 'Prompt is required.' });
    }

    console.log('Generating DALL-E image with prompt:', prompt);
    console.log('DALL-E parameters:', {
      model: 'dall-e-3',
      size: '1792x1024',
      quality: 'hd',
      style: 'natural'
    });

    const startTime = Date.now();

    // Generate the image
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1792x1024', // Landscape format (16:9) - closest to 3:2 available
      quality: 'hd',
      style: 'natural'
    });

    const generationTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`DALL-E generation took ${generationTime} seconds`);

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    console.log('DALL-E image generated successfully');
    if (revisedPrompt) {
      console.log('DALL-E revised prompt:', revisedPrompt);
    }

    // Generate alt-text based on the image description
    let altText = '';
    if (description) {
      try {
        // Set provider if specified (for alt-text generation only)
        const aiProviderType: AIProvider | undefined = provider && (provider === 'openai' || provider === 'gemini')
          ? provider
          : undefined;
        
        if (aiProviderType) {
          try {
            aiProvider.setProvider(aiProviderType);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Provider ${aiProviderType} not available for alt-text, using default:`, errorMessage);
          }
        }

        // Use provider-specific model and token limits
        const currentProvider = aiProvider.getCurrentProvider();
        const model = currentProvider === 'gemini' 
          ? 'gemini-2.5-flash' 
          : 'gpt-4o-mini';
        const maxTokens = currentProvider === 'gemini' ? 8192 : 100;

        const altTextResponse = await aiProvider.generateCompletion(
          [{
            role: 'user',
            content: `Create a concise, descriptive alt-text (50-80 characters) for an AI-generated image based on this description:

"${description}"

The alt-text should:
- Be concise and descriptive
- Focus on the visual elements
- Be suitable for accessibility
- Be 50-80 characters max

Return ONLY the alt-text, nothing else.`
          }],
          {
            model,
            temperature: 0.3,
            maxTokens,
          },
          aiProviderType
        );

        altText = altTextResponse.content.trim() || description;
      } catch (altError) {
        console.error('Error generating alt-text:', altError);
        // Fallback to description if alt-text generation fails
        altText = description;
      }
    }

    return NextResponse.json({ imageUrl, altText });
  } catch (error) {
    console.error('Error generating DALL-E image:', error);
    return NextResponse.json(
      { imageUrl: '', altText: '', error: 'Failed to generate image.' },
      { status: 500 }
    );
  }
}

