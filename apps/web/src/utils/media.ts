/**
 * Returns true if the icon string represents an image URL, data URI, or local path
 * rather than an inline emoji character.
 */
export function isImageUrl(val: string): boolean {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('data:image/') ||
    val.startsWith('/')
  );
}
