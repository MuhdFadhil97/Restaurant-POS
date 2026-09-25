import { useState } from "react";
import { Tabs } from "@/components/ui";
import { SegmentsTab } from "./SegmentsTab";
import { CampaignsTab } from "./CampaignsTab";

const tabs = [
  { key: "segments", label: "Segments", component: SegmentsTab },
  { key: "campaigns", label: "Campaigns", component: CampaignsTab },
] as const;

export function CrmPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("segments");
  const ActiveComponent = tabs.find((t) => t.key === active)!.component;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Marketing</h1>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <ActiveComponent />
    </div>
  );
}
