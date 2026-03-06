// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // ---------------------------
  // حسابات المستخدمين (بروفايل)
  // ---------------------------
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(), // admin | teacher | student | guardian | guest
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

  // -----------
  // الطلاب
  // -----------
  students: defineTable({
    userId: v.id("users"),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    parentPhone: v.string(),
    address: v.string(),
    level: v.string(),
    program: v.optional(v.string()),
    enrollmentDate: v.number(),
    isActive: v.boolean(),
    gender: v.optional(v.string()), // "ذكر" | "أنثى"
  })
    .index("by_user", ["userId"])
    .index("by_program", ["program"])
    .index("by_level", ["level"]),

  // -----------
  // المحفّظون
  // -----------
  teachers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    specialization: v.string(),
    experience: v.number(),
    assignedPrograms: v.array(v.string()),
    isActive: v.boolean(),
    workDays: v.optional(v.array(v.string())), // ["Sun","Mon","Wed"]
  }).index("by_user", ["userId"]),

  // ---------
  // البرامج
  // ---------
  programs: defineTable({
    name: v.string(),
    description: v.string(),
    duration: v.string(),
    targetAge: v.string(),
    maxStudents: v.number(),
    currentStudents: v.number(),
    teacherId: v.optional(v.id("teachers")),
    schedule: v.string(),
    isActive: v.boolean(),
  }).index("by_teacher", ["teacherId"]),

  // -----------
  // الحضور
  // -----------
  attendance: defineTable({
    studentId: v.optional(v.id("students")),
    teacherId: v.optional(v.id("teachers")),
    program: v.optional(v.string()),
    date: v.string(), // YYYY-MM-DD
    status: v.string(), // حاضر | غائب | متأخر ...
    notes: v.optional(v.string()),
    timestamp: v.number(),
    type: v.string(), // "student" | "teacher"
    checkInTime: v.optional(v.string()),
    checkOutTime: v.optional(v.string()),
  })
    .index("by_student_date", ["studentId", "date"])
    .index("by_teacher_date", ["teacherId", "date"])
    .index("by_program_date", ["program", "date"])
    .index("by_type_date", ["type", "date"])
    .index("by_date", ["date"])
    .index("by_status_date", ["status", "date"]),

  // -------------
  // التقييمات
  // -------------
  evaluations: defineTable({
    studentId: v.id("students"),
    teacherId: v.id("teachers"),
    program: v.string(),

    evaluationType: v.string(),

    surahFrom: v.string(),
    surahTo: v.optional(v.string()),
    ayahFrom: v.optional(v.number()),
    ayahTo: v.optional(v.number()),

    newMemorizationGrade: v.optional(v.string()),
    reviewGrade: v.optional(v.string()),

    overallGrade: v.string(),
    notes: v.optional(v.string()),
    strengths: v.optional(v.string()),
    improvements: v.optional(v.string()),
    date: v.string(),
    timestamp: v.number(),

    todayTasks: v.optional(
      v.object({
        newMem: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            grade: v.optional(v.string()),
          })
        ),
        reviewNear: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            grade: v.optional(v.string()),
          })
        ),
        reviewFar: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            grade: v.optional(v.string()),
          })
        ),
      })
    ),

    nextTasks: v.optional(
      v.object({
        newMem: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            targetGrade: v.optional(v.string()),
          })
        ),
        reviewNear: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            targetGrade: v.optional(v.string()),
          })
        ),
        reviewFar: v.optional(
          v.object({
            surahFrom: v.string(),
            ayahFrom: v.optional(v.number()),
            surahTo: v.optional(v.string()),
            ayahTo: v.optional(v.number()),
            targetGrade: v.optional(v.string()),
          })
        ),
      })
    ),

    tajweedRule: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_teacher", ["teacherId"])
    .index("by_student_date", ["studentId", "date"]),

  // -------------
  // المسابقات
  // -------------
  competitions: defineTable({
    title: v.string(),
    description: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    prizes: v.array(v.string()),
    rules: v.string(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  // -----------
  // الفيديوهات
  // -----------
  videos: defineTable({
    title: v.string(),
    description: v.string(),
    videoUrl: v.string(),
    category: v.string(),
    views: v.number(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  // ---------------------
  // مكتبة المصادر التعليمية
  // ---------------------
  resources: defineTable({
    title: v.string(),
    description: v.string(),
    type: v.string(), // "pdf" | "book" | "article" | "audio" | "other"
    fileStorageId: v.optional(v.id("_storage")), // ملف مرفوع مباشرة
    fileUrl: v.optional(v.string()), // رابط خارجي
    externalLink: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")), // صورة الغلاف
    category: v.string(), // "تفسير" | "تجويد" | "سيرة" | "فقه" | "عام"
    author: v.optional(v.string()),
    downloads: v.number(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),

  // ----------
  // الإعدادات
  // ----------
  settings: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // ---------------------------
  // طلبات التسجيل/الاشتراك
  // ---------------------------
  requests: defineTable({
    type: v.string(),
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    userPhone: v.optional(v.string()),

    programId: v.optional(v.id("programs")),
    programName: v.optional(v.string()),

    competitionId: v.optional(v.id("competitions")),
    competitionTitle: v.optional(v.string()),

    status: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
    processedBy: v.optional(v.id("users")),
  })
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // -----------
  // محادثات المساعد الذكي
  // -----------
  aiChats: defineTable({
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),

  // -----------
  // إعدادات الفوتر
  // -----------
  footerSettings: defineTable({
    address: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    workingHours: v.string(),
    backgroundColor: v.string(),
    socialLinks: v.object({
      youtube: v.optional(v.string()),
      instagram: v.optional(v.string()),
      whatsapp: v.optional(v.string()),
      twitter: v.optional(v.string()),
    }),
    quickLinks: v.array(
      v.object({
        title: v.string(),
        subtitle: v.string(),
      })
    ),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
