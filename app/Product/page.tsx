// components/ProductSection.tsx
import React from "react";
import FadeInSection from "../../components/FadeInSection";
import ProductCard from "../../components/ProductCard";

const products = [
    {
        title: "バス時刻表取得システム",
        image: "/img/product/BusTime.jpg",
        link: "bustime",
        description: "八束穂キャンパス行きバス時刻表取得アプリ",
    },
    {
        title: "GPA計算システム",
        image: "/img/product/GPA_calc.jpg",
        link: "gpa_calc",
        description: "KITのGPA計算と成績管理",
    },
    {
        title: "ふくにしファーム\nWebサイト",
        image: "/img/product/Fukunishifarm.jpg",
        link: "fukunishifarm",
        description: "ぶどう園の紹介用Webサイト",
    },
    {
        title: "コンビニ経営ゲーム",
        image: "/img/product/SimulationGame.jpg",
        link: "simulation_game",
        description: "ハッカソンで作成した経営シミュレーションゲーム",
    },
    {
        title: "Todoアプリ IconicMomentum",
        image: "/img/product/IconicMomentum.jpg",
        link: "iconic_momentum",
        description: "Flutter & FirebaseのTodo管理アプリ",
    },
    {
        title: "ポータルサイト",
        image: "/img/product/PortalSite.jpg",
        link: "portal_site",
        description: "自身がよく利用するWebサイト及びアプリケーション集約したシステム",
    },
    {
        title: "10card_creater",
        image: "/img/product/10card_creater.jpg",
        link: "10card_creater",
        description: "名刺10枚切り用紙対応印刷システム",
    },
    {
        title: "HanaScore",
        image: "/img/product/HanaScore.jpg",
        link: "hana_score",
        description: "花札の点数計算をするためのアプリ",
    },
    {
        title: "Bloomia",
        image: "/img/product/Bloomia_icon.png",
        link: "bloomia",
        description: "中等教育機関向けLMS",
    }
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
                            description={product.description}
                            slug={product.link}
                        />
                    ))}
                </div>
            </section>
        </FadeInSection>
    );
}
