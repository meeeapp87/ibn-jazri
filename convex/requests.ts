import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// جلب كل الطلبات (للوحة التحكم)
export const listRequests = query({
  args: {},
  handler: async (ctx) => {
    // لو عايز تتحقق انه أدمن: هات اليوزر من userProfiles وشوف role === "admin"
    const items = await ctx.db.query("requests").order("desc").collect();
    return items;
  },
});

// تغيير حالة الطلب
export const updateRequestStatus = mutation({
  args: {
    id: v.id("requests"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("غير مصرح: يجب تسجيل الدخول");
    }
    const req = await ctx.db.get(id);
    if (!req) {
      throw new ConvexError("الطلب غير موجود");
    }
    await ctx.db.patch(id, {
      status,
      notes: notes ?? req.notes,
      processedAt: Date.now(),
      processedBy: userId,
    });
    return { ok: true };
  },
});

// (اختياري) جلب طلبات المستخدم نفسه
export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("requests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
