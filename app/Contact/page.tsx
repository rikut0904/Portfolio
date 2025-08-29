"use client";

import React from "react";
import FadeInSection from "../../components/FadeInSection";

export default function ActivityPage() {
    return (
        <main className="max-w-5xl mx-auto p-6">
            <FadeInSection>
                <section id="activity" className="py-8">
                    <h1>お問い合わせ</h1>
                    <iframe src="https://forms.gle/UiAi1ccjjyxHmvvu9" width="640" height="802">読み込み中...</iframe>
                </section>
            </FadeInSection>
        </main>
    );
}