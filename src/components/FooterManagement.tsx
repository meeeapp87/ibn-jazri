// src/components/FooterManagement.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function FooterManagement({ onBack }: { onBack: () => void }) {
  const footerSettings = useQuery(api.footerSettings.getFooterSettings);

  const saveFooter = useMutation(api.footerSettings.saveFooterSettings);

  const [form, setForm] = useState({
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    workingHours: "",
    youtube: "",
    instagram: "",
    socialWhatsapp: "",
    twitter: "",
    quickLinks: [
      { title: "الرئيسية", subtitle: "نظرة عامة" },
      { title: "البرامج", subtitle: "التسجيل والبرامج" },
      { title: "المحفظون", subtitle: "طاقم التحفيظ" },
      { title: "التسجيل", subtitle: "انضم الآن" },
    ],
  });

  useEffect(() => {
    if (!footerSettings) return;

    setForm({
      address: footerSettings.address ?? "",
      phone: footerSettings.phone ?? "",
      whatsapp: footerSettings.whatsapp ?? "",
      email: footerSettings.email ?? "",
      workingHours: footerSettings.workingHours ?? "",
      youtube: footerSettings.socialLinks?.youtube ?? "",
      instagram: footerSettings.socialLinks?.instagram ?? "",
      socialWhatsapp: footerSettings.socialLinks?.whatsapp ?? "",
      twitter: footerSettings.socialLinks?.twitter ?? "",
      quickLinks:
        footerSettings.quickLinks?.length > 0
          ? footerSettings.quickLinks
          : form.quickLinks,
    });
  }, [footerSettings]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuickLinkChange = (index: number, key: string, value: string) => {
    const updated = [...form.quickLinks];
    (updated[index] as any)[key] = value;
    setForm((prev) => ({ ...prev, quickLinks: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await saveFooter({
        address: form.address,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        workingHours: form.workingHours,
        backgroundColor: "#022c22",
        socialLinks: {
          youtube: form.youtube || undefined,
          instagram: form.instagram || undefined,
          whatsapp: form.socialWhatsapp || undefined,
          twitter: form.twitter || undefined,
        },
        quickLinks: form.quickLinks,
      });

      toast.success("تم حفظ إعدادات الفوتر بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-emerald-800">إعدادات الفوتر</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          ← رجوع
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-emerald-50 rounded-2xl border p-6"
      >
        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-1">العنوان</label>
          <textarea
            className="w-full border rounded-lg p-2 text-sm"
            rows={2}
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </div>

        {/* Phones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">رقم الجوال</label>
            <input
              className="w-full border rounded-lg p-2"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">رقم واتساب</label>
            <input
              className="w-full border rounded-lg p-2"
              value={form.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
            />
          </div>
        </div>

        {/* Email + Working hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">البريد الإلكتروني</label>
            <input
              className="w-full border rounded-lg p-2"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">مواعيد العمل</label>
            <input
              className="w-full border rounded-lg p-2"
              value={form.workingHours}
              onChange={(e) => handleChange("workingHours", e.target.value)}
            />
          </div>
        </div>

        {/* Social links */}
        <h3 className="font-semibold text-emerald-800 mt-4">روابط السوشيال</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full border rounded-lg p-2"
            placeholder="رابط يوتيوب"
            value={form.youtube}
            onChange={(e) => handleChange("youtube", e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-2"
            placeholder="رابط انستغرام"
            value={form.instagram}
            onChange={(e) => handleChange("instagram", e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-2"
            placeholder="رابط واتساب"
            value={form.socialWhatsapp}
            onChange={(e) => handleChange("socialWhatsapp", e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-2"
            placeholder="رابط تويتر"
            value={form.twitter}
            onChange={(e) => handleChange("twitter", e.target.value)}
          />
        </div>

        {/* Quick links */}
        <h3 className="font-semibold text-emerald-800 mt-4">الروابط السريعة</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.quickLinks.map((link, idx) => (
            <div key={idx} className="border rounded-xl p-3 bg-white">
              <input
                className="w-full border rounded-lg p-2 mb-2"
                placeholder="العنوان"
                value={link.title}
                onChange={(e) =>
                  handleQuickLinkChange(idx, "title", e.target.value)
                }
              />

              <input
                className="w-full border rounded-lg p-2"
                placeholder="الوصف"
                value={link.subtitle}
                onChange={(e) =>
                  handleQuickLinkChange(idx, "subtitle", e.target.value)
                }
              />
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="w-full mt-4 bg-emerald-700 text-white py-3 rounded-xl hover:bg-emerald-800 transition"
        >
          💾 حفظ الإعدادات
        </button>
      </form>
    </div>
  );
}
