import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const mergeOneDuplicateGroup = mutation({
  args: {
    keepId: v.id("teachers"),
    mergeIds: v.array(v.id("teachers")),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    const hardDelete = !!args.hardDelete;
    const keepId = args.keepId;
    const ids = Array.from(new Set(args.mergeIds.map((x) => x))).filter((x) => x !== keepId);
    if (ids.length < 1) throw new ConvexError("اختر سجلين على الأقل (Keep + واحد أو أكثر)");

    let movedAttendance = 0;
    let movedEvaluations = 0;
    let merged = 0;

    for (const tid of ids) {
      // نقل تقييمات الطلاب التي كتبها هذا المحفظ
      const evals = await ctx.db.query("evaluations").withIndex("by_teacher", (q) => q.eq("teacherId", tid)).collect();
      for (const ev of evals) {
        await ctx.db.patch(ev._id, { teacherId: keepId });
        movedEvaluations++;
      }

      // نقل حضور الطلاب المسجل بواسطة هذا المحفظ (teacherId في attendance)
      const atts = await ctx.db.query("attendance").withIndex("by_teacher_date", (q) => q.eq("teacherId", tid)).collect();
      for (const a of atts) {
        await ctx.db.patch(a._id, { teacherId: keepId });
        movedAttendance++;
      }

      // تعطيل أو حذف سجل المحفظ المكرر
      if (hardDelete) {
        await ctx.db.delete(tid);
      } else {
        await ctx.db.patch(tid, { isActive: false });
      }

      merged++;
    }

    return { ok: true, merged, movedAttendance, movedEvaluations, keepId };
  },
});
