"use client";
import React, { useState } from "react";
import FadeInSection from "./FadeInSection";

const historyData = {
    "2021年": [
        { date: "2021年04月", details: ["滋賀県立瀬田工業高等学校 電気科 入学"] },
    ],
    "2022年": [
        { date: "2022年06月", details: ["令和4年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 2位"] },
        { date: "2022年11月", details: ["令和4年度滋賀県技能競技大会 滋賀県知事表彰 3級電子機器組立て作業"] },
    ],
    "2023年": [
        { date: "2023年06月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 滋賀県大会 1位"] },
        { date: "2023年08月", details: ["令和5年度高校生ものづくりコンテスト電気工事部門 近畿大会 出場"] },
        { date: "2023年11月", details: ["令和5年度滋賀県技能競技大会 滋賀県職業能力開発協会会長表彰 第1位 3級シーケンス制御作業"] },
    ],
    "2024年": [
        { date: "2024年03月", details: ["滋賀県立瀬田工業高等学校 電気科 卒業"] },
        {
            date: "2024年04月", details: [
                "金沢工業大学 情報工学科 入学",
                "Science Project for Children 参加",
                "工大祭実行委員会 参加",
                "坂本研究室 参加",
            ],
        },
        {
            date: "2024年06月", details: [
                "LCレファレンススタッフアルバイト 開始",
                "第二種電気工事士試験アドバイザーアルバイト 開始",
            ],
        },
        { date: "2024年07月", details: ["BusStopProject モバイル班 参加"] },
        { date: "2024年10月", details: ["第57回工大祭 運営", "RescueEd 設立"] },
        { date: "2024年11月", details: ["金沢市地域課題解決プロジェクト 参画"] },
    ],
    "2025年": [
        { date: "2025年01月", details: ["金沢IT部活メンター 開始", "GDGoC金沢工業大学 参加"] },
        { date: "2025年04月", details: ["インクルーシブデベロッパーズ 参加"] },
    ],
};

export default function HistorySection() {
    const [openYear, setOpenYear] = useState<string | null>(null);
    const [openIndex, setOpenIndex] = useState<{ [year: string]: number | null }>({});

    const toggleYear = (year: string) => setOpenYear(openYear === year ? null : year);
    const toggleItem = (year: string, index: number) => setOpenIndex(prev => ({ ...prev, [year]: prev[year] === index ? null : index }));

    return (
        <FadeInSection>
            <section id="history">
                <h2>略歴</h2>
                <div className="grid-card">
                    {Object.keys(historyData).map(year => {
                        return (
                            <div key={year} className="card">
                                <button className="w-full flex justify-between items-center" onClick={() => toggleYear(year)}>
                                    <h3>{year}</h3>
                                    <span>{openYear === year ? "▲" : "▼"}</span>
                                </button>
                                {openYear === year && (
                                    <div>
                                        {Object.keys(historyData).map((year) => (
                                            <div key={year} className="bg-purple-50 rounded-lg shadow p-6">
                                                <button className="w-full flex justify-between items-center" onClick={() => toggleYear(year)}>
                                                    <h3>{year}</h3>
                                                    <span>{openYear === year ? '▲' : '▼'}</span>
                                                </button>
                                                {openYear === year && (
                                                    <div className="mt-3">
                                                        {historyData[year as keyof typeof historyData].map((item, index) => (
                                                            <div key={index} className="card my-2">
                                                                <button className="w-full flex justify-between items-center" onClick={() => toggleItem(year, index)}>
                                                                    <h3>{item.date}</h3>
                                                                    <span>{openIndex[year] === index ? '▲' : '▼'}</span>
                                                                </button>
                                                                {openIndex[year] === index && (
                                                                    <div className="mt-2">
                                                                        {item.details.map((detail, i) => (
                                                                            <p key={i}>{detail}</p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </FadeInSection>
    );
}