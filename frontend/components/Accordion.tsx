"use client";
import React, { useState } from "react";

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

  return (
    <div className="rounded-lg my-4 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 transition-all duration-200 flex justify-between items-center text-left sticky top-0 z-10 rounded-t-lg"
        style={{
          backgroundColor: "var(--accordion-background)",
          borderBottom: isOpen ? "2px solid var(--primary-color)" : "none",
        }}
        aria-expanded={isOpen}
      >
        <h3 className="my-4" style={{ color: "var(--text-heading)" }}>
          {title}
        </h3>
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="var(--primary-color)"
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
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden rounded-b-lg`}
        style={{ backgroundColor: "var(--accordion-background)" }}
      >
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
