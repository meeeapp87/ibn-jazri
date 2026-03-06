import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type Mode =
  | "strict_name_phone"
  | "name_only" // ✅ تحذير فقط (لن يدمج إلا يدويًا)
  | "name_phone_loose"; // (احتياطي للمستقبل)

export function StudentsDedupModal({ onClose }: { onClose: () => void }) {
  const [includeInactive, setIncludeInactive] = useState(true);
  const [hardDelete, setHardDelete] = useState(false);

  // ✅ وضع الدمج الحقيقي (صارم)
  const strictGroups =
    useQuery(api.studentsDedupPreview.previewDuplicateStudents, {
      mode: "strict_name_phone",
      includeInactive,
      minCount: 2,
    }) || [];

  // ✅ وضع التحذير فقط (بالاسم بعد تنظيف)
  const suspiciousNameOnlyGroups =
    useQuery(api.studentsDedupPreview.previewDuplicateStudents, {
      mode: "name_only",
      includeInactive,
      minCount: 2,
    }) || [];

  const mergeGroup = useMutation(api.studentsDedupMerge.mergeOneDuplicateGroup);

  // ✅ ندمج القائمتين للعرض، لكن نميّز بينهم
  const groups = useMemo(() => {
    const strict = (strictGroups as any[]).map((g) => ({
      ...g,
      __kind: "strict" as const,
    }));

    const suspicious = (suspiciousNameOnlyGroups as any[]).map((g) => ({
      ...g,
      __kind: "suspicious" as const,
    }));

    return { strict, suspicious };
  }, [strictGroups, suspiciousNameOnlyGroups]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedKind, setSelectedKind] = useState<"strict" | "suspicious">(
    "strict"
  );

  const selectedGroup = useMemo(() => {
    const src = selectedKind === "strict" ? groups.strict : groups.suspicious;
    return (src as any[]).find((g) => g.key === selectedKey) || null;
  }, [groups, selectedKey, selectedKind]);

  const [keepId, setKeepId] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const initGroup = (g: any, kind: "strict" | "suspicious") => {
    setSelectedKind(kind);
    setSelectedKey(g.key);

    setKeepId(String(g.suggestedKeepId || ""));
    const next: Record<string, boolean> = {};
    for (const it of g.items || []) next[String(it.id)] = true;
    setChecked(next);
  };

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedIds = useMemo(() => {
    return Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [checked]);

  const canMerge =
    selectedGroup &&
    keepId &&
    selectedIds.length >= 2 &&
    selectedIds.includes(keepId);

  const keepItem = useMemo(() => {
    if (!selectedGroup) return null;
    return (selectedGroup.items || []).find(
      (it: any) => String(it.id) === String(keepId)
    );
  }, [selectedGroup, keepId]);

  const toRemoveItems = useMemo(() => {
    if (!selectedGroup) return [];
    const map = new Map<string, any>();
    for (const it of selectedGroup.items || []) map.set(String(it.id), it);
    return selectedIds
      .filter((id) => id !== keepId)
      .map((id) => map.get(String(id)))
      .filter(Boolean);
  }, [selectedGroup, selectedIds, keepId]);

  const buildConfirmText = () => {
    const keepLine = keepItem
      ? `KEEP: ${keepItem.name || "—"} | ${keepItem.phone || "—"} | ${
          keepItem.level || "—"
        }`
      : `KEEP: ${keepId}`;

    const removeLines =
      toRemoveItems.length === 0
        ? "(لا يوجد)"
        : toRemoveItems
            .map((x: any, i: number) => {
              return `${i + 1}) ${x.name || "—"} | ${x.phone || "—"} | ${
                x.level || "—"
              }`;
            })
            .join("\n");

    const header =
      selectedKind === "strict"
        ? "⚠️ تأكيد دمج (مطابقة صارمة)"
        : "⚠️ تأكيد دمج (تحذير: اسم فقط)";

    const warningNameOnly =
      selectedKind === "suspicious"
        ? "\n\n⚠️ ملاحظة مهمة: هذه المجموعة مبنية على (الاسم فقط)، راجع الهاتف والتفاصيل جيدًا قبل المتابعة."
        : "";

    return (
      header +
      "\n\n" +
      "سيتم أولاً نقل بيانات الطالب إلى سجل KEEP:\n" +
      "- Attendance\n" +
      "- Evaluations\n\n" +
      keepLine +
      "\n\n" +
      (hardDelete
        ? "ثم سيتم حذف السجلات التالية نهائيًا (Hard delete):\n"
        : "ثم سيتم تعطيل السجلات التالية (لن تظهر عادةً في القوائم):\n") +
      removeLines +
      warningNameOnly +
      "\n\nهل تريد المتابعة؟"
    );
  };

  const doMerge = async () => {
    if (!canMerge) {
      toast.error("لازم تختار (Keep) ويكون ضمن المحدد + تختار 2 سجلات أو أكثر");
      return;
    }

    const ok = window.confirm(buildConfirmText());
    if (!ok) return;

    setBusy(true);
    try {
      const res: any = await mergeGroup({
        keepId: keepId as any,
        mergeIds: selectedIds as any,
        hardDelete,
      });

      toast.success(
        `تم الدمج ✅ merged=${res?.merged ?? 0} | evaluations=${
          res?.movedEvaluations ?? 0
        } | attendance=${res?.movedAttendance ?? 0} | hardDelete=${
          res?.hardDelete ? "yes" : "no"
        }`
      );

      setSelectedKey("");
      setKeepId("");
      setChecked({});
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الدمج");
    } finally {
      setBusy(false);
    }
  };

  const selectedBadge =
    selectedKind === "strict"
      ? "✅ مطابقة صارمة (اسم + هاتف)"
      : "⚠️ تحذير (اسم فقط / مشابه)";

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
          <div>
            <h3 className="text-xl font-extrabold text-amber-800">
              🧹 دمج الطلاب المكررين
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              ✅ المطابقات الصارمة يمكن دمجها.{" "}
              <span className="font-bold text-rose-700">
                ⚠️ التحذيرات (اسم فقط) لن تُدمج إلا بتأكيد منك.
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
            <div className="font-bold mb-1">⚠️ تحذير مهم</div>
            <ul className="list-disc pr-5 space-y-1">
              <li>
                سيتم نقل: <b>Evaluations</b> و <b>Attendance</b> إلى سجل (Keep).
              </li>
              <li>
                عند تفعيل <b>الحذف النهائي</b> سيتم حذف السجلات المحددة نهائيًا بعد
                النقل (وبالتالي لن تظهر نهائيًا مرة أخرى).
              </li>
              <li>
                المدمج لا يحدث إلا بعد الضغط على زر <b>دمج المحدد</b> ثم تأكيد النافذة.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              عرض السجلات غير النشطة أيضًا
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
              />
              حذف نهائي للسجلات المكررة (Hard delete)
            </label>

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                ✅ صارمة:{" "}
                <span className="font-bold text-emerald-800">
                  {(groups.strict as any[]).length}
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
                ⚠️ تحذيرات:{" "}
                <span className="font-bold text-rose-800">
                  {(groups.suspicious as any[]).length}
                </span>
              </div>
            </div>
          </div>

          {(groups.strict as any[]).length === 0 &&
          (groups.suspicious as any[]).length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-10 text-center">
              <div className="text-5xl mb-3">✅</div>
              <div className="text-gray-700 font-semibold">
                لا توجد مجموعات مكررة (صارمة أو تحذيرية) حسب الفلاتر الحالية.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-gray-800">
                      ✅ مطابقات صارمة (اسم + هاتف)
                    </div>
                    <div className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-bold">
                      {(groups.strict as any[]).length}
                    </div>
                  </div>

                  {(groups.strict as any[]).length === 0 ? (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4">
                      لا توجد مطابقات صارمة.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[26vh] overflow-y-auto pr-1">
                      {(groups.strict as any[]).map((g) => (
                        <button
                          key={g.key}
                          onClick={() => initGroup(g, "strict")}
                          className={`w-full text-right p-3 rounded-xl border transition-all ${
                            selectedKey === g.key && selectedKind === "strict"
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-white hover:bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-gray-800">
                              {g.label}
                            </div>
                            <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                              {g.ids?.length ?? 0} سجلات
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Keep المقترح:{" "}
                            {String(g.suggestedKeepId).slice(0, 10)}…
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-rose-700">
                      ⚠️ تحذيرات (اسم فقط / مشابه)
                    </div>
                    <div className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full font-bold">
                      {(groups.suspicious as any[]).length}
                    </div>
                  </div>

                  <div className="text-[12px] text-gray-600 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-3">
                    هذه القائمة هدفها التنبيه فقط.{" "}
                    <span className="font-bold text-rose-700">
                      لن يتم الدمج تلقائيًا
                    </span>{" "}
                    وستظهر نافذة تأكيد بأسماء السجلات قبل الدمج.
                  </div>

                  {(groups.suspicious as any[]).length === 0 ? (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4">
                      لا توجد تحذيرات بالاسم فقط.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[26vh] overflow-y-auto pr-1">
                      {(groups.suspicious as any[]).map((g) => (
                        <button
                          key={g.key}
                          onClick={() => initGroup(g, "suspicious")}
                          className={`w-full text-right p-3 rounded-xl border transition-all ${
                            selectedKey === g.key &&
                            selectedKind === "suspicious"
                              ? "bg-rose-50 border-rose-300"
                              : "bg-white hover:bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-gray-800">
                              {g.label}
                            </div>
                            <div className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-1 rounded-full">
                              {g.ids?.length ?? 0} سجلات
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ⚠️ (اسم فقط) — راجع الهاتف جيدًا قبل الدمج
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-gray-800">
                    تفاصيل المجموعة
                  </div>
                  {selectedGroup && (
                    <div
                      className={`text-xs px-3 py-1 rounded-full font-bold ${
                        selectedKind === "strict"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {selectedBadge}
                    </div>
                  )}
                </div>

                {!selectedGroup ? (
                  <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-600">
                    اختر مجموعة من اليسار
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <div className="text-xs text-amber-800 font-bold mb-2">
                        اختر السجل الأساسي (Keep)
                      </div>
                      <select
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                        value={keepId}
                        onChange={(e) => setKeepId(e.target.value)}
                      >
                        {(selectedGroup.items || []).map((it: any) => (
                          <option key={String(it.id)} value={String(it.id)}>
                            {it.name} — {it.phone} — {it.level}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-gray-600 mt-2">
                        سيتم نقل evaluations و attendance إلى هذا السجل، ثم{" "}
                        {hardDelete ? "حذف" : "تعطيل"} السجلات الأخرى.
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-gray-700 bg-gray-100">
                            <th className="p-3 rounded-r-xl">دمج</th>
                            <th className="p-3">الاسم</th>
                            <th className="p-3">الهاتف</th>
                            <th className="p-3">المستوى</th>
                            <th className="p-3 rounded-l-xl">تاريخ التسجيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedGroup.items || []).map((it: any) => {
                            const id = String(it.id);
                            const isKeep = id === keepId;
                            const checkedVal = !!checked[id];
                            return (
                              <tr
                                key={id}
                                className={`bg-white border shadow-sm ${
                                  isKeep ? "ring-2 ring-amber-200" : ""
                                }`}
                              >
                                <td className="p-3 rounded-r-xl">
                                  <input
                                    type="checkbox"
                                    checked={checkedVal}
                                    onChange={() => toggle(id)}
                                  />
                                </td>
                                <td className="p-3 font-semibold text-gray-800">
                                  {it.name}{" "}
                                  {isKeep && (
                                    <span className="text-amber-700">(Keep)</span>
                                  )}
                                </td>
                                <td className="p-3">{it.phone}</td>
                                <td className="p-3">{it.level}</td>
                                <td className="p-3 rounded-l-xl text-xs text-gray-600">
                                  {it.enrollmentDate}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-gray-600">
                        المحدد:{" "}
                        <span className="font-bold text-gray-900">
                          {selectedIds.length}
                        </span>{" "}
                        — لازم 2 أو أكثر + Keep ضمن المحدد
                      </div>
                      <button
                        onClick={doMerge}
                        disabled={!canMerge || busy}
                        className={`px-4 py-2 rounded-xl font-bold text-white transition-all ${
                          !canMerge || busy
                            ? "bg-gray-300 cursor-not-allowed"
                            : selectedKind === "strict"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-rose-600 hover:bg-rose-700"
                        }`}
                      >
                        {busy ? "جاري الدمج..." : "✅ دمج المحدد"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
