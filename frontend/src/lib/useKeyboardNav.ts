import { useEffect, useRef, useState } from "react";

interface UseKeyboardNavArgs {
  count: number;
  disabled?: boolean;
  onOpen: (index: number) => void;
  onSave: (index: number) => void;
  onHelp: () => void;
}

export function useKeyboardNav({ count, disabled, onOpen, onSave, onHelp }: UseKeyboardNavArgs) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Keep stable refs to avoid stale closures in the event listener
  const argsRef = useRef({ count, disabled, onOpen, onSave, onHelp });
  argsRef.current = { count, disabled, onOpen, onSave, onHelp };

  const focusedRef = useRef(focusedIndex);
  focusedRef.current = focusedIndex;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const { count, disabled, onOpen, onSave, onHelp } = argsRef.current;
      const focused = focusedRef.current;

      // Skip when focused in a text input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Escape always works (clears focus) — even when disabled
      if (e.key === "Escape") {
        setFocusedIndex(null);
        return;
      }

      if (disabled) return;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, count - 1);
          });
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null || prev === 0) return null;
            return prev - 1;
          });
          break;
        }
        case "Enter":
        case "o": {
          if (focused !== null) {
            e.preventDefault();
            onOpen(focused);
          }
          break;
        }
        case "s": {
          if (focused !== null) {
            e.preventDefault();
            onSave(focused);
          }
          break;
        }
        case "?": {
          e.preventDefault();
          onHelp();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { focusedIndex, setFocusedIndex };
}
