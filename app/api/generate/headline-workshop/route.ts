import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to extract direct quotes from article text
function extractQuotes(articleText: string): string[] {
  const quotes: string[] = [];
  
  console.log('=== QUOTE EXTRACTION DEBUG ===');
  console.log('Article text length:', articleText.length);
  console.log('Article text sample:', articleText.substring(0, 500));
  
  // Test if there are any quotes at all in the text
  const allQuotes = articleText.match(/"[^"]*"/g);
  console.log('All double quotes found in text:', allQuotes);
  
  const allSingleQuotes = articleText.match(/'[^']*'/g);
  console.log('All single quotes found in text:', allSingleQuotes);
  
  // Match text within double quotes (including smart quotes)
  const doubleQuoteRegex = /["""]([^"""]+)["""]/g;
  let match;
  console.log('Searching for double quotes...');
  while ((match = doubleQuoteRegex.exec(articleText)) !== null) {
    console.log('Found double quote:', match[1]);
    if (match[1].length > 5 && match[1].length < 300) { // More flexible quote length
      quotes.push(match[1]);
      console.log('Added double quote:', match[1]);
    } else {
      console.log('Skipped double quote (length):', match[1], 'length:', match[1].length);
    }
  }
  
  // Match text within single quotes (including smart quotes)
  const singleQuoteRegex = /[''']([^''']+)[''']/g;
  console.log('Searching for single quotes...');
  while ((match = singleQuoteRegex.exec(articleText)) !== null) {
    console.log('Found single quote:', match[1]);
    if (match[1].length > 5 && match[1].length < 300) { // More flexible quote length
      quotes.push(match[1]);
      console.log('Added single quote:', match[1]);
    } else {
      console.log('Skipped single quote (length):', match[1], 'length:', match[1].length);
    }
  }
  
  // Sort quotes by impact (prioritize quotes with strong opinions, surprising statements, or key insights)
  const sortedQuotes = quotes.sort((a, b) => {
    const impactWords = [
      // Strong opinions and assessments
      'biggest', 'greatest', 'stupid', 'smart', 'clever', 'mistake', 'comeback', 'historic', 
      'surprising', 'shocking', 'unexpected', 'don\'t know', 'you don\'t', 'very smart', 
      'fifth grader', 'political history', 'reality television', 'real estate',
      // Financial and energy terms
      'clear', 'political', 'win', 'significant', 'implementation', 'risks', 'ambitious',
      'billion', 'million', 'trillion', 'percent', 'annually', 'energy', 'export', 'import',
      'deal', 'agreement', 'pact', 'trade', 'market', 'sector', 'industry', 'infrastructure',
      'supply', 'demand', 'volume', 'capacity', 'investment', 'growth', 'boom', 'surge',
      'revival', 'transformation', 'shift', 'pivot', 'game changer', 'catalyst',
      // Risk and uncertainty terms
      'warning', 'danger', 'threat', 'crisis', 'concern', 'skepticism', 'doubt', 'question',
      'challenge', 'obstacle', 'barrier', 'limitation', 'constraint', 'pressure'
    ];
    
    // Calculate impact score
    const aImpact = impactWords.filter(word => a.toLowerCase().includes(word)).length;
    const bImpact = impactWords.filter(word => b.toLowerCase().includes(word)).length;
    
    // Bonus for quotes that are direct statements about people or key entities
    const personQuoteBonus = (quote: string) => {
      const personWords = ['president', 'trump', 'he', 'his', 'him', 'eu', 'europe', 'u.s.', 'united states', 'america'];
      return personWords.filter(word => quote.toLowerCase().includes(word)).length;
    };
    
    const aBonus = personQuoteBonus(a);
    const bBonus = personQuoteBonus(b);
    
    // Bonus for shorter, punchier quotes (better for headlines)
    const aLengthBonus = a.length < 50 ? 2 : (a.length < 100 ? 1 : 0);
    const bLengthBonus = b.length < 50 ? 2 : (b.length < 100 ? 1 : 0);
    
    // Bonus for quotes with numbers (more specific and credible)
    const aNumberBonus = /\d/.test(a) ? 3 : 0;
    const bNumberBonus = /\d/.test(b) ? 3 : 0;
    
    // Bonus for quotes that sound like assessments or predictions
    const assessmentWords = ['clear', 'significant', 'ambitious', 'highly', 'really', 'truly', 'actually'];
    const aAssessmentBonus = assessmentWords.filter(word => a.toLowerCase().includes(word)).length;
    const bAssessmentBonus = assessmentWords.filter(word => b.toLowerCase().includes(word)).length;
    
    const aTotal = aImpact + aBonus + aLengthBonus + aNumberBonus + aAssessmentBonus;
    const bTotal = bImpact + bBonus + bLengthBonus + bNumberBonus + bAssessmentBonus;
    
    return bTotal - aTotal; // Higher impact first
  });
  
  const finalQuotes = sortedQuotes.slice(0, 3); // Return top 3 most impactful quotes
  
  // Debug logging
  console.log('=== QUOTE EXTRACTION DEBUG ===');
  console.log('All quotes found:', quotes);
  console.log('Sorted quotes:', sortedQuotes);
  console.log('Final quotes returned:', finalQuotes);
  
  return finalQuotes;
}

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
  
  // Filter out analyst names from the final list
  const analystNames = [
    'Oliver Rakau', 'Florence Schmit', 'Jensen Huang', 'Lisa Su',
    'Cathie Wood', 'Chamath Palihapitiya', 'Elon Musk', 'Mark Zuckerberg',
    'Tim Cook', 'Satya Nadella', 'Sundar Pichai'
  ];
  
  // Remove analyst names from nameCounts
  analystNames.forEach(analystName => {
    delete nameCounts[analystName];
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
  
  return sortedNames.slice(0, 5);
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
You are a top-tier financial headline writer. Generate exactly 3 diverse, compelling headlines for this article.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 15 words and highly clickable
- Focus on the MAIN STORY and most important finding from the article
- Use vivid, specific language - avoid generic terms like "analyst says"
- NEVER start headlines with "Analyst" - use specific company names, people, or entities
- Use strong action verbs like "ignited," "crushing," "unhinged," "dominating"
- Create intrigue while providing enough context to understand the topic
- Use metaphors and personification when appropriate
- Use numerals for any data points
- Create natural flow without awkward punctuation
- Make each headline engaging and curiosity-driven
- VARY THE STRUCTURE - don't use colons in every headline
- Use different approaches: questions, statements, revelations, contrasts
- ALWAYS prioritize the primary narrative and key data points from the article
- Avoid secondary or tangential findings unless they're truly the main story
- FOCUS ON THE CORE STORY: Don't just report market reactions - capture the strategic significance, political implications, or transformative potential
- CREATE CURIOSITY: Use questions, revelations, or contrasts that make readers want to learn more
- AVOID GENERIC PHRASES: Replace "But Will It Last?" with specific, story-relevant questions or statements
- QUOTES CAN STAND ALONE: When using quotes, you don't need to mention who said them - just use the quote itself for impact

${keyNames.length > 0 ? `KEY NAMES/ENTITIES TO PRIORITIZE (in order of importance):
${keyNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

CRITICAL: Start headlines with the FIRST key name listed above. This is the most important source/person in the article.` : 'NO PROMINENT NAMES AVAILABLE: Focus on the core story elements, key data points, and create curiosity-driven headlines that capture the main narrative without relying on specific people.'}

HEADLINE EXAMPLES (showing the style and quality you should aim for):
- "Trump's $750B Energy Gamble: Can Europe Really Fuel A U.S. Export Revival?"
- "Energy Sector's Comeback Story: How A $750B Deal Could Reverse Years Of Underperformance"
- "The $750B Question: Will Europe's Energy Pivot Finally Lift U.S. Stocks?"
- "From Laggard To Leader: Energy Stocks Eye $750B EU Deal As Game Changer"
- "Europe's Energy Bet: Can $750B In U.S. Exports Revive A Struggling Sector?"

Article:
${articleText}

Respond with exactly 3 headlines, numbered 1-3.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
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
You are a top-tier financial headline writer. Create exactly 1 compelling headline that incorporates the provided quote.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 1 headline - no more, no less
- Must be under 12 words and highly clickable
- MUST incorporate the provided quote naturally
- Focus on the MAIN STORY and most important finding from the article
- Use plain, everyday language—no jargon
- Use numerals for any data points
- Create natural flow without awkward punctuation
- Make the headline engaging and curiosity-driven
- Use single quotes (') around the quote - NEVER double quotes (")
- The quote should feel natural and enhance the headline, not forced
- ALWAYS prioritize the primary narrative and key data points from the article
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
        quotes,
        hasQuotes: quotes.length > 0,
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
          } else if (quotes.length > 0) {
            enhancementPrompt = `Create a headline that incorporates a brief, impactful quote snippet (3-5 words) from the article. CRITICAL: Use ONLY single quotes (') - NEVER double quotes ("). ALWAYS include the closing quote mark. Available quotes: ${quotes.map(q => `"${q}"`).join(', ')}`;
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
You are a top-tier financial headline writer. Create exactly 1 compelling headline based on the specific instruction.

${keyNames.length > 0 ? `KEY NAMES/ENTITIES TO PRIORITIZE (in order of importance):
${keyNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

CRITICAL: Start headlines with the FIRST key name listed above. This is the most important source/person in the article.` : 'NO PROMINENT NAMES AVAILABLE: Focus on the core story elements, key data points, and create curiosity-driven headlines that capture the main narrative without relying on specific people.'}

Enhancement Instruction: ${enhancementPrompt}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 1 headline - no more, no less
- Must be under 12 words and highly clickable
- Focus on the MAIN STORY and most important finding from the article
- Use plain, everyday language—no jargon
- Use numerals for any data points
- Create natural flow without awkward punctuation
- Make the headline engaging and curiosity-driven
- VARY THE STRUCTURE - don't use colons in every headline
- Use different approaches: questions, statements, revelations, contrasts
- ALWAYS prioritize the primary narrative and key data points from the article
- Avoid secondary or tangential findings unless they're truly the main story

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
        quotes,
        hasQuotes: quotes.length > 0,
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