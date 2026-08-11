import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiHelpCircle, FiLoader } from 'react-icons/fi';

// A replacement for window.confirm, which can't be styled, ignores dark mode,
// renders the page's origin above the message, and blocks the whole tab while
// it's open. Built on the native <dialog> element rather than a hand-rolled
// overlay so the parts that are easy to get wrong — top-layer stacking, the
// backdrop, focus trapping, inert background content, Escape to dismiss — come
// from the browser instead of from us.
//
// Usage:
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;

const ConfirmContext = createContext(null);

const TONES = {
  danger: {
    icon: FiAlertTriangle,
    iconClass: 'bg-danger-100 text-danger-600 dark:bg-danger-950 dark:text-danger-400',
    confirmClass: 'bg-danger-600 hover:bg-danger-700 focus-visible:outline-danger-600',
  },
  primary: {
    icon: FiHelpCircle,
    iconClass: 'bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400',
    confirmClass: 'bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-600',
  },
};

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const [working, setWorking] = useState(false);
  const dialogRef = useRef(null);
  // Held outside state because the promise has to settle exactly once, from
  // whichever path closes the dialog — button, backdrop, or Escape.
  const resolverRef = useRef(null);

  const settle = useCallback((answer) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setWorking(false);
    setRequest(null);
    if (resolve) resolve(answer);
  }, []);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        // A second call while one is open would strand the first promise
        // forever, so answer it "no" before taking over.
        if (resolverRef.current) resolverRef.current(false);
        resolverRef.current = resolve;
        setRequest(typeof options === 'string' ? { message: options } : options);
      }),
    []
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const tone = TONES[request?.tone] ?? TONES.danger;
  const ToneIcon = tone.icon;

  const handleConfirm = async () => {
    // `onConfirm` lets a caller keep the dialog up with a spinner while the
    // request runs, instead of dismissing into an unexplained pause.
    if (request.onConfirm) {
      setWorking(true);
      try {
        await request.onConfirm();
      } finally {
        settle(true);
      }
      return;
    }
    settle(true);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        // The native `cancel` event covers Escape; `close` catches every other
        // route out. Both mean "no".
        onClose={() => !working && settle(false)}
        onClick={(e) => {
          // <dialog> spans the viewport, so a click landing on the element
          // itself (rather than the panel inside it) is a backdrop click.
          if (e.target === dialogRef.current && !working) settle(false);
        }}
        className="confirm-dialog w-[calc(100vw-2rem)] max-w-md rounded-xl border border-dark-200 bg-surface p-0 text-dark-800 shadow-card-hover dark:border-dark-700 dark:text-dark-200">
        {request && (
          <div className="p-6">
            <div className="flex gap-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.iconClass}`}>
                <ToneIcon size={20} />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-base font-semibold">
                  {request.title ?? 'Are you sure?'}
                </h2>
                {request.message && (
                  <p className="mt-1 break-words text-sm text-dark-500 dark:text-dark-400">
                    {request.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                disabled={working}
                // The destructive button is never the one holding focus on
                // open — a stray Enter should cancel, not delete.
                autoFocus
                className="rounded-lg border border-dark-200 px-4 py-2 text-sm font-medium text-dark-600 transition-colors hover:bg-surface-muted disabled:opacity-60 dark:border-dark-700 dark:text-dark-300">
                {request.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={working}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70 ${tone.confirmClass}`}>
                {working && <FiLoader size={14} className="animate-spin" />}
                {request.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside a ConfirmProvider');
  return confirm;
};

export default ConfirmContext;
