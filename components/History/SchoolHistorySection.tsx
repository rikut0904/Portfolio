"use client";
import React from "react";
import FadeInSection from "../FadeInSection";
import Accordion from "../Accordion";

const historyData = [
    { date: "2021年04月", details: ["滋賀県立瀬田工業高等学校 電気科 入学"] },
    { date: "2024年03月", details: ["滋賀県立瀬田工業高等学校 電気科 卒業"] },
    { date: "2024年04月", details: ["金沢工業大学 情報工学科 入学"] },
    { date: "2028年03月", details: ["金沢工業大学 情報工学科 卒業予定"] },
];

export default function SchoolHistorySection() {
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