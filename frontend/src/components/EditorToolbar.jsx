import { FiBold, FiItalic, FiLink, FiImage, FiCode, FiList, FiMessageSquare } from 'react-icons/fi';
import { LuHeading2, LuListOrdered, LuFileCode } from 'react-icons/lu';
import Tooltip from './Tooltip';
import { MARKDOWN_TOOLS } from '../lib/markdownTools';

const ICONS = {
  bold: FiBold,
  italic: FiItalic,
  heading: LuHeading2,
  quote: FiMessageSquare,
  code: FiCode,
  codeblock: LuFileCode,
  bullet: FiList,
  numbered: LuListOrdered,
  link: FiLink,
  image: FiImage,
};

const formatShortcut = (shortcut) => {
  if (!shortcut) return '';
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return ` (${shortcut.replace('Mod', isMac ? 'Cmd' : 'Ctrl')})`;
};

const EditorToolbar = ({ textareaRef, value, onChange }) => {
  const handleClick = (tool) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { next, cursorPos, selectionEndPos } = tool.apply(textarea);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, selectionEndPos ?? cursorPos);
    });
  };

  return (
    <div className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 border-dark-200 bg-surface-muted p-1.5 dark:border-dark-700">
      {MARKDOWN_TOOLS.map((tool) => {
        const Icon = ICONS[tool.id];
        return (
          <Tooltip key={tool.id} label={`${tool.label}${formatShortcut(tool.shortcut)}`}>
            <button
              type="button"
              onClick={() => handleClick(tool)}
              className="flex h-7 w-7 items-center justify-center rounded text-dark-600 transition-colors hover:bg-dark-200/70 hover:text-dark-800 dark:text-dark-300 dark:hover:bg-dark-700 dark:hover:text-dark-100">
              <Icon size={15} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default EditorToolbar;
