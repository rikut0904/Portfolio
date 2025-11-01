"use client";
import React from "react";
import FadeInSection from "./FadeInSection";

const historyData = [
    { date: "2021年04月", details: ["滋賀県立瀬田工業高等学校 電気科 入学"] },
    { date: "2022年06月", details: ["令和4年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 2位"] },
    { date: "2022年11月", details: ["令和4年度滋賀県技能競技大会 滋賀県知事表彰 3級技能検定電子機器組立て電子機器組立て作業"] },
    { date: "2023年06月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 1位"] },
    { date: "2023年08月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 近畿大会 出場"] },
    { date: "2023年11月", details: ["令和5年度滋賀県技能競技大会 滋賀県職業能力開発協会会長表彰 第1位 3級技能検定電気機器組立てシーケンス制御作業"] },
    { date: "2024年03月", details: ["滋賀県立瀬田工業高等学校 電気科 卒業"] },
    { date: "2024年04月", details: ["金沢工業大学 情報工学科 入学", "Science Project for Children 参加", "工大祭実行委員会 参加", "坂本研究室 参加"] },
    { date: "2024年06月", details: ["LCレファレンススタッフアルバイト 開始", "第二種電気工事士試験アドバイザーアルバイト 開始"] },
    { date: "2024年07月", details: ["BusStopProject モバイル班 参加"] },
    { date: "2024年10月", details: ["第57回工大祭 運営", "RescueEd 設立"] },
    { date: "2024年11月", details: ["金沢市地域課題解決プロジェクト 参画"] },
    { date: "2025年01月", details: ["金沢IT部活メンター 開始", "GDGoC金沢工業大学 参加"] },
    { date: "2025年04月", details: ["インクルーシブデベロッパーズ 参加"] },
    { date: "2025年06月", details: ["キャリア教育学会 運営お手伝い"] },
    { date: "2025年07月", details: ["Google直伝！爆速アイデア創出術を1日で体験！ Build With AI in 金沢工大 運営", "Kanazawa.go 参加"] },
    { date: "2025年08月", details: ["Go Workshop Conference 参加", "電気学会C部門 運営お手伝い", "日本教育情報学会 年会 参加"] },
    { date: "2025年09月", details: ["情報処理学会 FIT 参加", "HelloDevWorld 運営", "Google直伝！爆速アイデア創出術を1日で体験！ Build With AI in 神戸電子 運営", "Go Conference 参加", "Biwako.go 立ち上げ"] },
    { date: "2025年10月", details: ["技育祭 参加", "第58回工大祭 運営", "Vueフェス 参加"] },
    { date: "2025年11月", details: ["星稜祭 参加予定", "LTインフィニティ 運営予定"] },
    { date: "2025年12月", details: ["Go Workshop Conference2025 運営予定"] },
    { date: "2026年01月", details: ["成人式 参加予定"] },
    { date: "2026年02月", details: ["dmm.go 参加予定", "Go Conference mini in Sendai.go 参加予定"] },
];

export default function HistorySection() {
    return (
        <FadeInSection>
            <section id="history">
                <h2>略歴</h2>
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