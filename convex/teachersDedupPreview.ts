import { query } from "./_generated/server";
import { v } from "convex/values";

function norm(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export const previewDuplicateTeachers = query({
  args: {
    mode: v.optional(v.string()), // "strict_name_phone" | "name_only"
    includeInactive: v.optional(v.boolean()),
    minCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const mode = (args.mode || "strict_name_phone") as string;
    const includeInactive = args.includeInactive ?? true;
    const minCount = args.minCount ?? 2;

    let all = await ctx.db.query("teachers").collect();
    if (!includeInactive) all = all.filter((t) => !!t.isActive);

    const groups = new Map<string, any[]>();

    for (const t of all) {
      const name = norm(t.name || "");
      const phone = norm(t.phone || "");
      const key = mode === "name_only" ? name : (name + "|" + phone);
      if (!key) continue;
      const arr = groups.get(key) || [];
      arr.push(t);
      groups.set(key, arr);
    }

    const out: any[] = [];
    for (const [key, items] of groups.entries()) {
      if ((items?.length || 0) < minCount) continue;

      // اقتراح Keep: الأحدث (creationTime أكبر) أو أول سجل
      const sorted = [...items].sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));
      const keep = sorted[0];

      const labelName = (items[0]?.name || "").trim() || "(بدون اسم)";
      const labelPhone = (items[0]?.phone || "").trim();
      const label = mode === "name_only" ? labelName : (labelName + " — " + (labelPhone || "(بدون هاتف)"));

      out.push({
        key,
        label,
        suggestedKeepId: keep._id,
        ids: items.map((x) => x._id),
        items: items.map((x) => ({
          id: x._id,
          name: x.name,
          phone: x.phone,
          specialization: x.specialization,
          experience: x.experience,
          isActive: x.isActive,
          created: x._creationTime,
        })),
      });
    }

    // ترتيب: الأكثر تكراراً أولاً
    out.sort((a, b) => (b.ids?.length || 0) - (a.ids?.length || 0));
    return out;
  },
});
