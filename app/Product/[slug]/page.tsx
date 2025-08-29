// app/Product/[slug]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProductDetail from "../../../components/ProductPage";

const productData: {
    [key: string]: {
        title: string;
        image: string;
        description: string;
        projectTree?: { name: string }[];
        sourceCodeUrl?: string;
        productUrl?: string;
        techList?: string[];
    }
} = {
    gpa_calc: {
        title: "GPA計算システム",
        image: "/img/GPA_calc2.jpg",
        description:
            "金沢工業大学のGPA及び正課学習ポイントを計算するためのシステムです。CSVによる保存・読み込み機能やFirebaseによるデータベース管理機能を備えています。",
        projectTree: [
            { name: "firebase_setting/.env" },
            { name: "function/gui.py" },
            { name: "KIT_GPA_calc.py" },
        ],
        sourceCodeUrl: "https://github.com/rikut0904/KIT_GPA_calc",
        productUrl: undefined,
        techList: [
            "Python",
            "PySimpleGUI",
            "pandas",
            "firebase-admin",
            "dotenv",
            "csv",
        ],
    },
    iconic_momentum: {
        title: "Todoアプリ IconicMomentum",
        image: "/img/IconicMomentum.jpg",
        description:
            "ハッカソンにてFlutterとFirebaseを学習しながら作成したTodoアプリです。ログイン機能やクラウド同期機能を実装しています。",
        sourceCodeUrl: "https://github.com/rikut0904/iconic_momentum",
        productUrl: "https://iconic-momentum.web.app/",
        techList: [
            "Flutter",
            "Firebase Authentication",
            "Firebase Firestore",
            "Firebase Hosting",
        ],
    },
};

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const product = productData[slug];

    if (!product) {
        return (
            <div className="max-w-5xl mx-auto p-6">
                <h1>制作物が見つかりませんでした</h1>
            </div>
        );
    }

    return (
        <ProductDetail
            title={product.title}
            image={product.image}
            description={product.description}
            projectTree={product.projectTree}
            sourceCodeUrl={product.sourceCodeUrl}
            productUrl={product.productUrl}
            techList={product.techList}
        />
    );
}
