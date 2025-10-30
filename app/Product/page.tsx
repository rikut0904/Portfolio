import React from "react";
import FadeInSection from "../../components/FadeInSection";
import ProductCard from "../../components/ProductCard";
import { db } from "../../lib/firebase/config";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface Product {
  id: string;
  title: string;
  image: string;
  description: string;
}

async function getProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Product, "id">),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function ProductSection() {
  const products: Product[] = await getProducts();

  return (
    <FadeInSection>
      <section id="products">
        <h2>制作物一覧</h2>
        <div className="grid-card">
          {products.map((product: Product, index: number) => (
            <ProductCard
              key={product.id || index}
              title={product.title}
              image={product.image}
              description={product.description}
            />
          ))}
        </div>
      </section>
    </FadeInSection>
  );
}
