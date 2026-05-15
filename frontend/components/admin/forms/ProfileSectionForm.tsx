import React from "react";

interface ProfileSectionFormProps {
  formData: {
    data?: Record<string, string | undefined>;
    [key: string]: unknown;
  };
  setFormData: (data: {
    data?: Record<string, string | undefined>;
    [key: string]: unknown;
  }) => void;
}

export default function ProfileSectionForm({
  formData,
  setFormData,
}: ProfileSectionFormProps) {
  const rawProfileData = formData.data || formData;
  const getString = (value: unknown) =>
    typeof value === "string" ? value : undefined;

  const profileData: Record<string, string | undefined> = {
    name: getString(rawProfileData?.name) || "",
    hometown: getString(rawProfileData?.hometown) || "",
    hobbies: getString(rawProfileData?.hobbies) || "",
    affiliation:
      getString(rawProfileData?.affiliation) ||
      getString(rawProfileData?.university) ||
      "",
    profileImage: getString(rawProfileData?.profileImage) || "",
  };

  const updateProfileData = (field: string, value: string) => {
    const patch = { [field]: value };

    if (formData.data) {
      setFormData({
        ...formData,
        data: { ...formData.data, ...patch },
      });
    } else {
      setFormData({ ...formData, ...patch });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          名前
        </label>
        <input
          type="text"
          value={profileData.name || ""}
          onChange={(e) => updateProfileData("name", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          出身
        </label>
        <input
          type="text"
          value={profileData.hometown || ""}
          onChange={(e) => updateProfileData("hometown", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          趣味
        </label>
        <input
          type="text"
          value={profileData.hobbies || ""}
          onChange={(e) => updateProfileData("hobbies", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          所属・大学
        </label>
        <input
          type="text"
          value={profileData.affiliation || ""}
          onChange={(e) => updateProfileData("affiliation", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          プロフィール画像URL
        </label>
        <input
          type="text"
          value={profileData.profileImage || ""}
          onChange={(e) => updateProfileData("profileImage", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="/img/profile.jpg"
        />
      </div>
    </div>
  );
}
