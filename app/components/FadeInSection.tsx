"use client";
import React, { useRef, useEffect, useState } from "react";

export default function FadeInSection({ children }: { children: React.ReactNode }) {
    const domRef = useRef<HTMLDivElement>(null);
    const [isVisible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                setVisible(entry.isIntersecting);
            });
        }, { rootMargin: "0px 0px -200px 0px", threshold: 0.1 });

        if (domRef.current) observer.observe(domRef.current);
        return () => { if (domRef.current) observer.unobserve(domRef.current); };
    }, []);

    return (
        <div className={`fade-in-section ${isVisible ? "is-visible" : ""}`} ref={domRef}>
            {children}
        </div>
    );
}