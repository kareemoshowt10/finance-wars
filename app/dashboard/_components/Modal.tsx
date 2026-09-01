"use client";
import { X } from "lucide-react";

/**
 * A centered dialog on desktop; a native-feeling bottom sheet on phones —
 * full-width, anchored to the bottom edge, rounded only on top, with a drag
 * handle and a slide-up entrance. Every form in Household HQ (and beyond)
 * goes through this one component, so fixing it here lifts all of them.
 */
export default function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`modal-anim modal-sheet-shape w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} sm:mx-4 card p-6 pb-safe relative bg-white dark:bg-[#0a0a0a] max-h-[85dvh] overflow-y-auto`}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-black/15 dark:bg-white/15 mx-auto mb-4 -mt-1.5" />
        <button onClick={onClose} className="absolute top-3 right-3 tap-target text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><X className="w-4 h-4" /></button>
        <h3 className="text-lg font-semibold mb-4 pr-8">{title}</h3>
        {children}
      </div>
    </div>
  );
}
