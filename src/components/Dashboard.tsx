// src/components/Dashboard.tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StudentsManagement } from "./StudentsManagement";
import { TeachersManagement } from "./TeachersManagement";
import { ProgramsManagement } from "./ProgramsManagement";
import { AttendanceManagement } from "./AttendanceManagement";
import { Reports } from "./Reports";
import { AdminUsersTable } from "./AdminUsersTable";
import { PublicContent } from "./PublicContent";
import { CompetitionsManagement } from "./CompetitionsManagement";
import { VideosManagement } from "./VideosManagement";
import { RequestsManagement } from "./RequestsManagement";
import { ResourcesManagement } from "./ResourcesManagement";
import { FooterManagement } from "./FooterManagement";

type TabType =
  | "overview"
  | "students"
  | "teachers"
  | "programs"
  | "competitions"
  | "videos"
  | "resources"
  | "attendance"
  | "reports"
  | "users"
  | "public"
  | "requests"
  | "footer";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const loggedInUser = useQuery(api.auth.loggedInUser);

  // ✅ تاريخ اليوم بصيغة YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);

  // ✅ إحصائيات الحضور "لليوم فقط"
  const attendanceStats =
    useQuery(api.attendance.getAttendanceStats, {
      fromDate: todayStr,
      toDate: todayStr,
    }) ?? {
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      presentPercentage: 0,
    };

  const userRole =
    loggedInUser?.profile?.role ||
    (loggedInUser as any)?.role ||
    "guest";

  const isAdmin = userRole === "admin";
  const isTeacher = userRole === "teacher";

  // اسم الترحيب: الاسم من البروفايل ثم الإيميل
  const welcomeName =
    loggedInUser?.profile?.name || loggedInUser?.email || "مستخدم";

  // نص الدور
  const roleLabel =
    isAdmin
      ? "مشرف / إدارة"
      : isTeacher
      ? "محفظ"
      : userRole === "student"
      ? "طالب"
      : userRole === "guardian"
      ? "ولي أمر"
      : "مستخدم";

  return (
    <div className="space-y-6" dir="rtl">
      {/* الهيدر الأخضر */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl px-8 py-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-lg shrink-0">
            <img
              src="https://polished-pony-114.convex.cloud/api/storage/35f5118c-e650-4ecd-a7ba-4c413e9591e0"
              alt="شعار دار ابن الجزري"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm text-green-100 mb-1">
              إدارة شاملة للطلاب والمحفظين والبرامج
            </p>
            <h1 className="text-3xl font-bold mb-2">لوحة إدارة دار ابن الجزري</h1>
            <p className="text-green-100">مرحباً، {welcomeName}</p>
          </div>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-right">
          <p className="text-green-50 mb-1">دورك الحالي:</p>
          <p className="text-white font-semibold">{roleLabel}</p>
        </div>
      </div>

      {/* المحتوى المتغيّر */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        {activeTab === "overview" && (
          <OverviewTab
            isAdmin={isAdmin}
            isTeacher={isTeacher}
            onOpenTab={setActiveTab}
            attendanceStats={attendanceStats}
            todayStr={todayStr}
          />
        )}

        {activeTab === "students" && (
          <StudentsManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "teachers" && isAdmin && (
          <TeachersManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "programs" && isAdmin && (
          <ProgramsManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "competitions" && isAdmin && (
          <CompetitionsManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "videos" && isAdmin && (
          <VideosManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "resources" && isAdmin && (
          <ResourcesManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "attendance" && (
          <AttendanceManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "reports" && (
          <Reports onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "users" && isAdmin && (
          <AdminUsersTable onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "users" && !isAdmin && (
          <p className="text-red-500 text-sm">غير مصرح لك برؤية هذه الصفحة.</p>
        )}

        {activeTab === "public" && <PublicContent userRole="admin" />}

        {activeTab === "requests" && isAdmin && (
          <RequestsManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "footer" && isAdmin && (
          <FooterManagement onBack={() => setActiveTab("overview")} />
        )}

        {activeTab === "footer" && !isAdmin && (
          <p className="text-red-500 text-sm">غير مصرح لك بتعديل الفوتر.</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   تب "نظرة عامة"
   ============================================================ */
function OverviewTab({
  isAdmin,
  isTeacher,
  onOpenTab,
  attendanceStats,
  todayStr,
}: {
  isAdmin: boolean;
  isTeacher: boolean;
  onOpenTab: (tab: TabType) => void;
  attendanceStats: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    presentPercentage: number;
  };
  todayStr: string;
}) {
  const students = useQuery(api.students.getAllStudents) || [];
  const teachers = useQuery(api.teachers.getAllTeachers) || [];
  const programs = useQuery(api.programs.getAllPrograms) || [];

  // ✅ حضور المحفّظ الحالي (إن وجد) مع وقت الدخول/الخروج
  const myTeacherToday = useQuery(api.attendance.myTeacherToday);

  const totalStudents = students.length;

  const presentToday = attendanceStats.presentCount ?? 0;
  const totalRecordsToday = attendanceStats.totalRecords ?? 0;

  // نسبة الحضور من إجمالي الطلاب (لليوم)
  const presentVsAllStudents =
    totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

  const formatTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formattedDate = new Date(todayStr).toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ملخّص الحضور اليومي */}
      <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-500 rounded-3xl p-8 text-white shadow-2xl border-4 border-green-400/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">🗓</span>
            </div>
            <h2 className="text-2xl font-bold">ملخّص الحضور اليومي</h2>
          </div>
          <span className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium border border-white/30">
            {formattedDate}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* كارت حضور الطلاب */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md border-2 border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">👥</span>
              <p className="text-sm text-green-50 font-medium">حضور الطلاب اليوم</p>
            </div>
            <p className="text-4xl font-bold mb-2">{presentToday}</p>
            <p className="text-xs text-green-100 mt-2">
              من إجمالي {totalStudents} طالب
              {totalRecordsToday > 0 &&
                ` (عدد سجلات اليوم: ${totalRecordsToday})`}
            </p>
          </div>

          {/* نسبة الحضور */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md border-2 border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📊</span>
              <p className="text-sm text-green-50 font-medium">نسبة الحضور اليوم</p>
            </div>
            <p className="text-4xl font-bold mb-2">
              {presentVsAllStudents}%
            </p>
            <p className="text-xs text-green-100 mt-2">
              محسوبة من إجمالي عدد الطلاب المسجّلين
            </p>
          </div>

          {/* حضور المحفّظ الحالي */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md border-2 border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">👨‍🏫</span>
              <p className="text-sm text-green-50 font-medium">
                حضورك أنت (كمحفّظ) اليوم
              </p>
            </div>

            {isTeacher ? (
              myTeacherToday ? (
                <div className="space-y-1 text-sm">
                  <p>
                    ⏰ وقت الدخول:{" "}
                    <span className="font-semibold">
                      {formatTime(myTeacherToday.checkInTime)}
                    </span>
                  </p>
                  <p>
                    🏁 وقت الانصراف:{" "}
                    <span className="font-semibold">
                      {myTeacherToday.checkOutTime
                        ? formatTime(myTeacherToday.checkOutTime)
                        : "لم يُسجل الانصراف بعد"}
                    </span>
                  </p>
                  {myTeacherToday.notes && (
                    <p className="text-[11px] text-green-100 mt-1">
                      📝 {myTeacherToday.notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-sm mt-1">
                  <p className="text-green-50">
                    لم يتم تسجيل حضورك اليوم حتى الآن.
                  </p>
                  <button
                    onClick={() => onOpenTab("attendance")}
                    className="mt-2 text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1"
                  >
                    تسجيل الحضور من "الحضور والغياب"
                  </button>
                </div>
              )
            ) : (
              <div className="text-sm mt-1">
                <p className="text-green-50">
                  يمكنك متابعة حضور المحفّظين وتفاصيل دخولهم/انصرافهم من صفحة
                  التقارير.
                </p>
                <button
                  onClick={() => onOpenTab("reports")}
                  className="mt-2 text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1"
                >
                  فتح صفحة التقارير
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* الإحصائيات العامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الطلاب"
          value={students.length}
          icon="🧑‍🎓"
          color="bg-purple-100 text-purple-700"
        />
        <StatCard
          title="عدد المحفظين"
          value={teachers.length}
          icon="👨‍🏫"
          color="bg-green-100 text-green-700"
        />
        <StatCard
          title="البرامج النشطة"
          value={programs.length}
          icon="📚"
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="الطلاب النشطين"
          value={students.filter((s) => s.isActive).length}
          icon="✅"
          color="bg-blue-100 text-blue-700"
        />
      </div>

      {/* البطاقات */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <ActionCard
          title="إدارة الطلاب"
          desc="عرض وإضافة بيانات الطلاب"
          icon="👥"
          bg="bg-blue-50"
          onClick={() => onOpenTab("students")}
        />
        {isAdmin && (
          <ActionCard
            title="إدارة المحفظين"
            desc="إضافة ومتابعة المحفظين"
            icon="👨‍🏫"
            bg="bg-emerald-50"
            onClick={() => onOpenTab("teachers")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="إدارة البرامج"
            desc="إضافة وتشغيل البرامج"
            icon="📚"
            bg="bg-amber-50"
            onClick={() => onOpenTab("programs")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="إدارة المسابقات"
            desc="إنشاء وتفعيل المسابقات"
            icon="🏆"
            bg="bg-orange-50"
            onClick={() => onOpenTab("competitions")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="إدارة الفيديوهات"
            desc="إضافة فيديوهات تعليمية"
            icon="🎥"
            bg="bg-sky-50"
            onClick={() => onOpenTab("videos")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="مكتبة المصادر"
            desc="إدارة الكتب والمقالات"
            icon="📖"
            bg="bg-purple-50"
            onClick={() => onOpenTab("resources")}
          />
        )}
        <ActionCard
          title="الحضور والغياب"
          desc="تسجيل ومراجعة الحضور"
          icon="✅"
          bg="bg-green-50"
          onClick={() => onOpenTab("attendance")}
        />
        <ActionCard
          title="التقارير"
          desc="تقارير الأداء والحضور"
          icon="📊"
          bg="bg-violet-50"
          onClick={() => onOpenTab("reports")}
        />
        {isAdmin && (
          <ActionCard
            title="إدارة المستخدمين"
            desc="التحكم في الصلاحيات"
            icon="🛡️"
            bg="bg-red-50"
            onClick={() => onOpenTab("users")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="إدارة الطلبات"
            desc="طلبات التسجيل والاشتراك"
            icon="📋"
            bg="bg-pink-50"
            onClick={() => onOpenTab("requests")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="محتوى الموقع"
            desc="عرض الصفحة العامة"
            icon="🌐"
            bg="bg-lime-50"
            onClick={() => onOpenTab("public")}
          />
        )}
        {isAdmin && (
          <ActionCard
            title="إعدادات الفوتر"
            desc="تعديل بيانات التواصل والروابط"
            icon="⚙️"
            bg="bg-indigo-50"
            onClick={() => onOpenTab("footer")}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 p-6 flex items-center gap-4">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${color} shadow-md`}
      >
        {icon}
      </div>
      <div>
        <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  icon,
  bg,
  onClick,
}: {
  title: string;
  desc: string;
  icon: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${bg} rounded-2xl border-2 border-gray-200 p-6 text-right hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 text-gray-800 flex flex-col gap-3 group`}
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <span className="bg-white text-gray-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
          فتح ←
        </span>
      </div>
      <p className="font-bold text-lg text-gray-900">{title}</p>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </button>
  );
}
