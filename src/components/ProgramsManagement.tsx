import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ProgramsManagementProps {
  onBack?: () => void;
}

export function ProgramsManagement({ onBack }: ProgramsManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const programs = useQuery(api.programs.getAllPrograms) || [];
  const teachers = useQuery(api.teachers.getAllTeachers) || [];
  const createProgram = useMutation(api.programs.createProgram);
  const updateProgram = useMutation(api.programs.updateProgram);
  const deactivateProgram = useMutation(api.programs.deactivateProgram);

  const handleAddProgram = async (formData: any) => {
    try {
      await createProgram(formData);
      toast.success("تم إضافة البرنامج بنجاح!");
      setShowAddForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ أثناء إضافة البرنامج";
      toast.error(message);
    }
  };

  const handleDeactivateProgram = async (programId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا البرنامج؟")) {
      try {
        await deactivateProgram({ programId: programId as any });
        toast.success("تم حذف البرنامج بنجاح!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "حدث خطأ أثناء حذف البرنامج";
        toast.error(message);
      }
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: "#059669" }} // أخضر غامق bg-green-500
            >
              ← رجوع للوحة التحكم
            </button>
          )}
          <h2 className="text-2xl font-bold text-green-800">إدارة البرامج</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + إضافة برنامج جديد
        </button>
      </div>

      {/* Programs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program._id} className="bg-gradient-to-br from-white to-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📚</span>
                  <h3 className="text-xl font-bold text-gray-900 truncate">{program.name}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{program.description}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                program.currentStudents >= program.maxStudents 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {program.currentStudents}/{program.maxStudents}
              </span>
            </div>
            
            <div className="space-y-2.5 text-sm text-gray-700 mb-4">
              <div className="flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2">
                <span>⏱️</span>
                <span className="font-medium">{program.duration}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2">
                <span>👥</span>
                <span className="font-medium">{program.targetAge}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2">
                <span>📅</span>
                <span className="font-medium">{program.schedule}</span>
              </div>
              {program.teacherId && (
                <div className="flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2">
                  <span>👨‍🏫</span>
                  <span className="font-medium">محفظ مكلف</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>نسبة الامتلاء</span>
                <span>{Math.round((program.currentStudents / program.maxStudents) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    program.currentStudents >= program.maxStudents 
                      ? 'bg-red-500' 
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((program.currentStudents / program.maxStudents) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                تعديل
              </button>
              <button 
                onClick={() => handleDeactivateProgram(program._id)}
                className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {programs.length === 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-16 text-center">
          <span className="text-7xl mb-6 block">📚</span>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">لا توجد برامج</h3>
          <p className="text-gray-600 text-lg">ابدأ بإضافة برنامج جديد من الزر أعلاه</p>
        </div>
      )}

      {/* Add Program Modal */}
      {showAddForm && (
        <AddProgramModal
          teachers={teachers}
          onSubmit={handleAddProgram}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

function AddProgramModal({ teachers, onSubmit, onClose }: any) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    targetAge: "",
    maxStudents: "",
    schedule: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.maxStudents) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    onSubmit({
      ...formData,
      maxStudents: parseInt(formData.maxStudents),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-green-800">إضافة برنامج جديد</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم البرنامج *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="مثال: برنامج الحفظ المكثف"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف البرنامج *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="وصف مختصر عن البرنامج وأهدافه"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مدة البرنامج
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">اختر المدة</option>
              <option value="3 أشهر">3 أشهر</option>
              <option value="6 أشهر">6 أشهر</option>
              <option value="سنة واحدة">سنة واحدة</option>
              <option value="سنتان">سنتان</option>
              <option value="3 سنوات">3 سنوات</option>
              <option value="مفتوح">مفتوح</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الفئة العمرية المستهدفة
            </label>
            <select
              value={formData.targetAge}
              onChange={(e) => setFormData({ ...formData, targetAge: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">اختر الفئة العمرية</option>
              <option value="5-8 سنوات">5-8 سنوات</option>
              <option value="9-12 سنة">9-12 سنة</option>
              <option value="13-16 سنة">13-16 سنة</option>
              <option value="17-25 سنة">17-25 سنة</option>
              <option value="26+ سنة">26+ سنة</option>
              <option value="جميع الأعمار">جميع الأعمار</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحد الأقصى للطلاب *
            </label>
            <input
              type="number"
              value={formData.maxStudents}
              onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              min="1"
              max="50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مواعيد الحصص
            </label>
            <input
              type="text"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="مثال: الأحد والثلاثاء 4:00-6:00 مساءً"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              إضافة البرنامج
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
