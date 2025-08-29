"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ProductCardProps {
  title: string;
  image: string;
  slug: string;
  description: string;
}

export default function ProductCard({ title, image, slug, description }: ProductCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/Product/${slug}`);
  };

  return (
    <div className="card cursor-pointer" onClick={handleClick}>
      <Image
        src={image}
        alt={title}
        width={250}
        height={250}
        className="rounded-lg mx-auto"
      />
      <h3 className="mt-4 text-center">{title}</h3>
      <p className="text-sm text-center">{description}</p>
    </div>
  );
}
