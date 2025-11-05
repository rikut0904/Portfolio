"use client";
import React, { useEffect, useState } from "react";
import FadeInSection from "../FadeInSection";
import Accordion from "../Accordion";

// フォールバック用のデフォルトデータ
const defaultHistoryData = [
    { date: "2021年04月", details: ["滋賀県立瀬田工業高等学校 電気科 入学"] },
    { date: "2024年03月", details: ["滋賀県立瀬田工業高等学校 電気科 卒業"] },
    { date: "2024年04月", details: ["金沢工業大学 情報工学科 入学"] },
    { date: "2028年03月", details: ["金沢工業大学 情報工学科 卒業予定"] },
];

export default function SchoolHistorySection() {
    const [historyData, setHistoryData] = useState(defaultHistoryData);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch("/api/sections");
            const data = await response.json();
            const section = data.sections?.find((s: any) => s.id === "school-history");
            if (section && section.data.histories) {
                setHistoryData(section.data.histories);
            }
        } catch (error) {
            console.error("Failed to fetch school history:", error);
            // エラー時はデフォルトデータを使用
        }
    };

    return (
        <FadeInSection>
            <section id="history">
                <Accordion title="学歴" defaultOpen={false}>
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