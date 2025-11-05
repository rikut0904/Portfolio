"use client";
import React, { useEffect, useState } from "react";
import FadeInSection from "../FadeInSection";
import Accordion from "../Accordion";

const defaultHistoryData = [
    { date: "2024年04月", details: ["Science Project for Children 参加", "工大祭実行委員会 参加", "坂本研究室 参加"] },
    { date: "2024年06月", details: ["LCレファレンススタッフアルバイト 開始", "第二種電気工事士試験アドバイザーアルバイト 開始"] },
    { date: "2024年07月", details: ["BusStopProject モバイル班 参加"] },
    { date: "2024年10月", details: ["RescueEd 設立"] },
    { date: "2024年11月", details: ["金沢市地域課題解決プロジェクト 参画"] },
    { date: "2025年01月", details: ["金沢IT部活メンター 開始", "GDGoC金沢工業大学 参加"] },
    { date: "2025年04月", details: ["インクルーシブデベロッパーズ 参加"] },
    { date: "2025年07月", details: ["Kanazawa.go 参加"] },
    { date: "2025年08月", details: ["Go Workshop Conference 参加"] },
    { date: "2025年09月", details: ["Biwako.go 立ち上げ"] },
];

export default function CommunityJoinHistorySection() {
    const [historyData, setHistoryData] = useState(defaultHistoryData);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch("/api/sections");
            const data = await response.json();
            const section = data.sections?.find((s: any) => s.id === "community-join-history");
            if (section && section.data.histories) {
                setHistoryData(section.data.histories);
            }
        } catch (error) {
            console.error("Failed to fetch community join history:", error);
        }
    };

    return (
        <FadeInSection>
            <section id="community-join-history">
                <Accordion title="団体参加履歴" defaultOpen={false}>
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