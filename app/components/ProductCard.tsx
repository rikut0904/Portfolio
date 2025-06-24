"use client"

import React from "react";
import Image from "next/image";

interface ProductCardProps {
  title: string;
  image: string;
  link: string;
  description: string;
}

export default function ProductCard({ title, image, link, description }: ProductCardProps) {
  return (
    <div className="card flex flex-col items-center">
      <a href={link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
        <div className="w-[250px] h-[250px] flex items-center justify-center overflow-hidden">
          <Image
            src={image}
            alt={title}
            width={250}
            height={250}
            className="object-contain"
          />
        </div>
        <h3 className="mt-4 text-center">{title}</h3>
        <p className="text-sm text-center">{description}</p>
      </a>
    </div>
  );
}