export function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
}

export function cleanHeadline(text: string, removeAllExclamations = false) {
  let cleaned = text
    .replace(/^["""']+|["""']+$/g, '')
    .replace(/\*\*/g, '')
    .trim();

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

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
} 