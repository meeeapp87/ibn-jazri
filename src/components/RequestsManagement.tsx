import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type RequestsManagementProps = {
  onBack?: () => void;
};

export function RequestsManagement({ onBack }: RequestsManagementProps) {
  const requests = useQuery(api.admin.getAllRequests, {}) || [];
  const updateStatus = useMutation(api.admin.processRequest);

  async function handleChangeStatus(id: string, status: "pending" | "approved" | "rejected") {
    try {
      await updateStatus({ requestId: id as any, status });
      toast.success(status === "approved" ? "تم قبول الطلب!" : status === "rejected" ? "تم رفض الطلب" : "تم تعليق الطلب");
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800">طلبات التسجيل والاشتراك</h2>
          <p className="text-gray-500 text-sm">جميع الطلبات التي أرسلها الطلاب من الصفحة العامة (برامج + مسابقات)</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: "#059669" }} // أخضر غامق bg-green-500
>
            ← رجوع للوحة التحكم
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center">
          <span className="text-7xl mb-6 block">📋</span>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">لا توجد طلبات حتى الآن</h3>
          <p className="text-gray-600 text-lg">ستظهر هنا طلبات التسجيل من الطلاب</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2 border-gray-200 bg-white shadow-lg">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-gradient-to-r from-pink-100 to-purple-100 text-gray-800 font-semibold">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">المرسل</th>
                <th className="px-3 py-2">النوع</th>
                <th className="px-3 py-2">العنصر</th>
                <th className="px-3 py-2">التواصل</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req: any, idx: number) => (
                <tr key={req._id} className="border-t">
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-gray-900">{req.userName}</div>
                    <div className="text-xs text-gray-400">{req.userEmail}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {req.type === "program" ? (
                      <span className="rounded bg-green-100 text-green-700 px-2 py-1 text-xs">برنامج</span>
                    ) : (
                      <span className="rounded bg-amber-100 text-amber-700 px-2 py-1 text-xs">مسابقة</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-800">
                    {req.programName || req.competitionTitle || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {req.userPhone ? (<>📞 {req.userPhone}</>) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {req.status === "pending" && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">قيد المراجعة</span>
                    )}
                    {req.status === "approved" && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">مقبول</span>
                    )}
                    {req.status === "rejected" && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">مرفوض</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {req.createdAt ? new Date(req.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 space-x-1 space-x-reverse">
                    <button onClick={() => handleChangeStatus(req._id, "approved")}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded">
                      قبول
                    </button>
                    <button onClick={() => handleChangeStatus(req._id, "rejected")}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">
                      رفض
                    </button>
                    <button onClick={() => handleChangeStatus(req._id, "pending")}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                      تعليق
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
