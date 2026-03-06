// src/components/HeroPage.tsx
import { useRef, useState } from "react";

export function HeroPage({ onLogin }: { onLogin: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = () => {
    if (!videoRef.current) return;

    if (soundOn) {
      videoRef.current.muted = true;
      setSoundOn(false);
    } else {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      setSoundOn(true);
      // لو يحصل أحياناً أن الفيديو يوقف عند إزالة الميوت
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-20 mb-20" dir="rtl">
      {/* Hero Section with Video Background */}
      <section className="relative h-[520px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl bg-black">
        {/* فيديو الخلفية */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://befitting-bass-995.convex.cloud/api/storage/8bd73099-442d-4ca9-91d1-ab7174f00eb8"
            type="video/mp4"
          />
        </video>

        {/* طبقة شفافة فوق الفيديو */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        {/* زر الصوت */}
        <button
          type="button"
          onClick={toggleSound}
          className="
            absolute top-5 left-5 z-20
            bg-white/20 hover:bg-white/30
            text-white backdrop-blur-lg 
            w-12 h-12 rounded-full 
            flex items-center justify-center 
            text-2xl transition
            shadow-lg border border-white/40
          "
        >
          {soundOn ? "🔊" : "🔇"}
        </button>

        {/* محتوى الهيرو */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <div className="max-w-4xl space-y-6">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl">
              دار ابن الجزري
            </h1>
            <p className="text-xl md:text-2xl text-emerald-100 font-semibold">
              لتحفيظ القرآن الكريم وتعليم أحكام التجويد
            </p>
            <p className="text-base md:text-lg text-emerald-50 max-w-2xl mx-auto leading-relaxed">
              منصة إيمانية تعليمية متكاملة لحفظ كتاب الله، وضبط التلاوة، ومتابعة
              تقدمك خطوة بخطوة مع نخبة من المحفظين والمحفظات.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <button
                onClick={onLogin}
                className="px-8 py-4 bg-white text-emerald-900 rounded-full font-bold text-lg shadow-xl hover:bg-emerald-50 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                ابدأ رحلتك معنا 🌟
              </button>

              <a
                href="https://wa.me/201066551820?text=السلام عليكم، أريد الاستفسار عن دار ابن الجزري"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gradient-to-r from-[#1EAC57] to-[#179948] text-white rounded-full font-bold text-lg shadow-xl hover:from-[#179948] hover:to-[#147B3A] hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                تواصل معنا عبر واتساب 📱
              </a>
            </div>
          </div>
        </div>

        {/* موجة زخرفية أسفل الهيرو */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="rgb(240, 253, 244)"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-900 mb-3">
            لماذا دار ابن الجزري؟
          </h2>
          <p className="text-lg md:text-xl text-gray-600">
            تجربة تعليمية روحانية تجمع بين إتقان الحفظ، جمال التلاوة، وراحة
            المتعلم
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl hover:-translate-y-2 transition-all border border-emerald-50">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1EAC57] to-[#179948] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-md">
              <span className="text-4xl">📖</span>
            </div>
            <h3 className="text-2xl font-bold text-emerald-900 mb-4 text-center">
              حفظ متقن
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              منهج واضح يبدأ من مستويات المبتدئين حتى ختم القرآن، مع متابعة
              دورية وتثبيت مستمر للمحفوظ.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl hover:-translate-y-2 transition-all border border-emerald-50">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-md">
              <span className="text-4xl">🎓</span>
            </div>
            <h3 className="text-2xl font-bold text-emerald-900 mb-4 text-center">
              محفظون متميزون
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              نخبة من أهل القرآن، مجازون ومتمرسون في تعليم الصغار والكبار بأساليب
              تربوية مريحة ومحفزة.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl hover:-translate-y-2 transition-all border border-emerald-50">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-md">
              <span className="text-4xl">⏰</span>
            </div>
            <h3 className="text-2xl font-bold text-emerald-900 mb-4 text-center">
              مرونة في المواعيد
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              برامج متنوعة حضورية وعن بُعد، تناسب جدول الأسرة وتراعي فروق الأعمار
              والالتزامات اليومية.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-br from-[#1EAC57] to-[#179948] rounded-3xl shadow-2xl py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-extrabold mb-1">
                200+
              </div>
              <div className="text-emerald-100 text-base md:text-lg">
                طالب وطالبة
              </div>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-extrabold mb-1">
                20+
              </div>
              <div className="text-emerald-100 text-base md:text-lg">
                محفظ ومحفظة
              </div>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-extrabold mb-1">
                10+
              </div>
              <div className="text-emerald-100 text-base md:text-lg">
                سنوات خبرة
              </div>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-extrabold mb-1">
                100%
              </div>
              <div className="text-emerald-100 text-base md:text-lg">
                رضا الطلاب
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-amber-50 to-emerald-50 rounded-3xl shadow-xl py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-900">
            ابدأ رحلتك الإيمانية اليوم
          </h2>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
            انضم إلى مئات الطلاب الذين يحفظون القرآن الكريم في دار ابن الجزري،
            وتابع تقدمك لحظة بلحظة من خلال منصتنا الرقمية.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onLogin}
              className="px-8 py-4 bg-[#1EAC57] text-white rounded-full font-bold text-lg hover:bg-[#179948] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              سجّل الآن مجاناً 🎯
            </button>
            <a
              href="https://wa.me/201066551820?text=السلام عليكم، أريد معرفة المزيد عن البرامج"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-emerald-800 border-2 border-[#1EAC57] rounded-full font-bold text-lg hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              استفسر عن البرامج 💬
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
