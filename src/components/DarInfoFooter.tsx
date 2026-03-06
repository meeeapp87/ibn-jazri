// src/components/DarInfoFooter.tsx
import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type SocialLinks = {
  youtube?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
};

type QuickLink = {
  title: string;
  subtitle: string;
};

type DarInfoFooterProps = {
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  workingHours?: string;
  socialLinks?: SocialLinks;
  quickLinks?: QuickLink[];
};

export function DarInfoFooter({
  address = "حي اليرموك، الرياض – المملكة العربية السعودية 13327",
  phone = "+201070506656",
  whatsapp = "+201070506656",
  email = "Elsayedaboelnour@gmail.com",
  workingHours = "السبت – الخميس: 8:00 ص – 8:00 م",
  socialLinks,
  quickLinks,
}: DarInfoFooterProps) {
  const linksToRender =
    quickLinks && quickLinks.length > 0
      ? quickLinks
      : [
          { title: "الرئيسية", subtitle: "نظرة عامة" },
          { title: "البرامج", subtitle: "التسجيل والبرامج" },
          { title: "المحفظون", subtitle: "طاقم التحفيظ" },
          { title: "التسجيل", subtitle: "انضم الآن" },
        ];

  return (
    <footer
      className="mt-10 bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 text-emerald-50"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {/* SECTION 1 — ABOUT + SOCIAL */}
          <div className="space-y-2">
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/90">
                📖
              </span>
              <span>دار ابن الجزري</span>
            </h3>

            <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
              منصة تعليمية متطورة تهدف إلى تيسير حفظ القرآن الكريم وتعليمه من خلال
              أحدث التقنيات والأساليب التربوية الحديثة.
            </p>

            <div className="flex items-center gap-2 pt-1 text-xl">
              <span className="text-[11px] md:text-xs text-emerald-200">
                تابعنا:
              </span>

              {/* YouTube */}
              {socialLinks?.youtube ? (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-emerald-700/70 flex items-center justify-center hover:bg-red-600 transition"
                  aria-label="YouTube"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M19.6 3.2H4.4A4.4 4.4 0 0 0 0 7.6v8.8a4.4 4.4 0 0 0 4.4 4.4h15.2a4.4 4.4 0 0 0 4.4-4.4V7.6a4.4 4.4 0 0 0-4.4-4.4zM9.6 16.2V7.8l6.6 4.2-6.6 4.2z" />
                  </svg>
                </a>
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800/40" />
              )}

              {/* Instagram */}
              {socialLinks?.instagram ? (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-emerald-700/70 flex items-center justify-center hover:bg-pink-500 transition"
                  aria-label="Instagram"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm10 2c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3h10zm-5 3.5A5.5 5.5 0 1 0 17.5 13 5.5 5.5 0 0 0 12 7.5zm0 9A3.5 3.5 0 1 1 15.5 13 3.5 3.5 0 0 1 12 16.5zm4.5-10.8a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2z" />
                  </svg>
                </a>
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800/40" />
              )}

              {/* WhatsApp */}
              {socialLinks?.whatsapp ? (
                <a
                  href={socialLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-emerald-700/70 flex items-center justify-center hover:bg-green-600 transition"
                  aria-label="WhatsApp"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M12 2A10 10 0 0 0 2 12a9.93 9.93 0 0 0 1.44 5.21L2 22l4.91-1.28A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.07-1.11L8 19l-2.24.58.6-2.15-.15-.23A8 8 0 1 1 12 20zm4.26-5.73c-.23-.12-1.37-.68-1.58-.76s-.37-.12-.53.12-.6.76-.73.92-.27.18-.5.06a6.54 6.54 0 0 1-3.18-2.79c-.24-.41.24-.38.68-1.25a.45.45 0 0 0 0-.42C9.4 9 9 8 8.81 7.6s-.37-.31-.53-.33h-.45a.86.86 0 0 0-.62.29 2.59 2.59 0 0 0-.81 1.92 4.49 4.49 0 0 0 .94 2.38 10.32 10.32 0 0 0 4.43 3.87 15.3 15.3 0 0 0 1.52.56 3.64 3.64 0 0 0 1.67.11 2.72 2.72 0 0 0 1.79-1.26 2.19 2.19 0 0 0 .15-1.26c-.06-.12-.2-.18-.43-.3z" />
                  </svg>
                </a>
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800/40" />
              )}

              {/* X (Twitter) */}
              {socialLinks?.twitter ? (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-emerald-700/70 flex items-center justify-center hover:bg-gray-600 transition"
                  aria-label="Twitter/X"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M17.53 3h3.96l-8.59 9.82L22 21h-6.47l-5.2-6.3L4.8 21H.84l9.14-10.46L2 3h6.53l4.66 5.64L17.53 3z" />
                  </svg>
                </a>
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800/40" />
              )}
            </div>
          </div>

          {/* SECTION 2 — QUICK LINKS */}
          <div className="space-y-2">
            <h4 className="text-base md:text-lg font-semibold border-b border-white/15 pb-1.5">
              روابط سريعة
            </h4>
            <ul className="space-y-1.5 text-xs md:text-sm text-emerald-50">
              {linksToRender.map((item, idx) => (
                <li
                  key={idx}
                  className={`flex items-center justify-between ${
                    idx < linksToRender.length - 1
                      ? "border-b border-white/10 pb-1.5"
                      : ""
                  }`}
                >
                  <span>{item.title}</span>
                  <span className="text-[10px] md:text-[11px] text-emerald-200">
                    {item.subtitle}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 3 — CONTACT */}
          <div className="space-y-2">
            <h4 className="text-base md:text-lg font-semibold border-b border-white/15 pb-1.5">
              تواصل معنا
            </h4>
            <ul className="space-y-1.5 text-xs md:text-sm text-emerald-50">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">📍</span>
                <span>{address}</span>
              </li>

              <li className="flex items-center gap-2">
                <span>📞</span>
                <span>{phone}</span>
              </li>

              <li className="flex items-center gap-2">
                <span>💬</span>
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-emerald-300/70 hover:text-emerald-200"
                >
                  واتساب: {whatsapp}
                </a>
              </li>

              <li className="flex items-center gap-2">
                <span>✉️</span>
                <a
                  href={`mailto:${email}`}
                  className="underline decoration-emerald-300/70 hover:text-emerald-200 break-all"
                >
                  {email}
                </a>
              </li>

              <li className="flex items-center gap-2">
                <span>⏰</span>
                <span>{workingHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-white/10 mt-4 pt-3 text-[10px] md:text-xs text-emerald-200 flex flex-col md:flex-row items-center justify-between gap-1.5">
          <span>
            © {new Date().getFullYear()} دار ابن الجزري لتحفيظ القرآن – جميع الحقوق محفوظة.
          </span>
          <span className="text-[10px]">
            تم تطوير المنصة لخدمة أهل القرآن 🌿
          </span>
        </div>
      </div>
    </footer>
  );
}

export function DarInfoFooterConnected() {
  const settings = useQuery(api.footerSettings.getFooterSettings);

  if (!settings) {
    return <DarInfoFooter />;
  }

  return (
    <DarInfoFooter
      address={settings.address}
      phone={settings.phone}
      whatsapp={settings.whatsapp}
      email={settings.email}
      workingHours={settings.workingHours}
      socialLinks={settings.socialLinks}
      quickLinks={settings.quickLinks}
    />
  );
}
