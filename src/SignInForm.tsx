"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

type SignInFormProps = {
  onSuccess?: () => void; // لو المكوّن جوّه مودال نبعته عشان يقفله
};

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  // دالة مساعدة
  const finish = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (submitting) return;
          setSubmitting(true);

          const formData = new FormData(e.target as HTMLFormElement);
          // convex محتاج يعرف أنت داخل ولا بتسجّل جديد
          formData.set("flow", flow);

          void signIn("password", formData)
            .then(() => {
              toast.success(
                flow === "signIn"
                  ? "تم تسجيل الدخول ✅"
                  : "تم إنشاء الحساب ✅"
              );
              finish();
            })
            .catch((error) => {
              let msg =
                flow === "signIn"
                  ? "تعذّر تسجيل الدخول، تأكد من البريد وكلمة المرور."
                  : "تعذّر إنشاء الحساب، جرّب بريدًا آخر.";
              if (error?.message?.includes("Invalid password")) {
                msg = "كلمة المرور غير صحيحة.";
              }
              if (error?.message?.includes("InvalidAccountId")) {
                msg = "لا يوجد حساب بهذا البريد، أنشئ حسابًا أولًا.";
              }
              toast.error(msg);
              setSubmitting(false);
            });
        }}
      >
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 text-right disabled:bg-gray-100"
          type="email"
          name="email"
          placeholder="البريد الإلكتروني"
          autoComplete="email"
          required
          disabled={submitting}
        />
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 text-right disabled:bg-gray-100"
          type="password"
          name="password"
          placeholder="كلمة المرور"
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          required
          disabled={submitting}
        />
        <button
          className="w-full rounded-xl bg-[#4a4de7] hover:bg-[#3d40d0] text-white py-2 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "جاري المعالجة..."
            : flow === "signIn"
            ? "تسجيل الدخول"
            : "إنشاء الحساب"}
        </button>

        <div className="text-center text-sm text-gray-600">
          {flow === "signIn" ? (
            <>
              ليس لديك حساب؟{" "}
              <button
                type="button"
                className="text-green-600 font-semibold"
                onClick={() => setFlow("signUp")}
                disabled={submitting}
              >
                أنشئ حسابًا الآن
              </button>
            </>
          ) : (
            <>
              لديك حساب بالفعل؟{" "}
              <button
                type="button"
                className="text-green-600 font-semibold"
                onClick={() => setFlow("signIn")}
                disabled={submitting}
              >
                سجّل الدخول
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
