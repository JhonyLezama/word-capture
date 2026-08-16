export function generateId() {
  return `w_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function sanitizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '');
}

export function isValidWord(text) {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.trim();
  if (cleaned.length < 2 || cleaned.length > 50) return false;
  return /^[a-zA-Z\s'-]+$/.test(cleaned);
}
