import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  FiHelpCircle,
  FiSave,
  FiSend,
  FiAlertCircle,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiX,
  FiImage,
} from 'react-icons/fi';
import Tooltip from '../components/Tooltip';
import { createPost, updatePost, fetchPostForEdit } from '../api/posts';
import ErrorState from '../components/ErrorState';
import getErrorMessage from '../utils/getErrorMessage';
import CodeBlock from '../components/CodeBlock';
import EditorToolbar from '../components/EditorToolbar';
import TagInput from '../components/TagInput';
import { MARKDOWN_TOOLS, SHORTCUT_TOOL_IDS } from '../lib/markdownTools';
import { markdownRehypePlugins } from '../lib/markdownRehype';
import { cleanLiquidTags } from '../lib/liquidTags';
import usePageMeta from '../lib/pageMeta';

const WORDS_PER_MINUTE = 200;
const TITLE_MAX = 100;
const EXCERPT_MAX = 200;
const AUTOSAVE_DELAY_MS = 800;

const CHEATSHEET = [
  { syntax: '## Heading', result: 'Section heading' },
  { syntax: '**bold**', result: 'Bold text' },
  { syntax: '_italic_', result: 'Italic text' },
  { syntax: '[text](url)', result: 'Link' },
  { syntax: '`code`', result: 'Inline code' },
  { syntax: '```js ... ```', result: 'Fenced code block with syntax highlighting' },
  { syntax: '- item', result: 'Bullet list' },
  { syntax: '> quote', result: 'Blockquote' },
];

const EMPTY_DRAFT = {
  title: '',
  excerpt: '',
  tags: [],
  coverImageUrl: '',
  content:
    '## Start with your main point\n\nWrite the way you would explain this to a teammate. Use headings to break up sections, and reach for a code block whenever you show something instead of describing it.',
};

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const draftKey = `devquora-draft-${id || 'new'}`;

  const [existing, setExisting] = useState(null);
  // 'ready' straight away for /post/new — there's nothing to fetch.
  const [loadState, setLoadState] = useState(id ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  // The last saved values, for the dirty check. Starts at the empty draft and is
  // replaced once an existing post loads (or after a successful save).
  const [initial, setInitial] = useState(EMPTY_DRAFT);

  usePageMeta(existing ? `Edit "${existing.title}"` : 'Write a post', 'Write and publish a markdown post on Devquora.', { noindex: true });

  const [title, setTitle] = useState(EMPTY_DRAFT.title);
  const [excerpt, setExcerpt] = useState(EMPTY_DRAFT.excerpt);
  const [tags, setTags] = useState(EMPTY_DRAFT.tags);
  const [coverImageUrl, setCoverImageUrl] = useState(EMPTY_DRAFT.coverImageUrl);
  const [content, setContent] = useState(EMPTY_DRAFT.content);
  const [status, setStatus] = useState('idle');
  const [showHelp, setShowHelp] = useState(false);
  const [mobilePane, setMobilePane] = useState('write');
  const [autosavedAt, setAutosavedAt] = useState(null);
  const [restorable, setRestorable] = useState(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const skipNextAutosave = useRef(true);
  // Which post id the form currently holds. Saving a brand-new draft rewrites
  // the URL to /post/:id/edit; without this the id change would refetch and
  // clobber the text still sitting in the textarea.
  const loadedId = useRef(null);

  useEffect(() => {
    if (!id || loadedId.current === id) return undefined;
    let cancelled = false;
    setLoadState('loading');
    fetchPostForEdit(id)
      .then((post) => {
        if (cancelled) return;
        loadedId.current = id;
        const loaded = {
          title: post.title,
          excerpt: post.excerpt || '',
          tags: post.tags || [],
          coverImageUrl: post.coverImageUrl || '',
          content: post.content,
        };
        // Hydrating counts as the baseline, not an edit — otherwise the
        // autosave fires immediately and the form reads as dirty on arrival.
        skipNextAutosave.current = true;
        setExisting(post);
        setInitial(loaded);
        setTitle(loaded.title);
        setExcerpt(loaded.excerpt);
        setTags(loaded.tags);
        setCoverImageUrl(loaded.coverImageUrl);
        setContent(loaded.content);
        setLoadState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getErrorMessage(err));
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // On first mount, offer to restore a locally-saved draft rather than
  // silently overwriting it — covers the "closed the tab by accident" case.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setRestorable(JSON.parse(raw));
    } catch {
      // ignore corrupt/unavailable localStorage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = useMemo(
    () =>
      title !== initial.title ||
      excerpt !== initial.excerpt ||
      content !== initial.content ||
      coverImageUrl !== initial.coverImageUrl ||
      tags.length !== initial.tags.length ||
      tags.some((t, i) => t !== initial.tags[i]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, excerpt, content, coverImageUrl, tags]
  );

  // Debounced autosave to localStorage — separate from the mocked backend
  // save so in-progress writing survives an accidental reload/tab close.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title, excerpt, tags, coverImageUrl, content, savedAt: Date.now() })
        );
        setAutosavedAt(Date.now());
      } catch {
        // localStorage full/unavailable — non-fatal, just skip autosave
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, excerpt, tags, coverImageUrl, content, draftKey]);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);
  const readTime = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  // Cleans dev.to Liquid tags for the preview only — never mutates `content`
  // itself, so pasting dev.to source in doesn't silently rewrite the textarea.
  const previewContent = useMemo(() => cleanLiquidTags(content), [content]);

  const restoreDraft = () => {
    if (!restorable) return;
    setTitle(restorable.title ?? '');
    setExcerpt(restorable.excerpt ?? '');
    setTags(restorable.tags ?? []);
    setCoverImageUrl(restorable.coverImageUrl ?? '');
    setContent(restorable.content ?? '');
    setRestorable(null);
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setRestorable(null);
  };

  const handleSave = async (publish) => {
    if (!title.trim()) {
      setStatus('error-title');
      return;
    }

    setStatus('saving');
    setSaveError(null);
    const payload = {
      title,
      excerpt,
      content,
      coverImageUrl,
      tags,
      status: publish ? 'published' : 'draft',
    };

    try {
      const post = existing ? await updatePost(existing.id, payload) : await createPost(payload);
      // The server copy is now the baseline, so the local autosave has nothing
      // left to protect.
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      setInitial({ title, excerpt, tags, coverImageUrl, content });

      if (publish) {
        navigate(`/post/${post.slug}`);
        return;
      }

      setExisting(post);
      setStatus('saved');
      // A new draft has an id now — move onto its edit URL so the next save
      // updates it instead of creating a second copy.
      if (!existing) {
        loadedId.current = post.id;
        navigate(`/post/${post.id}/edit`, { replace: true });
      }
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setStatus('error-save');
    }
  };

  const handleCoverDrop = (e) => {
    e.preventDefault();
    setIsDraggingCover(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setCoverImageUrl(reader.result);
      reader.readAsDataURL(file);
      return;
    }

    // Dragging an image from another tab/window (rather than a local file)
    // hands over its URL as text, not a File.
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url) setCoverImageUrl(url.trim());
  };

  const applyTool = useCallback((tool) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { next, cursorPos, selectionEndPos } = tool.apply(textarea);
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, selectionEndPos ?? cursorPos);
    });
  }, []);

  const handleTextareaKeyDown = (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;
    const toolId = SHORTCUT_TOOL_IDS[e.key.toLowerCase()];
    if (!toolId) return;
    const tool = MARKDOWN_TOOLS.find((t) => t.id === toolId);
    if (!tool) return;
    e.preventDefault();
    applyTool(tool);
  };

  if (loadState === 'loading') {
    return (
      <div className="container space-y-4 py-6">
        <div className="skeleton h-10 w-2/3 rounded-md" />
        <div className="skeleton h-96 rounded-lg" />
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="container py-16">
        <ErrorState message={loadError} onRetry={() => navigate(0)} />
      </div>
    );
  }

  return (
    <div className="container py-6">
      {restorable && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm dark:border-primary-800 dark:bg-primary-950 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-primary-800 dark:text-primary-200">
            We found an unsaved draft from your last session. Restore it?
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700">
              Restore
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-md border border-primary-300 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Title + excerpt */}
      <div className="mb-4 border-b border-dark-200 pb-4 dark:border-dark-700">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          placeholder="Post title"
          className="mb-1 w-full border-none bg-transparent font-heading text-3xl font-bold focus:outline-none"
        />
        <div className="mb-3 flex justify-between text-xs text-dark-400">
          <span>A clear, specific title helps readers know what they're getting.</span>
          <span>
            {title.length}/{TITLE_MAX}
          </span>
        </div>

        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value.slice(0, EXCERPT_MAX))}
          placeholder="One or two sentence summary — shown on the feed and in search results"
          rows={2}
          className="w-full resize-none rounded-md border border-dark-200 bg-surface px-3 py-2 text-sm text-dark-800 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:text-dark-200"
        />
        <div className="mb-1 mt-1 text-right text-xs text-dark-400">
          {excerpt.length}/{EXCERPT_MAX}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingCover(true);
          }}
          onDragLeave={() => setIsDraggingCover(false)}
          onDrop={handleCoverDrop}
          className={`overflow-hidden rounded-md border transition-colors ${
            isDraggingCover
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
              : 'border-dark-200 dark:border-dark-700'
          }`}>
          {coverImageUrl ? (
            <div className="relative">
              <img src={coverImageUrl} alt="" className="h-32 w-full object-cover" />
              <Tooltip label="Remove cover image">
                <button
                  type="button"
                  onClick={() => setCoverImageUrl('')}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80">
                  <FiX size={14} />
                </button>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-3 py-5 text-center">
              <FiImage size={18} className="text-dark-400" />
              <p className="text-xs text-dark-400">
                Drag & drop a cover image, or paste a URL below
              </p>
            </div>
          )}
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="Cover image URL (optional) — shown at the top of the post"
            className={`w-full border-none bg-surface px-3 py-2 text-sm text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-dark-200 ${
              coverImageUrl ? 'border-t border-dark-200 dark:border-dark-700' : ''
            }`}
          />
        </div>
      </div>

      {/* Tags + actions */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <TagInput tags={tags} onChange={setTags} />
          <p className="mt-1 text-xs text-dark-400">Tags help readers discover your post.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              showHelp
                ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300'
                : 'border-dark-200 text-dark-600 hover:bg-surface-muted dark:border-dark-700'
            }`}>
            <FiHelpCircle size={14} />
            {showHelp ? 'Hide help' : 'Markdown help'}
          </button>
          <button
            onClick={() => handleSave(false)}
            className="flex items-center gap-1.5 rounded-md border border-dark-200 px-4 py-1.5 text-sm font-medium text-dark-600 hover:bg-surface-muted dark:border-dark-700">
            <FiSave size={14} />
            Save draft
          </button>
          <button
            onClick={() => handleSave(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700">
            <FiSend size={14} />
            {existing?.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {status === 'error-title' && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-950 dark:text-danger-300">
          <FiAlertCircle size={14} className="shrink-0" />
          Add a title before saving.
        </p>
      )}
      {status === 'saving' && <p className="mb-4 text-sm text-dark-500">Saving...</p>}
      {status === 'error-save' && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-950 dark:text-danger-300">
          <FiAlertCircle size={14} className="shrink-0" />
          {saveError}
        </p>
      )}
      {status === 'saved' && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-950 dark:text-success-300">
          <FiCheckCircle size={14} className="shrink-0" />
          Draft saved. It stays private until you publish it.
        </p>
      )}

      {/* Markdown cheatsheet */}
      {showHelp && (
        <div className="mb-4 rounded-lg border border-dark-200 bg-surface-muted p-4 dark:border-dark-700">
          <h3 className="mb-2 flex items-center gap-1.5 font-heading text-sm font-bold">
            <FiHelpCircle size={14} />
            Markdown quick reference
          </h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {CHEATSHEET.map((row) => (
              <div key={row.syntax} className="flex justify-between gap-3">
                <code className="font-mono text-primary-600">{row.syntax}</code>
                <span className="text-dark-500">{row.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile write/preview toggle — the panes stack on small screens, so a
          side-by-side split is unusable there; let the reader pick one at a time. */}
      <div className="mb-3 flex rounded-md border border-dark-200 p-0.5 dark:border-dark-700 lg:hidden">
        {[
          { id: 'write', label: 'Write', Icon: FiEdit3 },
          { id: 'preview', label: 'Preview', Icon: FiEye },
        ].map(({ id: paneId, label, Icon }) => (
          <button
            key={paneId}
            type="button"
            onClick={() => setMobilePane(paneId)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mobilePane === paneId
                ? 'bg-primary-600 text-white'
                : 'text-dark-500 hover:bg-surface-muted dark:text-dark-400'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Editor + preview */}
      <EditorToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={mobilePane === 'write' ? 'block' : 'hidden lg:block'}>
          <p className="mb-3 hidden items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-dark-400 lg:flex">
            <FiEdit3 size={12} />
            Write
          </p>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            className="min-h-[60vh] w-full rounded-b-lg rounded-t-none border border-dark-200 bg-surface p-4 font-mono text-sm leading-relaxed text-dark-800 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:text-dark-200 lg:rounded-b-lg"
            placeholder="Write in Markdown..."
          />
        </div>
        <div className={mobilePane === 'preview' ? 'block' : 'hidden lg:block'}>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-dark-400">
            <FiEye size={12} />
            Preview
          </p>
          <div className="min-h-[60vh] overflow-y-auto rounded-lg border border-dark-200 bg-surface p-4 shadow-card dark:border-dark-700">
            <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-heading">
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt=""
                  className="mb-6 aspect-[100/42] w-full rounded-xl object-cover"
                />
              )}
              <ReactMarkdown
                components={{
                  code: ({ className, children }) => (
                    <CodeBlock className={className}>{children}</CodeBlock>
                  ),
                }}
                rehypePlugins={markdownRehypePlugins}>
                {previewContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-2 flex items-center justify-between text-xs text-dark-400">
        <span>{wordCount} words</span>
        <span className="flex items-center gap-3">
          {autosavedAt && (
            <span className="flex items-center gap-1">
              <FiCheckCircle size={12} />
              Saved locally{' '}
              {new Date(autosavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span>~{readTime} min read</span>
        </span>
      </div>
    </div>
  );
};

export default Editor;
