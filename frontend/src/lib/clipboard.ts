/**
 * Copy text to the clipboard.
 * Prefers the async Clipboard API, then falls back to execCommand for
 * non-secure contexts (e.g. http://192.168.x.x) where clipboard.writeText fails.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function' &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to legacy path.
    }
  }

  copyTextWithExecCommand(text);
}

function copyTextWithExecCommand(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  textarea.style.opacity = '0';

  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    textarea.remove();
  }

  if (!ok) {
    throw new Error('复制失败');
  }
}
