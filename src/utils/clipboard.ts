/**
 * Cross-platform clipboard utility that works reliably on:
 * - Desktop browsers (Chrome, Edge, Safari, Firefox)
 * - Mobile browsers (iOS Safari, Android Chrome, mobile webviews)
 * - Both HTTPS and HTTP environments
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API first if available in secure context
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Async Clipboard API failed, trying fallback textarea:', err);
    }
  }

  // 2. Fallback using temporary textarea (works in iOS Safari, Android Chrome, and HTTP)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Keep off-screen and invisible without display:none so selection works
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.zIndex = '-9999';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);

    // On iOS Safari, we must focus and select range explicitly
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('execCommand copy fallback failed:', err);
    return false;
  }
}
