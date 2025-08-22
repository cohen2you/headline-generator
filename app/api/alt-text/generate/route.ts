import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Convert the file to base64 for OpenAI Vision
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Generate sophisticated alt text using OpenAI Vision
    let altText = '';
    
    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert at generating accessible alt text for images. Generate concise, descriptive alt text that is 10-50 words (approximately 50-150 characters). Focus on the main subject, key visual elements, and context. Be specific but brief. Avoid unnecessary details. Use natural, conversational language. Never exceed 150 characters."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Generate concise alt text (10-50 words) for this image. Focus on the main subject and key visual elements. Be specific but brief."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        });

        altText = completion.choices[0]?.message?.content?.trim() || '';
        
        if (altText && altText.length > 10) {
          console.log('Generated alt text with OpenAI Vision:', altText);
        } else {
          console.log('OpenAI Vision returned insufficient response');
          altText = 'Image content';
        }

      } catch (error) {
        console.log('OpenAI Vision generation failed:', error);
        altText = 'Image content';
      }
    } else {
      altText = 'Image content';
    }

    // Clean up and format the alt text
    altText = (altText || '')
      .replace(/^[,\s]+/, '') // Remove leading commas and spaces
      .replace(/[,\s]+$/, '') // Remove trailing commas and spaces
      .replace(/[,\s]+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s+/g, ' ') // Normalize all whitespace
      .substring(0, 150); // Limit to 150 characters

    if (!altText || altText.length < 3) {
      altText = 'Image content';
    }

    return NextResponse.json({ altText });

  } catch (error) {
    console.error('Error generating alt text:', error);
    return NextResponse.json(
      { error: 'Failed to generate alt text' },
      { status: 500 }
    );
  }
} 