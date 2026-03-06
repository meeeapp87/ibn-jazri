// convex/students.ts
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/* ===========================
   جلب كل الطلاب
   - افتراضيًا: النشطين فقط
   - includeInactive=true: يرجع الكل (نشط + موقوف)
   =========================== */
export const getAllStudents = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeInactive = !!args.includeInactive;

    const students = await ctx.db.query("students").collect();

    const filtered = includeInactive
      ? students
      : students.filter((s: any) => (s.isActive ?? true) === true);

    // ترتيب بالأحدث تسجيلًا (لو enrollmentDate موجود)
    filtered.sort((a: any, b: any) => {
      const ad = Number(a.enrollmentDate || 0);
      const bd = Number(b.enrollmentDate || 0);
      return bd - ad;
    });

    return filtered;
  },
});

/* ===========================
   إنشاء طالب جديد
   =========================== */
export const createStudent = mutation({
  args: {
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    parentPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    level: v.string(),
    program: v.optional(v.string()),
    gender: v.optional(v.string()), // ✅ جديد
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول لإضافة طالب");
    }

    const now = Date.now();

    const studentId = await ctx.db.insert("students", {
      userId,
      name: args.name.trim(),
      age: args.age,
      phone: args.phone.trim(),
      parentPhone: (args.parentPhone ?? "").trim(),
      address: (args.address ?? "").trim(),
      level: args.level,
      program: args.program,
      enrollmentDate: now,
      isActive: true,
      gender: args.gender, // ✅ تخزين الجنس
    });

    return studentId;
  },
});

/* ===========================
   تحديث بيانات طالب
   =========================== */
export const updateStudent = mutation({
  args: {
    studentId: v.id("students"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    phone: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    level: v.optional(v.string()),
    program: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    gender: v.optional(v.string()), // ✅ جديد
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول");
    }

    const existing = await ctx.db.get(args.studentId);
    if (!existing) {
      throw new ConvexError("الطالب غير موجود");
    }

    const patch: any = {};

    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.age !== undefined) patch.age = args.age;
    if (args.phone !== undefined) patch.phone = args.phone.trim();
    if (args.parentPhone !== undefined) patch.parentPhone = args.parentPhone.trim();
    if (args.address !== undefined) patch.address = args.address.trim();
    if (args.level !== undefined) patch.level = args.level;
    if (args.program !== undefined) patch.program = args.program;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.gender !== undefined) patch.gender = args.gender;

    await ctx.db.patch(args.studentId, patch);
  },
});

/* ===========================
   تعطيل / حذف منطقي لطالب
   (صلاحية: مشرف فقط)
   =========================== */
export const deactivateStudent = mutation({
  args: {
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("يجب تسجيل الدخول");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new ConvexError("لا يوجد ملف مستخدم لهذا الحساب");
    }

    const isAdmin = profile.role === "admin";
    if (!isAdmin) {
      throw new ConvexError("ليست لديك صلاحية لحذف الطلاب (مشرف فقط)");
    }

    const existing = await ctx.db.get(args.studentId);
    if (!existing) {
      throw new ConvexError("الطالب غير موجود");
    }

    await ctx.db.patch(args.studentId, { isActive: false });

    return { ok: true };
  },
});

/* ===========================
   جلب طالب واحد
   =========================== */
export const getStudentById = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new ConvexError("الطالب غير موجود");
    }
    return student;
  },
});
