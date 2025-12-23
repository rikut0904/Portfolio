"use client";

import React from "react";
import Image from "next/image";

interface ProductCardProps {
  title: string;
  image: string;
  description: string;
  link?: string;
  githubUrl?: string;
  category?: string;
  technologies?: string[];
  deployStatus?: string;
  createdYear?: number;
  createdMonth?: number;
}

export default function ProductCard({
  title,
  image,
  description,
  link,
  githubUrl,
  category,
  technologies,
  deployStatus,
  createdYear,
  createdMonth
}: ProductCardProps) {

  const primaryLink = githubUrl || link;

  const handleCardClick = () => {
    if (!primaryLink) return;
    window.open(primaryLink, "_blank", "noopener,noreferrer");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!primaryLink) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  const CardContent = () => (
    <>
      {image && (
        <div className="relative w-full h-48 mb-4">
          <Image
            src={image}
            alt={title}
            fill
            className="rounded-lg object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-lg font-semibold flex-1">{title}</h3>
        {deployStatus && (
          <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${deployStatus === "公開中"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
            }`}>
            {deployStatus}
          </span>
        )}
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--text-body)' }}>{description}</p>

      <div className="space-y-2">
        {(category || (createdYear && createdMonth)) && (
          <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-body)' }}>
            {category && (
              <span className="px-2 py-1 rounded" style={{
                backgroundColor: 'var(--button-background)',
                color: 'var(--button-text)'
              }}>
                {category}
              </span>
            )}
            {createdYear && createdMonth && (
              <span className="px-2 py-1 rounded" style={{
                backgroundColor: 'var(--button-background)',
                color: 'var(--button-text)'
              }}>
                {createdYear}年{createdMonth}月
              </span>
            )}
          </div>
        )}

        {technologies && technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {technologies.map((tech, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {(githubUrl || link) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-semibold transition-colors"
                style={{
                  borderColor: "var(--primary-color)",
                  color: "var(--primary-color)",
                  backgroundColor: "var(--primary-light)"
                }}
              >
                GitHub
              </a>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-semibold text-white transition-colors"
                style={{
                  borderColor: "var(--primary-color)",
                  backgroundColor: "var(--primary-color)"
                }}
              >
                プロダクトを見る
              </a>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`card ${primaryLink ? "cursor-pointer transition-all hover:shadow-lg hover:translate-y-[-5px]" : "cursor-default"}`}
      onClick={primaryLink ? handleCardClick : undefined}
      onKeyDown={primaryLink ? handleKeyDown : undefined}
      role={primaryLink ? "link" : undefined}
      tabIndex={primaryLink ? 0 : undefined}
      style={{
        opacity: primaryLink ? 1 : 0.9,
      }}
    >
      <CardContent />
    </div>
  );
}
