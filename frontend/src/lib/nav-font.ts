export function getNavLabelFontClass(text: string) {
  const hasLatin = /[A-Za-z]/.test(text);
  const hasCjk = /[\u4e00-\u9fff]/.test(text);

  if (hasLatin && !hasCjk) {
    return 'font-sans';
  }

  if (hasCjk && !hasLatin) {
    return 'font-nav-cjk';
  }

  return 'font-nav';
}
