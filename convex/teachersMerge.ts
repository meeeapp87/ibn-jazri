import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const mergeTeachers = mutation({
  args: {
    keepTeacherId: v.id("teachers"),
    mergeTeacherIds: v.array(v.id("teachers")),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    const hardDelete = !!args.hardDelete;
    if (!args.mergeTeacherIds.some((x) => x === args.keepTeacherId)) {
      throw new ConvexError("keepTeacherId لازم يكون ضمن mergeTeacherIds");
    }

    let movedAttendance = 0;
    let movedEvaluations = 0;
    let movedPrograms = 0;
    let merged = 0;

    for (const tid of args.mergeTeacherIds) {
      if (tid === args.keepTeacherId) continue;

      // ✅ نقل حضور الطلاب/المحفظ (كل ما فيه teacherId)
      const att = await ctx.db
        .query("attendance")
        .withIndex("by_teacher_date", (q) => q.eq("teacherId", tid))
        .collect();
      for (const a of att) {
        await ctx.db.patch(a._id, { teacherId: args.keepTeacherId });
        movedAttendance++;
      }

      // ✅ نقل التقييمات
      const evals = await ctx.db
        .query("evaluations")
        .withIndex("by_teacher", (q) => q.eq("teacherId", tid))
        .collect();
      for (const ev of evals) {
        await ctx.db.patch(ev._id, { teacherId: args.keepTeacherId });
        movedEvaluations++;
      }

      // ✅ نقل البرامج المرتبطة بالمحفظ
      const progs = await ctx.db
        .query("programs")
        .withIndex("by_teacher", (q) => q.eq("teacherId", tid))
        .collect();
      for (const p of progs) {
        await ctx.db.patch(p._id, { teacherId: args.keepTeacherId });
        movedPrograms++;
      }

      // ✅ حذف/تعطيل سجل المحفظ المكرر
      if (hardDelete) {
        await ctx.db.delete(tid);
      } else {
        await ctx.db.patch(tid, { isActive: false });
      }

      merged++;
    }

    return { ok: true, merged, movedAttendance, movedEvaluations, movedPrograms, hardDelete };
  },
});
