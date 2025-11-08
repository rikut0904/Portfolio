"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import FadeInSection from "./FadeInSection";

interface ProfileData {
  name?: string;
  from?: string;
  hobbies?: string;
  affiliation?: string;
  imageUrl?: string;
}

interface DynamicProfileSectionProps {
  sectionId: string;
  defaultData: ProfileData;
}

export default function DynamicProfileSection({
  sectionId,
  defaultData
}: DynamicProfileSectionProps) {
  const [profileData, setProfileData] = useState<ProfileData>(defaultData);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/sections");
      const data = await response.json();
      const section = data.sections?.find((s: any) => s.id === sectionId);
      if (section && section.data) {
        setProfileData({
          name: section.data.name || defaultData.name,
          from: section.data.from || defaultData.from,
          hobbies: section.data.hobbies || defaultData.hobbies,
          affiliation: section.data.affiliation || defaultData.affiliation,
          imageUrl: section.data.imageUrl || defaultData.imageUrl,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch ${sectionId}:`, error);
    }
  };

  return (
    <FadeInSection>
      <section id={sectionId}>
        <h2>About Me</h2>
        <div className="flex flex-col md:flex-row items-left gap-8 card">
          {profileData.imageUrl && (
            <Image
              src={profileData.imageUrl}
              alt="プロフィール写真"
              width={150}
              height={150}
              className="rounded-full object-cover"
            />
          )}
          <div>
            {profileData.name && <h3>名前：{profileData.name}</h3>}
            {profileData.from && <p>出身：{profileData.from}</p>}
            {profileData.hobbies && <p>趣味：{profileData.hobbies}</p>}
            {profileData.affiliation && <p>{profileData.affiliation}</p>}
          </div>
        </div>
      </section>
    </FadeInSection>
  );
}
