"use client";
import React, { useEffect, useState } from "react";
import FadeInSection from "../FadeInSection";
import Accordion from "../Accordion";

const defaultHistoryData = [
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
    const [historyData, setHistoryData] = useState(defaultHistoryData);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch("/api/sections");
            const data = await response.json();
            const section = data.sections?.find((s: any) => s.id === "event-management-history");
            if (section && section.data.histories) {
                setHistoryData(section.data.histories);
            }
        } catch (error) {
            console.error("Failed to fetch event management history:", error);
        }
    };

    return (
        <FadeInSection>
            <section id="event-management-history">
                <Accordion title="イベント運営履歴" defaultOpen={false}>
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
                </Accordion>
            </section>
        </FadeInSection>
    );
}