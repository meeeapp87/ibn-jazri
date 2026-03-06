// src/components/Reports.tsx
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ReportsProps {
  onBack?: () => void;
}

// تحويل اختصارات الأيام إلى عربي
const WEEKDAY_LABELS: Record<string, string> = {
  Sun: "الأحد",
  Mon: "الاثنين",
  Tue: "الثلاثاء",
  Wed: "الأربعاء",
  Thu: "الخميس",
  Fri: "الجمعة",
  Sat: "السبت",
};

function formatWorkDays(codes?: string[]) {
  if (!codes || !codes.length) return "غير محدد";
  return codes.map((c) => WEEKDAY_LABELS[c] || c).join("، ");
}

// تحويل التقدير إلى رقم (للمقارنة في التعزيز)
function gradeToScore(grade?: string) {
  if (!grade) return 0;
  const g = grade.trim();
  if (g === "ممتاز" || g === "A+" || g === "A") return 5;
  if (g === "جيد جداً" || g === "جيد جدا" || g === "B+") return 4;
  if (g === "جيد" || g === "B") return 3;
  if (g === "مقبول" || g === "C") return 2;
  if (g === "ضعيف" || g === "D") return 1;
  return 0;
}

type SubTab = "summary" | "teachers" | "students" | "boost" | "analytics";

// ألوان بطاقات المستويات (مستوحاة من التعزيز والتكريم)
const LEVEL_COLORS = [
  { bg: "from-pink-400 to-rose-500", icon: "bg-pink-300" },
  { bg: "from-purple-400 to-indigo-500", icon: "bg-purple-300" },
  { bg: "from-blue-400 to-cyan-500", icon: "bg-blue-300" },
  { bg: "from-emerald-400 to-teal-500", icon: "bg-emerald-300" },
  { bg: "from-amber-400 to-orange-500", icon: "bg-amber-300" },
  { bg: "from-red-400 to-pink-500", icon: "bg-red-300" },
  { bg: "from-violet-400 to-purple-500", icon: "bg-violet-300" },
  { bg: "from-sky-400 to-blue-500", icon: "bg-sky-300" },
];

// دالة ترجع مفتاح ومدى الأسبوع من تاريخ معيّن
function getWeekRangeKey(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0-6
  const diffToMonday = (day + 6) % 7; // كم يوم نرجع لنصل للاثنين
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = monday.toISOString().slice(0, 10);
  const end = sunday.toISOString().slice(0, 10);
  return {
    key: `${start}_${end}`,
    label: `${start} → ${end}`,
  };
}

/** ✅ (مُحسّن) استخراج “آخر سورة” من تقييم الحفظ الجديد بأي شكل شائع في الداتا */
function extractSurahLabel(ev: any): string {
  if (!ev) return "—";

  // 1) حقول مباشرة شائعة (لو موجودة)
  const direct =
    ev?.surahName ||
    ev?.surah ||
    ev?.newSurah ||
    ev?.newMemSurah ||
    ev?.memorizationSurah ||
    ev?.newMemorizationSurah;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // 2) مسارات todayTasks/nextTasks + احتمالات مختلفة لتسمية "الحفظ الجديد"
  const candidates = [
    ev?.todayTasks?.newMem,
    ev?.todayTasks?.newMemorization,
    ev?.todayTasks?.newHifz,
    ev?.todayTasks?.memorization,

    ev?.nextTasks?.newMem,
    ev?.nextTasks?.newMemorization,
    ev?.nextTasks?.newHifz,
    ev?.nextTasks?.memorization,

    ev?.newMem,
    ev?.newMemorization,
    ev?.memorization,
  ].filter(Boolean);

  for (const task of candidates) {
    // اسم السورة مباشرة داخل التاسك
    const name =
      task?.surahName ||
      task?.surah ||
      task?.name ||
      task?.surahText ||
      task?.surahLabel;
    if (typeof name === "string" && name.trim()) return name.trim();

    // مدى من → إلى
    const from = task?.surahFrom || task?.fromSurah || task?.from;
    const to = task?.surahTo || task?.toSurah || task?.to;

    if (from || to) {
      if (from && to && String(from) !== String(to)) return `${from} → ${to}`;
      return String(from || to);
    }
  }

  // 3) لو المهام بتتخزن كـ Array (شائع جدًا)
  const arr =
    ev?.tasks ||
    ev?.todayTasksList ||
    ev?.items ||
    ev?.entries ||
    ev?.sections;
  if (Array.isArray(arr)) {
    for (const it of arr) {
      const kind =
        it?.type || it?.kind || it?.category || it?.taskType || it?.group;

      const isNew =
        kind === "new" ||
        kind === "newMem" ||
        kind === "newMemorization" ||
        kind === "new_hifz" ||
        kind === "حفظ جديد";

      if (!isNew) continue;

      const name = it?.surahName || it?.surah || it?.name;
      if (typeof name === "string" && name.trim()) return name.trim();

      const from = it?.surahFrom || it?.from;
      const to = it?.surahTo || it?.to;
      if (from || to) {
        if (from && to && String(from) !== String(to)) return `${from} → ${to}`;
        return String(from || to);
      }
    }
  }

  return "—";
}

export function Reports({ onBack }: ReportsProps) {
  // ====== فلاتر عامة ======
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [teacherFilter, setTeacherFilter] = useState<string>(""); // Id<"teachers"> كسلسلة
  const [statusFilter, setStatusFilter] = useState<string>(""); // "حاضر" | "غائب" | "متأخر" | ""
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("summary");

  // تبويب الإحصائيات
  const [analyticsView, setAnalyticsView] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");

  // مودال تفصيلي للمحفّظ
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // مودال تفصيلي للطالب
  const [selectedStudentModal, setSelectedStudentModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ✅ مودال: أسماء الطلاب داخل مستوى/جزء معين
  const [selectedLevelModal, setSelectedLevelModal] = useState<{
    level: string;
    count: number;
  } | null>(null);

  // مودالات الإحصائيات اليومية
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTeacherDay, setSelectedTeacherDay] = useState<{
    date: string;
    teacherId: string;
    teacherName: string;
  } | null>(null);

  // ====== بيانات أساسية ======
  const students = useQuery(api.students.getAllStudents) || [];
  const teachers = useQuery(api.teachers.getAllTeachers) || [];

  const teachersStatsRaw =
    useQuery(api.attendance.getTeachersAttendanceStats, {
      fromDate: dateFrom || undefined,
      toDate: dateTo || undefined,
    }) || [];

  // تقييمات الطلاب (للتعزيز + آخر تقدير/سورة)
  const evalRows =
    useQuery(api.evaluations.getEvaluationsForReports, {
      fromDate: dateFrom || undefined,
      toDate: dateTo || undefined,
    }) || [];

  // كروت إحصائيات عامة
  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.isActive).length;
  const totalTeachers = teachers.length;
  const activePrograms = 0; // البرامج مفصولة حالياً

  // توزيع المستويات
  const levelStats = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const s of students as any[]) {
      if (!s.level) continue;
      acc[s.level] = (acc[s.level] || 0) + 1;
    }
    return acc;
  }, [students]);

  // ✅ قائمة الطلاب داخل كل مستوى/جزء
  const studentsByLevel = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of students as any[]) {
      if (!s.level) continue;
      if (!map[s.level]) map[s.level] = [];
      map[s.level].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""), "ar")
      );
    }
    return map;
  }, [students]);

  // خرائط سريعة للأسماء
  const teacherMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of teachers as any[]) {
      m[String(t._id)] = t;
    }
    return m;
  }, [teachers]);

  const studentMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const s of students as any[]) {
      m[String(s._id)] = s;
    }
    return m;
  }, [students]);

  const getTeacherName = (teacherId: any) => {
    if (!teacherId) return "—";
    const key = String(teacherId);
    return teacherMap[key]?.name ?? "—";
  };

  const getStudentName = (studentId: any) => {
    if (!studentId) return "—";
    const key = String(studentId);
    return studentMap[key]?.name ?? "—";
  };

  // تنظيف إحصائيات المحفظين بحيث لا يظهر المحذوفين
  const teachersStats = useMemo(() => {
    return (teachersStatsRaw as any[]).filter((t) => {
      const teacher = teacherMap[String(t.teacherId)];
      return teacher && teacher.isActive !== false;
    });
  }, [teachersStatsRaw, teacherMap]);

  // ====== جلب السجلات المفصّلة (طلاب) من السيرفر مع فلتر المحفّظ في السيرفر ======
  const detailedRaw =
    useQuery(api.attendance.getAttendanceDetailed, {
      fromDate: dateFrom || undefined,
      toDate: dateTo || undefined,
      teacherId: teacherFilter ? (teacherFilter as any) : undefined,
      status: statusFilter || undefined,
    }) || [];

  // ====== تجهيز البيانات (ترتيب فقط) ======
  const detailed = useMemo(() => {
    const rows = [...(detailedRaw as any[])];
    rows.sort((a, b) =>
      a.date === b.date
        ? (b.timestamp ?? 0) - (a.timestamp ?? 0)
        : a.date < b.date
        ? 1
        : -1
    );
    return rows;
  }, [detailedRaw]);

  // ====== تجميع السجلات حسب اليوم (لاستخدام المودالات) ======
  const recordsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of detailed as any[]) {
      if (r.type !== "student") continue;
      if (!r.date) continue;
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    return map;
  }, [detailed]);

  // ====== حساب معدل الحضور العام ======
  const presentCount = detailed.filter(
    (r: any) =>
      r.type === "student" && (r.status === "حاضر" || r.status === "present")
  ).length;

  const totalRecords = detailed.filter((r: any) => r.type === "student").length;

  const presentPercentage =
    totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  // ====== ملخص الطلاب ======
  const studentsSummary = useMemo(() => {
    const map: Record<
      string,
      {
        studentId: string;
        name: string;
        present: number;
        absent: number;
        total: number;
      }
    > = {};

    for (const r of detailed as any[]) {
      if (r.type !== "student") continue;
      if (!r.studentId) continue;
      const sid = String(r.studentId);
      const name = r.studentName ?? getStudentName(r.studentId);

      if (!map[sid]) {
        map[sid] = { studentId: sid, name, present: 0, absent: 0, total: 0 };
      }

      map[sid].total += 1;
      if (r.status === "حاضر" || r.status === "present") {
        map[sid].present += 1;
      } else {
        map[sid].absent += 1;
      }
    }

    return Object.values(map).sort((a, b) => b.present - a.present);
  }, [detailed, students, studentMap]);

  // ====== ✅ (مُحسّن) آخر تقييم + آخر سورة لكل طالب داخل الفترة ======
  const latestEvalByStudent = useMemo(() => {
    const m: Record<
      string,
      { date: string; grade: string; surah: string; ts: number }
    > = {};

    for (const ev of evalRows as any[]) {
      const sid = ev?.studentId ? String(ev.studentId) : "";
      if (!sid) continue;

      const date = ev?.date ? String(ev.date) : "";

      const ts =
        typeof ev?._creationTime === "number"
          ? ev._creationTime
          : typeof ev?.timestamp === "number"
          ? ev.timestamp
          : date
          ? new Date(date + "T00:00:00").getTime()
          : 0;

      const grade = (ev?.overallGrade || ev?.grade || "—").toString();
      const surah = extractSurahLabel(ev);

      if (!m[sid] || ts > m[sid].ts) {
        m[sid] = { date, grade, surah, ts };
      }
    }

    const out: Record<string, { date: string; grade: string; surah: string }> =
      {};
    for (const [sid, v] of Object.entries(m)) {
      out[sid] = { date: v.date, grade: v.grade, surah: v.surah };
    }
    return out;
  }, [evalRows]);

  // ====== بيانات التعزيز ======

  // أفضل 5 طلاب في الحضور
  const topAttendanceStudents = useMemo(() => {
    const arr = studentsSummary
      .map((s) => ({
        ...s,
        rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    return arr;
  }, [studentsSummary]);

  // أفضل 5 طلاب في التقدير العام
  const topEvaluationStudents = useMemo(() => {
    if (!evalRows.length) return [];

    const map: Record<
      string,
      { studentId: string; name: string; sum: number; count: number }
    > = {};

    for (const ev of evalRows as any[]) {
      if (!ev.studentId) continue;
      const sid = String(ev.studentId);
      const name = getStudentName(ev.studentId);
      const score = gradeToScore(ev.overallGrade);

      if (!map[sid]) {
        map[sid] = { studentId: sid, name, sum: 0, count: 0 };
      }
      map[sid].sum += score;
      map[sid].count += 1;
    }

    const arr = Object.values(map)
      .filter((x) => x.count > 0)
      .map((x) => ({
        ...x,
        avg: x.sum / x.count,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return arr;
  }, [evalRows, students, studentMap]);

  // أفضل المحفّظين في الحضور
  const topTeachersByPresence = useMemo(() => {
    if (!teachersStats.length) return [];
    const arr = (teachersStats as any[])
      .map((t) => ({
        ...t,
        rate:
          t.expectedDays > 0
            ? Math.round((t.presentDays / t.expectedDays) * 100)
            : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    return arr;
  }, [teachersStats]);

  // ====== تحليلات يومية/أسبوعية/شهرية ======

  const dailyAnalytics = useMemo(() => {
    const byDate: Record<
      string,
      {
        date: string;
        presentCount: number;
        studentsSet: Set<string>;
        teacherCounts: Record<
          string,
          { teacherId: string; teacherName: string; count: number }
        >;
      }
    > = {};

    for (const r of detailed as any[]) {
      if (r.type !== "student") continue;
      if (!r.date) continue;

      const date = r.date as string;
      if (!byDate[date]) {
        byDate[date] = {
          date,
          presentCount: 0,
          studentsSet: new Set<string>(),
          teacherCounts: {},
        };
      }
      const bucket = byDate[date];

      // طالب حاضر فقط
      if (r.status === "حاضر" || r.status === "present") {
        bucket.presentCount += 1;
        if (r.studentId) {
          bucket.studentsSet.add(String(r.studentId));
        }
        const teacherKey = String(r.teacherId ?? "unknown");
        if (!bucket.teacherCounts[teacherKey]) {
          bucket.teacherCounts[teacherKey] = {
            teacherId: teacherKey,
            teacherName: r.teacherName ?? getTeacherName(r.teacherId),
            count: 0,
          };
        }
        bucket.teacherCounts[teacherKey].count += 1;
      }
    }

    const arr = Object.values(byDate).map((b) => ({
      date: b.date,
      presentCount: b.presentCount,
      uniqueStudentsCount: b.studentsSet.size,
      teachers: Object.values(b.teacherCounts).sort(
        (a, b2) => b2.count - a.count
      ),
    }));

    // ترتيب تنازلي حسب التاريخ
    arr.sort((a, b) => (a.date < b.date ? 1 : -1));
    return arr;
  }, [detailed, teacherMap]);

  const bestDay = useMemo(() => {
    if (!dailyAnalytics.length) return null;
    return dailyAnalytics.reduce((max, d) =>
      d.presentCount > max.presentCount ? d : max
    );
  }, [dailyAnalytics]);

  const weeklyAnalytics = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        label: string;
        presentCount: number;
        studentsSet: Set<string>;
        teachersSet: Set<string>;
      }
    > = {};

    for (const r of detailed as any[]) {
      if (r.type !== "student") continue;
      if (!r.date) continue;
      if (!(r.status === "حاضر" || r.status === "present")) continue;

      const info = getWeekRangeKey(r.date);
      if (!info) continue;

      if (!map[info.key]) {
        map[info.key] = {
          key: info.key,
          label: info.label,
          presentCount: 0,
          studentsSet: new Set<string>(),
          teachersSet: new Set<string>(),
        };
      }
      const bucket = map[info.key];
      bucket.presentCount += 1;
      if (r.studentId) bucket.studentsSet.add(String(r.studentId));
      if (r.teacherId) bucket.teachersSet.add(String(r.teacherId));
    }

    const arr = Object.values(map).map((b) => ({
      key: b.key,
      label: b.label,
      presentCount: b.presentCount,
      uniqueStudentsCount: b.studentsSet.size,
      teachersCount: b.teachersSet.size,
      avgPerStudent:
        b.studentsSet.size > 0
          ? Number((b.presentCount / b.studentsSet.size).toFixed(1))
          : 0,
    }));

    arr.sort((a, b) => (a.label < b.label ? 1 : -1));
    return arr;
  }, [detailed]);

  const monthlyAnalytics = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        label: string;
        presentCount: number;
        studentsSet: Set<string>;
        teachersSet: Set<string>;
      }
    > = {};

    for (const r of detailed as any[]) {
      if (r.type !== "student") continue;
      if (!r.date) continue;
      if (!(r.status === "حاضر" || r.status === "present")) continue;

      const monthKey = r.date.slice(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        map[monthKey] = {
          key: monthKey,
          label: monthKey,
          presentCount: 0,
          studentsSet: new Set<string>(),
          teachersSet: new Set<string>(),
        };
      }
      const bucket = map[monthKey];
      bucket.presentCount += 1;
      if (r.studentId) bucket.studentsSet.add(String(r.studentId));
      if (r.teacherId) bucket.teachersSet.add(String(r.teacherId));
    }

    const arr = Object.values(map).map((b) => ({
      key: b.key,
      label: b.label,
      presentCount: b.presentCount,
      uniqueStudentsCount: b.studentsSet.size,
      teachersCount: b.teachersSet.size,
      avgPerStudent:
        b.studentsSet.size > 0
          ? Number((b.presentCount / b.studentsSet.size).toFixed(1))
          : 0,
    }));

    arr.sort((a, b) => (a.label < b.label ? 1 : -1));
    return arr;
  }, [detailed]);

  // ====== أزرار سريعة للتاريخ ======
  const setToday = () => {
    const d = new Date();
    const s = d.toISOString().slice(0, 10);
    setDateFrom(s);
    setDateTo(s);
  };

  const setLast7Days = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTeacherFilter("");
    setStatusFilter("");
  };

  // تغيير التبويب
  const handleChangeTab = (tab: SubTab) => {
    setActiveSubTab(tab);
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
              style={{ backgroundColor: "#059669" }}
            >
              ← رجوع للوحة التحكم
            </button>
          )}
          <h2 className="text-2xl font-bold text-green-800">
            التقارير والإحصائيات
          </h2>
        </div>
        <p className="text-gray-600">
          اختر التبويب المناسب لعرض ملخّص عام، أو تقرير حضور المحفّظين، أو حضور
          الطلاب، أو تبويب التعزيز والتكريم، أو الإحصائيات الزمنية.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🔍</span>
          </div>
          <h3 className="text-lg font-bold text-green-800">
            الفلاتر والبحث
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-2">
              📅 من تاريخ
            </label>
            <input
              type="date"
              className="w-full border-2 border-green-200 rounded-xl px-4 py-2.5 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-2">
              📅 إلى تاريخ
            </label>
            <input
              type="date"
              className="w-full border-2 border-green-200 rounded-xl px-4 py-2.5 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-2">
              👨‍🏫 المحفّظ
            </label>
            <select
              className="w-full border-2 border-green-200 rounded-xl px-4 py-2.5 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="">الكل</option>
              {teachers.map((t: any) => (
                <option key={String(t._id)} value={String(t._id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-2">
              📊 حالة الطالب
            </label>
            <select
              className="w-full border-2 border-green-200 rounded-xl px-4 py-2.5 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="حاضر">حاضر</option>
              <option value="غائب">غائب</option>
              <option value="متأخر">متأخر</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-sm font-semibold text-green-700 mb-2">
              ⚡ إجراءات سريعة
            </label>
            <div className="flex gap-2">
              <button
                onClick={setToday}
                className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-green-200 text-sm font-medium text-green-700 hover:bg-green-50 hover:border-green-300 transition-all"
              >
                اليوم
              </button>
              <button
                onClick={setLast7Days}
                className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-green-200 text-sm font-medium text-green-700 hover:bg-green-50 hover:border-green-300 transition-all"
              >
                7 أيام
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-all"
              >
                تصفير
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200 flex gap-2 flex-wrap">
        <button
          onClick={() => handleChangeTab("summary")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "summary"
              ? "bg-green-50 text-green-700 border-x border-t border-green-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          الملخص العام
        </button>
        <button
          onClick={() => handleChangeTab("teachers")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "teachers"
              ? "bg-green-50 text-green-700 border-x border-t border-green-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          حضور المحفّظين
        </button>
        <button
          onClick={() => handleChangeTab("students")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "students"
              ? "bg-green-50 text-green-700 border-x border-t border-green-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          حضور الطلاب
        </button>
        <button
          onClick={() => handleChangeTab("boost")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "boost"
              ? "bg-pink-50 text-pink-700 border-x border-t border-pink-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          التعزيز والتكريم
        </button>
        <button
          onClick={() => handleChangeTab("analytics")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "analytics"
              ? "bg-emerald-50 text-emerald-700 border-x border-t border-emerald-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          الإحصائيات الزمنية
        </button>
      </div>

      {/* ====== الملخص العام ====== */}
      {activeSubTab === "summary" && (
        <>
          {/* General Stats */}
          <div>
            <h3 className="text-xl font-bold text-green-800 mb-4">
              الإحصائيات العامة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      إجمالي الطلاب
                    </p>
                    <p className="text-3xl font-bold mt-1">{totalStudents}</p>
                    <p className="text-blue-100 text-xs mt-1">
                      النشطين: {activeStudents}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">
                      عدد المحفظين
                    </p>
                    <p className="text-3xl font-bold mt-1">{totalTeachers}</p>
                    <p className="text-green-100 text-xs mt-1">
                      محسوب من بيانات المحفظين النشطين
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👨‍🏫</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium">
                      البرامج النشطة
                    </p>
                    <p className="text-3xl font-bold mt-1">{activePrograms}</p>
                    <p className="text-amber-100 text-xs mt-1">
                      تم فصل البرامج من التقارير
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-400 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">
                      معدل حضور الطلاب
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {presentPercentage}%
                    </p>
                    <p className="text-purple-100 text-xs mt-1">
                      من إجمالي سجلات الطلاب المفصّلة حسب الفلتر
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Level Distribution */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-green-800 mb-4">
              توزيع الطلاب حسب المستوى
            </h3>

            {Object.keys(levelStats).length === 0 ? (
              <p className="text-sm text-gray-400">
                لا توجد بيانات مستويات حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {Object.entries(levelStats).map(([level, count], idx) => {
                  const colorSet = LEVEL_COLORS[idx % LEVEL_COLORS.length];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setSelectedLevelModal({
                          level,
                          count: count as number,
                        })
                      }
                      className={`
                        bg-gradient-to-br ${colorSet.bg}
                        rounded-2xl
                        shadow-md
                        hover:shadow-xl
                        transition-all
                        duration-200
                        flex flex-col
                        items-center
                        justify-center
                        aspect-square
                        p-3
                        focus:outline-none
                        focus:ring-2
                        focus:ring-black/10
                      `}
                      title={`عرض أسماء الطلاب في ${level}`}
                    >
                      <div
                        className={`
                          w-10 h-10
                          ${colorSet.icon}
                          rounded-2xl
                          flex items-center justify-center
                          mb-2
                        `}
                      >
                        <span className="text-xl">📖</span>
                      </div>
                      <div className="text-2xl font-extrabold text-white mb-1">
                        {count as number}
                      </div>
                      <div className="text-[11px] text-white/90 font-semibold text-center leading-snug line-clamp-2">
                        {level}
                      </div>
                      <div className="text-[10px] text-white/80 mt-1">
                        اضغط للعرض
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ====== حضور المحفظين ====== */}
      {activeSubTab === "teachers" && (
        <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-2xl border border-green-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-800">
                  حضور/غياب المحفّظين
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  الفترة الحالية حسب الفلتر أعلاه
                </p>
              </div>
            </div>
          </div>

          {teachersStats.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-lg text-gray-600 font-medium">
                لا توجد بيانات حضور للمحفّظين في الفترة المحددة
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-gray-700 bg-gradient-to-r from-green-100 to-emerald-100">
                    <th className="p-4 rounded-r-xl font-bold">المحفّظ</th>
                    <th className="p-4 font-bold">أيام العمل</th>
                    <th className="p-4 font-bold">أيام متوقعة</th>
                    <th className="p-4 font-bold">أيام حضور</th>
                    <th className="p-4 rounded-l-xl font-bold">أيام غياب</th>
                  </tr>
                </thead>
                <tbody>
                  {teachersStats.map((t: any) => (
                    <tr
                      key={String(t.teacherId)}
                      className="bg-white hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <td className="p-4 font-bold text-green-800 rounded-r-xl">
                        <button
                          onClick={() =>
                            setSelectedTeacherModal({
                              id: String(t.teacherId),
                              name: t.teacherName,
                            })
                          }
                          className="underline decoration-dotted hover:text-green-600"
                        >
                          {t.teacherName}
                        </button>
                      </td>
                      <td className="p-4 text-gray-700 font-medium">
                        {formatWorkDays(t.workDays)}
                      </td>
                      <td className="p-4 text-gray-800 font-semibold">
                        {t.expectedDays}
                      </td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg">
                          ✅ {t.presentDays}
                        </span>
                      </td>
                      <td className="p-4 rounded-l-xl">
                        <span className="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-lg">
                          ❌ {t.absentDays}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====== حضور الطلاب ====== */}
      {activeSubTab === "students" && (
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl border border-blue-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blue-800">
                  ملخص حضور الطلاب
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  اضغط على اسم الطالب لعرض حضوره وتقييماته بالتفصيل
                </p>
              </div>
            </div>
          </div>

          {studentsSummary.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-lg text-gray-600 font-medium">
                لا توجد سجلات حضور مطابقة للفترة الحالية
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-gray-700 bg-gradient-to-r from-blue-100 to-cyan-100">
                    <th className="p-4 rounded-r-xl font-bold">الطالب</th>
                    <th className="p-4 font-bold">إجمالي السجلات</th>
                    <th className="p-4 font-bold">حضور</th>
                    <th className="p-4 font-bold">آخر تقدير</th>
                    <th className="p-4 rounded-l-xl font-bold">آخر سورة</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsSummary.map((s) => {
                    const last = latestEvalByStudent[s.studentId];
                    const lastGrade = last?.grade || "—";
                    const lastSurah = last?.surah || "—";
                    const lastDate = last?.date || "";

                    return (
                      <tr
                        key={s.studentId}
                        className="bg-white hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <td className="p-4 font-bold text-blue-800 rounded-r-xl">
                          <button
                            onClick={() =>
                              setSelectedStudentModal({
                                id: s.studentId,
                                name: s.name,
                              })
                            }
                            className="underline decoration-dotted hover:text-green-600"
                          >
                            {s.name}
                          </button>
                        </td>

                        <td className="p-4 text-gray-800 font-semibold">
                          {s.total}
                        </td>

                        <td className="p-4">
                          <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg">
                            ✅ {s.present}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg">
                            ⭐ {lastGrade}
                          </span>
                          {lastDate && (
                            <div className="text-[11px] text-gray-500 mt-1">
                              {dateFrom && dateTo && dateFrom === dateTo
                                ? "📅 بتاريخ: "
                                : "📅 آخر تاريخ: "}
                              {lastDate}
                            </div>
                          )}
                        </td>

                        <td className="p-4 rounded-l-xl">
                          <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-lg">
                            📖 {lastSurah}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====== تبويب التعزيز والتكريم ====== */}
      {activeSubTab === "boost" && (
        <div className="space-y-8">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">🏆</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-pink-700">
                    التعزيز والتكريم
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    تكريم المتميزين والمتفوقين في الحضور والتقييمات
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-pink-200">
                <p className="text-xs text-gray-500">
                  📊 يعتمد على سجلات الحضور والتقييمات في الفترة المحددة
                </p>
              </div>
            </div>
          </div>

          {/* كروت رئيسية */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* أفضل حضور طلاب */}
            <div className="group hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-white/10 backdrop-blur-sm p-6 border-b border-white/20">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-3xl">📚</span>
                    </div>
                    <h4 className="text-2xl font-bold">أفضل حضور</h4>
                  </div>
                  <p className="text-sm text-purple-100 text-center">
                    أعلى 5 طلاب من حيث نسبة الحضور
                  </p>
                </div>

                <div className="p-6">
                  {topAttendanceStudents.length === 0 ? (
                    <div className="bg-white/10 rounded-2xl p-8 text-center">
                      <span className="text-5xl mb-3 block">📭</span>
                      <p className="text-sm text-purple-100">
                        لا توجد بيانات حضور في الفترة الحالية
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topAttendanceStudents.map((s, idx) => (
                        <div
                          key={s.studentId}
                          className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 hover:bg-white/25 transition-all duration-200 border border-white/10 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold">
                              #{idx + 1} {s.name}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-white/90 text-purple-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                              {s.rate}% <span>حضور</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">
                              ✅ {s.present}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 rounded-full px-2 py-0.5 font-semibold">
                              📅 {s.total}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* أفضل تقييمات */}
            <div className="group hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 text-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-white/10 backdrop-blur-sm p-6 border-b border-white/20">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-3xl">⭐</span>
                    </div>
                    <h4 className="text-2xl font-bold">أوسمة التميز</h4>
                  </div>
                  <p className="text-sm text-cyan-100 text-center">
                    أعلى 5 طلاب في التقدير العام
                  </p>
                </div>

                <div className="p-6">
                  {topEvaluationStudents.length === 0 ? (
                    <div className="bg-white/10 rounded-2xl p-8 text-center">
                      <span className="text-5xl mb-3 block">📭</span>
                      <p className="text-sm text-cyan-100">
                        لا توجد تقييمات في الفترة الحالية
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topEvaluationStudents.map((s: any, idx: number) => (
                        <div
                          key={s.studentId}
                          className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/25 transition-all duration-200 border border-white/10"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                idx === 0
                                  ? "bg-yellow-400 text-yellow-900"
                                  : idx === 1
                                  ? "bg-gray-300 text-gray-700"
                                  : idx === 2
                                  ? "bg-amber-600 text-white"
                                  : "bg-white/20 text-white"
                              }`}
                            >
                              {idx === 0
                                ? "🥇"
                                : idx === 1
                                ? "🥈"
                                : idx === 2
                                ? "🥉"
                                : `#${idx + 1}`}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-base">{s.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`text-sm ${
                                        star <= Math.round(s.avg)
                                          ? "text-yellow-300"
                                          : "text-white/30"
                                      }`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-sm font-bold">
                                  {s.avg.toFixed(1)}/5
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-cyan-100 text-center bg-white/10 rounded-lg py-1">
                            {s.count} تقييم في الفترة المحددة
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* أفضل محفّظين */}
            <div className="group hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 text-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-white/10 backdrop-blur-sm p-6 border-b border-white/20">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-3xl">👨‍🏫</span>
                    </div>
                    <h4 className="text-2xl font-bold">تميز المحفّظين</h4>
                  </div>
                  <p className="text-sm text-pink-100 text-center">
                    أعلى المحفّظين التزامًا بالحضور
                  </p>
                </div>

                <div className="p-6">
                  {topTeachersByPresence.length === 0 ? (
                    <div className="bg-white/10 rounded-2xl p-8 text-center">
                      <span className="text-5xl mb-3 block">📭</span>
                      <p className="text-sm text-pink-100">
                        لا توجد بيانات حضور للمحفّظين
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topTeachersByPresence.map((t: any, idx: number) => (
                        <div
                          key={String(t.teacherId)}
                          className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 hover:bg-white/25 transition-all duration-200 border border-white/10 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold">
                              #{idx + 1} {t.teacherName}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-white/90 text-pink-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                              {t.rate}% <span>حضور</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">
                              ✅ {t.presentDays}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 rounded-full px-2 py-0.5 font-semibold">
                              ❌ {t.absentDays}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 rounded-full px-2 py-0.5 font-semibold">
                              📅 {t.expectedDays}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== تبويب الإحصائيات الزمنية ====== */}
      {activeSubTab === "analytics" && (
        <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-2xl border border-emerald-100 p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-800">
                  الإحصائيات الزمنية للحضور
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  عرض حضور الطلاب يوميًا وأسبوعيًا وشهريًا، مع عدد الطلاب لكل فترة
                  وتوزيعهم على المحفّظين.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-full border border-emerald-200 px-2 py-1 flex items-center gap-1 shadow-sm">
              <button
                onClick={() => setAnalyticsView("daily")}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-full font-semibold ${
                  analyticsView === "daily"
                    ? "bg-emerald-500 text-white shadow"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                يومي
              </button>
              <button
                onClick={() => setAnalyticsView("weekly")}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-full font-semibold ${
                  analyticsView === "weekly"
                    ? "bg-emerald-500 text-white shadow"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                أسبوعي
              </button>
              <button
                onClick={() => setAnalyticsView("monthly")}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-full font-semibold ${
                  analyticsView === "monthly"
                    ? "bg-emerald-500 text-white shadow"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                شهري
              </button>
            </div>
          </div>

          {/* ====== عرض يومي ====== */}
          {analyticsView === "daily" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-emerald-700 mb-1">
                    عدد الأيام التي تم فيها تسجيل حضور
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {dailyAnalytics.length}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-700 mb-1">
                    إجمالي الطلاب الحاضرين (سجلات الحضور)
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {dailyAnalytics.reduce(
                      (sum, d: any) => sum + d.presentCount,
                      0
                    )}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-amber-700 mb-1">
                    متوسط عدد الطلاب الحاضرين في اليوم
                  </p>
                  <p className="text-2xl font-bold text-amber-900">
                    {dailyAnalytics.length > 0
                      ? Math.round(
                          dailyAnalytics.reduce(
                            (sum: number, d: any) => sum + d.presentCount,
                            0
                          ) / dailyAnalytics.length
                        )
                      : 0}
                  </p>
                </div>
              </div>

              {/* جدول يومي */}
              <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-xl">📅</span>
                  </div>
                  <h4 className="text-lg font-bold text-emerald-800">
                    الحضور اليومي للطلاب مع توزيع المحفّظين
                  </h4>
                </div>

                {dailyAnalytics.length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
                    <span className="text-6xl mb-4 block">📭</span>
                    <p className="text-lg text-gray-600 font-medium">
                      لا توجد سجلات حضور للطلاب لعرض إحصائيات يومية.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-gray-700 bg-gradient-to-r from-emerald-100 to-green-100">
                          <th className="p-4 rounded-r-xl font-bold">
                            التاريخ (ميلادي)
                          </th>
                          <th className="p-4 font-bold">
                            عدد الطلاب الحاضرين
                          </th>
                          <th className="p-4 rounded-l-xl font-bold">
                            أعلى المحفّظين في اليوم
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyAnalytics.map((d: any) => (
                          <tr
                            key={d.date}
                            className="bg-white hover:bg-emerald-50 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                              {d.date}
                            </td>
                            <td className="p-4 text-emerald-900 font-semibold">
                              <button
                                onClick={() => setSelectedDay(d.date)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold"
                              >
                                👥 {d.presentCount}
                              </button>
                            </td>
                            <td className="p-4 rounded-l-xl">
                              <div className="flex flex-wrap gap-1">
                                {d.teachers.slice(0, 4).map((t: any) => (
                                  <button
                                    key={t.teacherId}
                                    onClick={() =>
                                      setSelectedTeacherDay({
                                        date: d.date,
                                        teacherId: String(t.teacherId),
                                        teacherName: t.teacherName,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5 text-xs font-semibold hover:bg-emerald-100"
                                  >
                                    🧑‍🏫 {t.teacherName}
                                    <span className="text-[11px]">
                                      ({t.count})
                                    </span>
                                  </button>
                                ))}
                                {d.teachers.length === 0 && (
                                  <span className="text-xs text-gray-400">
                                    لا توجد بيانات محفّظين لهذا اليوم
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {bestDay && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800">
                    📌 أكثر يوم كان فيه حضور:
                    <span className="font-bold"> {bestDay.date} </span>
                    بعدد
                    <span className="font-bold"> {bestDay.presentCount} </span>
                    طلاب حاضرين.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ====== عرض أسبوعي ====== */}
          {analyticsView === "weekly" && (
            <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">🗓️</span>
                </div>
                <h4 className="text-lg font-bold text-blue-800">
                  الحضور الأسبوعي للطلاب
                </h4>
              </div>

              {weeklyAnalytics.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
                  <span className="text-6xl mb-4 block">📭</span>
                  <p className="text-lg text-gray-600 font-medium">
                    لا توجد سجلات حضور كافية لعرض إحصائيات أسبوعية.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-gray-700 bg-gradient-to-r from-blue-100 to-cyan-100">
                        <th className="p-4 rounded-r-xl font-bold">
                          الفترة (الأسبوع)
                        </th>
                        <th className="p-4 font-bold">
                          إجمالي الطلاب الحاضرين
                        </th>
                        <th className="p-4 font-bold">عدد الطلاب المختلفين</th>
                        <th className="p-4 font-bold">
                          عدد المحفّظين الذين حضروا
                        </th>
                        <th className="p-4 rounded-l-xl font-bold">
                          متوسط الحضور لكل طالب
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyAnalytics.map((w: any) => (
                        <tr
                          key={w.key}
                          className="bg-white hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                            {w.label}
                          </td>
                          <td className="p-4 text-blue-900 font-semibold">
                            {w.presentCount}
                          </td>
                          <td className="p-4 text-gray-800 font-semibold">
                            {w.uniqueStudentsCount}
                          </td>
                          <td className="p-4 text-gray-800 font-semibold">
                            {w.teachersCount}
                          </td>
                          <td className="p-4 rounded-l-xl text-emerald-800 font-semibold">
                            {w.avgPerStudent}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ====== عرض شهري ====== */}
          {analyticsView === "monthly" && (
            <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">📆</span>
                </div>
                <h4 className="text-lg font-bold text-amber-800">
                  الحضور الشهري للطلاب
                </h4>
              </div>

              {monthlyAnalytics.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
                  <span className="text-6xl mb-4 block">📭</span>
                  <p className="text-lg text-gray-600 font-medium">
                    لا توجد سجلات حضور كافية لعرض إحصائيات شهرية.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-gray-700 bg-gradient-to-r from-amber-100 to-orange-100">
                        <th className="p-4 rounded-r-xl font-bold">
                          الفترة (الشهر)
                        </th>
                        <th className="p-4 font-bold">
                          إجمالي الطلاب الحاضرين
                        </th>
                        <th className="p-4 font-bold">عدد الطلاب المختلفين</th>
                        <th className="p-4 font-bold">
                          عدد المحفّظين الذين حضروا
                        </th>
                        <th className="p-4 rounded-l-xl font-bold">
                          متوسط الحضور لكل طالب
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyAnalytics.map((m: any) => (
                        <tr
                          key={m.key}
                          className="bg-white hover:bg-amber-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                            {m.label}
                          </td>
                          <td className="p-4 text-amber-900 font-semibold">
                            {m.presentCount}
                          </td>
                          <td className="p-4 text-gray-800 font-semibold">
                            {m.uniqueStudentsCount}
                          </td>
                          <td className="p-4 text-gray-800 font-semibold">
                            {m.teachersCount}
                          </td>
                          <td className="p-4 rounded-l-xl text-emerald-800 font-semibold">
                            {m.avgPerStudent}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* مودال تفاصيل المحفّظ */}
      {selectedTeacherModal && (
        <TeacherDaysModal
          teacherId={selectedTeacherModal.id}
          teacherName={selectedTeacherModal.name}
          fromDate={dateFrom}
          toDate={dateTo}
          onClose={() => setSelectedTeacherModal(null)}
        />
      )}

      {/* مودال تفاصيل الطالب */}
      {selectedStudentModal && (
        <StudentDetailsModal
          studentId={selectedStudentModal.id}
          studentName={selectedStudentModal.name}
          records={detailed.filter(
            (r: any) =>
              r.type === "student" &&
              r.studentId &&
              String(r.studentId) === selectedStudentModal.id
          )}
          getTeacherName={getTeacherName}
          onClose={() => setSelectedStudentModal(null)}
        />
      )}

      {/* مودال: جميع الطلاب في يوم معيّن */}
      {selectedDay && (
        <DayAttendanceModal
          date={selectedDay}
          records={recordsByDate[selectedDay] || []}
          getTeacherName={getTeacherName}
          getStudentName={getStudentName}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* مودال: الطلاب مع محفّظ معيّن في يوم معيّن */}
      {selectedTeacherDay && (
        <TeacherDayAttendanceModal
          date={selectedTeacherDay.date}
          teacherId={selectedTeacherDay.teacherId}
          teacherName={selectedTeacherDay.teacherName}
          records={recordsByDate[selectedTeacherDay.date] || []}
          getStudentName={getStudentName}
          onClose={() => setSelectedTeacherDay(null)}
        />
      )}

      {/* ✅ مودال: أسماء الطلاب داخل مستوى/جزء */}
      {selectedLevelModal && (
        <LevelStudentsModal
          level={selectedLevelModal.level}
          students={studentsByLevel[selectedLevelModal.level] || []}
          onClose={() => setSelectedLevelModal(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   مودال تفاصيل المحفّظ
   ============================================================ */
function TeacherDaysModal({
  teacherId,
  teacherName,
  fromDate,
  toDate,
  onClose,
}: {
  teacherId: string;
  teacherName: string;
  fromDate?: string;
  toDate?: string;
  onClose: () => void;
}) {
  const resolvedRange = useMemo(() => {
    // لو المستخدم مختار من/إلى استخدمهم
    if (fromDate && toDate) return { from: fromDate, to: toDate };

    // لو اختار تاريخ واحد فقط: اعتبره يوم واحد
    if (fromDate && !toDate) return { from: fromDate, to: fromDate };
    if (!fromDate && toDate) return { from: toDate, to: toDate };

    // افتراضي: الشهر الحالي
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-11
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);
    return { from, to };
  }, [fromDate, toDate]);

  const days =
    useQuery(api.attendance.getTeacherDaysInRange, {
      teacherId: teacherId as any,
      fromDate: resolvedRange.from,
      toDate: resolvedRange.to,
    }) || [];

  const totalDays = days.length;
  const presentDays = days.filter((d: any) => !!d.checkInTime).length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <span className="text-2xl">👨‍🏫</span>
              حضور المحفّظ: {teacherName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              الفترة حسب الفلتر: (تاريخ ميلادي – وقت دخول/خروج)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-700 mb-1">الفترة</p>
              <p className="text-sm font-bold text-emerald-900">
                {resolvedRange.from} → {resolvedRange.to}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs text-blue-700 mb-1">عدد الأيام</p>
              <p className="text-2xl font-extrabold text-blue-900">
                {totalDays}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs text-green-700 mb-1">أيام بها دخول</p>
              <p className="text-2xl font-extrabold text-green-900">
                {presentDays}
              </p>
            </div>
          </div>

          {days.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-lg text-gray-600 font-medium">
                لا توجد سجلات حضور للمحفّظ في الفترة المحددة
              </p>
            </div>
          ) : (
            <table className="w-full text-sm text-right border-separate border-spacing-y-2">
              <thead>
                <tr className="text-gray-700 bg-gradient-to-r from-green-100 to-emerald-100">
                  <th className="p-4 rounded-r-xl font-bold">
                    التاريخ (ميلادي)
                  </th>
                  <th className="p-4 font-bold">وقت الدخول</th>
                  <th className="p-4 font-bold">وقت الانصراف</th>
                  <th className="p-4 rounded-l-xl font-bold">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {days.map((r: any) => {
                  const inTime = r.checkInTime
                    ? new Date(r.checkInTime).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "—";
                  const outTime = r.checkOutTime
                    ? new Date(r.checkOutTime).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "—";

                  return (
                    <tr
                      key={String(r._id)}
                      className="bg-white hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                        {r.date}
                      </td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg">
                          🕐 {inTime}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-lg">
                          🕐 {outTime}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 rounded-l-xl">
                        {r.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   مودال تفاصيل الطالب: حضور + تقييمات
   ============================================================ */
function StudentDetailsModal({
  studentId,
  studentName,
  records,
  getTeacherName,
  onClose,
}: {
  studentId: string;
  studentName: string;
  records: any[];
  getTeacherName: (id: any) => string;
  onClose: () => void;
}) {
  const evaluations =
    useQuery(api.evaluations.getStudentEvaluations, {
      studentId: studentId as any,
      limit: 50,
    }) || [];

  const evalByDate = useMemo(() => {
    const m: Record<string, any> = {};
    for (const ev of evaluations as any[]) {
      if (!ev?.date) continue;
      m[ev.date] = ev;
    }
    return m;
  }, [evaluations]);

  const total = records.length;
  const present = records.filter(
    (r) => r.status === "حاضر" || r.status === "present"
  ).length;
  const absent = total - present;
  const perc = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-green-800">
              تفاصيل الطالب: {studentName}
            </h3>
            <p className="text-xs text-gray-500">
              حضور الطالب وتقييماته في الفترة المطابقة للفلاتر الحالية (تاريخ
              ميلادي)، مع دمج التقدير العام وملاحظات التقييم في نفس الجدول.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-600 mb-1">إجمالي سجلات الحضور</p>
              <p className="text-2xl font-bold text-blue-900">{total}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-600 mb-1">عدد مرات الحضور</p>
              <p className="text-2xl font-bold text-green-900">{present}</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4">
              <p className="text-xs text-rose-600 mb-1">
                عدد مرات الغياب/أخرى
              </p>
              <p className="text-2xl font-bold text-rose-900">{absent}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-xs text-purple-600 mb-1">نسبة الحضور</p>
              <p className="text-2xl font-bold text-purple-900">{perc}%</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">📋</span>
              </div>
              <h4 className="text-lg font-bold text-blue-800">
                سجلات الحضور مع التقدير العام
              </h4>
            </div>

            {records.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
                <span className="text-6xl mb-4 block">📭</span>
                <p className="text-lg text-gray-600 font-medium">
                  لا توجد سجلات حضور للطالب في الفترة الحالية
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-gray-700 bg-gradient-to-r from-blue-100 to-cyan-100">
                      <th className="p-4 rounded-r-xl font-bold">
                        التاريخ (ميلادي)
                      </th>
                      <th className="p-4 font-bold">الحالة</th>
                      <th className="p-4 font-bold">المحفّظ</th>
                      <th className="p-4 font-bold">التقدير العام</th>
                      <th className="p-4 rounded-l-xl font-bold">
                        ملاحظات التقييم
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => {
                      const ev = evalByDate[r.date];
                      const grade = ev?.overallGrade || "—";
                      const evalNotes = ev?.notes || "—";

                      return (
                        <tr
                          key={r._id}
                          className="bg-white hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                            {r.date}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-lg font-bold ${
                                r.status === "حاضر" || r.status === "present"
                                  ? "bg-green-100 text-green-700"
                                  : r.status === "غائب"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {r.status === "حاضر" || r.status === "present"
                                ? "✅"
                                : r.status === "غائب"
                                ? "❌"
                                : "⚠️"}{" "}
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-700 font-medium">
                            {r.teacherName ?? getTeacherName(r.teacherId)}
                          </td>
                          <td className="p-4">
                            <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg">
                              {grade}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 rounded-l-xl">
                            {evalNotes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   مودال: جميع الطلاب في يوم معيّن
   ============================================================ */
function DayAttendanceModal({
  date,
  records,
  getTeacherName,
  getStudentName,
  onClose,
}: {
  date: string;
  records: any[];
  getTeacherName: (id: any) => string;
  getStudentName: (id: any) => string;
  onClose: () => void;
}) {
  const total = records.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50">
          <div>
            <h3 className="text-lg font-bold text-emerald-800">
              حضور الطلاب في اليوم: {date}
            </h3>
            <p className="text-xs text-gray-500">
              يعرض جميع الطلاب الحاضرين في هذا اليوم مع المحفّظ المسؤول.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-emerald-700 mb-1">
              عدد الطلاب الحاضرين في هذا اليوم
            </p>
            <p className="text-2xl font-bold text-emerald-900">{total}</p>
          </div>

          {records.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-lg text-gray-600 font-medium">
                لا توجد سجلات حضور لهذا اليوم.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-gray-700 bg-gradient-to-r from-emerald-100 to-green-100">
                    <th className="p-4 rounded-r-xl font-bold">الطالب</th>
                    <th className="p-4 font-bold">المحفّظ</th>
                    <th className="p-4 rounded-l-xl font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr
                      key={r._id}
                      className="bg-white hover:bg-emerald-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                        {r.studentName ?? getStudentName(r.studentId)}
                      </td>
                      <td className="p-4 text-gray-700 font-medium">
                        {r.teacherName ?? getTeacherName(r.teacherId)}
                      </td>
                      <td className="p-4 rounded-l-xl">
                        <span
                          className={`px-3 py-1 rounded-lg font-bold ${
                            r.status === "حاضر" || r.status === "present"
                              ? "bg-green-100 text-green-700"
                              : r.status === "غائب"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   مودال: الطلاب مع محفّظ معيّن في يوم معيّن
   ============================================================ */
function TeacherDayAttendanceModal({
  date,
  teacherId,
  teacherName,
  records,
  getStudentName,
  onClose,
}: {
  date: string;
  teacherId: string;
  teacherName: string;
  records: any[];
  getStudentName: (id: any) => string;
  onClose: () => void;
}) {
  const filtered = records.filter(
    (r: any) =>
      r.teacherId && String(r.teacherId) === teacherId && r.type === "student"
  );
  const total = filtered.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-lg font-bold text-green-800">
              حضور الطلاب مع المحفّظ: {teacherName}
            </h3>
            <p className="text-xs text-gray-500">
              اليوم: {date} – يعرض الطلاب الذين حضروا مع هذا المحفّظ في هذا
              اليوم.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-green-700 mb-1">
              عدد الطلاب الحاضرين مع هذا المحفّظ
            </p>
            <p className="text-2xl font-bold text-green-900">{total}</p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-lg text-gray-600 font-medium">
                لا توجد سجلات حضور لهذا المحفّظ في هذا اليوم.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-gray-700 bg-gradient-to-r from-green-100 to-emerald-100">
                    <th className="p-4 rounded-r-xl font-bold">الطالب</th>
                    <th className="p-4 rounded-l-xl font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => (
                    <tr
                      key={r._id}
                      className="bg-white hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <td className="p-4 font-medium text-gray-800 rounded-r-xl">
                        {r.studentName ?? getStudentName(r.studentId)}
                      </td>
                      <td className="p-4 rounded-l-xl">
                        <span
                          className={`px-3 py-1 rounded-lg font-bold ${
                            r.status === "حاضر" || r.status === "present"
                              ? "bg-green-100 text-green-700"
                              : r.status === "غائب"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ✅ مودال: أسماء الطلاب داخل مستوى/جزء
   ============================================================ */
function LevelStudentsModal({
  level,
  students,
  onClose,
}: {
  level: string;
  students: any[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return students;

    return students.filter((s: any) => {
      const name = String(s?.name || "").toLowerCase();
      const phone = String(s?.phone || "").toLowerCase();
      const email = String(s?.email || "").toLowerCase();
      return (
        name.includes(query) || phone.includes(query) || email.includes(query)
      );
    });
  }, [q, students]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h3 className="text-lg font-extrabold text-indigo-800">
              الطلاب في: {level}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              العدد: <span className="font-bold">{students.length}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم / الهاتف / الإيميل..."
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          />

          {filtered.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-600">
              لا يوجد نتائج مطابقة.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((s: any) => (
                <div
                  key={String(s._id)}
                  className="border rounded-xl p-3 bg-white hover:bg-gray-50 transition-all"
                >
                  <div className="font-bold text-gray-800">{s.name || "—"}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {s.phone ? `📞 ${s.phone}` : "📞 —"}{" "}
                    {s.email ? `• ✉️ ${s.email}` : ""}
                  </div>
                  {s.isActive === false && (
                    <div className="mt-2 text-[11px] inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-semibold">
                      غير نشط
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
