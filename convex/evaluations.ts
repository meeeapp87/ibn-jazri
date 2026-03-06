// convex/evaluations.ts
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
