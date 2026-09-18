import { QRCodeSVG } from "qrcode.react";
import { TransactionDto } from "@/api/types";
import { money } from "@/features/pos/cartMath";

export function Receipt({ transaction }: { transaction: TransactionDto }) {
  return (
    <div className="font-mono text-sm w-72 mx-auto bg-white text-black p-4" id="receipt">
      <div className="text-center mb-2">
        {transaction.outlet?.receiptLogoUrl && (
          <img src={transaction.outlet.receiptLogoUrl} alt="" className="h-10 mx-auto mb-1 object-contain" />
        )}
        <p className="font-bold">{transaction.outlet?.name ?? "POS"}</p>
        {transaction.outlet?.address && <p className="text-xs">{transaction.outlet.address}</p>}
        {transaction.outlet?.einvoiceTin && (
          <p className="text-[10px] text-gray-600">TIN: {transaction.outlet.einvoiceTin}</p>
        )}
        {transaction.outlet?.einvoiceBrn && (
          <p className="text-[10px] text-gray-600">Reg No: {transaction.outlet.einvoiceBrn}</p>
        )}
        <p className="text-xs">{new Date(transaction.createdAt).toLocaleString()}</p>
        <p className="text-xs">Receipt #{transaction.receiptNumber ?? transaction.id}</p>
      </div>
      <hr className="border-dashed my-2" />
      <div className="flex justify-between text-xs font-bold mb-1">
        <span className="w-5">No.</span>
        <span className="flex-1">Products</span>
        <span>Price (RM)</span>
      </div>
      {transaction.items.map((item, index) => (
        <div key={item.id} className="flex justify-between text-xs mb-1">
          <span className="w-5">{index + 1}.</span>
          <span className="flex-1">
            {item.quantity}x {item.product.name}
            {item.variant ? ` (${item.variant.value})` : ""}
          </span>
          <span>{money(Number(item.lineTotal))}</span>
        </div>
      ))}
      <hr className="border-dashed my-2" />
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(Number(transaction.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{money(Number(transaction.discountTotal))}</span>
        </div>
        {Number(transaction.serviceChargeTotal) > 0 && (
          <div className="flex justify-between">
            <span>Service Charge</span>
            <span>{money(Number(transaction.serviceChargeTotal))}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{money(Number(transaction.taxTotal))}</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-1">
          <span>Total</span>
          <span>{money(Number(transaction.total))}</span>
        </div>
      </div>
      <hr className="border-dashed my-2" />
      {transaction.payments.map((p) => (
        <div key={p.id} className="flex justify-between text-xs">
          <span>{p.method}</span>
          <span>{money(Number(p.amount))}</span>
        </div>
      ))}
      {transaction.einvoiceStatus === "GENERATED" && transaction.einvoiceUuid && transaction.einvoiceLongId && (
        <>
          <hr className="border-dashed my-2" />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[10px] font-semibold">Malaysia e-Invoice</p>
            <QRCodeSVG
              value={`https://myinvois.hasil.gov.my/${transaction.einvoiceUuid}/share/${transaction.einvoiceLongId}`}
              size={96}
            />
            <p className="text-[9px] text-gray-500">Scan to validate</p>
          </div>
        </>
      )}
      {transaction.einvoiceStatus === "CANCELLED" && (
        <>
          <hr className="border-dashed my-2" />
          <p className="text-[10px] text-center text-red-600 font-semibold">e-Invoice Cancelled</p>
        </>
      )}
      <p className="text-center text-xs mt-3">{transaction.outlet?.receiptFooter || "Thank you!"}</p>
    </div>
  );
}
