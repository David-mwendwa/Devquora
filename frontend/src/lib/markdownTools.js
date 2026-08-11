// Shared markdown-editing primitives so the toolbar buttons and keyboard
// shortcuts in the Editor both drive the same textarea-splicing logic
// instead of duplicating it in two places.

export const wrapSelection = (textarea, before, after = before) => {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  const cursorPos = selected
    ? selectionStart + before.length
    : selectionStart + before.length;
  const selectionEndPos = selected
    ? cursorPos + selected.length
    : cursorPos;
  return { next, cursorPos, selectionEndPos };
};

export const linePrefix = (textarea, prefix) => {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  const cursorPos = selectionStart + prefix.length;
  return { next, cursorPos, selectionEndPos: cursorPos };
};

// `shortcut` is display-only metadata (shown in the button title/tooltip) —
// actual key handling lives in Editor.jsx's onKeyDown, matched by `id`.
export const MARKDOWN_TOOLS = [
  { id: 'bold', label: 'Bold', shortcut: 'Mod+B', apply: (t) => wrapSelection(t, '**') },
  { id: 'italic', label: 'Italic', shortcut: 'Mod+I', apply: (t) => wrapSelection(t, '_') },
  { id: 'heading', label: 'Heading', apply: (t) => linePrefix(t, '## ') },
  { id: 'quote', label: 'Quote', apply: (t) => linePrefix(t, '> ') },
  { id: 'code', label: 'Inline code', apply: (t) => wrapSelection(t, '`') },
  { id: 'codeblock', label: 'Code block', apply: (t) => wrapSelection(t, '\n```js\n', '\n```\n') },
  { id: 'bullet', label: 'Bullet list', apply: (t) => linePrefix(t, '- ') },
  { id: 'numbered', label: 'Numbered list', apply: (t) => linePrefix(t, '1. ') },
  { id: 'link', label: 'Link', shortcut: 'Mod+K', apply: (t) => wrapSelection(t, '[', '](url)') },
  { id: 'image', label: 'Image', apply: (t) => wrapSelection(t, '![alt text](', ')') },
];

export const SHORTCUT_TOOL_IDS = {
  b: 'bold',
  i: 'italic',
  k: 'link',
};
