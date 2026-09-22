import React from "react";

export default function FadeInSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fade-in-section">{children}</div>;
}
