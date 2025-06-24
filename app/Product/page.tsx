// components/ProductSection.tsx
import React from "react";
import FadeInSection from "../components/FadeInSection";
import ProductCard from "../components/ProductCard";

const products = [
    {
        title: "バス時刻表取得システム",
        image: "/img/product/BusTime.jpg",
        link: "/BusTime",
        description: "八束穂キャンパス行きバス時刻表取得アプリ",
    },
    {
        title: "GPA計算システム",
        image: "/img/product/GPA_calc.jpg",
        link: "/GPA_calc",
        description: "KITのGPA計算と成績管理",
    },
    {
        title: "ふくにしファーム\nWebサイト",
        image: "/img/product/Fukunishifarm.jpg",
        link: "/Fukunishifarm",
        description: "ぶどう園の紹介用Webサイト",
    },
    {
        title: "コンビニ経営ゲーム",
        image: "/img/product/SimulationGame.jpg",
        link: "/SimulationGame",
        description: "ハッカソンで作成した経営シミュレーションゲーム",
    },
    {
        title: "Todoアプリ IconicMomentum",
        image: "/img/product/IconicMomentum.jpg",
        link: "/IconicMomentum",
        description: "Flutter & FirebaseのTodo管理アプリ",
    },
    {
        title: "ポータルサイト",
        image: "/img/product/PortalSite.jpg",
        link: "/PortalSite",
        description: "自身がよく利用するWebサイト及びアプリケーション集約したシステム",
    },
    {
        title: "10card_creater",
        image: "/img/product/10card_creater.jpg",
        link: "/10card_creater",
        description: "名刺10枚切り用紙対応印刷システム",
    },
];

export default function ProductSection() {
    return (
        <FadeInSection>
            <section id="products">
                <h2>制作物一覧</h2>
                <div className="grid-card">
                    {products.map((product, index) => (
                        <ProductCard
                            key={index}
                            title={product.title}
                            image={product.image}
                            link={product.link}
                            description={product.description}
                        />
                    ))}
                </div>
            </section>
        </FadeInSection>
    );
}
