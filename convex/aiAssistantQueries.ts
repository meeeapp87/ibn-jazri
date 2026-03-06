// convex/aiAssistantQueries.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// دوال لجمع البيانات
export const getStudentsData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("students").collect();
  },
});

export const getTeachersData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teachers").collect();
  },
});

export const getProgramsData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

export const getAttendanceData = query({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];
    
    return await ctx.db
      .query("attendance")
      .filter((q) => q.gte(q.field("date"), dateStr))
      .collect();
  },
});

export const getEvaluationsData = query({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];
    
    return await ctx.db
      .query("evaluations")
      .filter((q) => q.gte(q.field("date"), dateStr))
      .collect();
  },
});

export const getVideosData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("videos").collect();
  },
});

export const getResourcesData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("resources").collect();
  },
});

export const getCompetitionsData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("competitions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// حفظ المحادثة
export const saveChatHistory = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }

    await ctx.db.insert("aiChats", {
      userId,
      question: args.question,
      answer: args.answer,
      timestamp: Date.now(),
    });

    return null;
  },
});

// جلب تاريخ المحادثات
export const getChatHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});
