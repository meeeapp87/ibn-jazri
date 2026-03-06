// convex/teachers.ts
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** جلب جميع المحفظين (النشِطين فقط) */
export const getAllTeachers = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("teachers").collect();

    // نرجّع فقط المحفظين النشِطين
    const activeOnly = docs.filter((t: any) => t.isActive !== false);

    // ترتيب حسب الاسم (عربي)
    return activeOnly.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "ar")
    );
  },
});

/** إنشاء محفظ جديد */
export const createTeacher = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    specialization: v.string(),
    experience: v.optional(v.float64()),
    assignedPrograms: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    // دعم أيام الدوام
    workDays: v.optional(v.array(v.string())), // أمثلة: ["Sun","Mon","Wed"]
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    return await ctx.db.insert("teachers", {
      userId: userId as any, // Id<"users">
      name: args.name,
      phone: args.phone,
      specialization: args.specialization,
      experience: args.experience ?? 0,
      assignedPrograms: args.assignedPrograms ?? [],
      isActive: args.isActive ?? true,
      workDays: args.workDays, // ممكن undefined
    });
  },
});

/** تعديل بيانات محفظ */
export const updateTeacher = mutation({
  args: {
    teacherId: v.id("teachers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    specialization: v.optional(v.string()),
    experience: v.optional(v.float64()),
    assignedPrograms: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    // جديد: تعديل workDays
    workDays: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.teacherId);
    if (!doc) throw new ConvexError("لم يتم العثور على المحفظ");

    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.specialization !== undefined) patch.specialization = args.specialization;
    if (args.experience !== undefined) patch.experience = args.experience;
    if (args.assignedPrograms !== undefined) patch.assignedPrograms = args.assignedPrograms;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.workDays !== undefined) patch.workDays = args.workDays;

    await ctx.db.patch(args.teacherId, patch);
    return args.teacherId;
  },
});

/** إلغاء تفعيل محفظ (للمشرف فقط) */
export const deactivateTeacher = mutation({
  args: { teacherId: v.id("teachers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول");

    // نتأكد إن اللي بيحذف مشرف
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "admin") {
      throw new ConvexError("فقط المشرف يمكنه حذف المحفظين");
    }

    const doc = await ctx.db.get(args.teacherId);
    if (!doc) throw new ConvexError("لم يتم العثور على المحفظ");

    // 1) حذف منطقي: نخليه غير نشِط في جدول المحفظين
    await ctx.db.patch(args.teacherId, { isActive: false });

    // 2) إيقاف البروفايل المرتبط (إن وجد) عشان ما يظهرش في إدارة المستخدمين كمفعّل
    const teacherProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", doc.userId))
      .first();

    if (teacherProfile) {
      await ctx.db.patch(teacherProfile._id, { isActive: false });
    }

    return { ok: true };
  },
});

/** ربط مستخدم موجود بملف محفّظ (للمشرف) */
export const linkUserToTeacher = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new ConvexError("يجب تسجيل الدخول");

    // نتأكد إن اللي بينفذ العملية مشرف
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();

    if (!profile || profile.role !== "admin") {
      throw new ConvexError("فقط المشرف يمكنه ربط المستخدمين");
    }

    // نجيب بروفايل المستخدم
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!userProfile) {
      throw new ConvexError("لم يتم العثور على بروفايل المستخدم");
    }

    // نتأكد إن المستخدم دوره محفّظ
    if (userProfile.role !== "teacher") {
      throw new ConvexError("المستخدم ليس محفّظًا");
    }

    // نشوف لو عنده ملف محفّظ بالفعل
    const existingTeacher = await ctx.db
      .query("teachers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingTeacher) {
      throw new ConvexError("المستخدم مربوط بملف محفّظ بالفعل");
    }

    // ننشئ ملف محفّظ جديد
    const teacherId = await ctx.db.insert("teachers", {
      userId: args.userId,
      name: userProfile.name,
      phone: userProfile.phone || "",
      specialization: "تحفيظ القرآن الكريم",
      experience: 0,
      assignedPrograms: [],
      isActive: true,
    });

    return teacherId;
  },
});
