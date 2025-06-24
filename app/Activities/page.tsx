import React from "react";
import FadeInSection from "../components/FadeInSection";

export default function ActivityPage() {
    return (
        <main className="max-w-5xl mx-auto px-6">
            <section id="activity" className="py-8">
                <FadeInSection>
                    <h1>課外活動</h1>
                </FadeInSection>
                <FadeInSection>
                    <h2>プロジェクト</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3>Science Project for Children</h3>
                            <p>2024年11月~ 学生代表</p>
                        </div>
                        <div className="card">
                            <h3>BusStopProject</h3>
                            <p>モバイル班</p>
                        </div>
                        <div className="card">
                            <h3>RescueEd</h3>
                            <p>共同代表</p>
                            <p>2024年10月24日設立</p>
                        </div>
                        <div className="card">
                            <h3>GDGoC金沢工業大学</h3>
                            <p></p>
                        </div>
                        <div className="card">
                            <h3>インクルーシブデベロッパーズ</h3>
                            <p></p>
                        </div>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>その他大学課外活動-</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3>工大祭実行委員会</h3>
                            <p></p>
                        </div>
                        <div className="card">
                            <h3>坂本研究室</h3>
                            <p></p>
                        </div>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>大学外課外活動</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3>金沢市地域課題解決プロジェクト</h3>
                            <p></p>
                        </div>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>アルバイト</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3>LCレファレンススタッフ</h3>
                            <p></p>
                        </div>
                        <div className="card">
                            <h3>第二種電気工事士試験アドバイザー</h3>
                            <p></p>
                        </div>
                        <div className="card">
                            <h3>金沢IT部活メンター</h3>
                            <p></p>
                        </div>
                    </div>
                </FadeInSection>
            </section>
        </main >
    )
}