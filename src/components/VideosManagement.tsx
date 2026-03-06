import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface VideosManagementProps {
  onBack?: () => void;
}

// ⬇︎ دالة بسيطة تسحب ID من روابط يوتيوب الشائعة
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    // https://youtu.be/xxxx
    const short = url.match(/youtu\.be\/([^?]+)/);
    if (short) return short[1];

    // https://www.youtube.com/watch?v=xxxx
    const long = url.match(/[?&]v=([^&]+)/);
    if (long) return long[1];

    const u = new URL(url);
    return u.searchParams.get("v");
  } catch (e) {
    return null;
  }
}

export function VideosManagement({ onBack }: VideosManagementProps) {
  const videos = useQuery(api.videos.getAllVideos) || [];
  const createVideo = useMutation(api.videos.createVideo);
  const updateVideo = useMutation(api.videos.updateVideo);
  const deactivateVideo = useMutation(api.videos.deactivateVideo);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState("");

  // ⬇︎ عشان نعرض الفيديو في مودال
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  function resetForm() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setCategory("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "create") {
      await createVideo({
        title,
        description,
        videoUrl,
        category: category || "عام",
      });
    } else if (mode === "edit" && editingId) {
      await updateVideo({
        videoId: editingId as any,
        title,
        description,
        videoUrl,
        category,
      });
    }

    resetForm();
  }

  function handleEdit(video: any) {
    setMode("edit");
    setEditingId(video._id);
    setTitle(video.title);
    setDescription(video.description);
    setVideoUrl(video.videoUrl);
    setCategory(video.category);
  }

  // ⬇︎ لو حبيت تزود مشاهدة لما يفتحه المدير
  async function handlePreview(video: any) {
    setSelectedVideo(video);
    try {
      await updateVideo({
        videoId: video._id,
        views: (video.views || 0) + 1,
      } as any);
    } catch (e) {
      // مش لازم نوقف العرض
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800">إدارة الفيديوهات 🎥</h2>
          <p className="text-gray-600 text-sm">
            رفع فيديوهات جديدة، تعديل القديمة، أو إخفاؤها من الصفحة العامة.
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: "#059669" }} // أخضر غامق bg-green-500
          >
            ← رجوع للوحة التحكم
          </button>
        )}
      </div>

      {/* form */}
      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border-2 border-sky-200 p-6 space-y-4 shadow-lg"
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان الفيديو
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-green-200 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="مثال: درس تجويد - أحكام الميم الساكنة"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الفئة
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="تجويد / تلاوة / مسابقات ..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رابط الفيديو (YouTube / Vimeo / ملف)
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            required
            placeholder="https://youtube.com/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الوصف
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 h-20 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="نبذة عن محتوى الفيديو..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition"
          >
            {mode === "create" ? "إضافة فيديو" : "حفظ التعديلات"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      {/* table */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-lg">
        <table className="w-full text-right">
          <thead className="bg-gradient-to-r from-sky-100 to-blue-100 text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-4 py-3">العنوان</th>
              <th className="px-4 py-3">الفئة</th>
              <th className="px-4 py-3">المشاهدات</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">تحكم</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-gray-400 text-sm"
                >
                  لا توجد فيديوهات حتى الآن.
                </td>
              </tr>
            )}
            {videos.map((video: any) => (
              <tr
                key={video._id}
                className="border-t border-gray-100 hover:bg-sky-50 transition-colors text-sm"
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  {video.title}
                </td>
                <td className="px-4 py-3 text-gray-500">{video.category}</td>
                <td className="px-4 py-3 text-gray-500">
                  {video.views ?? 0}
                </td>
                <td className="px-4 py-3">
                  {video.isActive ? (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                      نشط
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
                      مخفي
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  {/* 👇 زرار العرض داخل التطبيق */}
                  <button
                    onClick={() => handlePreview(video)}
                    className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs hover:bg-amber-100"
                  >
                    عرض
                  </button>
                  <button
                    onClick={() => handleEdit(video)}
                    className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs hover:bg-blue-100"
                  >
                    تعديل
                  </button>
                  {video.isActive ? (
                    <button
                      onClick={() => deactivateVideo({ videoId: video._id })}
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs hover:bg-red-100"
                    >
                      إخفاء
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateVideo({ videoId: video._id, isActive: true })
                      }
                      className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs hover:bg-green-100"
                    >
                      تفعيل
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 👇 مودال تشغيل الفيديو */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}

// ======================
// مودال عرض الفيديو
// ======================
function VideoModal({ video, onClose }: { video: any; onClose: () => void }) {
  const videoId = extractYouTubeId(video.videoUrl);
  const isYouTube = !!videoId;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-gray-800">{video.title}</h3>
            {video.category && (
              <p className="text-xs text-gray-400 mt-1">{video.category}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="bg-black">
          {isYouTube ? (
            <iframe
              className="w-full aspect-video"
              src={`https://www.youtube.com/embed/${videoId}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.videoUrl ? (
            <video
              src={video.videoUrl}
              controls
              className="w-full aspect-video"
            />
          ) : (
            <div className="text-white p-6 text-center">
              لا يمكن تشغيل هذا الرابط.
            </div>
          )}
        </div>
        {video.description && (
          <div className="p-4 text-sm text-gray-600">{video.description}</div>
        )}
      </div>
    </div>
  );
}
