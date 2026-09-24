import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { Tabs } from "@/components/ui";
import { ThisDeviceSection } from "./ThisDeviceSection";
import { TerminalsSection } from "./TerminalsSection";
import { PrintersSection } from "./PrintersSection";
import { PrintJobsSection } from "./PrintJobsSection";

const sections = [
  { key: "device", label: "This Device" },
  { key: "terminals", label: "Terminals" },
  { key: "printers", label: "Printers" },
  { key: "jobs", label: "Print Jobs" },
] as const;

export function HardwareTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [active, setActive] = useState<(typeof sections)[number]["key"]>("device");

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <Tabs tabs={sections} active={active} onChange={setActive} />
      {active === "device" && <ThisDeviceSection outletId={outletId} />}
      {active === "terminals" && <TerminalsSection outletId={outletId} />}
      {active === "printers" && <PrintersSection outletId={outletId} />}
      {active === "jobs" && <PrintJobsSection outletId={outletId} />}
    </div>
  );
}
