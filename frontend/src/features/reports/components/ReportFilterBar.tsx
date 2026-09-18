import { ReactNode } from "react";
import { Input, Select } from "@/components/ui";

export interface DateRangeState {
  from: string;
  to: string;
}

export function startOfTodayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toIsoRange({ from, to }: DateRangeState): { from: string; to: string } {
  return {
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59`).toISOString(),
  };
}

export function ReportFilterBar({
  range,
  onRangeChange,
  groupBy,
  onGroupByChange,
  extra,
}: {
  range: DateRangeState;
  onRangeChange: (range: DateRangeState) => void;
  groupBy?: "day" | "week" | "month";
  onGroupByChange?: (groupBy: "day" | "week" | "month") => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input type="date" value={range.from} onChange={(e) => onRangeChange({ ...range, from: e.target.value })} />
      <span className="text-gray-400">to</span>
      <Input type="date" value={range.to} onChange={(e) => onRangeChange({ ...range, to: e.target.value })} />
      {onGroupByChange && (
        <Select value={groupBy} onChange={(e) => onGroupByChange(e.target.value as "day" | "week" | "month")} className="w-32">
          <option value="day">By day</option>
          <option value="week">By week</option>
          <option value="month">By month</option>
        </Select>
      )}
      {extra}
    </div>
  );
}
