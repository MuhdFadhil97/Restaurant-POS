export interface ReportColumn {
  key: string;
  header: string;
  format?: "text" | "number" | "currency" | "date" | "datetime" | "percent";
  align?: "left" | "right" | "center";
}

export interface ReportMeta {
  outletName?: string;
  from?: string;
  to?: string;
  generatedAt: string;
  generatedBy?: string;
  filtersApplied?: Record<string, string | number | undefined>;
}

export type ReportRow = Record<string, string | number | boolean | null | undefined>;

export interface ReportData<Row extends ReportRow = ReportRow> {
  title: string;
  columns: ReportColumn[];
  rows: Row[];
  meta: ReportMeta;
  totals?: Partial<Record<string, number | string>>;
}
