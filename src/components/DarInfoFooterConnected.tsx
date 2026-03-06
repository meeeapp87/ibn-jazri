// src/components/DarInfoFooterConnected.tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DarInfoFooter } from "./DarInfoFooter";

export function DarInfoFooterConnected() {
  const data = useQuery(api.footerSettings.getFooterSettings, {});

  if (data === undefined || data === null) {
    // لسه محمّل أو مفيش إعدادات → نعرض القيم الافتراضية
    return <DarInfoFooter />;
  }

  return (
    <DarInfoFooter
      address={data.address}
      phone={data.phone}
      whatsapp={data.whatsapp}
      email={data.email}
      workingHours={data.workingHours}
      socialLinks={data.socialLinks as any}
    />
  );
}
