import React from "react";
import FadeInSection from "../../components/FadeInSection";
import Link from "next/link";

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
                        <Link href="https://sites.google.com/view/spfc-kit/">
                            <div className="card">
                                <h3>Science Project for Children</h3>
                                <p>2024年11月~ 学生代表</p>
                            </div>
                        </Link>
                        <Link href="http://sodeproject.com/busstop/">
                            <div className="card">
                                <h3>BusStopProject</h3>
                                <p>モバイル班</p>
                            </div>
                        </Link>
                        <Link href="https://rescueed24.github.io/rescueed/">
                            <div className="card">
                                <h3>RescueEd</h3>
                                <p>共同代表</p>
                                <p>2024年10月24日設立</p>
                            </div>
                        </Link>
                        <Link href="https://gdg.community.dev/gdg-on-campus-kanazawa-institute-of-technology-ishikawa-japan/">
                            <div className="card">
                                <h3>GDGoC金沢工業大学</h3>
                                <p>Organizer</p>
                            </div>
                        </Link>
                        <Link href="https://sites.google.com/view/inclusive-developers/home">
                            <div className="card">
                                <h3>インクルーシブデベロッパーズ</h3>
                            </div>
                        </Link>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>その他大学課外活動-</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="https://www2.kanazawa-it.ac.jp/kitfes/">
                            <div className="card">
                                <h3>工大祭実行委員会</h3>
                            </div>
                        </Link>
                        <Link href="https://sskmtlab.mydns.jp/">
                            <div className="card">
                                <h3>坂本研究室</h3>
                            </div>
                        </Link>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>大学外課外活動</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="https://kanazawa-civic-tech.jp/matching/year2024/">
                            <div className="card">
                                <h3>金沢市地域課題解決プロジェクト</h3>
                            </div>
                        </Link>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>アルバイト</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="https://www.kanazawa-it.ac.jp/kitlc/index.html">
                            <div className="card">
                                <h3>LCレファレンススタッフ</h3>
                            </div>
                        </Link>
                        <Link href="https://www.kanazawa-it.ac.jp/shikaku/">
                            <div className="card">
                                <h3>第二種電気工事士試験アドバイザー</h3>
                            </div>
                        </Link>
                        <Link href="https://kanazawa-it-bukatsu.jp/">
                            <div className="card">
                                <h3>金沢IT部活メンター</h3>
                            </div>
                        </Link>
                    </div>
                </FadeInSection>
                <FadeInSection>
                    <h2>参加コミュニティ</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="https://kanazawa-it-bukatsu.jp/">
                            <div className="card">
                                <h3>金沢IT部活</h3>
                            </div>
                        </Link>
                        <Link href="https://osdev.jp/">
                            <div className="card">
                                <h3>osdev-jp</h3>
                            </div>
                        </Link>
                        <Link href="https://kanazawago.connpass.com/">
                            <div className="card">
                                <h3>Kanazawa.go</h3>
                            </div>
                        </Link>
                        <Link href="https://gwc.gocon.jp/2025/">
                            <div className="card">
                                <h3>Go Workshop Conference</h3>
                            </div>
                        </Link>
                    </div>
                </FadeInSection>
            </section>
        </main >
    )
}