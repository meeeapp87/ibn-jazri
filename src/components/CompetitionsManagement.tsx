// src/components/CompetitionsManagement.tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CompetitionsManagementProps {
  onBack?: () => void;
}

export function CompetitionsManagement({ onBack }: CompetitionsManagementProps) {
  const competitions = useQuery(api.competitions.getAllCompetitions) || [];
  const createCompetition = useMutation(api.competitions.createCompetition);
  const updateCompetition = useMutation(api.competitions.updateCompetition);
  const deactivateCompetition = useMutation(api.competitions.deactivateCompetition);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizes, setPrizes] = useState("");
  const [rules, setRules] = useState("");

  function resetForm() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setPrizes("");
    setRules("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ✅ التقسيم الصحيح على سطر جديد
    const prizesArray = prizes
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      if (mode === "create") {
        await createCompetition({
          title,
          description,
          startDate,
          endDate,
          prizes: prizesArray,
          rules,
        });
        toast.success("تمت إضافة المسابقة");
      } else if (mode === "edit" && editingId) {
        await updateCompetition({
          competitionId: editingId as any,
          title,
          description,
          startDate,
          endDate,
          prizes: prizesArray,
          rules,
        });
        toast.success("تم حفظ التعديلات");
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ");
    }
  }

  function handleEdit(comp: any) {
    setMode("edit");
    setEditingId(comp._id);
    setTitle(comp.title);
    setDescription(comp.description);
    setStartDate(comp.startDate);
    setEndDate(comp.endDate);
    // ✅ الدمج الصحيح
    setPrizes((comp.prizes || []).join("\n"));
    setRules(comp.rules || "");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800">إدارة المسابقات 🏆</h2>
          <p className="text-gray-600 text-sm">
            إضافة، تعديل، تفعيل أو إلغاء تفعيل المسابقات المعروضة في الصفحة العامة.
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
         style={{ backgroundColor: "#059669" }} // أخضر غامق bg-green-500
          >
            ← رجوع للوحة التحكم
          </button>
        )}
      </div>

      {/* النموذج */}
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 p-6 space-y-4 shadow-lg">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المسابقة</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 h-20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الجوائز (كل جائزة في سطر)</label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 h-20"
              value={prizes}
              onChange={(e) => setPrizes(e.target.value)}
              placeholder={"مثال:\nالمركز الأول …\nالمركز الثاني …"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القواعد / الشروط</label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 h-20"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder={"اكتب الشروط…\nسطر لكل شرط (سيتحوّل لبلوك واحد مع فواصل سطور)."}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2 rounded-lg bg-green-600 text-white">
            {mode === "create" ? "إضافة مسابقة" : "حفظ التعديلات"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-200"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-lg">
        <table className="w-full text-right">
          <thead className="bg-gradient-to-r from-orange-100 to-amber-100 text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-4 py-3">العنوان</th>
              <th className="px-4 py-3">الفترة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">جوائز</th>
              <th className="px-4 py-3">تحكم</th>
            </tr>
          </thead>
          <tbody>
            {competitions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                  لا توجد مسابقات بعد.
                </td>
              </tr>
            )}
            {competitions.map((comp: any) => (
              <tr key={comp._id} className="border-t border-gray-100 hover:bg-orange-50 transition-colors text-sm">
                <td className="px-4 py-3 font-medium text-gray-800">{comp.title}</td>
                <td className="px-4 py-3 text-gray-500">
                  {comp.startDate} → {comp.endDate}
                </td>
                <td className="px-4 py-3">
                  {comp.isActive ? (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">نشطة</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">غير نشطة</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {(comp.prizes || []).slice(0, 3).join("، ")}
                </td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <button
                    onClick={() => handleEdit(comp)}
                    className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs"
                  >
                    تعديل
                  </button>
                  {comp.isActive ? (
                    <button
                      onClick={() => deactivateCompetition({ competitionId: comp._id })}
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs"
                    >
                      إلغاء
                    </button>
                  ) : (
                    <button
                      onClick={() => updateCompetition({ competitionId: comp._id, isActive: true })}
                      className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs"
                    >
                      تفعيل
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
