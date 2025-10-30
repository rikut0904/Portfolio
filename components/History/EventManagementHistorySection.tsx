"use client";
import React from "react";
import FadeInSection from "../FadeInSection";

const historyData = [
    { date: "2024年10月", details: ["第57回工大祭 運営"] },
    { date: "2025年06月", details: ["キャリア教育学会 運営お手伝い"] },
    { date: "2025年07月", details: ["Google直伝！爆速アイデア創出術を1日で体験！ Build With AI in 金沢工大 運営"] },
    { date: "2025年08月", details: ["電気学会C部門 運営お手伝い"] },
    { date: "2025年09月", details: ["HelloDevWorld 運営", "Google直伝！爆速アイデア創出術を1日で体験！ Build With AI in 神戸電子 運営"] },
    { date: "2025年10月", details: ["第58回工大祭 運営"] },
    { date: "2025年11月", details: ["LTインフィニティ 運営予定"] },
    { date: "2025年12月", details: ["Go Workshop Conference2025 運営予定"] }
];

export default function EventManagementHistorySection() {
    return (
        <FadeInSection>
            <section id="event-management-history">
                <h2>イベント運営履歴</h2>
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