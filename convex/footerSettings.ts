import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("يجب تسجيل الدخول أولاً");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile || profile.role !== "admin") {
    throw new ConvexError("غير مصرح لك بالوصول لهذه الصفحة");
  }

  return userId;
}

export const getFooterSettings = query({
  args: {},
  async handler(ctx) {
    const doc = await ctx.db.query("footerSettings").first();
    return doc ?? null;
  },
});

export const saveFooterSettings = mutation({
  args: {
    address: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    workingHours: v.string(),
    backgroundColor: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        youtube: v.optional(v.string()),
        instagram: v.optional(v.string()),
        whatsapp: v.optional(v.string()),
        twitter: v.optional(v.string()),
      })
    ),
    quickLinks: v.optional(
      v.array(
        v.object({
          title: v.string(),
          subtitle: v.string(),
        })
      )
    ),
  },
  async handler(ctx, args) {
    const userId = await requireAdmin(ctx);

    const existing = await ctx.db.query("footerSettings").first();

    const backgroundColor =
      args.backgroundColor ?? existing?.backgroundColor ?? "#022c22";

    const socialLinks =
      args.socialLinks ??
      existing?.socialLinks ?? {
        youtube: "",
        instagram: "",
        whatsapp: "",
        twitter: "",
      };

    const defaultQuickLinks = [
      { title: "الرئيسية", subtitle: "نظرة عامة" },
      { title: "البرامج", subtitle: "التسجيل والبرامج" },
      { title: "المحفظون", subtitle: "طاقم التحفيظ" },
      { title: "التسجيل", subtitle: "انضم الآن" },
    ];

    const quickLinks =
      args.quickLinks ?? existing?.quickLinks ?? defaultQuickLinks;

    const base = {
      address: args.address,
      phone: args.phone,
      whatsapp: args.whatsapp,
      email: args.email,
      workingHours: args.workingHours,
      backgroundColor,
      socialLinks,
      quickLinks,
      updatedAt: Date.now(),
      updatedBy: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, base);
      return existing._id;
    }

    const id = await ctx.db.insert("footerSettings", base);
    return id;
  },
});
