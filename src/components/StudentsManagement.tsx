// src/components/StudentsManagement.tsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface StudentsManagementProps {
  onBack?: () => void;
}

const SURAHS = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

const GRADES = ["ممتاز", "جيد جدا", "جيد", "يحتاج متابعة", "إعادة"];

/** قائمة الأجزاء 1..30 */
const JUZ_LEVELS = [
  "الجزء 1","الجزء 2","الجزء 3","الجزء 4","الجزء 5","الجزء 6","الجزء 7","الجزء 8","الجزء 9","الجزء 10",
  "الجزء 11","الجزء 12","الجزء 13","الجزء 14","الجزء 15","الجزء 16","الجزء 17","الجزء 18","الجزء 19","الجزء 20",
  "الجزء 21","الجزء 22","الجزء 23","الجزء 24","الجزء 25","الجزء 26","الجزء 27",
  "الجزء 28 (قد سمع)","الجزء 29 (تبارك)","الجزء 30 (عم)",
  "القرآن كاملاً",
  "ختمة تثبيت",
  "تعلم التجويد"
];

/** ✅ قائمة أحكام التجويد الجديدة */
const TAJWEED_RULES = [
  "لا يوجد",
  "الفرق بين رسم المصحف والرسم الإملائي",
  "علامات الوقف",
  "المد الطبيعي",
  "مد البدل",
  "مد العوض",
  "مد الصلة الصغرى",
  "المد المتصل",
  "المد المنفصل",
  "مد الصلة الكبرى",
  "المد اللازم الكلمي",
  "المد اللازم الحرفي",
  "المد العارض للسكون",
  "مد اللين",
  "صفات الحروف العربية (الصفات التي لها ضد)",
  "الجهر والهمس",
  "الشدة والرخاوة والبينية",
  "الاستعلاء والاستفال",
  "الاطباق والانفتاح",
  "أحكام التفخيم والترقيق (ألف المد ، لام لفظ الجلالة، الراء)",
  "الصفات التي لا ضد لها",
  "تجاور الحروف العربية",
  "أحكام اللام الساكنة (الإظهار ، الإدغام)",
  "أحكام الميم الساكنة (الإخفاء الشفوي)",
  "أحكام الميم الساكنة (الإدغام)",
  "أحكام الميم الساكنة (الإظهار الشفوي)",
  "أحكام النون الساكنة والتنوين (الإظهار الحلقي)",
  "أحكام النون الساكنة والتنوين (إدغام بغنة)",
  "أحكام النون الساكنة والتنوين (إدغام بغير غنة)",
  "أحكام النون الساكنة والتنوين (الإقلاب)",
  "أحكام النون الساكنة والتنوين (الإخفاء الحقيقي)",
  "مراتب الغنية",
  "تفادي التقاء الساكنين",
  "أحكام الهمزة (همزة القطع ، وهمزة الوصل)",
  "دخول همزة الاستفهام على همزة قطع ساكنة (مد البدل)",
  "دخول همزة الاستفهام على همزة الوصل في الأفعال",
  "دخول همزة الاستفهام المفتوحة على لام التعريف",
  "النبر",
  "الألفات السبعة",
  "الإشمام ، الإمالة ، التسهيل",
  "الوقف والإبتداء (أنواع الوقف)",
  "الوقف والإبتداء (أنواع البدء)",
  "الوقف في المقطوع والموصول",
  "مقارنة بين الوقف ، القطع ، السكت",
  "السكتات الواجبة والجائزة عند حفص من طريق الشاطبية",
  "مخارج الحروف العربية (المخارج العامة)",
  "مخارج الحروف العربية (المخارج الخاصة)",
  "إتمام الحركات",
  "آلية النطق بالحرف الصحيح في جهاز النطق البشري",
];

function safeDateLabel(d?: string) {
  return d || "—";
}

/** ✅ أرقام عربية -> إنجليزية */
function normalizeDigits(input: string) {
  const map: Record<string, string> = {
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
  };
  return input.replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d);
}

/** ✅ يحول لرقم آمن أو undefined */
function toSafeNumber(v: any): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const normalized = normalizeDigits(s);
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

/** ✅ منع NaN في العرض */
function formatRange(task?: any) {
  if (!task) return "";

  const sFrom = task.surahFrom || "";
  const sTo = task.surahTo || "";

  const fromNum = toSafeNumber(task.ayahFrom);
  const toNum = toSafeNumber(task.ayahTo);

  const aFrom = fromNum !== undefined ? `:${fromNum}` : "";
  const aTo = toNum !== undefined ? `:${toNum}` : "";

  if (!sFrom) return "";

  if (!sTo || sTo === sFrom) {
    // نفس السورة: "الفلق:1 → 5" (بدون NaN)
    return `${sFrom}${aFrom}${toNum !== undefined ? ` → ${toNum}` : ""}`;
  }

  return `${sFrom}${aFrom} → ${sTo}${aTo}`;
}

export function StudentsManagement({ onBack }: StudentsManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [evaluatingStudent, setEvaluatingStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");

  const students = useQuery(api.students.getAllStudents) || [];
  const programs = useQuery(api.programs.getAllPrograms) || [];
  const createStudent = useMutation(api.students.createStudent);
  const updateStudent = useMutation(api.students.updateStudent);
  const deactivateStudent = useMutation(api.students.deactivateStudent);

  const filteredStudents = (students as any[])
    .filter((student) => student?.isActive !== false)
    .filter((student) => {
      const matchesSearch =
        (student?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student?.phone || "").includes(searchTerm);
      const matchesProgram = !selectedProgram || student?.program === selectedProgram;
      return matchesSearch && matchesProgram;
    });

  const handleAddStudent = async (formData: any) => {
    try {
      await createStudent(formData);
      toast.success("تم إضافة الطالب بنجاح!");
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "حدث خطأ أثناء إضافة الطالب");
    }
  };

  const handleDeactivateStudent = async (studentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    try {
      await deactivateStudent({ studentId: studentId as any });
      toast.success("تم حذف الطالب بنجاح!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "حدث خطأ أثناء حذف الطالب");
    }
  };

  const handleEditStudent = async (formData: any) => {
    try {
      await updateStudent({
        studentId: editingStudent._id,
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
      });
      toast.success("تم تحديث بيانات الطالب بنجاح!");
      setEditingStudent(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "حدث خطأ أثناء تحديث الطالب");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
              style={{ backgroundColor: "#059669" }}
            >
              ← رجوع للوحة التحكم
            </button>
          )}
          <h2 className="text-2xl font-bold text-green-800">إدارة الطلاب</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + إضافة طالب جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البحث (الاسم أو رقم الهاتف)
            </label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="ابحث عن طالب..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تصفية حسب البرنامج
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">جميع البرامج</option>
              {programs.map((program: any) => (
                <option key={program._id} value={program.name}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student: any) => {
          const isFemale = student.gender === "أنثى";
          const cardBg = isFemale
            ? "bg-gradient-to-br from-pink-50 via-pink-100 to-rose-50"
            : "bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50";
          const borderColor = isFemale ? "border-pink-300" : "border-blue-300";
          const levelBg = isFemale ? "bg-pink-200" : "bg-blue-200";
          const levelText = isFemale ? "text-pink-900" : "text-blue-900";
          const rowBg = isFemale ? "bg-pink-200/60" : "bg-blue-50/50";
          const rowBorder = isFemale ? "border-pink-300/70" : "border-blue-200/60";

          return (
            <div
              key={student._id}
              className={`${cardBg} border-2 ${borderColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{isFemale ? "👧" : "👦"}</span>
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {student.name}
                    </h3>
                  </div>
                  <p className="text-green-600 font-medium">
                    {student.program || "بدون برنامج"}
                  </p>
                </div>
                <span className={`${levelBg} ${levelText} px-3 py-1.5 rounded-full text-xs font-bold shadow-sm`}>
                  {student.level}
                </span>
              </div>

              <div className="space-y-2.5 text-sm text-gray-700">
                <div className={`flex items-center gap-2 ${rowBg} border ${rowBorder} rounded-lg px-3 py-2`}>
                  <span>📞</span>
                  <span className="font-medium">{student.phone}</span>
                </div>
                <div className={`flex items-center gap-2 ${rowBg} border ${rowBorder} rounded-lg px-3 py-2`}>
                  <span>👨‍👩‍👧‍👦</span>
                  <span className="font-medium">{student.parentPhone}</span>
                </div>
                <div className={`flex items-center gap-2 ${rowBg} border ${rowBorder} rounded-lg px-3 py-2`}>
                  <span>🎂</span>
                  <span className="font-medium">{student.age} سنة</span>
                </div>
                <div className={`flex items-center gap-2 ${rowBg} border ${rowBorder} rounded-lg px-3 py-2`}>
                  <span>📍</span>
                  <span className="truncate font-medium">{student.address}</span>
                </div>
                <div className={`flex items-center gap-2 ${rowBg} border ${rowBorder} rounded-lg px-3 py-2`}>
                  <span>📅</span>
                  <span className="font-medium">
                    {student.enrollmentDate
                      ? new Date(student.enrollmentDate).toLocaleDateString("ar-SA")
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditingStudent(student)}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  تعديل
                </button>
                <button
                  onClick={() => setEvaluatingStudent(student)}
                  className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  تقييم
                </button>
                <button
                  onClick={() => handleDeactivateStudent(student._id)}
                  className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500">لم يتم العثور على طلاب مطابقين لمعايير البحث</p>
        </div>
      )}

      {showAddForm && (
        <AddStudentModal
          onSubmit={handleAddStudent}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onSubmit={handleEditStudent}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {/* ✅ evaluation modal */}
      {evaluatingStudent?._id && (
        <EvaluationModal
          studentId={evaluatingStudent._id}
          studentName={evaluatingStudent.name || ""}
          program={evaluatingStudent.program || "غير محدد"}
          onClose={() => setEvaluatingStudent(null)}
        />
      )}
    </div>
  );
}

/* ==================== Edit Modal ==================== */
type EditStudentForm = {
  name: string;
  phone: string;
  parentPhone: string;
  address: string;
  level: string;
  age: string | number;
  gender: string;
};

function EditStudentModal({
  student,
  onSubmit,
  onClose,
}: {
  student: any;
  onSubmit: (data: EditStudentForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditStudentForm>({
    name: student?.name || "",
    phone: student?.phone || "",
    parentPhone: student?.parentPhone || "",
    address: student?.address || "",
    level: student?.level || "الجزء 30 (عم)",
    age: String(student?.age ?? ""),
    gender: student?.gender || "ذكر",
  });

  const setField = (k: keyof EditStudentForm, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("الاسم ورقم الهاتف أساسيان");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-green-700">تعديل الطالب</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-right">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">هاتف ولي الأمر</label>
              <input
                type="tel"
                value={form.parentPhone}
                onChange={(e) => setField("parentPhone", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجزء الحالي</label>
              <select
                value={form.level}
                onChange={(e) => setField("level", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                {JUZ_LEVELS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السن</label>
              <input
                type="number"
                min={3}
                value={form.age}
                onChange={(e) => setField("age", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
            <select
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="ذكر">ذكر 👦</option>
              <option value="أنثى">أنثى 👧</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================== Add Modal ==================== */
function AddStudentModal({ onSubmit, onClose }: any) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
    parentPhone: "",
    address: "",
    level: "الجزء 30 (عم)",
    gender: "ذكر",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error("يرجى ملء الاسم ورقم الهاتف");
      return;
    }
    onSubmit({ ...formData, age: parseInt(formData.age) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-green-800">إضافة طالب جديد</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العمر *</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم هاتف ولي الأمر</label>
            <input
              type="tel"
              value={formData.parentPhone}
              onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الجزء الحالي</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {JUZ_LEVELS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الجنس *</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="ذكر">ذكر 👦</option>
              <option value="أنثى">أنثى 👧</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              إضافة الطالب
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

/* ==================== Evaluation Modal (FIXED) ==================== */
function EvaluationModal({
  studentId,
  studentName,
  program,
  onClose,
}: {
  studentId: string;
  studentName: string;
  program: string;
  onClose: () => void;
}) {
  const createEvaluation = useMutation(api.evaluations.createEvaluation);
  const markStudentAttendance = useMutation(api.attendance.markStudentAttendance);

  const lastEvaluations =
    useQuery(api.evaluations.getStudentEvaluations, {
      studentId: studentId as any,
      limit: 20,
    }) || [];

  const groupedByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ev of lastEvaluations) {
      const d = ev?.date || "بدون تاريخ";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(ev);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [lastEvaluations]);

  const [todayNew, setTodayNew] = useState({
    surahFrom: "",
    ayahFrom: "",
    surahTo: "",
    ayahTo: "",
    grade: "",
  });
  const [todayNear, setTodayNear] = useState({
    surahFrom: "",
    ayahFrom: "",
    surahTo: "",
    ayahTo: "",
    grade: "",
  });
  const [todayFar, setTodayFar] = useState({
    surahFrom: "",
    ayahFrom: "",
    surahTo: "",
    ayahTo: "",
    grade: "",
  });

  const [nextNew, setNextNew] = useState({
    surahFrom: "",
    ayahFrom: "",
    surahTo: "",
    ayahTo: "",
  });
  const [nextNear, setNextNear] = useState({
    surahFrom: "",
    ayahFrom: "",
    surahTo: "",
    ayahTo: "",
  });
  const [nextFar, setNextFar] = useState({
    surahFrom: "",
    ayahFrom: "",
    surahTo: "",
    ayahTo: "",
  });

  const [tajweedRule, setTajweedRule] = useState<string>("لا يوجد");
  const [notes, setNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");

  const [recordAttendance, setRecordAttendance] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const todayTasks: any = {};
      const nextTasks: any = {};

      if (todayNew.surahFrom) {
        todayTasks.newMem = {
          surahFrom: todayNew.surahFrom,
          ayahFrom: toSafeNumber(todayNew.ayahFrom),
          surahTo: todayNew.surahTo || undefined,
          ayahTo: toSafeNumber(todayNew.ayahTo),
          grade: todayNew.grade || undefined,
        };
      }

      if (todayNear.surahFrom) {
        todayTasks.reviewNear = {
          surahFrom: todayNear.surahFrom,
          ayahFrom: toSafeNumber(todayNear.ayahFrom),
          surahTo: todayNear.surahTo || undefined,
          ayahTo: toSafeNumber(todayNear.ayahTo),
          grade: todayNear.grade || undefined,
        };
      }

      if (todayFar.surahFrom) {
        todayTasks.reviewFar = {
          surahFrom: todayFar.surahFrom,
          ayahFrom: toSafeNumber(todayFar.ayahFrom),
          surahTo: todayFar.surahTo || undefined,
          ayahTo: toSafeNumber(todayFar.ayahTo),
          grade: todayFar.grade || undefined,
        };
      }

      if (nextNew.surahFrom) {
        nextTasks.newMem = {
          surahFrom: nextNew.surahFrom,
          ayahFrom: toSafeNumber(nextNew.ayahFrom),
          surahTo: nextNew.surahTo || undefined,
          ayahTo: toSafeNumber(nextNew.ayahTo),
        };
      }

      if (nextNear.surahFrom) {
        nextTasks.reviewNear = {
          surahFrom: nextNear.surahFrom,
          ayahFrom: toSafeNumber(nextNear.ayahFrom),
          surahTo: nextNear.surahTo || undefined,
          ayahTo: toSafeNumber(nextNear.ayahTo),
        };
      }

      if (nextFar.surahFrom) {
        nextTasks.reviewFar = {
          surahFrom: nextFar.surahFrom,
          ayahFrom: toSafeNumber(nextFar.ayahFrom),
          surahTo: nextFar.surahTo || undefined,
          ayahTo: toSafeNumber(nextFar.ayahTo),
        };
      }

      await createEvaluation({
        studentId: studentId as any,
        program: program || "غير محدد",
        date: today,
        todayTasks: Object.keys(todayTasks).length ? todayTasks : undefined,
        nextTasks: Object.keys(nextTasks).length ? nextTasks : undefined,
        tajweedRule: tajweedRule !== "لا يوجد" ? tajweedRule : undefined,
        notes: notes || undefined,
        strengths: strengths || undefined,
        improvements: improvements || undefined,
      });

      if (recordAttendance) {
        await markStudentAttendance({
          studentId: studentId as any,
          date: today,
          status: "حاضر",
          program: program || "غير محدد",
          notes: "تم تسجيل الحضور من نموذج التقييم",
        } as any);
      }

      toast.success("تم حفظ التقييم ✅");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("تعذر حفظ التقييم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto p-6" dir="rtl">
        <div className="flex justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-green-800">تقييم الطالب: {studentName}</h3>
            <p className="text-sm text-gray-500">سجّل ما تم اليوم، ثم اكتب المهمة القادمة، وأضف الملاحظات.</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recordAttendance"
                checked={recordAttendance}
                onChange={(e) => setRecordAttendance(e.target.checked)}
              />
              <label htmlFor="recordAttendance" className="text-sm text-gray-700">
                تسجيل حضور الطالب اليوم ({today})
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">أحكام التجويد</label>
              <select
                value={tajweedRule}
                onChange={(e) => setTajweedRule(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                {TAJWEED_RULES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-green-900">تقييم اليوم (ما تم تسميعه)</h4>
            <RowToday title="الحفظ الجديد" color="green" state={todayNew} setState={setTodayNew} />
            <RowToday title="مراجعة الماضي القريب" color="sky" state={todayNear} setState={setTodayNear} />
            <RowToday title="مراجعة الماضي البعيد" color="purple" state={todayFar} setState={setTodayFar} />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-amber-900">المهمة القادمة</h4>
            <RowNextTask title="الحفظ الجديد" state={nextNew} setState={setNextNew} />
            <RowNextTask title="مراجعة الماضي القريب" state={nextNear} setState={setNextNear} />
            <RowNextTask title="مراجعة الماضي البعيد" state={nextFar} setState={setNextFar} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-3">
              <label className="text-sm font-medium text-blue-900">ملاحظات عامة</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-2 border border-blue-100 rounded-lg px-3 py-2 min-h-[90px]"
              />
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <label className="text-sm font-medium text-emerald-900">نقاط قوة عند الطالب</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full mt-2 border border-emerald-100 rounded-lg px-3 py-2 min-h-[90px]"
              />
            </div>
            <div className="bg-rose-50 rounded-xl p-3">
              <label className="text-sm font-medium text-rose-900">جوانب تحتاج إلى تحسين</label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                className="w-full mt-2 border border-rose-100 rounded-lg px-3 py-2 min-h-[90px]"
              />
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-gray-700">آخر التقييمات</h4>

            {groupedByDate.length ? (
              <div className="space-y-3">
                {groupedByDate.map(([date, items]) => (
                  <div key={date} className="border rounded-xl p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-gray-800">📅 {safeDateLabel(date)}</p>
                      <span className="text-xs text-gray-500">{items.length} تقييم</span>
                    </div>

                    <div className="space-y-2">
                      {items.map((ev: any) => {
                        const newMem = ev?.todayTasks?.newMem;
                        const near = ev?.todayTasks?.reviewNear;
                        const far = ev?.todayTasks?.reviewFar;

                        return (
                          <div key={ev._id} className="bg-white border rounded-lg p-3">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <p className="font-medium text-gray-900">
                                {ev.overallGrade ? `⭐ ${ev.overallGrade}` : "⭐ تقييم"}
                              </p>
                              {ev.tajweedRule && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                  🎯 تجويد: {ev.tajweedRule}
                                </span>
                              )}
                            </div>

                            {newMem?.surahFrom && (
                              <p className="text-[12px] text-green-800 mt-2">
                                📗 الحفظ الجديد:{" "}
                                <span className="font-semibold">{formatRange(newMem)}</span>
                                {newMem.grade ? ` — (${newMem.grade})` : ""}
                              </p>
                            )}

                            {near?.surahFrom && (
                              <p className="text-[12px] text-sky-800 mt-1">
                                🔁 مراجعة قريبة:{" "}
                                <span className="font-semibold">{formatRange(near)}</span>
                                {near.grade ? ` — (${near.grade})` : ""}
                              </p>
                            )}

                            {far?.surahFrom && (
                              <p className="text-[12px] text-purple-800 mt-1">
                                🔁 مراجعة بعيدة:{" "}
                                <span className="font-semibold">{formatRange(far)}</span>
                                {far.grade ? ` — (${far.grade})` : ""}
                              </p>
                            )}

                            {ev.notes && (
                              <p className="text-[11px] text-gray-500 mt-2">📝 {ev.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">لا توجد تقييمات سابقة لهذا الطالب.</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 min-w-[120px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 min-w-[140px]"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ التقييم"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================== RowToday ==================== */
function RowToday({
  title,
  color,
  state,
  setState,
}: {
  title: string;
  color: "green" | "sky" | "purple";
  state: any;
  setState: (v: any) => void;
}) {
  const colorClass =
    color === "green"
      ? "text-green-900"
      : color === "sky"
      ? "text-sky-900"
      : "text-purple-900";

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
      <p className={`text-sm font-medium md:col-span-6 ${colorClass}`}>{title}</p>

      <div>
        <label className="text-xs text-gray-500">من سورة</label>
        <select
          value={state.surahFrom}
          onChange={(e) => {
            const v = e.target.value;
            setState((p: any) => ({ ...p, surahFrom: v, surahTo: p.surahTo ? p.surahTo : v }));
          }}
          className="w-full border rounded-lg px-2 py-1"
        >
          <option value=""></option>
          {SURAHS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">من الآية</label>
        <input
          value={state.ayahFrom}
          onChange={(e) => setState((p: any) => ({ ...p, ayahFrom: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
          placeholder="1"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">إلى سورة</label>
        <select
          value={state.surahTo}
          onChange={(e) => setState((p: any) => ({ ...p, surahTo: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
        >
          <option value=""></option>
          {SURAHS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">إلى الآية</label>
        <input
          value={state.ayahTo}
          onChange={(e) => setState((p: any) => ({ ...p, ayahTo: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
          placeholder="10"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">التقدير</label>
        <select
          value={state.grade}
          onChange={(e) => setState((p: any) => ({ ...p, grade: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
        >
          <option value=""></option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ==================== RowNextTask ==================== */
function RowNextTask({
  title,
  state,
  setState,
}: {
  title: string;
  state: any;
  setState: (v: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <p className="text-sm font-medium text-amber-900 md:col-span-5">{title}</p>

      <div>
        <label className="text-xs text-gray-500">من سورة</label>
        <select
          value={state.surahFrom}
          onChange={(e) => {
            const v = e.target.value;
            setState((p: any) => ({ ...p, surahFrom: v, surahTo: p.surahTo ? p.surahTo : v }));
          }}
          className="w-full border rounded-lg px-2 py-1"
        >
          <option value=""></option>
          {SURAHS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">من الآية</label>
        <input
          value={state.ayahFrom}
          onChange={(e) => setState((p: any) => ({ ...p, ayahFrom: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
          placeholder="1"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">إلى سورة</label>
        <select
          value={state.surahTo}
          onChange={(e) => setState((p: any) => ({ ...p, surahTo: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
        >
          <option value=""></option>
          {SURAHS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">إلى الآية</label>
        <input
          value={state.ayahTo}
          onChange={(e) => setState((p: any) => ({ ...p, ayahTo: e.target.value }))}
          className="w-full border rounded-lg px-2 py-1"
          placeholder="10"
        />
      </div>
    </div>
  );
}
