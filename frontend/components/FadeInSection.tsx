"use client";
import React, { useRef, useEffect, useState } from "react";

export default function FadeInSection({
  children,
}: {
  children: React.ReactNode;
}) {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 一度表示されたら、その後は消えないようにする
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target); // 一度表示されたら、その後は監視を停止
          }
        });
      },
      { rootMargin: "0px 0px -100px 0px", threshold: 0.1 },
    );

    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return (
    <div
      className={`fade-in-section ${isVisible ? "is-visible" : ""}`}
      ref={domRef}
    >
      {children}
    </div>
  );
}
