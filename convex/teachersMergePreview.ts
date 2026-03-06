import { query } from "./_generated/server";
import { v } from "convex/values";

export const listAllTeachersForMerge = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const includeInactive = !!args.includeInactive;
    const all = await ctx.db.query("teachers").collect();
    const rows = includeInactive ? all : all.filter((t: any) => (t.isActive ?? true) === true);
    // ترتيب: الأحدث
    rows.sort((a: any, b: any) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
    return rows.map((t: any) => ({
      id: t._id,
      name: t.name,
      phone: t.phone,
      specialization: t.specialization,
      experience: t.experience,
      isActive: (t.isActive ?? true) === true,
      userId: t.userId,
    }));
  },
});
