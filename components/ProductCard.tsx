
import React from "react";
import Image from "next/image";

interface ProductCardProps {
  title: string;
  image: string;
  description: string;
}

export default function ProductCard({ title, image, description }: ProductCardProps) {

  return (
    <div className="card cursor-pointer">
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
