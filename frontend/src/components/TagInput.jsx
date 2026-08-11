import { useState } from 'react';

const TagInput = ({ tags, onChange, max = 5 }) => {
  const [draft, setDraft] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || tags.includes(tag) || tags.length >= max) return;
    onChange([...tags, tag]);
    setDraft('');
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 rounded-md border border-dark-200 bg-surface px-2 py-1.5 focus-within:border-primary-500 dark:border-dark-700 sm:w-72">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300">
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-primary-400 hover:text-primary-700"
            aria-label={`Remove ${tag}`}>
            &times;
          </button>
        </span>
      ))}
      {tags.length < max && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={tags.length === 0 ? 'Add up to 5 tags...' : ''}
          className="min-w-[6rem] flex-1 border-none bg-transparent text-sm focus:outline-none"
        />
      )}
    </div>
  );
};

export default TagInput;
