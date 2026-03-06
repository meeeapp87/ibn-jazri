// convex/resources.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// توليد رابط رفع ملف
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// جلب المصادر النشطة (للعرض العام) مع روابط الملفات
export const getActiveResources = query({
  args: {
    category: v.optional(v.string()),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("resources")
      .filter((qq) => qq.eq(qq.field("isActive"), true));

    if (args.category) {
      q = q.filter((qq) => qq.eq(qq.field("category"), args.category));
    }

    if (args.type) {
      q = q.filter((qq) => qq.eq(qq.field("type"), args.type));
    }

    const resources = await q.collect();
    const sorted = resources.sort((a, b) => b.createdAt - a.createdAt);

    // إضافة روابط الملفات والأغلفة
    const withUrls = await Promise.all(
      sorted.map(async (r) => ({
        ...r,
        fileUrl: r.fileStorageId ? await ctx.storage.getUrl(r.fileStorageId) : r.fileUrl,
        coverUrl: r.coverStorageId ? await ctx.storage.getUrl(r.coverStorageId) : null,
      }))
    );

    if (args.limit) {
      return withUrls.slice(0, args.limit);
    }
    return withUrls;
  },
});

// جلب جميع المصادر (للإدارة) مع روابط الملفات
export const getAllResources = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const resources = await ctx.db.query("resources").collect();
    
    // إضافة روابط الملفات والأغلفة
    const withUrls = await Promise.all(
      resources.map(async (r) => ({
        ...r,
        fileUrl: r.fileStorageId ? await ctx.storage.getUrl(r.fileStorageId) : r.fileUrl,
        coverUrl: r.coverStorageId ? await ctx.storage.getUrl(r.coverStorageId) : null,
      }))
    );
    
    return withUrls;
  },
});

// جلب الفئات المتاحة
export const getResourceCategories = query({
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db
      .query("resources")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const categories = [...new Set(resources.map((r) => r.category))];
    return categories;
  },
});

// إضافة مصدر جديد
export const createResource = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    type: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    externalLink: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    category: v.string(),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const resourceId = await ctx.db.insert("resources", {
      title: args.title,
      description: args.description,
      type: args.type,
      fileStorageId: args.fileStorageId,
      fileUrl: args.fileUrl,
      externalLink: args.externalLink,
      coverStorageId: args.coverStorageId,
      category: args.category,
      author: args.author,
      downloads: 0,
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
    });

    return resourceId;
  },
});

// زيادة عدد التحميلات
export const incrementDownloads = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) {
      throw new ConvexError("المصدر غير موجود");
    }

    await ctx.db.patch(args.resourceId, {
      downloads: (resource.downloads ?? 0) + 1,
    });

    return args.resourceId;
  },
});

// تحديث مصدر
export const updateResource = mutation({
  args: {
    resourceId: v.id("resources"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    externalLink: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    category: v.optional(v.string()),
    author: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const { resourceId, ...updates } = args;

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(resourceId, cleanUpdates);
    return resourceId;
  },
});

// حذف مصدر
export const deleteResource = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    await ctx.db.delete(args.resourceId);
    return args.resourceId;
  },
});
