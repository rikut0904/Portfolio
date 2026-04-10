"use client";

import React from "react";
import ProductDetail from "./ProductCard";

interface ProjectTreeItem {
  name: string;
}

interface ProductProps {
  title: string;
  image: string;
  description: string;
  projectTree?: ProjectTreeItem[];
  sourceCodeUrl?: string;
  productUrl?: string;
  techList?: string[];
}

export default function ProductPage(props: ProductProps) {
  return <ProductDetail {...props} />;
}
