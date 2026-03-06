// convex/auth.ts
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

// دالة مساعدة لإنشاء السجلات المرتبطة بالأدوار
async function createRoleSpecificRecord(ctx: any, userId: any, role: string, name: string, phone: string) {
  if (role === "teacher") {
    await ctx.db.insert("teachers", {
      userId,
      name,
      phone: phone || "",
      specialization: "تحفيظ القرآن الكريم",
      experience: 0,
      assignedPrograms: [],
      isActive: true,
    });
  } else if (role === "student") {
    await ctx.db.insert("students", {
      userId,
      name,
      age: 18,
      phone: phone || "",
      parentPhone: "",
      address: "",
      level: "مبتدئ",
      program: "برنامج عام",
      enrollmentDate: Date.now(),
      isActive: true,
    });
  }
}

// ============================
// جلب المستخدم الحالي
// ============================
export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      ...user,
      profile: profile || null,
    };
  },
});

// ============================
// جلب بروفايل المستخدم الحالي
// ============================
export const getCurrentUserProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ============================
// إنشاء / إكمال بروفايل المستخدم
// ============================
export const completeProfile = mutation({
  args: {
    name: v.string(),
    role: v.string(), // "student" | "teacher" | "guardian"
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    // ✅ حماية من محاولة اختيار "admin"
    if (args.role === "admin") {
      throw new ConvexError("غير مسموح باختيار دور المشرف.");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId as any);
    const emailFromUser =
      user && "email" in user && typeof (user as any).email === "string"
        ? (user as any).email
        : "";

    if (existing) {
      const oldRole = existing.role;
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        phone: args.phone,
        isActive: true,
      });

      // إذا غيّر الدور، أنشئ السجل المناسب
      if (args.role !== oldRole) {
        await createRoleSpecificRecord(ctx, userId, args.role, args.name, args.phone || "");
      }

      return existing._id;
    } else {
      const profileId = await ctx.db.insert("userProfiles", {
        userId,
        name: args.name,
        email: emailFromUser,
        role: args.role,
        phone: args.phone,
        isActive: true,
        createdAt: Date.now(),
      });

      // أنشئ السجل المناسب للدور
      await createRoleSpecificRecord(ctx, userId, args.role, args.name, args.phone || "");

      return profileId;
    }
  },
});
