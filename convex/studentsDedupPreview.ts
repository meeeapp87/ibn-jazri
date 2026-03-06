// convex/studentsDedupPreview.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

type Mode = "strict_name_phone" | "name_only";

function normalizePhone(x?: string) {
  return String(x || "").replace(/[^\d]/g, "");
}

// تنظيف عربي بسيط: إزالة التشكيل + توحيد بعض الحروف + مسافات
function normalizeName(input?: string) {
  let s = String(input || "").trim().toLowerCase();

  // remove Arabic diacritics
  s = s.replace(/[\u064B-\u0652\u0670]/g, "");

  // normalize Arabic letters
  s = s
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");

  // remove punctuation/symbols, keep letters/numbers/spaces
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");

  // collapse spaces
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

export const previewDuplicateStudents = query({
  args: {
    mode: v.union(v.literal("strict_name_phone"), v.literal("name_only")),
    includeInactive: v.boolean(),
    minCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minCount = args.minCount ?? 2;

    // ✅ نجيب كل الطلاب
    const all = await ctx.db.query("students").collect();

    // ✅ فلترة inactive لو المستخدم لا يريدهم
    const students = args.includeInactive ? all : all.filter((s) => s.isActive);

    const map = new Map<
      string,
      {
        key: string;
        label: string;
        ids: string[];
        suggestedKeepId: string;
        items: Array<{
          id: string;
          name: string;
          phone: string;
          level: string;
          enrollmentDate: number;
          isActive: boolean;
        }>;
      }
    >();

    // مقياس بسيط لاختيار Keep: (نشط أولًا) ثم الأقدم تسجيلًا
    const pickKeep = (items: any[]) => {
      const sorted = [...items].sort((a, b) => {
        const ax = a.isActive ? 1 : 0;
        const bx = b.isActive ? 1 : 0;
        if (ax !== bx) return bx - ax; // active first
        return (a.enrollmentDate || 0) - (b.enrollmentDate || 0); // older first
      });
      return sorted[0]?._id;
    };

    for (const s of students as any[]) {
      const nameNorm = normalizeName(s.name);
      const phoneNorm = normalizePhone(s.phone);

      // تجاهل سجلات ناقصة جدًا
      if (!nameNorm) continue;

      let key = "";
      if (args.mode === "strict_name_phone") {
        if (!phoneNorm) continue; // strict لازم هاتف
        key = `${nameNorm}__${phoneNorm}`;
      } else {
        // name_only (تحذير فقط)
        key = `${nameNorm}`;
      }

      const row = map.get(key);
      const item = {
        id: String(s._id),
        name: s.name || "",
        phone: s.phone || "",
        level: s.level || "",
        enrollmentDate: s.enrollmentDate || 0,
        isActive: !!s.isActive,
      };

      if (!row) {
        map.set(key, {
          key,
          label:
            args.mode === "strict_name_phone"
              ? `${s.name || "—"} | ${s.phone || "—"}`
              : `${s.name || "—"} (اسم فقط)`,
          ids: [String(s._id)],
          suggestedKeepId: String(s._id),
          items: [item],
        });
      } else {
        row.ids.push(String(s._id));
        row.items.push(item);
      }
    }

    const groups = Array.from(map.values())
      .filter((g) => (g.ids?.length ?? 0) >= minCount)
      .map((g) => {
        const keep = pickKeep(
          g.items.map((x) => ({
            _id: x.id,
            isActive: x.isActive,
            enrollmentDate: x.enrollmentDate,
          }))
        );
        return {
          ...g,
          suggestedKeepId: String(keep || g.suggestedKeepId),
        };
      })
      .sort((a, b) => (b.ids?.length ?? 0) - (a.ids?.length ?? 0));

    return groups;
  },
});
