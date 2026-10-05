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
  return (
    <article className="card product-card">
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
              className="product-link"
            >
              作品を見る
              <span aria-hidden="true">↗</span>
            </a>
          )}
          {!link && (
            <span
              className="product-card__action-placeholder"
              aria-hidden="true"
            />
          )}
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="repository-hint repository-link"
              aria-label={`${title}のGitHubリポジトリを開く`}
            >
              GitHub →
            </a>
          )}
          {!githubUrl && (
            <span
              className="product-card__action-placeholder"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </article>
  );
}
