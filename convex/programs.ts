// convex/programs.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// إضافة برنامج جديد (للإدارة)
export const createProgram = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    duration: v.string(),
    targetAge: v.string(),
    maxStudents: v.number(),
    schedule: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const programId = await ctx.db.insert("programs", {
      name: args.name,
      description: args.description,
      duration: args.duration,
      targetAge: args.targetAge,
      maxStudents: args.maxStudents,
      currentStudents: 0,
      schedule: args.schedule,
      isActive: true,
    });

    return programId;
  },
});

// جلب جميع البرامج (للوحة الإدارة فقط)
export const getAllPrograms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // لو مش داخل، ما نرجعش حاجة (ده للإدارة)
      return [];
    }

    const programs = await ctx.db.query("programs").collect();
    // الإدارة غالبًا عايزة الكل، بس لو عايزهم مفعّلين بس شيل الكومنت الجاي
    // return programs.filter((program) => program.isActive);
    return programs;
  },
});

// تحديث برنامج
export const updateProgram = mutation({
  args: {
    programId: v.id("programs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    duration: v.optional(v.string()),
    targetAge: v.optional(v.string()),
    maxStudents: v.optional(v.number()),
    schedule: v.optional(v.string()),
    teacherId: v.optional(v.id("teachers")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const { programId, ...updates } = args;

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(programId, cleanUpdates);
    return programId;
  },
});

// إلغاء تفعيل برنامج
export const deactivateProgram = mutation({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    await ctx.db.patch(args.programId, { isActive: false });
    return args.programId;
  },
});

// تحديث عدد الطلاب في البرنامج
export const updateStudentCount = mutation({
  args: {
    programName: v.string(),
    increment: v.boolean(), // true للزيادة، false للنقصان
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const programs = await ctx.db.query("programs").collect();
    const program = programs.find(
      (p) => p.name === args.programName && p.isActive
    );

    if (!program) {
      throw new ConvexError("البرنامج غير موجود");
    }

    const newCount = args.increment
      ? program.currentStudents + 1
      : Math.max(0, program.currentStudents - 1);

    await ctx.db.patch(program._id, { currentStudents: newCount });
    return program._id;
  },
});

// 🟢 جلب البرامج للعرض العام (للزائر / للطلاب)
export const getPublicPrograms = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// إرسال طلب تسجيل في برنامج
export const requestEnrollment = mutation({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول أولاً");

    const user = await ctx.db.get(userId);
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const program = await ctx.db.get(args.programId);
    if (!program) throw new ConvexError("البرنامج غير موجود");

    return await ctx.db.insert("requests", {
      type: "program",
      userId,
      userName: userProfile?.name || user?.name || "غير محدد",
      userEmail: userProfile?.email || user?.email || "غير محدد",
      userPhone: userProfile?.phone,
      programId: args.programId,
      programName: program.name,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
