"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A centered dialog on desktop; a native-feeling bottom sheet on phones —
 * full-width, anchored to the bottom edge, rounded only on top, with a drag
 * handle and a slide-up entrance. Every form in Household HQ (and beyond)
 * goes through this one component, so fixing it here lifts all of them.
 *
 * Keyboard and screen-reader behavior lives here too: Escape closes, Tab is
 * trapped inside the dialog, focus moves in on open and returns to whatever
 * opened it on close, and the page behind stops scrolling.
 */
export default function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Held in a ref so callers passing an inline arrow (all of them) don't
  // re-run the effect every render and yank focus back mid-typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    // Land on the first real control rather than the close button, so a
    // keyboard user starts in the form instead of on "dismiss".
    const targets = focusables();
    (targets.find((el) => el.dataset.modalClose === undefined) ?? targets[0] ?? panel)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`modal-anim modal-sheet-shape w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} sm:mx-4 card p-6 pb-safe relative bg-white dark:bg-[#0a0a0a] max-h-[85dvh] overflow-y-auto focus:outline-none`}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-black/15 dark:bg-white/15 mx-auto mb-4 -mt-1.5" />
        <button
          onClick={onClose}
          data-modal-close
          aria-label="Close dialog"
          className="absolute top-3 right-3 tap-target text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 id={titleId} className="text-lg font-semibold mb-4 pr-8">{title}</h3>
        {children}
      </div>
    </div>
  );
}
