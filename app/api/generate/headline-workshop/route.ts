import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });



// Function to fix incomplete quotes in headlines using improved logic
function fixIncompleteQuotes(headline: string): string {
  console.log(`=== QUOTE FIXING DEBUG ===`);
  console.log(`Input headline: "${headline}"`);
  
  // First, normalize all quotes to double quotes for consistent processing
  let cleaned = headline
    .replace(/[''']/g, '"') // Convert all single quotes and apostrophes to double quotes
    .replace(/\*\*/g, '')
    .trim();
    
  // Now remove quotes from beginning and end
  cleaned = cleaned
    .replace(/^[""]+/g, '') // Remove quotes from beginning
    .replace(/[""]+$/g, '') // Remove quotes from end
    .trim();
    
  // Restore legitimate apostrophes by converting back single quotes within words
  // Only convert quotes that are clearly apostrophes (between letters or at word boundaries)
  cleaned = cleaned.replace(/(\w)"(\w)/g, "$1'$2"); // Convert quotes between letters back to apostrophes
  cleaned = cleaned.replace(/(\w)"(\s|$)/g, "$1'$2"); // Convert quotes at word endings back to apostrophes
  
  // Intelligent quote balancing based on content structure
  cleaned = balanceQuotesIntelligently(cleaned);
  
  // Convert double quotes around phrases to single quotes
  // This handles cases like "phrase" -> 'phrase'
  cleaned = cleaned.replace(/"([^"]+)"/g, "'$1'");
  
  console.log(`Final headline: "${cleaned}"`);
  return cleaned;
}

// Intelligent quote balancing function (same as in utils.ts)
function balanceQuotesIntelligently(text: string): string {
  // Split the text into segments to analyze quote structure
  const segments = text.split(/([""])/);
  let result = '';
  let inQuote = false;
  let currentSegment = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment === '"') {
      if (!inQuote) {
        // Starting a new quote
        inQuote = true;
        result += currentSegment + '"';
        currentSegment = '';
      } else {
        // Ending a quote
        inQuote = false;
        result += currentSegment + '"';
        currentSegment = '';
      }
    } else {
      currentSegment += segment;
    }
  }
  
  // Only close a quote if we're actually in one AND the remaining content looks like it should be quoted
  if (inQuote && currentSegment.trim().length > 0) {
    // Check if the remaining content looks like it should be part of a quote
    const remainingContent = currentSegment.trim();
    const shouldBeQuoted = remainingContent.length < 10 || 
                          remainingContent.match(/^(but|yet|and|or|however|though|although|while|whereas|meanwhile|meanwhile,)/i);
    
    if (shouldBeQuoted) {
      // This might be part of the quote, so close it
      result += currentSegment + '"';
    } else {
      // This looks like regular text, not part of a quote
      result += currentSegment;
    }
  } else {
    // Add any remaining content
    result += currentSegment;
  }
  
  return result;
}



// Function to extract key names from article text
function extractKeyNames(articleText: string): string[] {
  const names: string[] = [];
  
  // Common stock tickers and company patterns
  const stockPatterns = [
    /\b[A-Z]{2,5}\b/g, // Stock tickers like AAPL, TSLA, MSFT
    /\b[A-Z][a-z]+ (Inc|Corp|Company|Ltd|LLC|Group|Holdings)\b/g, // Company names
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Full names like "John Smith"
  ];
  
  // Look specifically for the main company mentioned in the article
  const mainCompanyPatterns = [
    /\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(stated|announced|reported|said|confirmed)/gi,
    /\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(Inc|Corp|Company|Ltd|LLC|Group|Holdings)\b/g,
    /\b([A-Z][a-z]+)\s+(stated|announced|reported|said|confirmed)/gi,
  ];
  
  mainCompanyPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(articleText)) !== null) {
      const companyName = match[1];
      if (companyName && companyName.length > 2 && companyName.length < 50) {
        names.push(companyName);
        // Give extra weight to companies mentioned in this context
        if (nameCounts[companyName]) {
          nameCounts[companyName] += 20;
        }
      }
    }
  });
  
  stockPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(articleText)) !== null) {
      if (match[0].length > 2 && match[0].length < 50) {
        names.push(match[0]);
      }
    }
  });
  
  // Also look for prominent names mentioned with titles or context
  const prominentNamePatterns = [
    /\b(former|ex-)?(President|CEO|Director|Chairman|Founder|Communications Director|White House)\s+([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
    /\b([A-Z][a-z]+ [A-Z][a-z]+),?\s+(former|ex-)?(President|CEO|Director|Chairman|Founder|Communications Director|White House)\b/g,
  ];
  
  prominentNamePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(articleText)) !== null) {
      const name = match[3] || match[1]; // Extract the name part
      if (name && name.length > 5 && name.length < 50) {
        names.push(name);
      }
    }
  });
  
  // Look for quoted speakers - people who are actually speaking in the article
  const quotedSpeakerPatterns = [
    /"([^"]+)"\s+([A-Z][a-z]+ [A-Z][a-z]+)\s+said/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+said\s+"([^"]+)"/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+expressed\s+([^,]+)/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+noted\s+([^,]+)/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+called\s+([^,]+)/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+offered\s+([^,]+)/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+assessed\s+([^,]+)/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+offered\s+a\s+([^,]+)/g,
  ];
  
  quotedSpeakerPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(articleText)) !== null) {
      const name = match[2] || match[1]; // Extract the name part
      if (name && name.length > 5 && name.length < 50) {
        names.push(name);
      }
    }
  });
  
  // Remove duplicates and prioritize names that appear more frequently
  const nameCounts: { [key: string]: number } = {};
  names.forEach(name => {
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });
  
  // Also give bonus points to names that appear near quotes or are mentioned as speakers
  const quotedSpeakerBonus = ['said', 'expressed', 'noted', 'called', 'offered', 'assessed'];
  quotedSpeakerBonus.forEach(verb => {
    const speakerPattern = new RegExp(`([A-Z][a-z]+ [A-Z][a-z]+)\\s+${verb}`, 'g');
    let match;
    while ((match = speakerPattern.exec(articleText)) !== null) {
      const name = match[1];
      if (nameCounts[name]) {
        nameCounts[name] += 5; // Much higher bonus points for being a quoted speaker
      }
    }
  });
  
  // Give massive bonus to names that are directly quoted
  const directQuotePattern = /"([^"]+)"\s+([A-Z][a-z]+ [A-Z][a-z]+)/g;
  let quoteMatch;
  while ((quoteMatch = directQuotePattern.exec(articleText)) !== null) {
    const name = quoteMatch[2];
    if (nameCounts[name]) {
      nameCounts[name] += 10; // Massive bonus for being directly quoted
    }
  }
  
  // CRITICAL: Prioritize prominent political figures and key decision-makers over analysts
  const prominentPoliticalFigures = [
    'Donald Trump', 'Joe Biden', 'Barack Obama', 'Hillary Clinton', 'Mike Pence',
    'Kamala Harris', 'Nancy Pelosi', 'Mitch McConnell', 'Chuck Schumer',
    'Jerome Powell', 'Janet Yellen', 'Larry Summers', 'Jamie Dimon'
  ];
  
  // Give massive priority to prominent political figures
  prominentPoliticalFigures.forEach(figure => {
    if (nameCounts[figure]) {
      nameCounts[figure] += 50; // Massive bonus for prominent political figures
    }
  });
  
  // Penalize generic institutional names like "White House" when there are specific people quoted
  const genericNames = ['White House', 'Congress', 'Senate', 'House', 'Government', 'Administration'];
  const hasSpecificSpeakers = Object.keys(nameCounts).some(name => 
    !genericNames.includes(name) && nameCounts[name] > 2
  );
  
  if (hasSpecificSpeakers) {
    genericNames.forEach(genericName => {
      if (nameCounts[genericName]) {
        nameCounts[genericName] = Math.max(1, nameCounts[genericName] - 5); // Penalize generic names
      }
    });
  }
  
  // Filter out analyst names and problematic terms from the final list
  const analystNames = [
    'Oliver Rakau', 'Florence Schmit', 'Jensen Huang', 'Lisa Su',
    'Cathie Wood', 'Chamath Palihapitiya', 'Elon Musk', 'Mark Zuckerberg',
    'Tim Cook', 'Satya Nadella', 'Sundar Pichai'
  ];
  
  // Filter out problematic terms that shouldn't be used in headlines
  const problematicTerms = [
    'Also Read', 'Also', 'Read', 'Atse', 'ATSE', '1KOMMA5', 'KOMMA5',
    'White House', 'Congress', 'Senate', 'House', 'Government', 'Administration'
  ];
  
  // Remove analyst names and problematic terms from nameCounts
  analystNames.forEach(analystName => {
    delete nameCounts[analystName];
  });
  
  problematicTerms.forEach(term => {
    delete nameCounts[term];
  });
  
  const sortedNames = Object.keys(nameCounts).sort((a, b) => nameCounts[b] - nameCounts[a]);
  
  // Special handling: If the article starts with a specific person's assessment, prioritize them
  const firstParagraph = articleText.split('\n')[0] || articleText.substring(0, 200);
  const firstPersonPattern = /([A-Z][a-z]+ [A-Z][a-z]+)\s+(offered|expressed|assessed|said|noted)/;
  const firstPersonMatch = firstParagraph.match(firstPersonPattern);
  
  if (firstPersonMatch && nameCounts[firstPersonMatch[1]]) {
    // Move the first person mentioned to the top if they're a key source
    const firstPerson = firstPersonMatch[1];
    const filteredNames = sortedNames.filter(name => name !== firstPerson);
    return [firstPerson, ...filteredNames].slice(0, 5);
  }
  
  let finalNames = sortedNames.slice(0, 5);
  
  // If we don't have any names or the first name looks problematic, try to extract the main company
  if (finalNames.length === 0 || finalNames[0].length < 3) {
    // Look for common company patterns in the first few sentences
    const firstParagraph = articleText.split('\n')[0] || articleText.substring(0, 300);
    const companyMatch = firstParagraph.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(stated|announced|reported|said|confirmed)/i);
    if (companyMatch && companyMatch[1]) {
      finalNames = [companyMatch[1], ...finalNames];
    }
  }
  
  return finalNames;
}

export async function POST(request: Request) {
  try {
    const { articleText, action, selectedHeadline, enhancementType, specificQuote, customEnhancement, quote } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ error: 'Article text is required.' });
    }

    // Extract key names from article
    const keyNames = extractKeyNames(articleText);

    // Step 1: Generate initial headlines
    if (action === 'generate_initial') {
      const prompt = `
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

CRITICAL ACCURACY REQUIREMENTS:
- Headlines must be factually accurate to the article content
- Don't overstate competitive advantages or market impact
- If a company is "first" or "ahead," specify the context (deadline, timeline, etc.)
- If something is "threatening," explain what's actually at stake
- Avoid claiming someone is "the leader" unless the article explicitly states this
- Be specific about timing, deadlines, and competitive positioning
- Don't dramatize beyond what the facts support

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
- Use words like "dangerous," "terrified," "missing," "vulnerable," "hidden," "force"

${keyNames.length > 0 ? `KEY NAMES/ENTITIES TO PRIORITIZE (in order of importance):
${keyNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

CRITICAL: Start headlines with the FIRST key name listed above. This is the most important source/person in the article.` : 'NO PROMINENT NAMES AVAILABLE: Focus on the core story elements, key data points, and create curiosity-driven headlines that capture the main narrative without relying on specific people.'}

Article:
${articleText}

Respond with exactly 3 headlines, numbered 1-3, each using a different approach.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      });

      const text = completion.choices[0].message?.content || '';
      console.log('=== INITIAL HEADLINE GENERATION DEBUG ===');
      console.log('Raw AI response:', text);
      console.log('Raw response length:', text.length);
      console.log('Raw response ends with:', text.slice(-10));
      
      const headlines = text
        .split('\n')
        .map(line => line.replace(/^\d+\.?\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
        .map(headline => replaceAnalystNames(headline));

      return NextResponse.json({ 
        headlines,
        keyNames
      });
    }

    // Step 1.5: Incorporate selected quote into new headline
    if (action === 'incorporate_quote' && quote) {
      const prompt = `
You are a financial journalist writing clean, analytical headlines. Create exactly 1 compelling headline that incorporates the provided quote.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 1 headline - no more, no less
- Must be under 12 words
- MUST incorporate the provided quote naturally
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Use numerals for any data points
- Use single quotes (') around the quote - NEVER double quotes (")
- The quote should feel natural and enhance the headline, not forced
- Avoid secondary or tangential findings unless they're truly the main story

${keyNames.length > 0 ? `KEY NAMES/ENTITIES TO PRIORITIZE (in order of importance):
${keyNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

CRITICAL: Start headlines with the FIRST key name listed above. This is the most important source/person in the article.` : 'NO PROMINENT NAMES AVAILABLE: Focus on the core story elements, key data points, and create curiosity-driven headlines that capture the main narrative without relying on specific people.'}

QUOTE TO INCORPORATE: '${quote}'

HEADLINE EXAMPLES (showing how to naturally incorporate quotes):
- Survey: 55% Plan Car Purchases Amid 'Tariff Uncertainty'
- Middle-Income Americans Speed Up 'Car Buying Plans'
- 18% Accelerate Major Purchases Due to 'Price Concerns'

Article:
${articleText}

Respond with exactly 1 headline.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });

      const text = completion.choices[0].message?.content || '';
      console.log('=== INCORPORATE QUOTE DEBUG ===');
      console.log('Quote to incorporate:', quote);
      console.log('Raw AI response:', text);
      
      const headlines = text
        .split('\n')
        .map(line => line.replace(/^\d+\.?\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 1)
        .map(headline => replaceAnalystNames(headline));

      return NextResponse.json({ 
        headlines,
        keyNames
      });
    }

    // Step 2: Enhance selected headline
    if (action === 'enhance' && selectedHeadline) {
      let enhancementPrompt = '';
      
      switch (enhancementType) {
        case 'urgent':
          enhancementPrompt = `Make this headline more urgent and time-sensitive. Add words like "Breaking," "Just In," "Alert," or create immediate urgency. Focus on the most recent or surprising development.`;
          break;
        case 'specific':
          enhancementPrompt = `Add specific data points, numbers, or concrete details from the article to make this headline more precise and credible. Include exact figures, dates, or specific outcomes.`;
          break;
        case 'analyst':
          enhancementPrompt = `Reframe this headline to sound like expert analysis or insider insight. Add authority and expertise. Use phrases like "expert reveals," "insider says," or "analyst warns."`;
          break;
        case 'context':
          enhancementPrompt = `Add broader market context or industry implications to make this headline more relevant to investors. Connect to market trends, sector performance, or economic impact.`;
          break;
        case 'shorter':
          enhancementPrompt = `Make this headline shorter and punchier while keeping the key message. Aim for 6-8 words maximum. Remove unnecessary words but keep the core impact.`;
          break;
        case 'curiosity':
          enhancementPrompt = `Add intrigue and curiosity to make readers want to click. Use words that create mystery or promise revelation. Include phrases like "reveals," "exposes," "shocking," or "unexpected."`;
          break;
        case 'risk':
          enhancementPrompt = `Emphasize the risk, danger, or negative implications. Make it clear what's at stake. Use words like "warning," "danger," "threat," or "crisis."`;
          break;
        case 'quote':
          if (specificQuote) {
            enhancementPrompt = `Create a completely new headline variation built around this specific quote: "${specificQuote}". CRITICAL: Use ONLY single quotes (') - NEVER double quotes ("). ALWAYS include the closing quote mark. IMPORTANT: Create a DIFFERENT headline style than before - try a new approach, different structure, or alternative framing. Make the quote the central focus and build the headline around it. Only use this one quote, do not add any other quotes. MANDATORY: Every opening single quote (') must have a corresponding closing single quote ('). EXAMPLE: "Scaramucci Warns: 'If You Think The President Is Stupid, You Don't Know The President'"`;
          } else {
            enhancementPrompt = `Add a compelling statement that sounds like a direct quote but is actually a summary of key points from the article.`;
          }
          break;
        case 'custom':
          enhancementPrompt = customEnhancement || 'Improve this headline based on the article content.';
          break;
        default:
          enhancementPrompt = 'Improve this headline to make it more engaging and accurate.';
      }

      const prompt = `
You are a financial headline editor. Enhance this headline based on the specific instruction.

Original Headline: "${selectedHeadline}"

Enhancement Instruction: ${enhancementPrompt}

Article Context:
${articleText}

CRITICAL REQUIREMENTS:
- Keep the enhanced headline under 12 words
- Maintain the core message and accuracy
- Follow the specific enhancement instruction
- Make it more engaging and clickable
- Use numerals for any data points
- Start with the company name
- MANDATORY STRUCTURAL CHANGE: Use a COMPLETELY DIFFERENT structure than the original headline
- STRUCTURAL OPTIONS TO CHOOSE FROM:
  * Question format: "Will [Company] [Action] [Outcome]?"
  * Action-focused: "[Company] [Strong Verb] [Target/Outcome]"
  * Contrast format: "[Company] [Action] But [Unexpected Result]"
  * Revelation format: "[Company] [Reveals/Exposes/Unleashes] [Discovery]"
  * Impact format: "[Company] [Action] [Impact on Market/Sector]"
  * Warning format: "[Company] [Warns/Alert] [Risk/Threat]"
  * Transformation format: "From [Old State] To [New State]: [Company] [Action]"
  * Direct statement: "[Company] [Action] [Specific Outcome]"
- AVOID: Using the same structure as the original headline
- QUOTE FORMATTING: If using quotes, ALWAYS use ONLY single quotes (') - NEVER double quotes ("). ALWAYS include the closing quote mark. EXAMPLE: 'If You Think The President Is Stupid, You Don't Know The President'
- IMPORTANT: When incorporating quotes, restructure the entire headline around the quote - don't just insert it into the existing structure

Respond with the enhanced headline only.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.6,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });

      let enhancedHeadline = completion.choices[0].message?.content?.trim() || selectedHeadline;
      console.log('=== ENHANCEMENT DEBUG ===');
      console.log('Raw enhanced headline response:', completion.choices[0].message?.content);
      console.log('Raw response length:', completion.choices[0].message?.content?.length);
      console.log('Raw response ends with:', completion.choices[0].message?.content?.slice(-10));
      console.log('Processed enhanced headline:', enhancedHeadline);
      console.log('Enhanced headline length:', enhancedHeadline.length);
      console.log('Enhanced headline ends with:', enhancedHeadline.slice(-5));
      console.log('Single quotes count in enhanced headline:', (enhancedHeadline.match(/'/g) || []).length);
      console.log('Double quotes count in enhanced headline:', (enhancedHeadline.match(/"/g) || []).length);
      
      // Post-process to ensure quotes are properly closed for all enhancements
      enhancedHeadline = fixIncompleteQuotes(enhancedHeadline);
      
      // Additional safety check: if we have an odd number of single quotes, add closing quote
      const singleQuoteCount = (enhancedHeadline.match(/'/g) || []).length;
      if (singleQuoteCount % 2 === 1 && !enhancedHeadline.endsWith("'")) {
        console.log('SAFETY CHECK: Adding missing closing quote');
        enhancedHeadline = enhancedHeadline + "'";
      }

      return NextResponse.json({ 
        enhancedHeadline,
        originalHeadline: selectedHeadline,
        enhancementType,
        keyNames
      });
    }

    // Step 2.5: Generate completely new headline based on enhancement type
    if (action === 'generate_new' && enhancementType) {
      let enhancementPrompt = '';
      
      switch (enhancementType) {
        case 'urgent':
          enhancementPrompt = `Create a headline that emphasizes urgency and breaking news. Use words like "Breaking," "Just In," "Alert," or create immediate urgency. Focus on the most recent or surprising development.`;
          break;
        case 'specific':
          enhancementPrompt = `Create a headline with specific data points, numbers, or concrete details from the article. Include exact figures, dates, or specific outcomes to make it more precise and credible.`;
          break;
        case 'analyst':
          enhancementPrompt = `Create a headline that sounds like expert analysis or insider insight. Add authority and expertise. Use phrases like "expert reveals," "insider says," or "analyst warns."`;
          break;
        case 'context':
          enhancementPrompt = `Create a headline that adds broader market context or industry implications. Connect to market trends, sector performance, or economic impact to make it more relevant to investors.`;
          break;
        case 'shorter':
          enhancementPrompt = `Create a short and punchy headline while keeping the key message. Aim for 6-8 words maximum. Remove unnecessary words but keep the core impact.`;
          break;
        case 'curiosity':
          enhancementPrompt = `Create a headline with intrigue and curiosity to make readers want to click. Use words that create mystery or promise revelation. Include phrases like "reveals," "exposes," "shocking," or "unexpected."`;
          break;
        case 'risk':
          enhancementPrompt = `Create a headline that emphasizes the risk, danger, or negative implications. Make it clear what's at stake. Use words like "warning," "danger," "threat," or "crisis."`;
          break;
        case 'quote':
          if (specificQuote) {
            enhancementPrompt = `Create a headline built around this specific quote: "${specificQuote}". CRITICAL: Use ONLY single quotes (') - NEVER double quotes ("). ALWAYS include the closing quote mark. Make the quote the central focus and build the headline around it. Only use this one quote, do not add any other quotes. MANDATORY: Every opening single quote (') must have a corresponding closing single quote ('). EXAMPLE: "Scaramucci Warns: 'If You Think The President Is Stupid, You Don't Know The President'"`;
          } else {
            enhancementPrompt = `Create a headline with a compelling statement that sounds like a direct quote but is actually a summary of key points from the article.`;
          }
          break;
        case 'custom':
          enhancementPrompt = customEnhancement || 'Create a headline based on the article content.';
          break;
        default:
          enhancementPrompt = 'Create an engaging and accurate headline.';
      }

      const prompt = `
You are a financial journalist writing clean, analytical headlines. Create exactly 1 compelling headline based on the specific instruction.

${keyNames.length > 0 ? `KEY NAMES/ENTITIES TO PRIORITIZE (in order of importance):
${keyNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

CRITICAL: Start headlines with the FIRST key name listed above. This is the most important source/person in the article.` : 'NO PROMINENT NAMES AVAILABLE: Focus on the core story elements, key data points, and create curiosity-driven headlines that capture the main narrative without relying on specific people.'}

Enhancement Instruction: ${enhancementPrompt}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 1 headline - no more, no less
- Must be under 12 words
- Use natural sentence structure - no colons, dashes, or excessive punctuation
- Focus on one clear point per headline
- Use plain, everyday language - no jargon or dramatic verbs
- Include specific numbers in only ONE headline per set
- Start with the company name or key entity
- Make each headline read like a natural sentence
- Focus on implications and meaning, not just facts

HEADLINE APPROACHES TO CHOOSE FROM:
1. **Stakes**: What's really at risk or up for grabs?
2. **Drama**: What's the most surprising or dramatic angle?
3. **Competitive Threat**: How does this threaten or advantage rivals?
4. **Market Impact**: How does this change the game for everyone?
5. **Broader Significance**: Why does this matter beyond just the company?

EXAMPLES OF GOOD HEADLINES:
- "New York's Office Boom Stands Alone As Most US Cities Stay Remote"
- "Tesla Faces Growing Competition In Electric Vehicle Market"
- "Federal Reserve Signals Potential Rate Cuts Ahead"
- "Tech Giants Struggle With AI Talent Shortage"
- "Oil Prices Fall Amid Global Economic Concerns"

HEADLINE FOCUS:
- Focus on what the story MEANS, not just what it SAYS
- Emphasize implications, trends, and broader significance
- Include specific numbers in only ONE headline per set
- Use the other headlines to explore different angles and perspectives
- Ask "so what?" - what does this mean for investors, markets, or the industry?
- Look for the most compelling angle: competitive advantage, market disruption, strategic positioning, or industry transformation
- Find the "hook" that makes this story significant beyond just the facts

CRITICAL: Make headlines that make readers WANT to click. Ask yourself:
- What's really at stake here?
- Why should anyone care about this story?
- What's the most dramatic or surprising angle?
- What's the competitive or market impact?
- What's the broader significance beyond just the company?

AVOID: Generic news headlines that just report facts
AIM FOR: Headlines that reveal stakes, drama, or competitive dynamics

AVOID:
- Colons, dashes, or excessive punctuation
- Dramatic verbs like "sparks," "ignites," "plummets," "soars"
- Multiple data points crammed together
- Sensational or clickbait language
- Repetitive structures

Article:
${articleText}

Respond with exactly 1 headline using a clean, analytical approach.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });

      const text = completion.choices[0].message?.content || '';
      console.log('=== GENERATE NEW HEADLINE DEBUG ===');
      console.log('Enhancement type:', enhancementType);
      console.log('Raw AI response:', text);
      
      const headlines = text
        .split('\n')
        .map(line => line.replace(/^\d+\.?\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 1)
        .map(headline => replaceAnalystNames(headline));

      return NextResponse.json({ 
        headlines,
        keyNames
      });
    }

    return NextResponse.json({ error: 'Invalid action specified.' });
  } catch (error) {
    console.error('Error in headline workshop:', error);
    return NextResponse.json({ error: 'Failed to process headline workshop request.' }, { status: 500 });
  }
}



// Function to replace analyst names with "Analyst" in headlines
function replaceAnalystNames(headline: string): string {
  // List of analyst names that should be replaced
  const analystNames = [
    'Oliver Rakau',
    'Florence Schmit', 
    'Jensen Huang',
    'Lisa Su',
    'Cathie Wood',
    'Chamath Palihapitiya',
    'Elon Musk',
    'Mark Zuckerberg',
    'Tim Cook',
    'Satya Nadella',
    'Sundar Pichai'
  ];
  
  let cleanedHeadline = headline;
  
  // Replace analyst names at the start of headlines
  analystNames.forEach(name => {
    const patterns = [
      new RegExp(`^${name}:\\s*`, 'gi'), // "Name: "
      new RegExp(`^${name}\\s+`, 'gi'), // "Name " at start
    ];
    
    patterns.forEach(pattern => {
      cleanedHeadline = cleanedHeadline.replace(pattern, 'Analyst ');
    });
  });
  
  return cleanedHeadline;
} 