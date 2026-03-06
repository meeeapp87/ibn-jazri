// convex/studentsDedupMerge.ts
import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const mergeOneDuplicateGroup = mutation({
  args: {
    keepId: v.id("students"),
    mergeIds: v.array(v.id("students")),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    const hardDelete = !!args.hardDelete;

    // ✅ لازم يكون فيه على الأقل 2
    if (!args.mergeIds || args.mergeIds.length < 2) {
      throw new ConvexError("لازم تختار سجلين أو أكثر للدمج");
    }

    // ✅ تأكد keep ضمن القائمة
    if (!args.mergeIds.some((x) => x === args.keepId)) {
      throw new ConvexError("keepId لازم يكون ضمن mergeIds");
    }

    // ✅ تأكد أن keep موجود
    const keep = await ctx.db.get(args.keepId);
    if (!keep) throw new ConvexError("سجل Keep غير موجود");

    let movedEvaluations = 0;
    let movedAttendance = 0;
    let merged = 0;

    for (const sid of args.mergeIds) {
      if (sid === args.keepId) continue;

      const s = await ctx.db.get(sid);
      if (!s) {
        // لو السجل اتحذف قبل كده… نتجاهله
        continue;
      }

      // نقل التقييمات
      const evals = await ctx.db
        .query("evaluations")
        .withIndex("by_student", (q) => q.eq("studentId", sid))
        .collect();

      for (const ev of evals) {
        await ctx.db.patch(ev._id, { studentId: args.keepId });
        movedEvaluations++;
      }

      // نقل الحضور (studentId)
      const att = await ctx.db
        .query("attendance")
        .withIndex("by_student_date", (q) => q.eq("studentId", sid))
        .collect();

      for (const a of att) {
        await ctx.db.patch(a._id, { studentId: args.keepId });
        movedAttendance++;
      }

      // ✅ حذف/تعطيل السجل المكرر (ممنوع نلمس keep)
      if (sid === args.keepId) continue;

      if (hardDelete) {
        await ctx.db.delete(sid);
      } else {
        await ctx.db.patch(sid, { isActive: false });
      }

      merged++;
    }

    return {
      ok: true,
      merged,
      movedEvaluations,
      movedAttendance,
      hardDelete,
    };
  },
});
