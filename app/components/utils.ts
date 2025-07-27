export function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
}

export function cleanHeadline(text: string, removeAllExclamations = false) {
  console.log('=== CLEAN HEADLINE DEBUG ===');
  console.log('Input text:', text);
  console.log('Input length:', text.length);
  console.log('Input ends with:', text.slice(-5));
  console.log('Single quotes count:', (text.match(/'/g) || []).length);
  console.log('Double quotes count:', (text.match(/"/g) || []).length);
  
  // First, normalize all quotes to double quotes for consistent processing
  let cleaned = text
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
  
  // Handle mixed quote patterns like "phrase' -> 'phrase'
  cleaned = cleaned.replace(/"([^"]+)'/g, "'$1'");
  
  // Additional cleanup: convert any remaining double quotes to single quotes
  cleaned = cleaned.replace(/"/g, "'");
  
  // Final safety check: ensure single quotes are balanced
  const finalSingleQuoteCount = (cleaned.match(/'/g) || []).length;
  if (finalSingleQuoteCount % 2 === 1 && !cleaned.trim().endsWith("'")) {
    console.log('FINAL SAFETY CHECK: Adding missing closing quote');
    cleaned = cleaned + "'";
  }
    
  console.log('After cleaning:', cleaned);
  console.log('Cleaned length:', cleaned.length);
  console.log('Cleaned ends with:', cleaned.slice(-5));
  console.log('Final single quotes count:', (cleaned.match(/'/g) || []).length);

  if (removeAllExclamations) {
    cleaned = cleaned.replace(/!/g, '');
  } else {
    cleaned = cleaned.replace(/!+$/g, '');
  }

  // Convert ALL CAPS words to proper title case
  cleaned = cleaned.replace(/\b[A-Z]{2,}\b/g, (match) => {
    // Keep common acronyms in caps (like "CO", "NOW", "3", etc.)
    if (match.length <= 3 || /^\d+$/.test(match)) {
      return match;
    }
    // Convert longer ALL CAPS words to title case
    return match.charAt(0) + match.slice(1).toLowerCase();
  });

  return toTitleCase(cleaned);
}

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

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
} 