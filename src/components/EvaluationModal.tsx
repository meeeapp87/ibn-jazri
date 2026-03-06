import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

const SURAHS = [
  "القرآن كاملاً",
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

type Task = {
  surahFrom: string;
  ayahFrom?: number;
  surahTo?: string;
  ayahTo?: number;
  grade?: string;
};

type NextTask = {
  surahFrom: string;
  ayahFrom?: number;
  surahTo?: string;
  ayahTo?: number;
};

type TodayTasks = {
  newMem?: Task;
  reviewNear?: Task;
  reviewFar?: Task;
};

type NextTasks = {
  newMem?: NextTask;
  reviewNear?: NextTask;
  reviewFar?: NextTask;
};

function fmtAyah(n?: number) {
  return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

function buildRangeText(t?: { surahFrom?: string; ayahFrom?: number; surahTo?: string; ayahTo?: number }) {
  if (!t?.surahFrom) return "";
  const from = `${t.surahFrom}${t.ayahFrom ? `:${t.ayahFrom}` : ""}`;
  const toSurah = t.surahTo || t.surahFrom;
  const to = `${toSurah}${t.ayahTo ? `:${t.ayahTo}` : ""}`;
  return from === to ? from : `${from} → ${to}`;
}

function badge(key: "newMem" | "reviewNear" | "reviewFar") {
  if (key === "newMem") return "bg-green-100 text-green-800 border-green-200";
  if (key === "reviewNear") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function labelToday(key: keyof TodayTasks) {
  if (key === "newMem") return "حفظ جديد";
  if (key === "reviewNear") return "مراجعة قريبة";
  return "مراجعة بعيدة";
}

function labelNext(key: keyof NextTasks) {
  if (key === "newMem") return "مهمة قادمة: حفظ جديد";
  if (key === "reviewNear") return "مهمة قادمة: مراجعة قريبة";
  return "مهمة قادمة: مراجعة بعيدة";
}

function RangeRow({
  title,
  fromSurah,
  setFromSurah,
  fromAyah,
  setFromAyah,
  toSurah,
  setToSurah,
  toAyah,
  setToAyah,
  showGrade,
  grade,
  setGrade,
}: {
  title: string;
  fromSurah: string;
  setFromSurah: (v: string) => void;
  fromAyah: string;
  setFromAyah: (v: string) => void;
  toSurah: string;
  setToSurah: (v: string) => void;
  toAyah: string;
  setToAyah: (v: string) => void;
  showGrade?: boolean;
  grade?: string;
  setGrade?: (v: string) => void;
}) {
  return (
    <div className="border rounded-xl p-3 bg-white">
      <h5 className="font-bold text-gray-800 text-sm mb-2">{title}</h5>

      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">من سورة</label>
          <select
            value={fromSurah}
            onChange={(e) => setFromSurah(e.target.value)}
            className="border rounded-lg px-3 py-2 min-w-[160px]"
          >
            {SURAHS.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">من الآية</label>
          <input
            value={fromAyah}
            onChange={(e) => setFromAyah(e.target.value)}
            className="border rounded-lg px-3 py-2 w-24 text-center"
            placeholder="1"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">إلى سورة</label>
          <select
            value={toSurah}
            onChange={(e) => setToSurah(e.target.value)}
            className="border rounded-lg px-3 py-2 min-w-[160px]"
          >
            <option value="">— نفس السورة —</option>
            {SURAHS.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">إلى الآية</label>
          <input
            value={toAyah}
            onChange={(e) => setToAyah(e.target.value)}
            className="border rounded-lg px-3 py-2 w-24 text-center"
            placeholder="10"
          />
        </div>

        {showGrade && setGrade ? (
          <div className="min-w-[180px]">
            <label className="text-xs text-gray-600 mb-1 block">التقدير</label>
            <select
              value={grade || ""}
              onChange={(e) => setGrade(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">— لا يوجد —</option>
              <option value="ممتاز">ممتاز</option>
              <option value="جيد جدا">جيد جدا</option>
              <option value="جيد">جيد</option>
              <option value="يحتاج متابعة">يحتاج متابعة</option>
              <option value="إعادة">إعادة</option>
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EvaluationModal({
  studentId,
  studentName,
  program,
  onClose,
}: {
  studentId: string;
  studentName: string;
  program: string;
  onClose: () => void;
}) {
  const createEval = useMutation(api.evaluations.createEvaluation);

  const recent = useQuery(api.evaluations.getStudentEvaluations, {
    studentId: studentId as any,
    limit: 20,
  }) as any[] | undefined;

  const lastEval = useMemo(() => (recent && recent.length ? recent[0] : null), [recent]);

  // today row (one of 3) + grades
  const [type, setType] = useState<"new" | "review_near" | "review_far">("new");
  const [fromSurah, setFromSurah] = useState("الفاتحة");
  const [toSurah, setToSurah] = useState<string | "">("");
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");
  const [gradeNew, setGradeNew] = useState("");
  const [gradeReview, setGradeReview] = useState("");

  // next 3 rows
  const [nxNewFromSurah, setNxNewFromSurah] = useState("الفاتحة");
  const [nxNewFromAyah, setNxNewFromAyah] = useState("");
  const [nxNewToSurah, setNxNewToSurah] = useState<string | "">("");
  const [nxNewToAyah, setNxNewToAyah] = useState("");

  const [nxNearFromSurah, setNxNearFromSurah] = useState("الفاتحة");
  const [nxNearFromAyah, setNxNearFromAyah] = useState("");
  const [nxNearToSurah, setNxNearToSurah] = useState<string | "">("");
  const [nxNearToAyah, setNxNearToAyah] = useState("");

  const [nxFarFromSurah, setNxFarFromSurah] = useState("الفاتحة");
  const [nxFarFromAyah, setNxFarFromAyah] = useState("");
  const [nxFarToSurah, setNxFarToSurah] = useState<string | "">("");
  const [nxFarToAyah, setNxFarToAyah] = useState("");

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [markAttendance, setMarkAttendance] = useState(true);

  function fillNextFromLastEval() {
    const t: NextTasks | undefined = lastEval?.nextTasks;
    if (!t) return;

    if (t.newMem?.surahFrom) setNxNewFromSurah(t.newMem.surahFrom);
    setNxNewFromAyah(fmtAyah(t.newMem?.ayahFrom));
    setNxNewToSurah(t.newMem?.surahTo || "");
    setNxNewToAyah(fmtAyah(t.newMem?.ayahTo));

    if (t.reviewNear?.surahFrom) setNxNearFromSurah(t.reviewNear.surahFrom);
    setNxNearFromAyah(fmtAyah(t.reviewNear?.ayahFrom));
    setNxNearToSurah(t.reviewNear?.surahTo || "");
    setNxNearToAyah(fmtAyah(t.reviewNear?.ayahTo));

    if (t.reviewFar?.surahFrom) setNxFarFromSurah(t.reviewFar.surahFrom);
    setNxFarFromAyah(fmtAyah(t.reviewFar?.ayahFrom));
    setNxFarToSurah(t.reviewFar?.surahTo || "");
    setNxFarToAyah(fmtAyah(t.reviewFar?.ayahTo));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const today = new Date().toISOString().slice(0, 10);

    const todayTasks: any = {};
    if (type === "new" && fromSurah) {
      todayTasks.newMem = {
        surahFrom: fromSurah,
        ayahFrom: fromAyah ? Number(fromAyah) : undefined,
        surahTo: toSurah || undefined,
        ayahTo: toAyah ? Number(toAyah) : undefined,
        grade: gradeNew || undefined,
      };
    } else if (type === "review_near" && fromSurah) {
      todayTasks.reviewNear = {
        surahFrom: fromSurah,
        ayahFrom: fromAyah ? Number(fromAyah) : undefined,
        surahTo: toSurah || undefined,
        ayahTo: toAyah ? Number(toAyah) : undefined,
        grade: gradeReview || undefined,
      };
    } else if (type === "review_far" && fromSurah) {
      todayTasks.reviewFar = {
        surahFrom: fromSurah,
        ayahFrom: fromAyah ? Number(fromAyah) : undefined,
        surahTo: toSurah || undefined,
        ayahTo: toAyah ? Number(toAyah) : undefined,
        grade: gradeReview || undefined,
      };
    }

    const nextTasks: any = {};
    const hasAny = (s: string, a: string, ts: string, ta: string) => !!(s?.trim() || a?.trim() || ts?.trim() || ta?.trim());

    if (hasAny(nxNewFromSurah, nxNewFromAyah, nxNewToSurah, nxNewToAyah)) {
      nextTasks.newMem = {
        surahFrom: nxNewFromSurah,
        ayahFrom: nxNewFromAyah ? Number(nxNewFromAyah) : undefined,
        surahTo: nxNewToSurah || undefined,
        ayahTo: nxNewToAyah ? Number(nxNewToAyah) : undefined,
      };
    }
    if (hasAny(nxNearFromSurah, nxNearFromAyah, nxNearToSurah, nxNearToAyah)) {
      nextTasks.reviewNear = {
        surahFrom: nxNearFromSurah,
        ayahFrom: nxNearFromAyah ? Number(nxNearFromAyah) : undefined,
        surahTo: nxNearToSurah || undefined,
        ayahTo: nxNearToAyah ? Number(nxNearToAyah) : undefined,
      };
    }
    if (hasAny(nxFarFromSurah, nxFarFromAyah, nxFarToSurah, nxFarToAyah)) {
      nextTasks.reviewFar = {
        surahFrom: nxFarFromSurah,
        ayahFrom: nxFarFromAyah ? Number(nxFarFromAyah) : undefined,
        surahTo: nxFarToSurah || undefined,
        ayahTo: nxFarToAyah ? Number(nxFarToAyah) : undefined,
      };
    }

    await createEval({
      studentId: studentId as any,
      program,
      date: today,
      todayTasks: Object.keys(todayTasks).length ? todayTasks : undefined,
      nextTasks: Object.keys(nextTasks).length ? nextTasks : undefined,
      notes: notes || undefined,
      markAttendance,
    });

    toast.success("تم حفظ التقييم ✅");
    setSaving(false);
    onClose();
  }

  // ✅ كارت "المهمة القادمة" من آخر تقييم محفوظ
  const lastNextTasks = lastEval?.nextTasks as NextTasks | undefined;
  const nextTaskLines = useMemo(() => {
    if (!lastNextTasks) return [];
    const keys: (keyof NextTasks)[] = ["newMem", "reviewNear", "reviewFar"];
    return keys
      .map((k) => {
        const t = lastNextTasks[k];
        const range = buildRangeText(t);
        if (!range) return null;
        return { key: k as any, text: `${labelNext(k)} (${range})` };
      })
      .filter(Boolean) as Array<{ key: "newMem" | "reviewNear" | "reviewFar"; text: string }>;
  }, [lastNextTasks]);

  // ✅ آخر التقييمات: تجميع حسب اليوم (مربعات)
  const historyByDate = useMemo(() => {
    const map = new Map<string, Array<{ key: "newMem" | "reviewNear" | "reviewFar"; text: string }>>();
    if (!recent?.length) return [];

    const keys: (keyof TodayTasks)[] = ["newMem", "reviewNear", "reviewFar"];

    for (const ev of recent) {
      const date = ev?.date || "";
      const tasks = ev?.todayTasks as TodayTasks | undefined;
      if (!date || !tasks) continue;

      for (const k of keys) {
        const t = tasks[k];
        const range = buildRangeText(t);
        if (!range) continue;

        const line = { key: k as any, text: `${labelToday(k)} (${range})` };
        const arr = map.get(date) || [];
        arr.push(line);
        map.set(date, arr);
      }
    }

    // نحول لـ array مرتب تنازلي
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, lines]) => ({ date, lines }));
  }, [recent]);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-green-800">تقييم الطالب: {studentName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* ✅ المهمة القادمة */}
        <div className="border rounded-2xl p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold text-amber-900">المهمة القادمة (من تقييم اليوم السابق)</h4>
            <button
              type="button"
              onClick={fillNextFromLastEval}
              className="px-3 py-1 text-sm rounded-lg border border-amber-200 bg-white hover:bg-amber-100"
            >
              نسخ المهمة السابقة
            </button>
          </div>

          {nextTaskLines.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {nextTaskLines.map((x, i) => (
                <li key={i} className="text-amber-900">• {x.text}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-700">لا توجد مهمة قادمة محفوظة في آخر تقييم.</p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* نوع التقييم */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">نوع التقييم (اليوم)</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="border rounded-lg px-3 py-2">
              <option value="new">حفظ جديد</option>
              <option value="review_near">مراجعة قريبة</option>
              <option value="review_far">مراجعة بعيدة</option>
            </select>
          </div>

          {/* today row */}
          {type === "new" ? (
            <RangeRow
              title="ما تم اليوم: حفظ جديد"
              fromSurah={fromSurah}
              setFromSurah={setFromSurah}
              fromAyah={fromAyah}
              setFromAyah={setFromAyah}
              toSurah={toSurah}
              setToSurah={setToSurah}
              toAyah={toAyah}
              setToAyah={setToAyah}
              showGrade
              grade={gradeNew}
              setGrade={setGradeNew}
            />
          ) : (
            <RangeRow
              title={type === "review_near" ? "ما تم اليوم: مراجعة قريبة" : "ما تم اليوم: مراجعة بعيدة"}
              fromSurah={fromSurah}
              setFromSurah={setFromSurah}
              fromAyah={fromAyah}
              setFromAyah={setFromAyah}
              toSurah={toSurah}
              setToSurah={setToSurah}
              toAyah={toAyah}
              setToAyah={setToAyah}
              showGrade
              grade={gradeReview}
              setGrade={setGradeReview}
            />
          )}

          {/* next tasks */}
          <div className="border rounded-2xl p-4 bg-indigo-50 border-indigo-200 space-y-3">
            <h4 className="font-bold text-indigo-900">المهمة القادمة (تُكتب الآن لليوم التالي)</h4>

            <RangeRow
              title="مهمة قادمة: حفظ جديد"
              fromSurah={nxNewFromSurah}
              setFromSurah={setNxNewFromSurah}
              fromAyah={nxNewFromAyah}
              setFromAyah={setNxNewFromAyah}
              toSurah={nxNewToSurah}
              setToSurah={setNxNewToSurah}
              toAyah={nxNewToAyah}
              setToAyah={setNxNewToAyah}
            />

            <RangeRow
              title="مهمة قادمة: مراجعة قريبة"
              fromSurah={nxNearFromSurah}
              setFromSurah={setNxNearFromSurah}
              fromAyah={nxNearFromAyah}
              setFromAyah={setNxNearFromAyah}
              toSurah={nxNearToSurah}
              setToSurah={setNxNearToSurah}
              toAyah={nxNearToAyah}
              setToAyah={setNxNearToAyah}
            />

            <RangeRow
              title="مهمة قادمة: مراجعة بعيدة"
              fromSurah={nxFarFromSurah}
              setFromSurah={setNxFarFromSurah}
              fromAyah={nxFarFromAyah}
              setFromAyah={setNxFarFromAyah}
              toSurah={nxFarToSurah}
              setToSurah={setNxFarToSurah}
              toAyah={nxFarToAyah}
              setToAyah={setNxFarToAyah}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">ملاحظات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded-lg px-3 py-2 w-full h-20" />
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={markAttendance}
                onChange={(e) => setMarkAttendance(e.target.checked)}
                className="w-5 h-5 text-green-600 rounded"
              />
              <span className="text-sm font-bold text-green-800">✅ تسجيل حضور الطالب تلقائيًا</span>
            </label>
          </div>

          {/* ✅ آخر التقييمات - مربعات */}
          <div className="border rounded-2xl p-4 bg-gray-50">
            <h4 className="font-bold text-gray-800 mb-3">آخر التقييمات</h4>

            {historyByDate.length ? (
              <div className="space-y-3 max-h-64 overflow-auto">
                {historyByDate.map((g) => (
                  <div key={g.date} className="bg-white border rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 rounded-full border bg-gray-100 text-gray-700">
                        {g.date}
                      </span>
                      <span className="text-xs text-gray-500">تفاصيل اليوم</span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {g.lines.map((line, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${badge(line.key)}`}>
                            {labelToday(line.key)}
                          </span>
                          <span className="text-sm text-gray-800">{line.text.replace(/^.*?\s\(/, "(").replace(/\)$/, ")")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">لا يوجد تقييمات سابقة.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50">
              {saving ? "جارٍ الحفظ..." : "حفظ التقييم"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
