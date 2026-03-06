import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("يجب تسجيل الدخول");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile) throw new ConvexError("لا يوجد ملف مستخدم");
  if (profile.role !== "admin") throw new ConvexError("صلاحية غير كافية");
  return { userId, profile };
}

export const listTeachersForMerge = query({
  args: { includeInactive: v.boolean() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const teachers = await ctx.db.query("teachers").collect();
    const list = [] as any[];

    for (const t of teachers) {
      const isActive = t.isActive !== false;
      if (!args.includeInactive && !isActive) continue;

      const p = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q: any) => q.eq("userId", t.userId))
        .first();

      list.push({
        id: t._id,
        userId: t.userId,
        name: t.name,
        phone: t.phone,
        email: p?.email ?? "",
        experience: t.experience,
        specialization: t.specialization,
        isActive,
      });
    }

    list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));
    return list;
  },
});

export const mergeTeachersManual = mutation({
  args: {
    keepTeacherId: v.id("teachers"),
    mergeTeacherIds: v.array(v.id("teachers")),
    hardDelete: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const keep = await ctx.db.get(args.keepTeacherId);
    if (!keep) throw new ConvexError("Keep غير موجود");

    const mergeIds = Array.from(new Set(args.mergeTeacherIds.map((x) => x)));
    if (mergeIds.length < 2) throw new ConvexError("اختر سجلين أو أكثر");
    if (!mergeIds.some((x) => x === args.keepTeacherId)) throw new ConvexError("Keep لازم يكون ضمن المحدد");

    let movedAttendanceTeacher = 0;
    let movedEvaluationsTeacher = 0;
    let movedProgramsTeacher = 0;
    let movedStudentsTeacher = 0;
    let merged = 0;

    for (const tid of mergeIds) {
      if (tid === args.keepTeacherId) continue;

      const t = await ctx.db.get(tid);
      if (!t) continue;

      const evals = await ctx.db.query("evaluations").withIndex("by_teacher", (q: any) => q.eq("teacherId", tid)).collect();
      for (const ev of evals) {
        await ctx.db.patch(ev._id, { teacherId: args.keepTeacherId });
        movedEvaluationsTeacher++;
      }

      const att = await ctx.db.query("attendance").withIndex("by_teacher_date", (q: any) => q.eq("teacherId", tid)).collect();
      for (const a of att) {
        await ctx.db.patch(a._id, { teacherId: args.keepTeacherId });
        movedAttendanceTeacher++;
      }

      const progs = await ctx.db.query("programs").withIndex("by_teacher", (q: any) => q.eq("teacherId", tid)).collect();
      for (const p of progs) {
        await ctx.db.patch(p._id, { teacherId: args.keepTeacherId });
        movedProgramsTeacher++;
      }

      const students = await ctx.db.query("students").withIndex("by_program", (q: any) => q.eq("program", t.name)).collect();
      for (const s of students) {
        movedStudentsTeacher++;
      }

      if (args.hardDelete) {
        await ctx.db.delete(tid);
      } else {
        await ctx.db.patch(tid, { isActive: false });
      }

      merged++;
    }

    return {
      merged,
      movedAttendanceTeacher,
      movedEvaluationsTeacher,
      movedProgramsTeacher,
      movedStudentsTeacher,
    };
  },
});
