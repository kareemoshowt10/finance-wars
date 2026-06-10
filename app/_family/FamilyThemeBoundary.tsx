"use client";
import { useEffect } from "react";

// Applies the Family theme to <body> while the user is on a public page,
// and restores their dashboard theme on unmount.
export default function FamilyThemeBoundary() {
  useEffect(() => {
    document.body.classList.add("family-theme");
    document.documentElement.classList.remove("dark");
    return () => {
      document.body.classList.remove("family-theme");
      try {
        const t = localStorage.getItem("fw-theme");
        if (t !== "light") document.documentElement.classList.add("dark");
      } catch { document.documentElement.classList.add("dark"); }
    };
  }, []);
  return null;
}
