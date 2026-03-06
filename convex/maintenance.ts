// convex/maintenance.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * دمج بيانات محفظين:
 * - ينقل كل سجلات الحضور (attendance) من fromTeacherId إلى toTeacherId
 * - ينقل كل التقييمات (evaluations) من fromTeacherId إلى toTeacherId
 * - يعمل دمج بسيط لبيانات المحفظين لو الحساب القديم لسه موجود
 */
export const mergeTeacher = mutation({
  args: {
    fromTeacherId: v.id("teachers"),
    toTeacherId: v.id("teachers"),
  },
  async handler(ctx, { fromTeacherId, toTeacherId }) {
    if (fromTeacherId === toTeacherId) {
      throw new Error("fromTeacherId و toTeacherId لازم يكونوا مختلفين");
    }

    // نحاول نجيب المحفظين (ممكن القديم يكون اتحذف – مافي مشكلة)
    const fromTeacher = await ctx.db.get(fromTeacherId);
    const toTeacher = await ctx.db.get(toTeacherId);

    if (!toTeacher) {
      throw new Error("المحفظ الهدف (toTeacherId) غير موجود");
    }

    // لو المحفظ القديم لسه موجود ندمج شوية بيانات أساسية
    if (fromTeacher) {
      const mergedWorkDays =
        toTeacher.workDays && toTeacher.workDays.length > 0
          ? toTeacher.workDays
          : fromTeacher.workDays;

      const mergedAssignedPrograms = [
        ...(toTeacher.assignedPrograms ?? []),
        ...(fromTeacher.assignedPrograms ?? []),
      ];

      await ctx.db.patch(toTeacherId, {
        workDays: mergedWorkDays,
        assignedPrograms: mergedAssignedPrograms,
        isActive: true,
      });

      // نوقف القديم بس لو لسه موجود
      await ctx.db.patch(fromTeacherId, {
        isActive: false,
        assignedPrograms: [],
      });
    }

    // ===== نقل حضور المحفظ + حضور الطلاب المرتبط به =====
    const attendance = await ctx.db
      .query("attendance")
      .filter((q: any) => q.eq(q.field("teacherId"), fromTeacherId))
      .collect();

    for (const a of attendance) {
      await ctx.db.patch(a._id, { teacherId: toTeacherId });
    }

    // ===== نقل التقييمات =====
    const evaluations = await ctx.db
      .query("evaluations")
      .filter((q: any) => q.eq(q.field("teacherId"), fromTeacherId))
      .collect();

    for (const e of evaluations) {
      await ctx.db.patch(e._id, { teacherId: toTeacherId });
    }

    return {
      fromTeacherId,
      toTeacherId,
      movedAttendanceCount: attendance.length,
      movedEvaluationsCount: evaluations.length,
    };
  },
});
