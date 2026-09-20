import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQrMenu, useSubmitQrOrder } from "@/api/qrOrder";
import { QrMenuProduct } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Spinner, ErrorMessage } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { useQrCartStore } from "@/store/qrCartStore";

function cartKey(productId: number, variantId?: number) {
  return variantId ? `${productId}:${variantId}` : `${productId}`;
}

export function QrMenuPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQrMenu(token);
  const submitOrder = useSubmitQrOrder(token);
  const cart = useQrCartStore((s) => s.cartsByToken[token] ?? []);
  const addItem = useQrCartStore((s) => s.addItem);
  const setQuantity = useQrCartStore((s) => s.setQuantity);
  const clearCart = useQrCartStore((s) => s.clearCart);

  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, string>();
    for (const p of data.menu) {
      if (p.category) map.set(p.category.id, p.category.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [data]);

  const filteredMenu = useMemo(() => {
    if (!data) return [];
    if (categoryId === "all") return data.menu;
    return data.menu.filter((p) => p.categoryId === categoryId);
  }, [data, categoryId]);

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function handleAdd(product: QrMenuProduct, variant: QrMenuProduct["variants"][number] | null) {
    addItem(token, {
      key: cartKey(product.id, variant?.id),
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      variantLabel: variant?.value,
      unitPrice: Number(product.unitPrice) + Number(variant?.priceAdjustment ?? 0),
    });
  }

  async function handleSubmit() {
    if (cart.length === 0) return;
    setSubmitError(null);
    try {
      await submitOrder.mutateAsync(
        cart.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      );
      clearCart(token);
      navigate(`/order/${token}/status`);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <ErrorMessage message={getErrorMessage(error) || "This QR code is invalid or has expired."} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <p className="font-semibold text-gray-900">{data.outlet.name}</p>
        <p className="text-sm text-gray-500">Table {data.table.name}</p>
      </header>

      {data.activeOrder && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm text-brand-800">
          Your table already has an order in progress.{" "}
          <button className="underline font-medium" onClick={() => navigate(`/order/${token}/status`)}>
            View status
          </button>
        </div>
      )}

      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        <button
          onClick={() => setCategoryId("all")}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
            categoryId === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              categoryId === c.id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredMenu.map((product) => (
          <MenuCard key={product.id} product={product} onAdd={handleAdd} />
        ))}
        {filteredMenu.length === 0 && <p className="text-gray-400 text-sm col-span-full py-8 text-center">No items in this category.</p>}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          {submitError && (
            <div className="mb-2">
              <ErrorMessage message={submitError} />
            </div>
          )}
          <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
            <span>{cartCount} item{cartCount === 1 ? "" : "s"}</span>
            <span className="font-semibold text-gray-900">{money(cartTotal)}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitOrder.isPending}
            className="w-full bg-brand-600 text-white font-medium py-3 rounded-lg disabled:bg-gray-300"
          >
            {submitOrder.isPending ? "Placing order..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuCard({
  product,
  onAdd,
}: {
  product: QrMenuProduct;
  onAdd: (product: QrMenuProduct, variant: QrMenuProduct["variants"][number] | null) => void;
}) {
  const [pickingVariant, setPickingVariant] = useState(false);
  const stock = product.stocks?.[0]?.quantity;
  const outOfStock = stock !== undefined && stock <= 0;

  function handleClick() {
    if (outOfStock) return;
    if (product.variants.length > 0) {
      setPickingVariant((v) => !v);
    } else {
      onAdd(product, null);
    }
  }

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <button onClick={handleClick} disabled={outOfStock} className="w-full text-left disabled:opacity-50">
        <p className="font-medium text-gray-900">{product.name}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold text-brand-700">{money(Number(product.unitPrice))}</span>
          {outOfStock && <span className="text-xs font-medium text-red-600">Out of Stock</span>}
        </div>
      </button>
      {pickingVariant && (
        <div className="mt-2 border-t border-gray-100 pt-2 space-y-1">
          {product.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                onAdd(product, v);
                setPickingVariant(false);
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-brand-50 flex justify-between"
            >
              <span>{v.value}</span>
              <span className="text-gray-400">+{money(Number(v.priceAdjustment))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
