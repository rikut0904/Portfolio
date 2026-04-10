import React from "react";

interface ProfileSectionFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function ProfileSectionForm({
  formData,
  setFormData,
}: ProfileSectionFormProps) {
  const profileData = formData.data || formData;

  const updateProfileData = (field: string, value: string) => {
    if (formData.data) {
      setFormData({
        ...formData,
        data: { ...formData.data, [field]: value },
      });
    } else {
      setFormData({ ...formData, [field]: value });
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
          value={profileData.hometown || profileData.from || ""}
          onChange={(e) =>
            updateProfileData(
              formData.data ? "hometown" : "from",
              e.target.value,
            )
          }
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
          value={profileData.university || profileData.affiliation || ""}
          onChange={(e) =>
            updateProfileData(
              formData.data ? "university" : "affiliation",
              e.target.value,
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          プロフィール画像URL
        </label>
        <input
          type="text"
          value={profileData.profileImage || profileData.imageUrl || ""}
          onChange={(e) =>
            updateProfileData(
              formData.data ? "profileImage" : "imageUrl",
              e.target.value,
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="/img/profile.jpg"
        />
      </div>
    </div>
  );
}
