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
export type StockTakeStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type EInvoiceStatus = "NOT_APPLICABLE" | "GENERATED" | "CANCELLED";

export interface Outlet {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  einvoiceTin?: string | null;
  einvoiceBrn?: string | null;
  einvoiceMsicCode?: string | null;
  einvoiceSstNo?: string | null;
  receiptLogoUrl?: string | null;
  receiptFooter?: string | null;
  loyaltyEarnRate?: number;
  loyaltyRedeemRate?: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
}

export interface UserDto {
  id: number;
  email: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  outletIds: number[];
}

export interface ProductCategory {
  id: number;
  name: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  value: string;
  skuSuffix?: string | null;
  priceAdjustment: number;
}

export interface TaxRate {
  id: number;
  outletId: number;
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface ProductStock {
  id: number;
  productId: number;
  variantId: number | null;
  outletId: number;
  quantity: number;
}

export interface KitchenStation {
  id: number;
  outletId: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId: number | null;
  category?: ProductCategory | null;
  unitPrice: number;
  costPrice?: number; // absent for cashiers
  taxRateId: number | null;
  taxRate?: TaxRate | null;
  stationId?: number | null;
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
  id: number;
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
  id: number;
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
  productId?: number | null;
  categoryId?: number | null;
}

export interface TableDto {
  id: number;
  outletId: number;
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
  id: number;
  productId: number;
  product: Product;
  variantId: number | null;
  variant: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  discountId: number | null;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  prepStatus?: PrepStatus;
  preparingAt?: string | null;
  readyAt?: string | null;
  servedAt?: string | null;
}

export interface PaymentDto {
  id: number;
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  remark?: string | null;
  giftCardId?: number | null;
  giftCard?: { id: number; code: string } | null;
}

export interface TransactionDto {
  id: number;
  outletId: number;
  outlet?: Outlet;
  tableId: number | null;
  table?: TableDto | null;
  customerId: number | null;
  customer?: Customer | null;
  cashierId: number;
  cashier?: { id: number; name: string };
  status: TransactionStatus;
  receiptNumber?: string | null;
  einvoiceStatus?: EInvoiceStatus;
  einvoiceUuid?: string | null;
  einvoiceLongId?: string | null;
  einvoiceGeneratedAt?: string | null;
  subtotal: number;
  discountTotal: number;
  orderDiscountId?: number | null;
  orderDiscount?: Discount | null;
  serviceChargeTotal: number;
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
  id: number;
  outletId: number;
  productId: number;
  product: Product;
  variantId: number | null;
  variant: ProductVariant | null;
  type: MovementType;
  quantityChange: number;
  reason?: string | null;
  createdAt: string;
  performedBy: { id: number; name: string };
}

export interface CashSession {
  id: number;
  outletId: number;
  userId: number;
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
  id: number;
  outletId: number;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"; endTime <= startTime means overnight
  breakMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffShiftSchedule {
  id: number;
  outletId: number;
  userId: number;
  user?: { id: number; name: string; role: string };
  shiftTemplateId: number;
  shiftTemplate?: StaffShiftTemplate;
  date: string;
  notes?: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffBreakRecord {
  id: number;
  attendanceId: number;
  breakStart: string;
  breakEnd?: string | null;
  createdAt: string;
}

export interface StaffAttendance {
  id: number;
  outletId: number;
  userId: number;
  user?: { id: number; name: string; role: string };
  scheduleId?: number | null;
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
  userId: number;
  userName: string;
  weekStart: string;
  workedHours: number;
  daysWorked: number;
  hasNoRestDay: boolean;
  exceedsWeeklyHours: boolean;
}

export interface AuditLogEntry {
  id: number;
  outletId?: number | null;
  userId: number;
  user?: { id: number; name: string };
  action: string;
  entityType: string;
  entityId: number;
  details?: unknown;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTerms?: string | null;
  isActive: boolean;
}

export interface PurchaseOrderItemDto {
  id: number;
  productId: number;
  product: Product;
  variantId: number | null;
  variant: ProductVariant | null;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrderDto {
  id: number;
  outletId: number;
  outlet?: Outlet;
  supplierId: number;
  supplier?: Supplier;
  status: PurchaseOrderStatus;
  createdBy?: { id: number; name: string };
  orderedAt?: string | null;
  expectedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemDto[];
  createdAt: string;
  _count?: { items: number };
}

export interface StockTransferItemDto {
  id: number;
  productId: number;
  product: Product;
  variantId: number | null;
  variant: ProductVariant | null;
  quantity: number;
}

export interface StockTransferDto {
  id: number;
  fromOutletId: number;
  fromOutlet?: Outlet;
  toOutletId: number;
  toOutlet?: Outlet;
  status: StockTransferStatus;
  requestedBy?: { id: number; name: string };
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

export interface GoodsReceivedNoteItemDto {
  id: number;
  purchaseOrderItemId: number;
  productId: number;
  product: Product;
  variantId: number | null;
  variant: ProductVariant | null;
  quantityReceived: number;
  quantityRejected: number;
  rejectionReason?: string | null;
  unitCost: number;
}

export interface GoodsReceivedNoteDto {
  id: number;
  purchaseOrderId: number;
  purchaseOrder?: PurchaseOrderDto;
  outletId: number;
  outlet?: Outlet;
  receivedBy?: { id: number; name: string };
  receivedAt: string;
  notes?: string | null;
  items: GoodsReceivedNoteItemDto[];
  createdAt: string;
  _count?: { items: number };
}

export interface StockTakeItemDto {
  id: number;
  productId: number;
  product: Product;
  variantId: number | null;
  variant: ProductVariant | null;
  systemQuantity: number;
  countedQuantity: number | null;
  notes?: string | null;
}

export interface StockTakeDto {
  id: number;
  outletId: number;
  outlet?: Outlet;
  status: StockTakeStatus;
  startedBy?: { id: number; name: string };
  completedBy?: { id: number; name: string } | null;
  notes?: string | null;
  startedAt: string;
  completedAt?: string | null;
  items: StockTakeItemDto[];
  _count?: { items: number };
}

export interface GiftCard {
  id: number;
  code: string;
  balance: number;
  isActive: boolean;
  issuedAt: string;
  expiresAt?: string | null;
}
