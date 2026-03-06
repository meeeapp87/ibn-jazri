// src/components/ProfileSetup.tsx
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ProfileSetup() {
  const completeProfile = useMutation(api.auth.completeProfile);
  const currentProfile = useQuery(api.auth.getCurrentUserProfile);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "guardian">("student");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // املأ الحقول من البروفايل الحالي إن وُجد
  useEffect(() => {
    if (!currentProfile) return;
    setName(currentProfile.name ?? "");
    setRole((currentProfile.role as any) ?? "student");
    setPhone(currentProfile.phone ?? "");
  }, [currentProfile]);

  const formatEgyptPhone = (raw: string) => {
    if (!raw) return "";
    // إزالة أي مسافات ورموز
    const onlyDigits = raw.replace(/\D/g, "");
    // لو بالفعل بصيغة دولية 0020 ترجع كما هي
    if (onlyDigits.startsWith("0020")) return onlyDigits;
    // لو بتبدأ بـ 0 محلية، نشيل الأصفار الأولية ثم نضيف 0020
    const trimmed = onlyDigits.replace(/^0+/, "");
    return `0020${trimmed}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    if (!phone.trim()) {
      toast.error("رقم الجوال مطلوب");
      return;
    }
    setSaving(true);
    try {
      const formattedPhone = formatEgyptPhone(phone);
      await completeProfile({ name: name.trim(), role, phone: formattedPhone });
      toast.success("✅ تم حفظ البيانات بنجاح");
      // حدِّث الحالة المحلية بدون إعادة تحميل
      setPhone(formattedPhone);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white/80 backdrop-blur rounded-2xl border border-green-100 p-8 shadow-sm" dir="rtl">
      <h2 className="text-2xl font-bold text-green-800 mb-2 text-center">إكمال الملف الشخصي</h2>
      <p className="text-gray-600 text-center mb-6">
        الرجاء إدخال بياناتك الأساسية لتخصيص تجربتك في المنصة.
      </p>

      {/* لمسة بسيطة: عرض الإيميل الحالي إن وُجد */}
      {loggedInUser?.email && (
        <div className="mb-4 text-center text-sm text-gray-500">
          البريد المسجّل: <span className="font-medium">{loggedInUser.email}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* الاسم */}
        <div>
          <label className="block text-green-800 font-semibold mb-1">الاسم الكامل</label>
          <input
            type="text"
            placeholder="مثال: أحمد مصطفى"
            className="w-full border border-green-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* الدور */}
        <div>
          <label className="block text-green-800 font-semibold mb-1">الدور في المنصة</label>
          <select
            className="w-full border border-green-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 outline-none"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="student">طالب</option>
            <option value="teacher">محفظ</option>
            <option value="guardian">ولي أمر</option>
            {/* ⚠️ ممنوع إضافة "admin" من الواجهة */}
          </select>
        </div>

        {/* رقم الجوال */}
        <div>
          <label className="block text-green-800 font-semibold mb-1">رقم الجوال (يُحفظ بصيغة 0020…)</label>
          <input
            type="tel"
            placeholder="10xxxxxxxx"
            className="w-full border border-green-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            سيتم تحويل الرقم تلقائيًا إلى 0020XXXXXXXXXX
          </p>
        </div>

        {/* زر الحفظ */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition-all"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ البيانات"}
        </button>
      </form>
    </div>
  );
}
