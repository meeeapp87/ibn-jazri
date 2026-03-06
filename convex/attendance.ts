// convex/attendance.ts
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * جدول attendance تقريبًا:
 * {
 *   type: "student" | "teacher";
 *   date: string; // YYYY-MM-DD
 *   status?: string; // للطلاب
 *   program?: string;
 *   studentId?: Id<"students">;
 *   teacherId?: Id<"teachers">;
 *   notes?: string;
 *   checkInTime?: string;  // للمحفّظ
 *   checkOutTime?: string; // للمحفّظ
 *   timestamp: number;
 * }
 */

function todayDateString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function inRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/* ===========================
   تسجيل حضور / غياب الطالب
   =========================== */

export const markStudentAttendance = mutation({
  args: {
    studentId: v.id("students"),
    status: v.string(), // "حاضر" | "غائب" | "متأخر" ...
    program: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.optional(v.string()), // يسمح بتحديد تاريخ معين (افتراضي: اليوم)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    const date = args.date ?? todayDateString();
    const now = Date.now();

    // نجلب بيانات الطالب (للمستوى/البرنامج)
    const student = await ctx.db.get(args.studentId);
    if (!student) throw new ConvexError("الطالب غير موجود");

    // نحدّد المحفّظ الحالي من جدول teachers (مربوط بـ userId)
    const teacher = await ctx.db
      .query("teachers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    // نبحث إن كان هناك سجل سابق لنفس الطالب في نفس اليوم -> نعدله بدل التكرار
    const existing = await ctx.db
      .query("attendance")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "student"),
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("date"), date)
        )
      )
      .first();

    if (existing) {
      const patch: any = {
        status: args.status,
        program: args.program ?? existing.program,
        notes: args.notes ?? existing.notes,
        timestamp: now,
      };
      if (teacher) {
        patch.teacherId = teacher._id;
      }

      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    const doc: any = {
      type: "student",
      date,
      timestamp: now,
      studentId: args.studentId,
      status: args.status,
      program: (args.program as any) ?? (student as any).program ?? "غير محدد",
      notes: args.notes,
    };

    if (teacher) {
      doc.teacherId = teacher._id;
    }

    const id = await ctx.db.insert("attendance", doc);
    return id;
  },
});

/* ===========================
   جلب حضور الطلاب في تاريخ معيّن
   =========================== */

export const getStudentAttendanceByDate = query({
  args: {
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("attendance")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "student"),
          q.eq(q.field("date"), args.date)
        )
      )
      .collect();

    return rows;
  },
});

/* ===========================
   مسح جميع سجلات حضور الطلاب
   =========================== */

export const clearAllAttendance = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    const allStudentRows = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("type"), "student"))
      .collect();

    for (const row of allStudentRows) {
      await ctx.db.delete(row._id);
    }

    return { deletedCount: allStudentRows.length };
  },
});

/* ===========================
   حضور المحفّظ: تسجيل دخول
   =========================== */

export const teacherCheckIn = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول كمحفّظ");

    const teacher = await ctx.db
      .query("teachers")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .first();

    if (!teacher) {
      throw new ConvexError("لم يتم العثور على ملف المحفّظ");
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const nowIso = today.toISOString();
    const nowTs = Date.now();

    // هل له سجل اليوم بالفعل؟
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_teacher_date", (q) =>
        q.eq("teacherId", teacher._id).eq("date", dateStr)
      )
      .first();

    if (existing) {
      if (!existing.checkInTime) {
        await ctx.db.patch(existing._id, { checkInTime: nowIso });
      }
      return existing._id;
    }

    // سجل جديد للمحفّظ
    const id = await ctx.db.insert("attendance", {
      type: "teacher",
      date: dateStr,
      timestamp: nowTs,
      teacherId: teacher._id,
      status: "حاضر",
      checkInTime: nowIso,
      checkOutTime: undefined,
    });

    return id;
  },
});

/* ===========================
   حضور المحفّظ: تسجيل خروج
   =========================== */

export const teacherCheckOut = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    const teacher = await ctx.db
      .query("teachers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!teacher) {
      throw new ConvexError("لا يوجد ملف محفظ مرتبط بهذا الحساب");
    }

    const date = todayDateString();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const existing = await ctx.db
      .query("attendance")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "teacher"),
          q.eq(q.field("teacherId"), teacher._id),
          q.eq(q.field("date"), date)
        )
      )
      .first();

    if (!existing) {
      throw new ConvexError("لم يتم تسجيل دخول اليوم لهذا المحفظ");
    }

    await ctx.db.patch(existing._id, {
      checkOutTime: nowIso,
      timestamp: now,
    });

    return existing._id;
  },
});

/* ===========================
   جلب حضور المحفّظ الحالي لليوم
   =========================== */

export const myTeacherToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const teacher = await ctx.db
      .query("teachers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!teacher) return null;

    const date = todayDateString();

    const row = await ctx.db
      .query("attendance")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "teacher"),
          q.eq(q.field("teacherId"), teacher._id),
          q.eq(q.field("date"), date)
        )
      )
      .first();

    return row ?? null;
  },
});

/* ===========================
   تقارير مفصّلة (الطلاب)
   =========================== */

export const getAttendanceDetailed = query({
  args: {
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    teacherId: v.optional(v.id("teachers")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("type"), "student"))
      .collect();

    const students = await ctx.db.query("students").collect();
    const teachers = await ctx.db.query("teachers").collect();

    const studentMap: Record<string, any> = {};
    for (const s of students) studentMap[String(s._id)] = s;

    const teacherMap: Record<string, any> = {};
    for (const t of teachers) teacherMap[String(t._id)] = t;

    const filtered = rows
      .filter((r) =>
        inRange(r.date, args.fromDate ?? undefined, args.toDate ?? undefined)
      )
      .filter((r) => {
        // إذا لم يتم اختيار محفظ، أظهر كل السجلات
        if (!args.teacherId) return true;
        // إذا تم اختيار محفظ، تأكد من وجود teacherId في السجل وأنه يطابق
        if (!r.teacherId) return false;
        return String(r.teacherId) === String(args.teacherId);
      })
      .filter((r) =>
        args.status && args.status !== "" ? r.status === args.status : true
      )
      .map((r) => {
        const anyRow = r as any;
        return {
          ...r,
          type: "student" as const,
          studentName:
            anyRow.studentName ??
            studentMap[String(r.studentId)]?.name ??
            "—",
          teacherName:
            anyRow.teacherName ??
            (r.teacherId ? teacherMap[String(r.teacherId)]?.name : undefined) ??
            "—",
        };
      });

    return filtered;
  },
});

/* ===========================
   إحصائيات حضور المحفّظين
   الآن تُحسب من أي سجل مرتبط بالمحفّظ
   (طلاب أو سجلات teacher)
   =========================== */

export const getTeachersAttendanceStats = query({
  args: {
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teachers = await ctx.db.query("teachers").collect();

    // نجلب كل السجلات التي لها teacherId (طلاب أو محفّظ)
    const allRows = await ctx.db
      .query("attendance")
      .filter((q) => q.neq(q.field("teacherId"), undefined))
      .collect();

    const mapByTeacher: Record<string, Record<string, any>> = {};

    for (const row of allRows) {
      if (!row.teacherId || !row.date) continue;
      if (!inRange(row.date, args.fromDate ?? undefined, args.toDate ?? undefined))
        continue;

      const tid = String(row.teacherId);
      if (!mapByTeacher[tid]) mapByTeacher[tid] = {};

      const existing = mapByTeacher[tid][row.date];

      // لو فيه أكتر من سجل لنفس اليوم، نفضّل سجل type "teacher"
      if (!existing) {
        mapByTeacher[tid][row.date] = row;
      } else if (existing.type !== "teacher" && row.type === "teacher") {
        mapByTeacher[tid][row.date] = row;
      }
    }

    // نطاق التاريخ الافتراضي: آخر 30 يوم لو from/to مش محددين
    const from = args.fromDate ? new Date(args.fromDate) : null;
    const to = args.toDate ? new Date(args.toDate) : null;

    let startDate = from;
    let endDate = to;
    if (!startDate || !endDate) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 29);
    }

    const results: any[] = [];

    for (const teacher of teachers) {
      const tid = String(teacher._id);
      const workDays: string[] = Array.isArray((teacher as any).workDays)
        ? (teacher as any).workDays
        : [];

      let expectedDays = 0;
      let presentDays = 0;

      let d = new Date(startDate!);
      while (d <= endDate!) {
        const dateStr = d.toISOString().slice(0, 10);
        const dayCode = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
          d.getUTCDay()
        ];

        if (workDays.length === 0 || workDays.includes(dayCode)) {
          expectedDays++;
          const hasRecord =
            mapByTeacher[tid] && mapByTeacher[tid][dateStr] ? true : false;
          if (hasRecord) {
            presentDays++;
          }
        }

        d.setUTCDate(d.getUTCDate() + 1);
      }

      const absentDays = Math.max(expectedDays - presentDays, 0);

      results.push({
        teacherId: teacher._id,
        teacherName: teacher.name,
        workDays,
        expectedDays,
        presentDays,
        absentDays,
      });
    }

    return results;
  },
});

/* ===========================
   آخر أيام حضور المحفّظ
   (من سجلات الطلاب + سجلات المحفّظ)
   =========================== */

export const getTeacherRecentDays = query({
  args: {
    teacherId: v.id("teachers"),
    days: v.number(), // مثال: 7
  },
  handler: async (ctx, args) => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - (args.days - 1));

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = today.toISOString().slice(0, 10);

    // نجيب كل السجلات لهذا المحفّظ (طلاب + teacher)
    const rows = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();

    // نجمّعها حسب اليوم، ونفضّل سجل type="teacher" لو موجود
    const byDate: Record<string, any> = {};

    for (const row of rows) {
      if (!row.date) continue;
      if (!inRange(row.date, fromStr, toStr)) continue;

      const existing = byDate[row.date];
      if (!existing) {
        byDate[row.date] = row;
      } else if (existing.type !== "teacher" && row.type === "teacher") {
        byDate[row.date] = row;
      }
    }

    const filtered = Object.values(byDate).sort((a: any, b: any) =>
      a.date < b.date ? 1 : -1
    );

    return filtered;
  },
});

/* ===========================
   إحصائيات عامة للحضور (طلاب)
   =========================== */

export const getAttendanceStats = query({
  args: {
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("type"), "student"))
      .collect();

    const filtered = rows.filter((r) =>
      inRange(r.date, args.fromDate ?? undefined, args.toDate ?? undefined)
    );

    const totalRecords = filtered.length;
    const presentCount = filtered.filter(
      (r) => r.status === "حاضر" || r.status === "present"
    ).length;
    const absentCount = totalRecords - presentCount;
    const presentPercentage = totalRecords > 0 
      ? Math.round((presentCount / totalRecords) * 100) 
      : 0;

    return {
      totalRecords,
      presentCount,
      absentCount,
      presentPercentage,
    };
  },
});
/* ===========================
   (جديد) أيام حضور المحفّظ داخل مدى تاريخ (حسب الفلتر)
   يرجّع يوم واحد لكل تاريخ، ويفضّل سجل type="teacher" لو موجود
   =========================== */

export const getTeacherDaysInRange = query({
  args: {
    teacherId: v.id("teachers"),
    fromDate: v.string(), // YYYY-MM-DD
    toDate: v.string(),   // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const fromStr = args.fromDate;
    const toStr = args.toDate;

    // نجيب كل السجلات لهذا المحفّظ (طلاب + teacher) داخل الفترة
    // (لو حابب أسرع أداء لاحقاً: نضيف index حسب teacherId + date لكل الأنواع)
    const rows = await ctx.db
      .query("attendance")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();

    // نجمّعها حسب اليوم، ونفضّل سجل type="teacher" لو موجود
    const byDate: Record<string, any> = {};

    for (const row of rows) {
      if (!row.date) continue;
      if (!inRange(row.date, fromStr, toStr)) continue;

      const existing = byDate[row.date];
      if (!existing) {
        byDate[row.date] = row;
      } else if (existing.type !== "teacher" && row.type === "teacher") {
        byDate[row.date] = row;
      }
    }

    const result = Object.values(byDate).sort((a: any, b: any) =>
      a.date < b.date ? 1 : -1
    );

    return result;
  },
});
