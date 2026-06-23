export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function isWordCountInRange(
  text: string,
  min: number,
  max: number
): boolean {
  const count = countWords(text);
  return count >= min && count <= max;
}
