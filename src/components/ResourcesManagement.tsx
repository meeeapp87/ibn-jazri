import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type ResourcesManagementProps = {
  onBack?: () => void;
};

export function ResourcesManagement({ onBack }: ResourcesManagementProps) {
  const resources = useQuery(api.resources.getAllResources) || [];
  const createResource = useMutation(api.resources.createResource);
  const updateResource = useMutation(api.resources.updateResource);
  const deleteResource = useMutation(api.resources.deleteResource);
  const generateUploadUrl = useMutation(api.resources.generateUploadUrl);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // حقول النموذج
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("pdf");
  const [fileStorageId, setFileStorageId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [coverStorageId, setCoverStorageId] = useState<string | null>(null);
  const [category, setCategory] = useState("عام");
  const [author, setAuthor] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("pdf");
    setFileStorageId(null);
    setFileUrl("");
    setExternalLink("");
    setCoverStorageId(null);
    setCategory("عام");
    setAuthor("");
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleEdit = (resource: any) => {
    setTitle(resource.title);
    setDescription(resource.description);
    setType(resource.type);
    setFileStorageId(resource.fileStorageId || null);
    setFileUrl(resource.fileUrl || "");
    setExternalLink(resource.externalLink || "");
    setCoverStorageId(resource.coverStorageId || null);
    setCategory(resource.category);
    setAuthor(resource.author || "");
    setEditingId(resource._id);
    setShowForm(true);
  };

  // رفع ملف الكتاب/المصدر
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = await result.json();
      if (!result.ok) {
        throw new Error(`فشل الرفع: ${JSON.stringify(json)}`);
      }
      setFileStorageId(json.storageId);
      setFileUrl(""); // إلغاء الرابط الخارجي إذا تم رفع ملف
      toast.success("تم رفع الملف بنجاح! ✅");
    } catch (error) {
      console.error("خطأ في رفع الملف:", error);
      toast.error("فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  // رفع صورة الغلاف
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من أن الملف صورة
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة فقط");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = await result.json();
      if (!result.ok) {
        throw new Error(`فشل الرفع: ${JSON.stringify(json)}`);
      }
      setCoverStorageId(json.storageId);
      toast.success("تم رفع صورة الغلاف بنجاح! ✅");
    } catch (error) {
      console.error("خطأ في رفع الغلاف:", error);
      toast.error("فشل رفع صورة الغلاف");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    // التحقق من وجود ملف أو رابط
    if (!fileStorageId && !fileUrl && !externalLink) {
      toast.error("يرجى رفع ملف أو إدخال رابط");
      return;
    }

    try {
      if (editingId) {
        await updateResource({
          resourceId: editingId as any,
          title,
          description,
          type,
          fileStorageId: fileStorageId as any,
          fileUrl: fileUrl || undefined,
          externalLink: externalLink || undefined,
          coverStorageId: coverStorageId as any,
          category,
          author: author || undefined,
        });
        toast.success("تم تحديث المصدر بنجاح! ✅");
      } else {
        await createResource({
          title,
          description,
          type,
          fileStorageId: fileStorageId as any,
          fileUrl: fileUrl || undefined,
          externalLink: externalLink || undefined,
          coverStorageId: coverStorageId as any,
          category,
          author: author || undefined,
        });
        toast.success("تم إضافة المصدر بنجاح! ✅");
      }
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast.error(message);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصدر؟")) return;
    
    try {
      await deleteResource({ resourceId: resourceId as any });
      toast.success("تم حذف المصدر بنجاح");
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast.error(message);
    }
  };

  const handleToggleActive = async (resource: any) => {
    try {
      await updateResource({
        resourceId: resource._id as any,
        isActive: !resource.isActive,
      });
      toast.success(resource.isActive ? "تم إخفاء المصدر" : "تم تفعيل المصدر");
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800">مكتبة المصادر التعليمية 📚</h2>
          <p className="text-gray-500 text-sm">إدارة الكتب والمقالات والملفات التعليمية</p>
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: "#059669" }}
            >
              ← رجوع للوحة التحكم
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
          >
            {showForm ? "إلغاء" : "+ إضافة مصدر جديد"}
          </button>
        </div>
      </div>

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-purple-800 mb-4">
            {editingId ? "تعديل المصدر" : "إضافة مصدر جديد"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان المصدر *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                  placeholder="مثال: كتاب التجويد المصور"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المؤلف
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                  placeholder="اسم المؤلف أو المصدر"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نوع المصدر *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  <option value="pdf">PDF</option>
                  <option value="book">كتاب</option>
                  <option value="article">مقال</option>
                  <option value="audio">صوتي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  التصنيف *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  <option value="تفسير">تفسير</option>
                  <option value="تجويد">تجويد</option>
                  <option value="سيرة">سيرة</option>
                  <option value="فقه">فقه</option>
                  <option value="عام">عام</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الوصف *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                rows={3}
                placeholder="وصف مختصر عن المصدر..."
                required
              />
            </div>

            {/* رفع صورة الغلاف */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                صورة الغلاف (اختياري)
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploading}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
              {coverStorageId && (
                <p className="text-xs text-green-600 mt-1">✅ تم رفع صورة الغلاف</p>
              )}
            </div>

            {/* رفع الملف من الجهاز */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رفع الملف من الجهاز (PDF, كتاب، صوتي...)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
              {fileStorageId && (
                <p className="text-xs text-green-600 mt-1">✅ تم رفع الملف</p>
              )}
            </div>

            {/* أو رابط خارجي */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                أو رابط خارجي (اختياري)
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                disabled={!!fileStorageId}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:bg-gray-100"
                placeholder="https://example.com/file.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رابط خارجي إضافي (اختياري)
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                placeholder="https://example.com"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50"
              >
                {uploading ? "جاري الرفع..." : editingId ? "حفظ التعديلات" : "إضافة المصدر"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة المصادر */}
      {resources.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center">
          <span className="text-7xl mb-6 block">📚</span>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">لا توجد مصادر حتى الآن</h3>
          <p className="text-gray-600 text-lg">ابدأ بإضافة أول مصدر تعليمي</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource: any) => (
            <div
              key={resource._id}
              className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm hover:shadow-lg transition-all overflow-hidden"
            >
              {/* صورة الغلاف */}
              {resource.coverUrl ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={resource.coverUrl}
                    alt={resource.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white h-32 flex items-center justify-center">
                  <span className="text-5xl">
                    {resource.type === "pdf" ? "📄" : 
                     resource.type === "book" ? "📖" : 
                     resource.type === "audio" ? "🎧" : 
                     resource.type === "article" ? "📝" : "📦"}
                  </span>
                </div>
              )}

              <div className="p-4 space-y-3">
                <h3 className="text-lg font-bold text-gray-900">{resource.title}</h3>
                {resource.author && (
                  <p className="text-purple-600 text-sm">بواسطة: {resource.author}</p>
                )}
                <p className="text-gray-600 text-sm line-clamp-2">{resource.description}</p>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                    {resource.category}
                  </span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {resource.type}
                  </span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    📥 {resource.downloads} تحميل
                  </span>
                  {resource.isActive ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                      نشط
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                      مخفي
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleEdit(resource)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm px-3 py-2 rounded-lg font-medium transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleToggleActive(resource)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg font-medium transition-colors"
                  >
                    {resource.isActive ? "إخفاء" : "تفعيل"}
                  </button>
                  <button
                    onClick={() => handleDelete(resource._id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 rounded-lg font-medium transition-colors"
                  >
                    حذف
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
