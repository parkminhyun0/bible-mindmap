export function strongNumberForExternalLink(strong) {
  if (!strong || typeof strong !== 'string') return '';
  const withoutPrefix = strong.trim().replace(/^[GH]/i, '');
  const match = withoutPrefix.match(/^0*([1-9]\d*[a-z]?)$/i);
  return match?.[1] || '';
}

export function biblehubStrongUrl(strong, isHebrew) {
  const num = strongNumberForExternalLink(strong);
  if (!num) return '';
  return `https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${num}.htm`;
}
