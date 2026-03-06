// src/components/PublicContent.tsx
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type PublicContentProps = {
  userRole: string;
  onRequestAuth?: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  guest: "زائر",
  student: "طالب",
  guardian: "ولي أمر",
  teacher: "محفظ",
  admin: "مشرف",
};

type ViewType =
  | "home"
  | "programs"
  | "competitions"
  | "videos"
  | "resources"
  | "program-details"
  | "competition-details";

/* ============================================================
   مودال تأكيد أنيق بدل confirm()
   ============================================================ */
function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[min(92vw,460px)] rounded-2xl bg-white shadow-xl border border-gray-100 p-6 text-right">
        {title && (
          <h3 className="text-lg font-bold mb-2 text-gray-900">{title}</h3>
        )}
        <p className="text-gray-700 mb-5">{message}</p>
        <div className="flex items-center gap-2 justify-start">
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* عنصر بادج صغير */
function Badge({ icon, text }: { icon?: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-[13px]">
      {icon && <span>{icon}</span>}
      <span className="font-medium">{text}</span>
    </span>
  );
}

export function PublicContent({ userRole, onRequestAuth }: PublicContentProps) {
  const [view, setView] = useState<ViewType>("home");
  const [selectedVideoCategory, setSelectedVideoCategory] = useState("");
  const [selectedResourceCategory, setSelectedResourceCategory] = useState("");
  const [selectedResourceType, setSelectedResourceType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<any>(null);

  // حالة مودال تأكيد الاشتراك في المسابقة
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCompetitionId, setPendingCompetitionId] =
    useState<string | null>(null);

  const isGuest = userRole === "guest";
  const niceRole = ROLE_LABELS[userRole] ?? userRole;

  // ===== بيانات عامة =====
  const programs = useQuery(api.programs.getPublicPrograms) ?? [];
  const competitions = useQuery(api.competitions.getActiveCompetitions) ?? [];
  const videoCategories = useQuery(api.videos.getVideoCategories) ?? [];
  const videos =
    useQuery(api.videos.getActiveVideos, {
      category: selectedVideoCategory || undefined,
      limit: 6,
    }) ?? [];
  const resourceCategories = useQuery(api.resources.getResourceCategories) ?? [];
  const resources = useQuery(api.resources.getActiveResources, {
    category: selectedResourceCategory || undefined,
    type: selectedResourceType || undefined,
  }) ?? [];

  // ===== عمليات =====
  const incrementViews = useMutation(api.videos.incrementViews);
  const incrementDownloads = useMutation(api.resources.incrementDownloads);
  const requestProgramEnrollment = useMutation(api.programs.requestEnrollment);
  const requestCompetitionParticipation = useMutation(
    api.competitions.requestParticipation
  );

  // ===== Handlers =====
  const handleVideoClick = async (video: any) => {
    try {
      await incrementViews({ videoId: video._id as any });
      if (video.videoUrl) window.open(video.videoUrl, "_blank");
    } catch (error) {
      console.log("error incrementing views", error);
    }
  };

  // عرض الكتاب/المصدر (فتح في تبويب جديد بدون زيادة عدّاد التحميل)
  const handleResourceView = (resource: any) => {
    try {
      const url = resource.fileUrl || resource.externalLink;
      if (!url) {
        toast.error("لا يوجد رابط متاح لعرض هذا المصدر.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.log("error opening resource view", error);
    }
  };

  // تحميل (فتح الرابط + زيادة عدّاد التحميل في الخلفية)
  const handleResourceDownload = async (resource: any) => {
    try {
      const url = resource.fileUrl || resource.externalLink;
      if (!url) {
        toast.error("لا يوجد رابط متاح لتحميل هذا المصدر.");
        return;
      }

      await incrementDownloads({ resourceId: resource._id as any });
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("جاري التحميل...");
    } catch (error) {
      console.error("error downloading resource", error);
      toast.error("حدث خطأ أثناء التحميل");
    }
  };

  const handleProgramClick = (program: any) => {
    setSelectedProgram(program);
    setView("program-details");
  };

  const handleCompetitionClick = (competition: any) => {
    setSelectedCompetition(competition);
    setView("competition-details");
  };

  const handleProgramEnrollment = async (programId: string) => {
    try {
      await requestProgramEnrollment({ programId: programId as any });
      toast.success("تم إرسال طلب التسجيل بنجاح! سيتم التواصل معك قريباً.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "حدث خطأ أثناء إرسال الطلب";
      toast.error(message);
    }
  };

  const handleCompetitionParticipation = async (competitionId: string) => {
    try {
      await requestCompetitionParticipation({
        competitionId: competitionId as any,
      });
      toast.success("تم إرسال طلب الاشتراك بنجاح! سيتم التواصل معك قريباً.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "حدث خطأ أثناء إرسال الطلب";
      toast.error(message);
    }
  };

  /* ============================================================
     HOME
     ============================================================ */
  if (view === "home") {
    return (
      <div className="space-y-10" dir="rtl">
        {/* هيرو */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">
              مرحبًا بك في دار ابن الجزري 🕌
            </h1>
            <p className="text-lg text-green-100 mb-2">
              منصة متكاملة لتحفيظ القرآن الكريم وتعليم علومه
            </p>
            <p className="text-green-200">
              أنت تتصفح بصلاحية:
              <span className="font-semibold text-white mr-1">{niceRole}</span>
            </p>
            {isGuest && (
              <div className="mt-6">
                <a
                  href="#login"
                  className="bg-white text-green-700 px-8 py-3 rounded-xl font-bold hover:bg-green-50 transition-colors shadow-lg inline-block"
                  onClick={(e) => {
                    e.preventDefault();
                    onRequestAuth?.();
                  }}
                >
                  سجل الآن مجاناً
                </a>
              </div>
            )}
          </div>
        </div>

        {/* الكروت الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => setView("programs")}
            className="group bg-gradient-to-br from-green-50 via-white to-green-50 rounded-3xl border-2 border-green-100 p-6 text-center shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl">
              📚
            </div>
            <h3 className="text-lg font-bold text-green-800">
              برامجنا التعليمية
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              برامج متنوعة ومتخصصة لجميع الأعمار والمستويات
            </p>
            <div className="mt-auto flex items-center gap-2 text-xs font-semibold text-green-700">
              <span>استكشف البرامج</span>
              <span className="text-green-600">←</span>
            </div>
          </button>

          <button
            onClick={() => setView("competitions")}
            className="group bg-gradient-to-br from-emerald-50 via-white to-emerald-50 rounded-3xl border-2 border-emerald-100 p-6 text-center shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl">
              🏆
            </div>
            <h3 className="text-lg font-bold text-green-800">
              المسابقات والفعاليات
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              مسابقات قرآنية دورية تفاعلية
            </p>
            <div className="mt-auto flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span>شاهد المسابقات</span>
              <span className="text-emerald-600">←</span>
            </div>
          </button>

          <button
            onClick={() => setView("videos")}
            className="group bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-3xl border-2 border-blue-100 p-6 text-center shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl">
              🎥
            </div>
            <h3 className="text-lg font-bold text-green-800">
              الفيديوهات التعليمية
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              مكتبة شاملة من الدروس المرئية
            </p>
            <div className="mt-auto flex items-center gap-2 text-xs font-semibold text-blue-700">
              <span>تصفح المكتبة</span>
              <span className="text-blue-600">←</span>
            </div>
          </button>

          <button
            onClick={() => setView("resources")}
            className="group bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-3xl border-2 border-purple-100 p-6 text-center shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl">
              📖
            </div>
            <h3 className="text-lg font-bold text-green-800">
              مكتبة المصادر
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              كتب ومقالات وملفات تعليمية متنوعة
            </p>
            <div className="mt-auto flex items-center gap-2 text-xs font-semibold text-purple-700">
              <span>تصفح المكتبة</span>
              <span className="text-purple-600">←</span>
            </div>
          </button>
        </div>

        {/* الفوتر الديناميكي */}
      </div>
    );
  }

  /* ============================================================
     PROGRAMS
     ============================================================ */
  if (view === "programs") {
    return (
      <div className="space-y-10" dir="rtl">
        {/* هيدر + رجوع */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              البرامج المتاحة 📚
            </h2>
            <p className="text-gray-500 text-sm">
              اختر البرنامج المناسب وسجّل طلب الانضمام.
            </p>
          </div>
          <button
            onClick={() => setView("home")}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            ← رجوع
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {programs.length === 0 && (
            <div className="md:col-span-3 bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
              لا توجد برامج حالياً.
            </div>
          )}

          {programs.map((program: any) => {
            const percent =
              program.maxStudents > 0
                ? Math.round(
                    (program.currentStudents / program.maxStudents) * 100
                  )
                : 0;

            return (
              <div
                key={program._id.id ?? program._id}
                className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleProgramClick(program)}
              >
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white">
                  <h3 className="text-lg font-bold mb-2">{program.name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="bg-green-400/50 px-3 py-1 rounded-full">
                      {program.targetAge}
                    </span>
                    <span>
                      {program.currentStudents}/{program.maxStudents} طالب
                    </span>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-3 flex-1">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {program.description}
                  </p>

                  {program.schedule && (
                    <p className="text-xs text-gray-500">
                      📅 المواعيد: {program.schedule}
                    </p>
                  )}

                  <div className="mt-auto">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>نسبة الامتلاء</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    className={`w-full mt-3 py-2 rounded-xl text-sm font-semibold transition ${
                      percent >= 100
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (percent >= 100) return;
                      if (isGuest) return onRequestAuth?.();
                      handleProgramEnrollment(program._id);
                    }}
                    disabled={percent >= 100}
                  >
                    {percent >= 100 ? "القائمة ممتلئة" : "طلب التسجيل"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============================================================
     COMPETITIONS (قائمة)
     ============================================================ */
  if (view === "competitions") {
    return (
      <div className="space-y-10" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              المسابقات والفعاليات 🏆
            </h2>
            <p className="text-gray-500 text-sm">
              اختر المسابقة ثم اعرض التفاصيل والاشتراك.
            </p>
          </div>
          <button
            onClick={() => setView("home")}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            ← رجوع
          </button>
        </div>

        {competitions.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-700">
            لا توجد مسابقات نشطة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {competitions.map((c: any) => {
              const start = new Date(c.startDate).toLocaleDateString("ar-EG");
              const end = new Date(c.endDate).toLocaleDateString("ar-EG");
              const prizes: string[] = Array.isArray(c.prizes) ? c.prizes : [];

              return (
                <article
                  key={c._id.id ?? c._id}
                  className="rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-bold">{c.title}</h3>
                      <span className="text-2xl">🏆</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge icon="📅" text={`من ${start}`} />
                      <Badge icon="⏰" text={`إلى ${end}`} />
                      {c.isActive && <Badge icon="✅" text="نشطة" />}
                      {prizes.length > 0 && (
                        <Badge icon="🎁" text={`${prizes.length} جوائز`} />
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {c.description && (
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                        {c.description}
                      </p>
                    )}

                    <button
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2 rounded-xl font-semibold"
                      onClick={() => handleCompetitionClick(c)}
                    >
                      عرض التفاصيل والاشتراك
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    );
  }

  /* ============================================================
     COMPETITION DETAILS (عرض الشروط داخلي + مودال تأكيد)
     ============================================================ */
  if (view === "competition-details" && selectedCompetition) {
    const start = new Date(selectedCompetition.startDate).toLocaleDateString(
      "ar-EG"
    );
    const end = new Date(selectedCompetition.endDate).toLocaleDateString(
      "ar-EG"
    );
    const prizes: string[] = Array.isArray(selectedCompetition.prizes)
      ? selectedCompetition.prizes
      : [];
    const rules: string = selectedCompetition.rules || "";

    return (
      <div className="space-y-10" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              {selectedCompetition.title} 🏆
            </h2>
            <p className="text-gray-500 text-sm">
              تفاصيل المسابقة ومعلومات الاشتراك
            </p>
          </div>
          <button
            onClick={() => setView("competitions")}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            ← رجوع للمسابقات
          </button>
        </div>

        <article className="bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6">
            <div className="flex flex-wrap gap-2 text-[13px]">
              <Badge icon="📅" text={`من ${start}`} />
              <Badge icon="⏰" text={`إلى ${end}`} />
              {selectedCompetition.isActive && <Badge icon="✅" text="نشطة" />}
              {prizes.length > 0 && (
                <Badge icon="🎁" text={`${prizes.length} جوائز`} />
              )}
            </div>
            <h1 className="text-2xl font-bold mt-3">
              {selectedCompetition.title}
            </h1>
          </div>

          <div className="p-6 space-y-5">
            {selectedCompetition.description && (
              <p className="text-gray-700">{selectedCompetition.description}</p>
            )}

            {prizes.length > 0 && (
              <div>
                <h4 className="font-semibold text-emerald-800 mb-2">
                  🎁 الجوائز:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {prizes.map((p, i) => (
                    <span
                      key={i}
                      className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rules && (
              <div>
                <h4 className="font-semibold text-emerald-800 mb-2">
                  📌 الشروط:
                </h4>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-gray-700 whitespace-pre-wrap">
                  {rules}
                </div>
              </div>
            )}

            <button
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
              onClick={() => {
                if (isGuest) return onRequestAuth?.();
                setPendingCompetitionId(selectedCompetition._id);
                setConfirmOpen(true);
              }}
            >
              اشترك في المسابقة
            </button>
          </div>
        </article>

        {/* مودال التأكيد */}
        <ConfirmDialog
          open={confirmOpen}
          title="تأكيد الاشتراك"
          message="هل تريد بالتأكيد الاشتراك في هذه المسابقة؟"
          confirmText="تأكيد الاشتراك"
          cancelText="إلغاء"
          onConfirm={async () => {
            if (!pendingCompetitionId) return;
            setConfirmOpen(false);
            await handleCompetitionParticipation(pendingCompetitionId);
            setPendingCompetitionId(null);
          }}
          onClose={() => {
            setConfirmOpen(false);
            setPendingCompetitionId(null);
          }}
        />

      </div>
    );
  }

  /* ============================================================
     VIDEOS
     ============================================================ */
  if (view === "videos") {
    return (
      <div className="space-y-10" dir="rtl">
        {/* هيدر + رجوع */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              الفيديوهات التعليمية 🎥
            </h2>
            <p className="text-gray-500 text-sm">
              دروس مبسطة في التجويد وأدب التلاوة.
            </p>
          </div>
          <button
            onClick={() => setView("home")}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            ← رجوع
          </button>
        </div>

        {/* الفلاتر */}
        {videoCategories.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedVideoCategory("")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                selectedVideoCategory === ""
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              جميع الفئات
            </button>
            {videoCategories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setSelectedVideoCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  selectedVideoCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {videos.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-blue-700">
            لا توجد فيديوهات متاحة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.map((video: any) => (
              <div
                key={video._id.id ?? video._id}
                className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => handleVideoClick(video)}
              >
                <div className="relative h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                  <div className="text-5xl mb-2">🎥</div>
                  <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                    {video.category}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/40 text-white px-2 py-1 rounded text-xs">
                    👁 {video.views} مشاهدة
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {video.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
                    <span>
                      {new Date(video.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                    <button className="text-blue-600 font-semibold">
                      مشاهدة الآن
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    );
  }

  /* ============================================================
     RESOURCES - مكتبة المصادر المحسّنة ✨
     ============================================================ */
  if (view === "resources") {
    const resourceTypes = [
      { value: "pdf", label: "PDF", icon: "📄" },
      { value: "book", label: "كتاب", icon: "📖" },
      { value: "article", label: "مقال", icon: "📝" },
      { value: "audio", label: "صوتي", icon: "🎧" },
      { value: "other", label: "أخرى", icon: "📦" },
    ];

    return (
      <div className="space-y-10" dir="rtl">
        {/* هيدر + رجوع (أخضر) */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              مكتبة المصادر التعليمية 📖
            </h2>
            <p className="text-gray-500 text-sm">
              كتب ومقالات وملفات تعليمية متنوعة - تصفح واستفد
            </p>
          </div>
          <button
            onClick={() => setView("home")}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            ← رجوع
          </button>
        </div>

        {/* فلاتر الفئات */}
        {resourceCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              🏷️ تصفية حسب الفئة:
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedResourceCategory("")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  selectedResourceCategory === ""
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                جميع الفئات
              </button>
              {resourceCategories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedResourceCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                    selectedResourceCategory === cat
                      ? "bg-purple-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* فلاتر الأنواع */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            📦 تصفية حسب النوع:
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedResourceType("")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                selectedResourceType === ""
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              جميع الأنواع
            </button>
            {resourceTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedResourceType(type.value)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                  selectedResourceType === type.value
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* عداد النتائج */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-800">
          <span className="font-semibold">{resources.length} مصدر متاح</span>
          {(selectedResourceCategory || selectedResourceType) && (
            <span className="mr-2 text-purple-600">(مفلتر)</span>
          )}
        </div>

        {resources.length === 0 ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-xl font-bold text-purple-800 mb-2">
              لا توجد مصادر متاحة
            </h3>
            <p className="text-purple-600">
              {selectedResourceCategory || selectedResourceType
                ? "جرب تغيير الفلاتر للعثور على مصادر أخرى"
                : "لا توجد مصادر متاحة حالياً"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource: any) => {
              const icon =
                resource.type === "pdf"
                  ? "📄"
                  : resource.type === "book"
                  ? "📖"
                  : resource.type === "audio"
                  ? "🎧"
                  : resource.type === "article"
                  ? "📝"
                  : "📦";

              const typeLabel =
                resource.type === "pdf"
                  ? "PDF"
                  : resource.type === "book"
                  ? "كتاب"
                  : resource.type === "audio"
                  ? "صوتي"
                  : resource.type === "article"
                  ? "مقال"
                  : "أخرى";

              return (
                <div
                  key={resource._id.id ?? resource._id}
                  className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* غلاف الكتاب / الملف */}
                  <div className="relative h-44 overflow-hidden">
                    {resource.coverUrl ? (
                      <img
                        src={resource.coverUrl}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 flex items-center justify-center text-white text-6xl">
                        {icon}
                      </div>
                    )}

                    <div className="absolute top-3 right-3 bg-purple-800/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold border border-white/20">
                      {resource.category}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <span>📥</span>
                      <span>{resource.downloads}</span>
                    </div>
                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded text-xs">
                      {typeLabel}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {resource.title}
                    </h3>
                    {resource.author && (
                      <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                        <span>✍️</span>
                        <span>{resource.author}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {resource.description}
                    </p>

                    {/* أزرار العرض والتحميل */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleResourceView(resource)}
                        className="flex-1 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
                      >
                        {resource.type === "pdf" || resource.type === "book"
                          ? "عرض الكتاب"
                          : "عرض"}
                      </button>
                      <button
                        onClick={() => handleResourceDownload(resource)}
                        className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <span>تحميل</span>
                        <span>⬇️</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    );
  }

  /* ============================================================
     PROGRAM DETAILS
     ============================================================ */
  if (view === "program-details" && selectedProgram) {
    const percent =
      selectedProgram.maxStudents > 0
        ? Math.round(
            (selectedProgram.currentStudents / selectedProgram.maxStudents) *
              100
          )
        : 0;

    return (
      <div className="space-y-10" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              {selectedProgram.name} 📚
            </h2>
            <p className="text-gray-500 text-sm">
              تفاصيل البرنامج ومعلومات التسجيل
            </p>
          </div>
          <button
            onClick={() => setView("programs")}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            ← رجوع للبرامج
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-green-100 shadow-lg p-8">
          <h1 className="text-2xl font-bold text-green-800 mb-4">
            {selectedProgram.name}
          </h1>
          <p className="text-gray-700 mb-6">{selectedProgram.description}</p>

          {selectedProgram.schedule && (
            <p className="text-sm text-gray-600 mb-6">
              📅 المواعيد: {selectedProgram.schedule}
            </p>
          )}

          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>نسبة الامتلاء</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>

          <button
            className={`w-full py-3 rounded-lg font-bold transition ${
              percent >= 100
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            onClick={() => {
              if (percent >= 100) return;
              if (isGuest) return onRequestAuth?.();
              handleProgramEnrollment(selectedProgram._id);
            }}
            disabled={percent >= 100}
          >
            {percent >= 100 ? "القائمة ممتلئة" : "طلب التسجيل في البرنامج"}
          </button>
        </div>

      </div>
    );
  }

  // fallback
  return null;
}
