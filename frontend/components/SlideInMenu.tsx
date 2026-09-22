"use client";

import { useEffect, useRef } from "react";

type SlideInMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
};

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function SlideInMenu({
  isOpen,
  onClose,
  ariaLabel,
  children,
}: SlideInMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget =
      closeButtonRef.current ||
      (panelRef.current?.querySelector(
        focusableSelector,
      ) as HTMLElement | null);

    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable =
        panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <div
      id="mobile-navigation"
      className={`mobile-menu ${isOpen ? "mobile-menu--open" : ""}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="mobile-menu__backdrop"
        aria-label="メニューを閉じる"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="mobile-menu__panel"
      >
        <div className="mobile-menu__header">
          <p>メニュー</p>
          <button
            ref={closeButtonRef}
            type="button"
            className="mobile-menu__close"
            aria-label="メニューを閉じる"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <nav className="mobile-menu__nav" aria-label={ariaLabel}>
          {children}
        </nav>
      </div>
    </div>
  );
}
