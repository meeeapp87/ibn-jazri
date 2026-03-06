// src/components/TeachersManagement.tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface TeachersManagementProps {
  onBack?: () => void;
}

const WEEK_DAYS: { code: string; label: string }[] = [
  { code: "Sun", label: "الأحد" },
  { code: "Mon", label: "الإثنين" },
  { code: "Tue", label: "الثلاثاء" },
  { code: "Wed", label: "الأربعاء" },
  { code: "Thu", label: "الخميس" },
  { code: "Fri", label: "الجمعة" },
  { code: "Sat", label: "السبت" },
];

export function TeachersManagement({ onBack }: TeachersManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);

  const teachersQuery = useQuery(api.teachers.getAllTeachers) || [];
  // فلترة احتياطية: لا نعرض إلا النشِطين
  const teachers = teachersQuery.filter((t: any) => t.isActive !== false);

  const programs = useQuery(api.programs.getAllPrograms) || [];
  const createTeacher = useMutation(api.teachers.createTeacher);
  const updateTeacher = useMutation(api.teachers.updateTeacher);
  const deactivateTeacher = useMutation(api.teachers.deactivateTeacher);

  const handleAddTeacher = async (formData: any) => {
    try {
      await createTeacher(formData);
      toast.success("تم إضافة المحفظ بنجاح!");
      setShowAddForm(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "حدث خطأ أثناء إضافة المحفظ";
      toast.error(message);
    }
  };

  const handleEditTeacher = async (formData: any) => {
    try {
      await updateTeacher({
        teacherId: editingTeacher._id,
        ...formData,
      });
      toast.success("تم تحديث بيانات المحفظ بنجاح!");
      setEditingTeacher(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "حدث خطأ أثناء تحديث المحفظ";
      toast.error(message);
    }
  };

  const handleDeactivateTeacher = async (teacherId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المحفظ؟")) {
      try {
        await deactivateTeacher({ teacherId: teacherId as any });
        toast.success("تم حذف المحفظ بنجاح!");
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "حدث خطأ أثناء حذف المحفظ";
        toast.error(message);
      }
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: "#059669" }} // أخضر غامق bg-green-500
            >
              ← رجوع للوحة التحكم
            </button>
          )}
          <h2 className="text-2xl font-bold text-green-800">إدارة المحفظين</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + إضافة محفظ جديد
        </button>
      </div>

      {/* Teachers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher: any) => (
          <div
            key={teacher._id}
            className="bg-gradient-to-br from-white to-green-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">👨‍🏫</span>
                  <h3 className="text-xl font-bold text-gray-900 truncate">
                    {teacher.name}
                  </h3>
                </div>
                <p className="text-green-600 font-semibold text-sm">
                  {teacher.specialization}
                </p>
              </div>
              <span className="bg-amber-200 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                {teacher.experience} سنوات
              </span>
            </div>

            {/* أيام الدوام */}
            {Array.isArray(teacher.workDays) && teacher.workDays.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">أيام الدوام:</p>
                <div className="flex flex-wrap gap-1">
                  {teacher.workDays.map((d: string) => {
                    const lbl = WEEK_DAYS.find((w) => w.code === d)?.label ?? d;
                    return (
                      <span
                        key={d}
                        className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs"
                      >
                        {lbl}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2.5 text-sm text-gray-700 mb-4">
              <div className="flex items-center gap-2 bg-green-100 rounded-lg px-3 py-2">
                <span>📞</span>
                <span className="font-medium">{teacher.phone}</span>
              </div>
              <div className="flex items-center gap-2 bg-green-100 rounded-lg px-3 py-2">
                <span>📚</span>
                <span className="font-medium">{teacher.assignedPrograms.length} برنامج مكلف</span>
              </div>
            </div>

            {/* Assigned Programs */}
            {teacher.assignedPrograms.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  البرامج المكلف بها:
                </p>
                <div className="flex flex-wrap gap-1">
                  {teacher.assignedPrograms.map(
                    (programName: string, index: number) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                      >
                        {programName}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setEditingTeacher(teacher)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDeactivateTeacher(teacher._id)}
                className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {teachers.length === 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-16 text-center">
          <span className="text-7xl mb-6 block">👨‍🏫</span>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            لا يوجد محفظين
          </h3>
          <p className="text-gray-600 text-lg">ابدأ بإضافة محفظ جديد من الزر أعلاه</p>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddForm && (
        <AddTeacherModal
          programs={programs}
          onSubmit={handleAddTeacher}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <EditTeacherModal
          teacher={editingTeacher}
          programs={programs}
          onSubmit={handleEditTeacher}
          onClose={() => setEditingTeacher(null)}
        />
      )}
    </div>
  );
}

/* ---------------------- Add Teacher Modal ---------------------- */
function AddTeacherModal({ programs, onSubmit, onClose }: any) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialization: "",
    experience: "",
    assignedPrograms: [] as string[],
    workDays: [] as string[], // NEW
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.specialization) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    onSubmit({
      ...formData,
      experience: parseInt(formData.experience) || 0,
    });
  };

  const handleProgramToggle = (programName: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedPrograms: prev.assignedPrograms.includes(programName)
        ? prev.assignedPrograms.filter((p) => p !== programName)
        : [...prev.assignedPrograms, programName],
    }));
  };

  const handleDayToggle = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(code)
        ? prev.workDays.filter((d) => d !== code)
        : [...prev.workDays, code],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-green-800">إضافة محفظ جديد</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* باقي الحقول كما هي بالضبط */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التخصص *
            </label>
            <select
              value={formData.specialization}
              onChange={(e) =>
                setFormData({ ...formData, specialization: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">اختر التخصص</option>
              <option value="تحفيظ القرآن الكريم">تحفيظ القرآن الكريم</option>
              <option value="التجويد">التجويد</option>
              <option value="القراءات">القراءات</option>
              <option value="التفسير">التفسير</option>
              <option value="الحديث الشريف">الحديث الشريف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سنوات الخبرة
            </label>
            <input
              type="number"
              min={0}
              value={formData.experience}
              onChange={(e) =>
                setFormData({ ...formData, experience: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البرامج المكلف بها
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {programs.map((program: any) => (
                <label key={program._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.assignedPrograms.includes(program.name)}
                    onChange={() => handleProgramToggle(program.name)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">{program.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* أيام الدوام */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أيام الدوام (اختياري)
            </label>
            <div className="grid grid-cols-3 gap-2 border border-gray-300 rounded-lg p-3">
              {WEEK_DAYS.map((d) => (
                <label key={d.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.workDays.includes(d.code)}
                    onChange={() => handleDayToggle(d.code)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              تُستخدم لحساب الغياب بناءً على أيام التكليف الفعلية.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              إضافة المحفظ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------- Edit Teacher Modal ---------------------- */
function EditTeacherModal({ teacher, programs, onSubmit, onClose }: any) {
  const [formData, setFormData] = useState({
    name: teacher?.name || "",
    phone: teacher?.phone || "",
    specialization: teacher?.specialization || "",
    experience: String(teacher?.experience ?? ""),
    assignedPrograms: (teacher?.assignedPrograms ?? []) as string[],
    isActive: teacher?.isActive ?? true,
    workDays: (Array.isArray(teacher?.workDays) ? teacher.workDays : []) as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.specialization) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    onSubmit({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      specialization: formData.specialization,
      experience: parseInt(formData.experience) || 0,
      assignedPrograms: formData.assignedPrograms,
      isActive: !!formData.isActive,
      workDays: formData.workDays,
    });
  };

  const handleProgramToggle = (programName: string) => {
    setFormData((prev: any) => ({
      ...prev,
      assignedPrograms: prev.assignedPrograms.includes(programName)
        ? prev.assignedPrograms.filter((p: string) => p !== programName)
        : [...prev.assignedPrograms, programName],
    }));
  };

  const handleDayToggle = (code: string) => {
    setFormData((prev: any) => ({
      ...prev,
      workDays: prev.workDays.includes(code)
        ? prev.workDays.filter((d: string) => d !== code)
        : [...prev.workDays, code],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-green-800">تعديل بيانات المحفظ</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* نفس الحقول كما كانت */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التخصص *
            </label>
            <select
              value={formData.specialization}
              onChange={(e) =>
                setFormData({ ...formData, specialization: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">اختر التخصص</option>
              <option value="تحفيظ القرآن الكريم">تحفيظ القرآن الكريم</option>
              <option value="التجويد">التجويد</option>
              <option value="القراءات">القراءات</option>
              <option value="التفسير">التفسير</option>
              <option value="الحديث الشريف">الحديث الشريف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سنوات الخبرة
            </label>
            <input
              type="number"
              min={0}
              value={formData.experience}
              onChange={(e) =>
                setFormData({ ...formData, experience: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البرامج المكلف بها
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {programs.map((program: any) => (
                <label key={program._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    checked={formData.assignedPrograms.includes(program.name)}
                    onChange={() => handleProgramToggle(program.name)}
                  />
                  <span className="text-sm">{program.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* أيام الدوام */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أيام الدوام (اختياري)
            </label>
            <div className="grid grid-cols-3 gap-2 border border-gray-300 rounded-lg p-3">
              {WEEK_DAYS.map((d) => (
                <label key={d.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={formData.workDays.includes(d.code)}
                    onChange={() => handleDayToggle(d.code)}
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              تُستخدم لحساب الغياب بناءً على أيام التكليف الفعلية.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="isActive"
              type="checkbox"
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              نشِط
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              حفظ التعديلات
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
