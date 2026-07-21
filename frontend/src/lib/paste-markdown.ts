/** Use markdown paste only when fenced code blocks would be lost in HTML. */
export const shouldPreferMarkdownPaste = (text: string): boolean =>
  /^```[\s\S]*?^```/m.test(text) ||
  /^~~~[\s\S]*?^~~~/m.test(text) ||
  /^(`{3,}|~{3,})/m.test(text);
