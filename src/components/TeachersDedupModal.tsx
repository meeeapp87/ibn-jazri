import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function TeachersDedupModal({ onClose }: { onClose: () => void }) {
  const [includeInactive, setIncludeInactive] = useState(true);
  const [mode, setMode] = useState<"strict_name_phone" | "name_only">(
    "strict_name_phone"
  );

  const groups =
    useQuery(api.teachersDedupPreview.previewDuplicateTeachers, {
      mode,
      includeInactive,
      minCount: 2,
    }) || [];

  const mergeGroup = useMutation(api.teachersDedupMerge.mergeOneDuplicateGroup);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const selectedGroup = useMemo(() => {
    return (groups as any[]).find((g) => g.key === selectedKey) || null;
  }, [groups, selectedKey]);

  const [keepId, setKeepId] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);

  const initGroup = (g: any) => {
    setSelectedKey(g.key);
    setKeepId(String(g.suggestedKeepId));
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
    !!selectedGroup &&
    !!keepId &&
    selectedIds.length >= 2 &&
    selectedIds.includes(keepId);

  const keepItem = useMemo(() => {
    if (!selectedGroup) return null;
    return (selectedGroup.items || []).find(
      (it: any) => String(it.id) === String(keepId)
    );
  }, [selectedGroup, keepId]);

  const toDeleteItems = useMemo(() => {
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
      ? `KEEP: ${keepItem.name || "—"} | ${keepItem.email || "—"} | ${
          keepItem.phone || "—"
        }`
      : `KEEP: ${keepId}`;

    const deleteLines =
      toDeleteItems.length === 0
        ? "(لا يوجد)"
        : toDeleteItems
            .map((x: any, i: number) => {
              return `${i + 1}) ${x.name || "—"} | ${x.email || "—"} | ${
                x.phone || "—"
              }`;
            })
            .join("\n");

    return (
      "⚠️ تأكيد الدمج\n\n" +
      "سيتم أولاً نقل بيانات المحفّظ إلى سجل KEEP:\n" +
      "- Attendance (المسجل بواسطة المحفّظ)\n" +
      "- Evaluations\n" +
      "- Programs (إن وجد)\n\n" +
      keepLine +
      "\n\n" +
      (hardDelete
        ? "ثم سيتم حذف السجلات التالية نهائيًا (Hard delete):\n"
        : "ثم سيتم تعطيل السجلات التالية (لن تظهر عادةً في القوائم):\n") +
      deleteLines +
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
        } | attendance=${res?.movedAttendance ?? 0} | programs=${
          res?.movedPrograms ?? 0
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

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
          <div>
            <h3 className="text-xl font-extrabold text-emerald-800">
              🧹 دمج المحفظين
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              لا يتم أي دمج تلقائي. أنت تختار Keep ثم تضغط دمج.
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
                سيتم نقل: <b>Evaluations</b> و <b>Attendance المسجل بواسطة المحفّظ</b>{" "}
                إلى سجل (Keep).
              </li>
              <li>
                عند تفعيل <b>الحذف النهائي</b> سيتم حذف السجلات المحددة نهائيًا بعد
                النقل.
              </li>
              <li>
                يمكنك اختيار <b>Name only</b> لعرض تكرارات الاسم حتى لو اختلف الهاتف.
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

            <div className="flex items-center gap-2">
              <select
                className="border rounded-lg px-3 py-2"
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
              >
                <option value="strict_name_phone">Strict: الاسم + الهاتف</option>
                <option value="name_only">Name only: الاسم فقط</option>
              </select>
              <div className="text-sm text-gray-600">
                المجموعات:{" "}
                <span className="font-bold text-emerald-800">
                  {(groups as any[]).length}
                </span>
              </div>
            </div>
          </div>

          {(groups as any[]).length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-10 text-center">
              <div className="text-5xl mb-3">✅</div>
              <div className="text-gray-700 font-semibold">
                لا توجد مجموعات مكررة مطابقة حسب الوضع الحالي.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border rounded-2xl p-4">
                <div className="text-sm font-bold text-gray-800 mb-3">
                  المجموعات
                </div>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {(groups as any[]).map((g) => (
                    <button
                      key={g.key}
                      onClick={() => initGroup(g)}
                      className={
                        "w-full text-right p-3 rounded-xl border transition-all " +
                        (selectedKey === g.key
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-white hover:bg-gray-50 border-gray-200")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-gray-800">{g.label}</div>
                        <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                          {g.ids?.length ?? 0} سجلات
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Keep المقترح: {String(g.suggestedKeepId).slice(0, 10)}…
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border rounded-2xl p-4">
                <div className="text-sm font-bold text-gray-800 mb-3">
                  تفاصيل المجموعة
                </div>
                {!selectedGroup ? (
                  <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-600">
                    اختر مجموعة من اليسار
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <div className="text-xs text-emerald-800 font-bold mb-2">
                        اختر السجل الأساسي (Keep)
                      </div>
                      <select
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                        value={keepId}
                        onChange={(e) => setKeepId(e.target.value)}
                      >
                        {(selectedGroup.items || []).map((it: any) => (
                          <option key={String(it.id)} value={String(it.id)}>
                            {it.name} — {it.email || "—"} — {it.phone || "—"}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-gray-600 mt-2">
                        سيتم نقل Evaluations + Attendance المسجل بواسطة المحفّظ + Programs
                        إلى هذا السجل.
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={hardDelete}
                          onChange={(e) => setHardDelete(e.target.checked)}
                        />
                        حذف نهائي للسجلات المكررة (Hard delete) بعد النقل
                      </label>
                      <div className="text-xs text-gray-600">
                        المحدد: <span className="font-bold">{selectedIds.length}</span>{" "}
                        — لازم 2 أو أكثر + Keep ضمن المحدد
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-gray-700 bg-gray-100">
                            <th className="p-3 rounded-r-xl">دمج</th>
                            <th className="p-3">الاسم</th>
                            <th className="p-3">الإيميل</th>
                            <th className="p-3 rounded-l-xl">الهاتف</th>
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
                                className={
                                  "bg-white border shadow-sm " +
                                  (isKeep ? "ring-2 ring-emerald-200" : "")
                                }
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
                                    <span className="text-emerald-700">(Keep)</span>
                                  )}
                                </td>
                                <td className="p-3">{it.email || "—"}</td>
                                <td className="p-3 rounded-l-xl">{it.phone || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={doMerge}
                        disabled={!canMerge || busy}
                        className={
                          "px-4 py-2 rounded-xl font-bold text-white transition-all " +
                          (!canMerge || busy
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700")
                        }
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
