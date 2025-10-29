"use client";
import React from "react";
import FadeInSection from "../FadeInSection";

const historyData = [
    { date: "2024年04月", details: ["Science Project for Children 参加", "工大祭実行委員会 参加", "坂本研究室 参加"] },
    { date: "2024年07月", details: ["BusStopProject モバイル班 参加"] },
    { date: "2024年10月", details: ["RescueEd 設立"] },
    { date: "2024年11月", details: ["金沢市地域課題解決プロジェクト 参画"] },
    { date: "2025年01月", details: ["金沢IT部活メンター 開始", "GDGoC金沢工業大学 参加"] },
    { date: "2025年04月", details: ["インクルーシブデベロッパーズ 参加"] },
    { date: "2025年07月", details: ["Kanazawa.go 参加"] },
    { date: "2025年08月", details: ["Go Workshop Conference 参加"] },
    { date: "2025年09月", details: ["情報処理学会 FIT 参加予定", "HelloDevWorld 運営予定", "Google直伝！爆速アイデア創出術を1日で体験！ Build With AI in 神戸電子 運営予定", "Go Conference 参加予定"] },
    { date: "2025年10月", details: ["第58回工大祭 運営予定", "Vueフェス 参加予定"] },
];

export default function SchoolHistorySection() {
    return (
        <FadeInSection>
            <section id="community-join-history">
                <h2>団体参加履歴</h2>
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