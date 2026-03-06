// convex/admin.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// التحقق من أن المستخدم مشرف
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

// جلب جميع المستخدمين (للمشرف فقط)
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("userProfiles").collect();
    
    // نجيب بيانات المستخدم الأساسية مع البروفايل
    const usersWithProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          email: user?.email || "غير محدد",
          userCreatedAt: user?._creationTime || profile.createdAt,
        };
      })
    );

    return usersWithProfiles.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// تغيير دور المستخدم (للمشرف فقط)
export const setUserRole = mutation({
  args: {
    profileId: v.id("userProfiles"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // التحقق من أن الدور صحيح
    const validRoles = ["student", "teacher", "guardian", "admin"];
    if (!validRoles.includes(args.role)) {
      throw new ConvexError("دور غير صحيح");
    }

    // جلب البروفايل الحالي
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new ConvexError("المستخدم غير موجود");
    }

    const oldRole = profile.role;
    
    await ctx.db.patch(args.profileId, {
      role: args.role,
    });

    // إنشاء سجل محفظ إذا لزم الأمر
    if (args.role === "teacher" && oldRole !== "teacher") {
      const existingTeacher = await ctx.db
        .query("teachers")
        .withIndex("by_user", (q: any) => q.eq("userId", profile.userId))
        .first();
      
      if (!existingTeacher) {
        await ctx.db.insert("teachers", {
          userId: profile.userId,
          name: profile.name,
          phone: profile.phone || "",
          specialization: "تحفيظ القرآن الكريم",
          experience: 0,
          assignedPrograms: [],
          isActive: true,
        });
      }
    }

    return args.profileId;
  },
});

// ✅ تفعيل/إلغاء تفعيل المستخدم (للمشرف فقط) + مزامنة حالة المحفظ
export const toggleUserActive = mutation({
  args: {
    profileId: v.id("userProfiles"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new ConvexError("المستخدم غير موجود");
    }

    // 1) تحديث حالة البروفايل
    await ctx.db.patch(args.profileId, {
      isActive: args.isActive,
    });

    // 2) تحديث حالة المحفظ/المحفظين المرتبطين بنفس المستخدم
    const teachers = await ctx.db
      .query("teachers")
      .withIndex("by_user", (q: any) => q.eq("userId", profile.userId))
      .collect();

    for (const t of teachers) {
      await ctx.db.patch(t._id, { isActive: args.isActive });
    }

    return {
      profileId: args.profileId,
      updatedTeachers: teachers.map((t) => t._id),
    };
  },
});

// حذف مستخدم نهائياً (للمشرف فقط - استخدام حذر)
export const deleteUser = mutation({
  args: {
    profileId: v.id("userProfiles"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new ConvexError("المستخدم غير موجود");
    }

    // ممكن هنا مستقبلاً تحذف أو توقّف المحفّظ المرتبط لو حبيت
    // const teachers = await ctx.db
    //   .query("teachers")
    //   .withIndex("by_user", (q: any) => q.eq("userId", profile.userId))
    //   .collect();
    // for (const t of teachers) {
    //   await ctx.db.patch(t._id, { isActive: false });
    // }

    // حذف البروفايل
    await ctx.db.delete(args.profileId);

    return args.profileId;
  },
});

// جلب جميع الطلبات (للأدمن)
export const getAllRequests = query({
  args: { type: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const requests = await ctx.db.query("requests").collect();
    return requests
      .filter((req) => {
        if (args.type && req.type !== args.type) return false;
        if (args.status && req.status !== args.status) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// معالجة طلب (قبول أو رفض)
export const processRequest = mutation({
  args: { requestId: v.id("requests"), status: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const userId = await getAuthUserId(ctx);
    await ctx.db.patch(args.requestId, {
      status: args.status,
      notes: args.notes,
      processedAt: Date.now(),
      processedBy: userId || undefined,
    });
    return args.requestId;
  },
});

// إحصائيات الطلبات
export const getRequestsStats = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const requests = await ctx.db.query("requests").collect();
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === "pending").length,
      approved: requests.filter(r => r.status === "approved").length,
      rejected: requests.filter(r => r.status === "rejected").length,
      programRequests: requests.filter(r => r.type === "program").length,
      competitionRequests: requests.filter(r => r.type === "competition").length,
    };
  },
});
