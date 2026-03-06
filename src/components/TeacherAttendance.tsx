// src/components/TeacherAttendance.tsx
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function TeacherAttendance({ onBack }: { onBack?: () => void }) {
  const todayAttendance = useQuery(api.attendance.myTeacherToday);
  const checkIn = useMutation(api.attendance.teacherCheckIn);
  const checkOut = useMutation(api.attendance.teacherCheckOut);

  const isCheckedIn = !!todayAttendance;
  const hasCheckout = !!todayAttendance?.checkOutTime;

  return (
    <div className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm space-y-6" dir="rtl">
      {/* زر الرجوع بنفسجي */}
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-white bg-violet-600 hover:bg-violet-700 transition font-semibold"
        >
          ← رجوع
        </button>
      )}

      <h2 className="text-xl font-bold text-green-800 flex items-center gap-2">
        <span>🕒</span>
        حضور اليوم للمحفّظ
      </h2>

      <p className="text-gray-500 text-sm">
        سجّل وقت الدخول والخروج ليظهر في لوحة الإدارة.
      </p>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => checkIn({})}
          disabled={isCheckedIn}
          className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
            isCheckedIn
              ? "bg-green-200 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isCheckedIn ? "تم تسجيل الدخول" : "تسجيل دخول"}
        </button>

        <button
          onClick={() => checkOut({})}
          disabled={!isCheckedIn || hasCheckout}
          className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
            !isCheckedIn || hasCheckout
              ? "bg-amber-200 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600"
          }`}
        >
          {hasCheckout ? "تم تسجيل الخروج" : "تسجيل خروج"}
        </button>
      </div>

      {todayAttendance && (
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800 space-y-1">
          <p>📅 التاريخ: {todayAttendance.date}</p>
          <p>
            ⏰ دخول:{" "}
            {todayAttendance.checkInTime
              ? new Date(todayAttendance.checkInTime).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </p>
          <p>
            🚪 خروج:{" "}
            {todayAttendance.checkOutTime
              ? new Date(todayAttendance.checkOutTime).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </p>
        </div>
      )}
    </div>
  );
}
