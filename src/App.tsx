// src/App.tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";

import { Dashboard } from "./components/Dashboard";
import { PublicContent } from "./components/PublicContent";
import { ProfileSetup } from "./components/ProfileSetup";
import { HeroPage } from "./components/HeroPage";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { AIAssistant } from "./components/AIAssistant";
// ✅ نستخدم النسخة المتصلة بالداتا
import { DarInfoFooterConnected } from "./components/DarInfoFooter";

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const loggedInUser = useQuery(api.auth.loggedInUser);

  const loading = loggedInUser === undefined;

  const isAnonymous =
    !loggedInUser ||
    (loggedInUser as any).tokenIdentifier?.startsWith?.("anonymous:");

  const isRealUser =
    loggedInUser &&
    !(loggedInUser as any).tokenIdentifier?.startsWith?.("anonymous:");

  const role =
    loggedInUser?.profile?.role || (loggedInUser as any)?.role || "guest";

  const canSeeDashboard = role === "admin" || role === "teacher";

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50"
      dir="rtl"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* الشعار والعنوان */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white shadow-sm">
              <img
                src="https://polished-pony-114.convex.cloud/api/storage/35f5118c-e650-4ecd-a7ba-4c413e9591e0"
                alt="شعار دار ابن الجزري"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold text-green-800 leading-tight truncate max-w-[180px] md:max-w-none">
                دار ابن الجزري
              </h1>
              <p className="text-xs md:text-sm text-green-600">
                لتحفيظ القرآن الكريم
              </p>
            </div>
          </div>

          {/* الأزرار */}
          <div className="flex items-center gap-2 md:gap-3 justify-end">
            {/* واتساب */}
            <a
              href="https://wa.me/201070506656?text=السلام عليكم، أحتاج مساعدة في دار ابن الجزري"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium"
              title="تواصل معنا عبر الواتساب"
            >
              <span className="text-lg">📱</span>
              <span className="hidden sm:inline">تواصل معنا</span>
            </a>

            {/* لوحة التحكم للمدير/المحفظ */}
            {!loading && isRealUser && canSeeDashboard && (
              <button
                onClick={() => setShowDashboard((prev) => !prev)}
                className="px-4 py-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                {showDashboard ? "الرجوع للموقع" : "لوحة التحكم"}
              </button>
            )}

            {/* دخول / خروج */}
            {!loading && !isAnonymous ? (
              <SignOutButton />
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="px-4 py-1.5 rounded-full border border-green-200 text-green-700 hover:bg-green-50 text-sm"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* جاري التحميل */}
        {loading && (
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
              <p className="text-green-700">جاري التحميل...</p>
            </div>
          </div>
        )}

        {/* زائر */}
        {!loading && isAnonymous && (
          <>
            <HeroPage onLogin={() => setShowLogin(true)} />
            <PublicContent
              userRole="guest"
              onRequestAuth={() => setShowLogin(true)}
            />
          </>
        )}

        {/* مستخدم مسجّل لكن ماكمّلاش البروفايل */}
        {!loading && isRealUser && !loggedInUser?.profile && <ProfileSetup />}

        {/* مستخدم مسجّل وكامل */}
        {!loading && isRealUser && loggedInUser?.profile && (
          <>
            {canSeeDashboard && showDashboard ? (
              <Dashboard />
            ) : (
              <PublicContent
                userRole={loggedInUser.profile.role}
                onRequestAuth={() => setShowLogin(true)}
              />
            )}
          </>
        )}
      </main>

      {/* مودال تسجيل الدخول */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {/* زر واتساب عايم */}
      <a
        href="https://wa.me/201066551820?text=السلام عليكم، أحتاج مساعدة في دار ابن الجزري"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        title="تواصل معنا عبر الواتساب"
      >
        <span className="text-2xl">📱</span>
      </a>

      {/* زر المساعد الذكي */}
      {!loading && isRealUser && loggedInUser?.profile && (
        <button
          onClick={() => setShowAI(true)}
          className="fixed bottom-24 left-6 z-50 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="المساعد الذكي"
        >
          <span className="text-2xl">🤖</span>
        </button>
      )}

      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}

      {/* Footer - ديناميكي من قاعدة البيانات، يظهر في كل الصفحات */}
      <DarInfoFooterConnected />
    </div>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-green-100 w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
        <h3 className="text-xl font-bold text-green-800 mb-4 text-center">
          تسجيل الدخول
        </h3>
        <SignInForm onSuccess={onClose} />
      </div>
    </div>
  );
}
