import { useLicenseStatus } from "@/api/license";

const STYLES: Record<string, string> = {
  RESTRICTED: "bg-red-600 text-white",
  GRACE_PERIOD: "bg-amber-500 text-white",
  EXPIRING_SOON: "bg-amber-100 text-amber-900 border-b border-amber-300",
};

// Shown above the app shell whenever the license needs attention. OK and
// DEV_BYPASS render nothing — no need to nag when everything's fine.
export function LicenseBanner() {
  const { data } = useLicenseStatus();
  if (!data || data.state === "OK" || data.state === "DEV_BYPASS") return null;

  return (
    <div className={`px-4 py-2 text-sm text-center font-medium shrink-0 ${STYLES[data.state]}`}>
      {data.message}
    </div>
  );
}
