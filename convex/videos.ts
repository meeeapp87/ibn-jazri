// convex/videos.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// جلب الفيديوهات النشطة (للعرض العام)
export const getActiveVideos = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("videos")
      .filter((q) => q.eq(q.field("isActive"), true));

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    const videos = await query.collect();
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedVideos = videos.sort((a, b) => b.createdAt - a.createdAt);
    
    // تحديد العدد المطلوب
    if (args.limit) {
      return sortedVideos.slice(0, args.limit);
    }
    
    return sortedVideos;
  },
});

// جلب جميع الفيديوهات (للإدارة)
export const getAllVideos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db.query("videos").collect();
  },
});

// جلب الفئات المتاحة
export const getVideoCategories = query({
  args: {},
  handler: async (ctx) => {
    const videos = await ctx.db
      .query("videos")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const categories = [...new Set(videos.map(v => v.category))];
    return categories;
  },
});

// إضافة فيديو جديد
export const createVideo = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    videoUrl: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const videoId = await ctx.db.insert("videos", {
      title: args.title,
      description: args.description,
      videoUrl: args.videoUrl,
      category: args.category,
      views: 0,
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
    });

    return videoId;
  },
});

// زيادة عدد المشاهدات
export const incrementViews = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new ConvexError("الفيديو غير موجود");
    }

    await ctx.db.patch(args.videoId, {
      views: video.views + 1,
    });

    return args.videoId;
  },
});

// تحديث فيديو
export const updateVideo = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    const { videoId, ...updates } = args;
    
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(videoId, cleanUpdates);
    return videoId;
  },
});

// إلغاء تفعيل فيديو
export const deactivateVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول أولاً");
    }

    await ctx.db.patch(args.videoId, { isActive: false });
    return args.videoId;
  },
});
