export type Role = "ADMIN" | "MANAGER" | "CASHIER" | "KITCHEN";
export type TransactionStatus = "HELD" | "OPEN" | "COMPLETED" | "VOIDED" | "REFUNDED";
export type PaymentMethod = "CASH" | "CARD" | "EWALLET" | "GIFT_CARD" | "LOYALTY_POINTS";
export type MovementType = "RESTOCK" | "WASTAGE" | "CORRECTION" | "SALE" | "REFUND" | "TRANSFER_OUT" | "TRANSFER_IN";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "NOT_AVAILABLE";
export type TableShape = "ROUND" | "RECTANGLE";
export type DiscountType = "PERCENTAGE" | "FIXED";
export type DiscountScope = "LINE" | "ORDER";
export type PrepStatus = "QUEUED" | "PREPARING" | "READY" | "SERVED";
export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
export type StockTransferStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface Outlet {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  receiptLogoUrl?: string | null;
  receiptFooter?: string | null;
  loyaltyEarnRate?: number;
  loyaltyRedeemRate?: number;
}

export interface UserDto {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  outletIds: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  value: string;
  skuSuffix?: string | null;
  priceAdjustment: number;
}

export interface TaxRate {
  id: string;
  outletId: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface ProductStock {
  id: string;
  productId: string;
  variantId: string | null;
  outletId: string;
  quantity: number;
}

export interface KitchenStation {
  id: string;
  outletId: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  category?: ProductCategory | null;
  unitPrice: number;
  costPrice?: number; // absent for cashiers
  taxRateId: string | null;
  taxRate?: TaxRate | null;
  stationId?: string | null;
  station?: KitchenStation | null;
  unitOfMeasure: string;
  imageUrl?: string | null;
  lowStockThreshold: number;
  isActive: boolean;
  variants: ProductVariant[];
  stocks?: ProductStock[];
}

export type CustomerSource = "WALK_IN" | "SOCIAL_MEDIA" | "REFERRAL" | "THIRD_PARTY" | "ONLINE";

export interface Customer {
  id: string;
  name: string;
  identificationNo?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  source?: CustomerSource | null;
  pointsBalance?: number;
  createdAt?: string;
}

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  code?: string | null;
  isActive: boolean;
  minSpend?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  usageLimit?: number | null;
  usageCount?: number;
  productId?: string | null;
  categoryId?: string | null;
}

export interface TableDto {
  id: string;
  outletId: string;
  name: string;
  capacity: number;
  status: TableStatus;
  posX: number | null;
  posY: number | null;
  shape: TableShape | null;
  width: number | null;
  height: number | null;
  reservedFor: string | null;
  reservedAt: string | null;
  reservedPartySize: number | null;
}

export interface TransactionItemDto {
  id: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  discountId: string | null;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  prepStatus?: PrepStatus;
  preparingAt?: string | null;
  readyAt?: string | null;
  servedAt?: string | null;
}

export interface PaymentDto {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  remark?: string | null;
  giftCardId?: string | null;
  giftCard?: { id: string; code: string } | null;
}

export interface TransactionDto {
  id: string;
  outletId: string;
  outlet?: Outlet;
  tableId: string | null;
  table?: TableDto | null;
  customerId: string | null;
  customer?: Customer | null;
  cashierId: string;
  cashier?: { id: string; name: string };
  status: TransactionStatus;
  receiptNumber?: string | null;
  subtotal: number;
  discountTotal: number;
  orderDiscountId?: string | null;
  orderDiscount?: Discount | null;
  taxTotal: number;
  total: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  notes?: string | null;
  voidReason?: string | null;
  items: TransactionItemDto[];
  payments: PaymentDto[];
  createdAt: string;
  _count?: { items: number };
}

export interface InventoryMovement {
  id: string;
  outletId: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  type: MovementType;
  quantityChange: number;
  reason?: string | null;
  createdAt: string;
  performedBy: { id: string; name: string };
}

export interface CashSession {
  id: string;
  outletId: string;
  userId: string;
  status: "OPEN" | "CLOSED";
  openingCash: number;
  expectedCash?: number | null;
  actualCash?: number | null;
  difference?: number | null;
  openedAt: string;
  closedAt?: string | null;
}

export type AttendanceStatus = "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";

export interface StaffShiftTemplate {
  id: string;
  outletId: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"; endTime <= startTime means overnight
  breakMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffShiftSchedule {
  id: string;
  outletId: string;
  userId: string;
  user?: { id: string; name: string; role: string };
  shiftTemplateId: string;
  shiftTemplate?: StaffShiftTemplate;
  date: string;
  notes?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffBreakRecord {
  id: string;
  attendanceId: string;
  breakStart: string;
  breakEnd?: string | null;
  createdAt: string;
}

export interface StaffAttendance {
  id: string;
  outletId: string;
  userId: string;
  user?: { id: string; name: string; role: string };
  scheduleId?: string | null;
  schedule?: StaffShiftSchedule | null;
  status: AttendanceStatus;
  clockInAt: string;
  clockOutAt?: string | null;
  totalWorkedMinutes?: number | null;
  totalBreakMinutes?: number | null;
  hasComplianceIssue: boolean;
  complianceNotes?: string | null;
  breaks: StaffBreakRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyComplianceSummary {
  userId: string;
  userName: string;
  weekStart: string;
  workedHours: number;
  daysWorked: number;
  hasNoRestDay: boolean;
  exceedsWeeklyHours: boolean;
}

export interface AuditLogEntry {
  id: string;
  outletId?: string | null;
  userId: string;
  user?: { id: string; name: string };
  action: string;
  entityType: string;
  entityId: string;
  details?: unknown;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTerms?: string | null;
  isActive: boolean;
}

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrderDto {
  id: string;
  outletId: string;
  outlet?: Outlet;
  supplierId: string;
  supplier?: Supplier;
  status: PurchaseOrderStatus;
  createdBy?: { id: string; name: string };
  orderedAt?: string | null;
  expectedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemDto[];
  createdAt: string;
  _count?: { items: number };
}

export interface StockTransferItemDto {
  id: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  quantity: number;
}

export interface StockTransferDto {
  id: string;
  fromOutletId: string;
  fromOutlet?: Outlet;
  toOutletId: string;
  toOutlet?: Outlet;
  status: StockTransferStatus;
  requestedBy?: { id: string; name: string };
  sentAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  items: StockTransferItemDto[];
  createdAt: string;
  _count?: { items: number };
}

export interface ImportRowError {
  row: number;
  sku?: string;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

export type ImportRowAction = "create" | "update" | "restore" | "invalid";

export interface ImportPreviewRow {
  row: number;
  sku?: string;
  name?: string;
  action: ImportRowAction;
  note?: string;
  error?: string;
}

export interface ImportPreview {
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  toRestore: number;
  invalid: number;
  rows: ImportPreviewRow[];
}

export interface BulkAdjustRowError {
  row: number;
  sku?: string;
  message: string;
}

export interface BulkAdjustSummary {
  totalRows: number;
  adjusted: number;
  failed: number;
  errors: BulkAdjustRowError[];
}

export type BulkAdjustRowAction = "adjust" | "invalid";

export interface BulkAdjustPreviewRow {
  row: number;
  sku?: string;
  name?: string;
  action: BulkAdjustRowAction;
  note?: string;
  error?: string;
}

export interface BulkAdjustPreview {
  totalRows: number;
  toAdjust: number;
  invalid: number;
  rows: BulkAdjustPreviewRow[];
}

export interface GiftCard {
  id: string;
  code: string;
  balance: number;
  isActive: boolean;
  issuedAt: string;
  expiresAt?: string | null;
}
