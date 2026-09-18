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
        <p className="text-xs">{new Date(transaction.createdAt).toLocaleString()}</p>
        <p className="text-xs">Receipt #{transaction.receiptNumber ?? transaction.id}</p>
      </div>
      <hr className="border-dashed my-2" />
      {transaction.items.map((item) => (
        <div key={item.id} className="flex justify-between text-xs mb-1">
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
      <p className="text-center text-xs mt-3">{transaction.outlet?.receiptFooter || "Thank you!"}</p>
    </div>
  );
}
