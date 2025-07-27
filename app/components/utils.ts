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
  
  // Convert double quotes around phrases to single quotes
  // This handles cases like "phrase" -> 'phrase'
  cleaned = cleaned.replace(/"([^"]+)"/g, "'$1'");
  
  // Handle mixed quote patterns like "phrase' -> 'phrase'
  cleaned = cleaned.replace(/"([^"]+)'/g, "'$1'");
  
  // Additional cleanup: convert any remaining double quotes to single quotes
  cleaned = cleaned.replace(/"/g, "'");
  
  // NEW: Comprehensive quote balancing
  cleaned = balanceQuotesComprehensively(cleaned);
    
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

function balanceQuotesComprehensively(text: string): string {
  console.log('=== COMPREHENSIVE QUOTE BALANCING ===');
  console.log('Input text:', text);
  
  // First, let's parse the text to understand its structure
  const words = text.split(/\s+/);
  console.log('Words:', words);
  
  // Count different types of single quotes
  let openingQuotes = 0;
  let closingQuotes = 0;
  let apostrophes = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Count apostrophes (like in "Trump's", "don't", etc.)
    const apostropheMatches = word.match(/'/g);
    if (apostropheMatches) {
      // Check if it's a legitimate apostrophe pattern
      if (/\w'\w/.test(word) || /\w'(s|t|re|ve|ll|d)\b/i.test(word)) {
        apostrophes += apostropheMatches.length;
        console.log(`Word "${word}" contains ${apostropheMatches.length} apostrophe(s)`);
      }
    }
    
    // Count opening quotes (quote at start of word)
    if (word.startsWith("'")) {
      openingQuotes++;
      console.log(`Word "${word}" starts with opening quote`);
    }
    
    // Count closing quotes (quote at end of word)
    if (word.endsWith("'")) {
      closingQuotes++;
      console.log(`Word "${word}" ends with closing quote`);
    }
  }
  
  console.log(`Analysis: ${openingQuotes} opening quotes, ${closingQuotes} closing quotes, ${apostrophes} apostrophes`);
  
  // If opening and closing quotes are balanced, we're good
  if (openingQuotes === closingQuotes) {
    console.log('Opening and closing quotes are balanced, no action needed');
    return text;
  }
  
  // If we have more opening quotes than closing quotes, we need to add a closing quote
  if (openingQuotes > closingQuotes) {
    console.log(`Need to add ${openingQuotes - closingQuotes} closing quote(s)`);
    return text + "'";
  }
  
  // If we have more closing quotes than opening quotes, something is wrong
  if (closingQuotes > openingQuotes) {
    console.log(`Warning: More closing quotes than opening quotes. This might indicate an error.`);
    // Don't add anything, just return as is
    return text;
  }
  
  // If we get here, quotes are balanced
  console.log('Quotes are balanced, no action needed');
  return text;
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
} 