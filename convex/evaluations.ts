// convex/evaluations.ts
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** =========================
 * خريطة السور إلى أرقام الأجزاء
 * ========================= */
const SURAH_TO_JUZ: Record<string, number> = {
  "الفاتحة": 1, "البقرة": 1, "آل عمران": 3, "النساء": 4, "المائدة": 6,
  "الأنعام": 7, "الأعراف": 8, "الأنفال": 9, "التوبة": 10, "يونس": 11,
  "هود": 11, "يوسف": 12, "الرعد": 13, "إبراهيم": 13, "الحجر": 14,
  "النحل": 14, "الإسراء": 15, "الكهف": 15, "مريم": 16, "طه": 16,
  "الأنبياء": 17, "الحج": 17, "المؤمنون": 18, "النور": 18, "الفرقان": 18,
  "الشعراء": 19, "النمل": 19, "القصص": 20, "العنكبوت": 20, "الروم": 21,
  "لقمان": 21, "السجدة": 21, "الأحزاب": 21, "سبأ": 22, "فاطر": 22,
  "يس": 22, "الصافات": 23, "ص": 23, "الزمر": 23, "غافر": 24,
  "فصلت": 24, "الشورى": 25, "الزخرف": 25, "الدخان": 25, "الجاثية": 25,
  "الأحقاف": 26, "محمد": 26, "الفتح": 26, "الحجرات": 26, "ق": 26,
  "الذاريات": 26, "الطور": 27, "النجم": 27, "القمر": 27, "الرحمن": 27,
  "الواقعة": 27, "الحديد": 27, "المجادلة": 28, "الحشر": 28, "الممتحنة": 28,
  "الصف": 28, "الجمعة": 28, "المنافقون": 28, "التغابن": 28, "الطلاق": 28,
  "التحريم": 28, "الملك": 29, "القلم": 29, "الحاقة": 29, "المعارج": 29,
  "نوح": 29, "الجن": 29, "المزمل": 29, "المدثر": 29, "القيامة": 29,
  "الإنسان": 29, "المرسلات": 29, "النبأ": 30, "النازعات": 30, "عبس": 30,
  "التكوير": 30, "الانفطار": 30, "المطففين": 30, "الانشقاق": 30, "البروج": 30,
  "الطارق": 30, "الأعلى": 30, "الغاشية": 30, "الفجر": 30, "البلد": 30,
  "الشمس": 30, "الليل": 30, "الضحى": 30, "الشرح": 30, "التين": 30,
  "العلق": 30, "القدر": 30, "البينة": 30, "الزلزلة": 30, "العاديات": 30,
  "القارعة": 30, "التكاثر": 30, "العصر": 30, "الهمزة": 30, "الفيل": 30,
  "قريش": 30, "الماعون": 30, "الكوثر": 30, "الكافرون": 30, "النصر": 30,
  "المسد": 30, "الإخلاص": 30, "الفلق": 30, "الناس": 30,
};

function juzToLevel(juz: number): string {
  if (juz === 28) return "الجزء 28 (قد سمع)";
  if (juz === 29) return "الجزء 29 (تبارك)";
  if (juz === 30) return "الجزء 30 (عم)";
  return `الجزء ${juz}`;
}

function levelToJuzNumber(level: string): number | null {
  if (["القرآن كاملاً", "ختمة تثبيت", "تعلم التجويد"].includes(level)) return null;
  const match = level.match(/الجزء (\d+)/);
  return match ? parseInt(match[1]) : null;
}

/** =========================
 * Helpers: formatting ranges
 * ========================= */
function buildRangeText(t?: {
  surahFrom?: string;
  ayahFrom?: number;
  surahTo?: string;
  ayahTo?: number;
}) {
  if (!t?.surahFrom) return "";
  const from = `${t.surahFrom}${t.ayahFrom ? ` ${t.ayahFrom}` : ""}`;
  const toSurah = t.surahTo || t.surahFrom;
  const to = `${toSurah}${t.ayahTo ? ` ${t.ayahTo}` : ""}`;
  return from === to ? from : `${from} → ${to}`;
}

function hasTask(t?: {
  surahFrom?: string;
  ayahFrom?: number;
  surahTo?: string;
  ayahTo?: number;
}) {
  return !!(t?.surahFrom || t?.ayahFrom || t?.surahTo || t?.ayahTo);
}

function buildTodaySummaryLines(ev: any): string[] {
  const out: string[] = [];
  const tt = ev?.todayTasks;

  if (hasTask(tt?.newMem)) out.push(`تم حفظ جديد (${buildRangeText(tt.newMem)})`);
  if (hasTask(tt?.reviewNear)) out.push(`تم مراجعة قريبة (${buildRangeText(tt.reviewNear)})`);
  if (hasTask(tt?.reviewFar)) out.push(`تم مراجعة بعيدة (${buildRangeText(tt.reviewFar)})`);

  // ✅ fallback للبيانات القديمة لو مفيش todayTasks
  if (out.length === 0 && ev?.surahFrom) {
    const legacy = buildRangeText({
      surahFrom: ev.surahFrom,
      ayahFrom: ev.ayahFrom,
      surahTo: ev.surahTo,
      ayahTo: ev.ayahTo,
    });
    if (legacy) out.push(`تم تسميع (${legacy})`);
  }

  return out;
}

function buildNextSummaryLines(ev: any): string[] {
  const out: string[] = [];
  const nt = ev?.nextTasks;

  if (hasTask(nt?.newMem)) out.push(`المهمة القادمة: حفظ جديد (${buildRangeText(nt.newMem)})`);
  if (hasTask(nt?.reviewNear)) out.push(`المهمة القادمة: مراجعة قريبة (${buildRangeText(nt.reviewNear)})`);
  if (hasTask(nt?.reviewFar)) out.push(`المهمة القادمة: مراجعة بعيدة (${buildRangeText(nt.reviewFar)})`);

  return out;
}

/** =========================
 * إنشاء تقييم جديد (نسخة موحّدة)
 * ========================= */
export const createEvaluation = mutation({
  args: {
    studentId: v.id("students"),
    program: v.string(),

    // ✅ ما تم تسميعه اليوم: 3 صفوف
    todayTasks: v.optional(
      v.object({
        newMem: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            grade: v.optional(v.string()),
          })
        ),
        reviewNear: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            grade: v.optional(v.string()),
          })
        ),
        reviewFar: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            grade: v.optional(v.string()),
          })
        ),
      })
    ),

    // ✅ المهمة القادمة: نفس التصميم لكن بدون تقدير
    nextTasks: v.optional(
      v.object({
        newMem: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
          })
        ),
        reviewNear: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
          })
        ),
        reviewFar: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
          })
        ),
      })
    ),

    // ✅ أحكام التجويد (لليوم كامل)
    tajweedRule: v.optional(v.string()),

    // ملاحظات
    notes: v.optional(v.string()),
    strengths: v.optional(v.string()),
    improvements: v.optional(v.string()),

    // التاريخ بصيغة "YYYY-MM-DD"
    date: v.string(),

    // ✅ خيار تسجيل الحضور (افتراضيًا true)
    markAttendance: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول");
    }

    // نجيب المحفظ المرتبط بالمستخدم الحالي
    const teacher = await ctx.db
      .query("teachers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!teacher) {
      throw new ConvexError("لم يتم العثور على حساب محفظ مرتبط بهذا المستخدم");
    }

    const now = Date.now();

    // هنستخدم أول صف تم تسميعه علشان نملأ الحقول القديمة للتوافق
    const mainFromToday =
      args.todayTasks?.newMem ||
      args.todayTasks?.reviewNear ||
      args.todayTasks?.reviewFar;

    // تقدير عام: لو موجود في أي صف من اليوم
    const overallGrade =
      args.todayTasks?.newMem?.grade ||
      args.todayTasks?.reviewNear?.grade ||
      args.todayTasks?.reviewFar?.grade ||
      "غير محدد";

    const doc: any = {
      studentId: args.studentId,
      teacherId: teacher._id,
      program: args.program,
      evaluationType: "تقييم_يومي",
      date: args.date,
      timestamp: now,
      overallGrade,
    };

    // نحط أول مقطع في الحقول القديمة
    if (mainFromToday) {
      doc.surahFrom = mainFromToday.surahFrom;
      if (mainFromToday.surahTo) doc.surahTo = mainFromToday.surahTo;
      if (mainFromToday.ayahFrom) doc.ayahFrom = mainFromToday.ayahFrom;
      if (mainFromToday.ayahTo) doc.ayahTo = mainFromToday.ayahTo;
    } else {
      doc.surahFrom = "غير محدد";
    }

    if (args.notes !== undefined) doc.notes = args.notes;
    if (args.strengths !== undefined) doc.strengths = args.strengths;
    if (args.improvements !== undefined) doc.improvements = args.improvements;
    if (args.todayTasks !== undefined) doc.todayTasks = args.todayTasks;
    if (args.nextTasks !== undefined) doc.nextTasks = args.nextTasks;
    if (args.tajweedRule !== undefined) doc.tajweedRule = args.tajweedRule;

    const id = await ctx.db.insert("evaluations", doc);

    // ✅ تحديث مستوى الطالب تلقائياً بناءً على السورة المحفوظة
    const newMemSurah = args.todayTasks?.newMem?.surahFrom;
    if (newMemSurah && SURAH_TO_JUZ[newMemSurah]) {
      const newJuz = SURAH_TO_JUZ[newMemSurah];
      const student = await ctx.db.get(args.studentId);
      if (student) {
        const currentJuzNum = levelToJuzNumber(student.level);
        if (currentJuzNum !== null && newJuz > currentJuzNum) {
          await ctx.db.patch(args.studentId, { level: juzToLevel(newJuz) });
        }
      }
    }

    // ✅ تسجيل حضور الطالب تلقائياً عند إنشاء التقييم (إذا كان الخيار مفعّل)
    const shouldMarkAttendance = args.markAttendance !== false; // افتراضيًا true

    if (shouldMarkAttendance) {
      // نتحقق أولاً إذا كان هناك سجل حضور لنفس الطالب في نفس اليوم
      const existingAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_student_date", (q) => q.eq("studentId", args.studentId).eq("date", args.date))
        .first();

      // إذا لم يكن هناك سجل حضور، نُنشئ واحد
      if (!existingAttendance) {
        await ctx.db.insert("attendance", {
          studentId: args.studentId,
          teacherId: teacher._id,
          program: args.program,
          date: args.date,
          status: "حاضر",
          notes: "تم التسجيل تلقائياً من التقييم",
          timestamp: now,
          type: "student",
        });
      }
    }

    return id;
  },
});

/** =========================
 * جلب آخر التقييمات لطالب
 * (مع سطور جاهزة للعرض)
 * ========================= */
export const getStudentEvaluations = query({
  args: {
    studentId: v.id("students"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // هات عدد أكبر شوية ثم رتب حسب (date desc ثم timestamp desc)
    const raw = await ctx.db
      .query("evaluations")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .take(Math.max(limit * 3, limit));

    const sorted = raw.sort((a: any, b: any) => {
      const ad = a.date || "";
      const bd = b.date || "";
      if (ad === bd) return (b.timestamp ?? 0) - (a.timestamp ?? 0);
      return ad < bd ? 1 : -1;
    });

    const sliced = sorted.slice(0, limit);

    // ✅ نضيف سطور جاهزة للعرض لكل تقييم
    return sliced.map((ev: any) => ({
      ...ev,
      todaySummaryLines: buildTodaySummaryLines(ev),
      nextSummaryLines: buildNextSummaryLines(ev),
    }));
  },
});

/** =========================
 * جلب تقييمات طالب بين تاريخين
 * ========================= */
export const getStudentEvaluationsByRange = query({
  args: {
    studentId: v.id("students"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("evaluations")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const filtered = all
      .filter((row: any) => row.date >= args.fromDate && row.date <= args.toDate)
      .sort((a: any, b: any) => {
        if (a.date === b.date) {
          return (b.timestamp ?? 0) - (a.timestamp ?? 0);
        }
        return a.date < b.date ? 1 : -1;
      });

    return filtered.map((ev: any) => ({
      ...ev,
      todaySummaryLines: buildTodaySummaryLines(ev),
      nextSummaryLines: buildNextSummaryLines(ev),
    }));
  },
});

/** =========================
 * كويري للتقارير: يرجّع التقييمات في فترة زمنية
 * (ونضيف نفس السطور الجاهزة للعرض)
 * ========================= */
export const getEvaluationsForReports = query({
  args: {
    fromDate: v.optional(v.string()), // YYYY-MM-DD
    toDate: v.optional(v.string()), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("evaluations");

    if (args.fromDate) {
      q = q.filter((f) => f.gte(f.field("date"), args.fromDate!));
    }
    if (args.toDate) {
      q = q.filter((f) => f.lte(f.field("date"), args.toDate!));
    }

    const rows = await q.collect();

    return rows.map((ev: any) => ({
      _id: ev._id,
      _creationTime: ev._creationTime,
      timestamp: ev.timestamp,

      studentId: ev.studentId,
      teacherId: ev.teacherId,
      date: ev.date,
      overallGrade: ev.overallGrade,

      todayTasks: ev.todayTasks,
      nextTasks: ev.nextTasks,

      surahFrom: ev.surahFrom,
      surahTo: ev.surahTo,
      ayahFrom: ev.ayahFrom,
      ayahTo: ev.ayahTo,

      // ✅ جديد: سطور جاهزة للعرض
      todaySummaryLines: buildTodaySummaryLines(ev),
      nextSummaryLines: buildNextSummaryLines(ev),
    }));
  },
});
