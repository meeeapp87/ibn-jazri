import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { StudentsDedupModal } from "./StudentsDedupModal";
import { TeachersDedupModal } from "./TeachersDedupModal"; // ✅ لو الملف موجود عندك

interface AdminUsersTableProps {
  onBack?: () => void;
}

export function AdminUsersTable({ onBack }: AdminUsersTableProps) {
  const users = useQuery(api.admin.listUsers);

  const setUserRole = useMutation(api.admin.setUserRole);
  const toggleUserActive = useMutation(api.admin.toggleUserActive);
  const linkUserToTeacher = useMutation(api.teachers.linkUserToTeacher);
  const deleteUser = useMutation(api.admin.deleteUser);

  const [studentsDedupOpen, setStudentsDedupOpen] = useState(false);
  const [teachersDedupOpen, setTeachersDedupOpen] = useState(false);

  // ✅ لو عايز تقفل أزرار الدمج غير للمشرف (اختياري)
  const currentUserRole = useMemo(() => {
    // لو listUsers بيرجع currentUserRole أو currentUser داخل كل user مش مضمون
    // فسيبها فاضية أو عدّل حسب اللي عندك
    return "admin";
  }, []);

  if (users === undefined) {
    return <p className="text-gray-500">جاري تحميل المستخدمين...</p>;
  }

  if (!users || users.length === 0) {
    return <p className="text-gray-500">لا يوجد مستخدمون حتى الآن.</p>;
  }

  async function handleRoleChange(profileId: string, role: string) {
    try {
      await setUserRole({ profileId: profileId as any, role });
      toast.success("تم تحديث الدور بنجاح ✅");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر تحديث الدور");
    }
  }

  async function handleToggle(profileId: string, isActive: boolean) {
    try {
      await toggleUserActive({ profileId: profileId as any, isActive });
      toast.success("تم تحديث الحالة ✅");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر تحديث الحالة");
    }
  }

  async function handleLinkTeacher(userId: string) {
    try {
      await linkUserToTeacher({ userId: userId as any });
      toast.success(
        "تم ربط المحفّظ بنجاح! ✅ يمكنك الآن تعديل بياناته من إدارة المحفظين"
      );
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر ربط المحفّظ");
    }
  }

  async function handleDelete(profileId: string, userName: string) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المستخدم "${userName}" نهائياً؟\n\n⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!`
    );
    if (!confirmed) return;

    try {
      await deleteUser({ profileId: profileId as any });
      toast.success("تم حذف المستخدم نهائياً ✅");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر حذف المستخدم");
    }
  }

  // ✅ تحذير قبل فتح دمج الطلاب
  const openStudentsDedup = () => {
    const ok = window.confirm(
      "⚠️ تنبيه مهم:\n\n- الدمج سيقوم بنقل (الحضور + التقييمات) إلى سجل واحد.\n- السجلات الأخرى سيتم تعطيلها (أو حذفها حسب اختيارك داخل الدمج).\n\nهل تريد فتح شاشة دمج الطلاب المكررين؟"
    );
    if (!ok) return;
    setStudentsDedupOpen(true);
  };

  // ✅ تحذير قبل فتح دمج المحفظين
  const openTeachersDedup = () => {
    const ok = window.confirm(
      "⚠️ تنبيه مهم:\n\n- الدمج سيقوم بنقل كل ما يخص المحفّظ (سجلاته، وربط الطلاب/الحضور/التقييمات حسب ما نفّذته في الـ backend).\n- السجلات الأخرى سيتم تعطيلها (أو حذفها حسب اختيارك).\n\nهل تريد فتح شاشة دمج المحفظين المكررين؟"
    );
    if (!ok) return;
    setTeachersDedupOpen(true);
  };

  const canUseDedupButtons = currentUserRole === "admin";

  return (
    <div className="space-y-4">
      {/* Header + أزرار الدمج */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: "#059669" }}
            >
              ← رجوع للوحة التحكم
            </button>
          )}
          <h3 className="text-xl font-bold text-green-800">إدارة المستخدمين</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openStudentsDedup}
            disabled={!canUseDedupButtons}
            className={`px-4 py-2 rounded-xl font-bold transition-all shadow ${
              canUseDedupButtons
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            title="دمج الطالبات/الطلاب الذين تم تسجيلهم أكثر من مرة"
          >
            🧹 دمج الطلاب
          </button>

          <button
            onClick={openTeachersDedup}
            disabled={!canUseDedupButtons}
            className={`px-4 py-2 rounded-xl font-bold transition-all shadow ${
              canUseDedupButtons
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            title="دمج المحفظين الذين تم تسجيلهم أكثر من مرة"
          >
            🧹 دمج المحفظين
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        من هنا يمكنك ترقية مستخدم إلى "مشرف"، أو تحويله إلى "محفظ"، أو إيقافه
        مؤقتًا.
      </p>

      <div className="overflow-x-auto border-2 border-gray-200 rounded-2xl shadow-lg">
        <table className="min-w-full text-sm text-right">
          <thead className="bg-gradient-to-r from-red-100 to-pink-100 text-gray-800 font-semibold">
            <tr>
              <th className="py-2 px-3">الاسم</th>
              <th className="py-2 px-3">البريد</th>
              <th className="py-2 px-3">الدور</th>
              <th className="py-2 px-3">الحالة</th>
              <th className="py-2 px-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr
                key={u._id}
                className="border-b last:border-0 hover:bg-red-50 transition-colors"
              >
                <td className="py-2 px-3">{u.name || "—"}</td>
                <td className="py-2 px-3 text-gray-500">{u.email || "—"}</td>

                <td className="py-2 px-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                  >
                    <option value="student">طالب</option>
                    <option value="teacher">محفظ</option>
                    <option value="guardian">ولي أمر</option>
                    <option value="admin">مشرف</option>
                  </select>
                </td>

                <td className="py-2 px-3">
                  {u.isActive ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      نشط
                    </span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      موقوف
                    </span>
                  )}
                </td>

                <td className="py-2 px-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleToggle(u._id, !u.isActive)}
                      className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
                    >
                      {u.isActive ? "إيقاف" : "تفعيل"}
                    </button>

                    {u.role === "teacher" && (
                      <button
                        onClick={() => handleLinkTeacher(u.userId)}
                        className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 text-green-800 px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
                        title="ربط بملف محفّظ"
                      >
                        ربط محفّظ
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(u._id, u.name || u.email)}
                      className="text-xs bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-800 px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
                      title="حذف المستخدم نهائياً"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مودالات الدمج */}
      {studentsDedupOpen && (
        <StudentsDedupModal onClose={() => setStudentsDedupOpen(false)} />
      )}

      {teachersDedupOpen && (
        <TeachersDedupModal onClose={() => setTeachersDedupOpen(false)} />
      )}
    </div>
  );
}
