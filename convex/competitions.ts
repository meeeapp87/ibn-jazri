// convex/competitions.ts
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** المسابقات النشطة (للعرض العام) — مرتبة حسب تاريخ النهاية تصاعدياً */
export const getActiveCompetitions = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("competitions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return rows.sort((a: any, b: any) =>
      a.endDate < b.endDate ? -1 : 1
    );
  },
});

/** جميع المسابقات (للإدارة) */
export const getAllCompetitions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("competitions").collect();
    // أحدث المضافين أولًا
    return rows.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

/** إنشاء مسابقة */
export const createCompetition = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
    prizes: v.array(v.string()),
    rules: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول أولاً");

    return await ctx.db.insert("competitions", {
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      prizes: args.prizes,
      rules: args.rules,
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

/** تحديث مسابقة */
export const updateCompetition = mutation({
  args: {
    competitionId: v.id("competitions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    prizes: v.optional(v.array(v.string())),
    rules: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول أولاً");

    const { competitionId, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(competitionId, clean);
    return competitionId;
  },
});

/** إلغاء تفعيل مسابقة */
export const deactivateCompetition = mutation({
  args: { competitionId: v.id("competitions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول أولاً");
    await ctx.db.patch(args.competitionId, { isActive: false });
    return args.competitionId;
  },
});

/** طلب اشتراك في مسابقة */
export const requestParticipation = mutation({
  args: { competitionId: v.id("competitions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("يجب تسجيل الدخول أولاً");

    // بيانات المستخدم + البروفايل للاسم
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const competition = await ctx.db.get(args.competitionId);
    if (!competition) throw new ConvexError("المسابقة غير موجودة");

    return await ctx.db.insert("requests", {
      type: "competition",
      userId,
      userName: profile?.name || (user as any)?.name || "غير محدد",
      userEmail: (user as any)?.email || "غير محدد",
      competitionId: args.competitionId,
      competitionTitle: (competition as any).title,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
