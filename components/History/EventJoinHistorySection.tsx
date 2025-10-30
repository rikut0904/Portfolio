"use client";
import React from "react";
import FadeInSection from "../FadeInSection";

const historyData = [
    { date: "2022年06月", details: ["令和4年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 2位"] },
    { date: "2022年11月", details: ["令和4年度滋賀県技能競技大会 滋賀県知事表彰 3級技能検定電子機器組立て電子機器組立て作業"] },
    { date: "2023年06月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 1位"] },
    { date: "2023年08月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 近畿大会 出場"] },
    { date: "2023年11月", details: ["令和5年度滋賀県技能競技大会 滋賀県職業能力開発協会会長表彰 第1位 3級技能検定電気機器組立てシーケンス制御作業"] },
    { date: "2025年08月", details: ["Go Workshop Conference 参加", "日本教育情報学会 年会 参加"] },
    { date: "2025年09月", details: ["情報処理学会 FIT 参加", "Go Conference 参加"] },
    { date: "2025年10月", details: ["技育祭 参加", "Vueフェス 参加"] },
    { date: "2025年11月", details: ["星稜祭 参加予定"] },
    { date: "2026年01月", details: ["成人式 参加予定"] },
    { date: "2026年02月", details: ["dmm.go 参加予定", "Go Conference mini in Sendai.go 参加予定"] },
];

export default function EventJoinHistorySection() {
    return (
        <FadeInSection>
            <section id="event-join-history">
                <h2>イベント参加履歴</h2>
                <div className="flex flex-col gap-4">
                    {historyData.map((item, index) => (
                        <div key={index} className="card">
                            <h3>{item.date}</h3>
                            <ul className="list-disc ml-5">
                                {item.details.map((detail, i) => (
                                    <li key={i}>{detail}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>
        </FadeInSection>
    );
}