"use client";
import React from "react";
import FadeInSection from "./FadeInSection";

const historyData = [
    { date: "2021年04月", details: ["滋賀県立瀬田工業高等学校 電気科 入学"] },
    { date: "2022年06月", details: ["令和4年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 2位"] },
    { date: "2022年11月", details: ["令和4年度滋賀県技能競技大会 滋賀県知事表彰 3級電子機器組立て作業"] },
    { date: "2023年06月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 1位"] },
    { date: "2023年08月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 近畿大会 出場"] },
    { date: "2023年11月", details: ["令和5年度滋賀県技能競技大会 滋賀県職業能力開発協会会長表彰 第1位 3級シーケンス制御作業"] },
    { date: "2024年03月", details: ["滋賀県立瀬田工業高等学校 電気科 卒業"] },
    { date: "2024年04月", details: ["金沢工業大学 情報工学科 入学", "Science Project for Children 参加", "工大祭実行委員会 参加", "坂本研究室 参加"] },
    { date: "2024年06月", details: ["LCレファレンススタッフアルバイト 開始", "第二種電気工事士試験アドバイザーアルバイト 開始"] },
    { date: "2024年07月", details: ["BusStopProject モバイル班 参加"] },
    { date: "2024年10月", details: ["第57回工大祭 運営", "RescueEd 設立"] },
    { date: "2024年11月", details: ["金沢市地域課題解決プロジェクト 参画"] },
    { date: "2025年01月", details: ["金沢IT部活メンター 開始", "GDGoC金沢工業大学 参加"] },
    { date: "2025年04月", details: ["インクルーシブデベロッパーズ 参加"] },
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