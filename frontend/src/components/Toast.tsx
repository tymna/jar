"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Toast = {
  message: string;
  // Optional link rendered after the message — e.g. a tx hash to the explorer.
  link?: { label: string; href: string };
};

const ToastContext = createContext<(toast: Toast) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // `seq` keys re-renders so showing the same toast twice restarts the timer.
  const [toast, setToast] = useState<(Toast & { seq: number }) | null>(null);
  const seqRef = useRef(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  const show = useCallback((t: Toast) => {
    seqRef.current += 1;
    setToast({ ...t, seq: seqRef.current });
  }, []);

  useEffect(() => {
    const el = popoverRef.current;
    if (!toast || !el) return;
    // Popover (not plain fixed positioning) so the snackbar lands in the
    // browser top layer — above any open <dialog> and its backdrop.
    el.showPopover();
    const timer = setTimeout(() => setToast(null), 8000);
    return () => {
      clearTimeout(timer);
      if (el.isConnected) el.hidePopover();
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          ref={popoverRef}
          popover="manual"
          // Reset the UA's centered-popover defaults, then pin bottom-center.
          className="fixed inset-auto bottom-6 left-1/2 m-0 flex -translate-x-1/2 items-start gap-3 rounded-xl border-2 border-black bg-white px-5 py-3 text-sm font-bold shadow-[0_4px_0_0_#000]"
        >
          <div className="flex flex-col items-center gap-0.5 text-center">
            {toast.message}
            {toast.link && (
              <a
                href={toast.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-normal text-cherry underline decoration-dotted underline-offset-2"
              >
                {toast.link.label}
              </a>
            )}
          </div>
          <button
            type="button"
            aria-label="dismiss"
            onClick={() => setToast(null)}
            className="text-neutral-400 hover:text-black"
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
