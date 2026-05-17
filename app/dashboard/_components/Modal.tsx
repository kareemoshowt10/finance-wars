"use client";
import { X } from "lucide-react";

export default function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} card p-6 relative bg-white dark:bg-[#0a0a0a] max-h-[90vh] overflow-y-auto`}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><X className="w-4 h-4" /></button>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
