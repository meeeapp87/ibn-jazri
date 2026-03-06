import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import TeacherAttendance from "./TeacherAttendance";

interface AttendanceManagementProps {
  onBack?: () => void;
}

export function AttendanceManagement({ onBack }: AttendanceManagementProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const allStudents = useQuery(api.students.getAllStudents) || [];
  const attendance = useQuery(
    api.attendance.getStudentAttendanceByDate,
    selectedDate ? { date: selectedDate } : "skip"
  ) || [];

  // فلترة الطلاب حسب البحث
  const students = allStudents.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.program || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const markAttendance = useMutation(api.attendance.markStudentAttendance);
  const clearAllAttendance = useMutation(api.attendance.clearAllAttendance);

  const handleMarkAttendance = async (studentId: string, status: string) => {
    try {
      await markAttendance({
        studentId: studentId as any,
        status,
        program: allStudents.find(s => s._id === studentId)?.program,
        date: selectedDate, // ✅ استخدم التاريخ المختار من الفلتر
      });
      toast.success(`تم تسجيل ${status} للطالب`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تسجيل الحضور";
      toast.error(message);
    }
  };

  const getStudentAttendanceStatus = (studentId: string) => {
    const record = attendance.find((a: any) => a.studentId === studentId);
    return record?.status || "لم يتم التسجيل";
  };

  const handleClearAllAttendance = async () => {
    if (!confirm("⚠️ هل أنت متأكد من مسح جميع سجلات الحضور؟ هذا الإجراء لا يمكن التراجع عنه!")) {
      return;
    }
    
    try {
      const result = await clearAllAttendance({});
      toast.success(`✅ تم مسح ${result.deletedCount} سجل حضور بنجاح`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ أثناء مسح البيانات";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-4 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
               style={{ backgroundColor: "#059669" }} // أخضر غامق bg-green-500
              >
                ← رجوع للوحة التحكم
              </button>
            )}
            <h2 className="text-2xl font-bold text-green-800">إدارة الحضور والغياب</h2>
          </div>
          <p className="text-gray-600">تسجيل ومتابعة حضور الطلاب والمحفظين</p>
        </div>
      </div>

      {/* Teacher Attendance */}
      <TeacherAttendance />

      {/* Filters & Admin Actions */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">فلاتر البحث</h3>
          <button
            onClick={handleClearAllAttendance}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            🗑️ مسح جميع سجلات الحضور
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البحث في الطلاب
            </label>
            <input
              type="text"
              placeholder="ابحث بالاسم أو البرنامج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التاريخ
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Attendance List */}
      {students.length > 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b border-green-200">
            <h3 className="text-lg font-bold text-green-800">
              حضور جميع الطلاب
            </h3>
            <p className="text-green-600 text-sm">
              التاريخ: {new Date(selectedDate).toLocaleDateString('en-GB')} | 
              عدد الطلاب: {students.length}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {students.map((student) => {
              const status = getStudentAttendanceStatus(student._id);
              return (
                <div key={student._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{student.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>📞 {student.phone}</span>
                        <span>📚 {student.level}</span>
                        <span>🎂 {student.age} سنة</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Current Status */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">الحالة الحالية</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          status === "حاضر" ? "bg-green-100 text-green-800" :
                          status === "غائب" ? "bg-red-100 text-red-800" :
                          status === "متأخر" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {status}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkAttendance(student._id, "حاضر")}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                        >
                          حاضر
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(student._id, "متأخر")}
                          className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                        >
                          متأخر
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(student._id, "غائب")}
                          className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                          غائب
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500">جرب البحث بكلمات مختلفة أو تأكد من وجود طلاب مسجلين</p>
        </div>
      )}

      {/* Quick Stats */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {attendance.filter((a: any) => a.status === "حاضر").length}
              </div>
              <div className="text-green-600 text-sm font-medium">حاضر</div>
            </div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">
                {attendance.filter((a: any) => a.status === "غائب").length}
              </div>
              <div className="text-red-600 text-sm font-medium">غائب</div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-700">
                {attendance.filter((a: any) => a.status === "متأخر").length}
              </div>
              <div className="text-yellow-600 text-sm font-medium">متأخر</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">
                {students.length - attendance.length}
              </div>
              <div className="text-gray-600 text-sm font-medium">لم يسجل</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
