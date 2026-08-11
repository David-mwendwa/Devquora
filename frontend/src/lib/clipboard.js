// navigator.clipboard.writeText rejects outright in insecure contexts, some
// iframes, and when permission is denied — callers that don't catch that
// (as both the Share button and the code-block Copy button didn't) silently
// do nothing on click. This tries the modern API, falls back to the classic
// execCommand trick, and only returns false once both have failed.
export const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy fallback below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};
