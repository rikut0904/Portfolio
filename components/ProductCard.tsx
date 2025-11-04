
import React from "react";
import Image from "next/image";

interface ProductCardProps {
  title: string;
  image: string;
  description: string;
  link?: string;
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
  category,
  technologies,
  deployStatus,
  createdYear,
  createdMonth
}: ProductCardProps) {

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
          <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
            deployStatus === "公開中"
              ? "bg-blue-100 text-blue-700"
              : "bg-orange-100 text-orange-700"
          }`}>
            {deployStatus}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3">{description}</p>

      <div className="space-y-2">
        {(category || (createdYear && createdMonth)) && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {category && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                {category}
              </span>
            )}
            {createdYear && createdMonth && (
              <span className="px-2 py-1 bg-gray-100 rounded">
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
                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (link && category === "Webアプリケーション") {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <CardContent />
      </a>
    );
  }

  return (
    <div className="card">
      <CardContent />
    </div>
  );
}
