import React from "react";
import Image from "next/image";
import HistorySection from "./components/HistorySection";
import FadeInSection from "./components/FadeInSection";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-6">
      <FadeInSection>
        <section id="profile">
          <h2>About Me</h2>
          <div className="flex flex-col md:flex-row items-left gap-8 card">
            <Image src="/img/profile.jpg" alt="プロフィール写真" width={150} height={150} className="rounded-full object-cover" />
            <div>
              <h3>名前：平田 陸翔</h3>
              <p>出身：滋賀県甲賀市</p>
              <p>趣味：温泉巡り、デバイス収集</p>
              <p>金沢工業大学 情報工学科 2年</p>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section id="license">
          <h2>資格</h2>
          <div className="grid-card">
            <div className="card">
              <h3>情報</h3>
              <ol>
                <li>ITパスポート</li>
                <li>Microsoft Office Specialist Word (Office 2019)</li>
                <li>Microsoft Office Specialist Word Expert (Office 365 Apps)</li>
                <li>Microsoft Office Specialist Excel (Office 2019)</li>
                <li>Microsoft Office Specialist PowerPoint (Office 2019)</li>
                <li>VBA Expert</li>
              </ol>
            </div>
            <div className="card">
              <h3>電気</h3>
              <ol>
                <li>第三種電気主任技術者</li>
                <li>第一種電気工事士(技能合格)</li>
                <li>第二種電気工事士</li>
                <li>認定電気工事従事者</li>
                <li>低圧取扱業務(低圧)特別教育(学科)終了</li>
              </ol>
            </div>
            <div className="card">
              <h3>その他</h3>
              <ol>
                <li>普通自動車免許(AT限定)</li>
                <li>SRI&apos;s introduction to innovation workshop 修了</li>
              </ol>
            </div>
          </div>
        </section>
      </FadeInSection>

      <HistorySection />
    </main>
  );
}