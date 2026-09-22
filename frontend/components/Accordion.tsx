"use client";

import React, { useId, useState } from "react";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({
  title,
  children,
  defaultOpen = false,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className={`accordion ${isOpen ? "accordion--open" : ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="accordion__trigger"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <svg
          className="accordion__icon"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        id={contentId}
        className="accordion__content"
        aria-hidden={!isOpen}
      >
        <div className="accordion__inner">{children}</div>
      </div>
    </div>
  );
}
