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
  createdMonth,
}: ProductCardProps) {
  const primaryLink = githubUrl;

  const openRepository = () => {
    if (primaryLink) {
      window.open(primaryLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!primaryLink) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRepository();
    }
  };

  return (
    <article
      className={`card product-card ${primaryLink ? "product-card--clickable" : ""}`}
      onClick={primaryLink ? openRepository : undefined}
      onKeyDown={primaryLink ? handleKeyDown : undefined}
      role={primaryLink ? "link" : undefined}
      tabIndex={primaryLink ? 0 : undefined}
      aria-label={primaryLink ? `${title}のGitHubリポジトリを開く` : undefined}
    >
      {image && (
        <div className="product-card__media">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="product-card__body">
        <div className="product-card__heading">
          <h3>{title}</h3>
          {deployStatus && (
            <span
              className={`status-pill ${
                deployStatus === "公開中"
                  ? "status-pill--live"
                  : "status-pill--private"
              }`}
            >
              <span aria-hidden="true" />
              {deployStatus}
            </span>
          )}
        </div>

        <p className="product-card__description">{description}</p>

        <div className="product-card__meta">
          {category && <span className="meta-pill">{category}</span>}
          {createdYear && createdMonth && (
            <span className="meta-pill">
              {createdYear}.{String(createdMonth).padStart(2, "0")}
            </span>
          )}
        </div>

        {technologies && technologies.length > 0 && (
          <div className="product-card__tech" aria-label="使用技術">
            {technologies.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        )}

        <div className="product-card__actions">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="product-link"
            >
              View product
              <span aria-hidden="true">↗</span>
            </a>
          )}
          {primaryLink && (
            <span className="repository-hint" aria-hidden="true">
              GitHub →
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
