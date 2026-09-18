import { useMemo, useState } from "react";
import { Product, ProductVariant } from "@/api/types";
import { useCategories } from "@/api/products";
import { Input } from "@/components/ui";
import { money } from "./cartMath";

export function ProductGrid({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (product: Product, variant: ProductVariant | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const { data: categories } = useCategories();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
    });
  }, [products, search, categoryId]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    // Barcode-scanner friendly: exact SKU match + Enter adds immediately.
    const match = products.find((p) => p.sku.toLowerCase() === search.trim().toLowerCase());
    if (match) {
      onSelect(match, null);
      setSearch("");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Scan barcode or search product / SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          autoFocus
        />
      </div>
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryId("all")}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
            categoryId === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          All
        </button>
        {categories?.map((c) => (
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
      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelect} />
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-full">No products found.</p>}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product, variant: ProductVariant | null) => void;
}) {
  const [pickingVariant, setPickingVariant] = useState(false);
  const stock = product.stocks?.[0]?.quantity;
  const outOfStock = stock !== undefined && stock <= 0;
  const lowStock = stock !== undefined && !outOfStock && stock <= product.lowStockThreshold;

  function handleClick() {
    if (product.variants.length > 0) {
      setPickingVariant((v) => !v);
    } else {
      onSelect(product, null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={outOfStock}
        className={`w-full h-28 flex flex-col items-start justify-between border rounded-xl p-3 text-left shadow-sm transition-all active:scale-[0.98] ${
          outOfStock
            ? "bg-red-50 border-red-200 cursor-not-allowed"
            : lowStock
            ? "bg-amber-50 border-amber-200 hover:border-brand-500 hover:shadow-md"
            : "bg-green-50/60 border-green-200 hover:border-brand-500 hover:shadow-md"
        }`}
      >
        <span className={`font-medium text-sm line-clamp-2 ${outOfStock ? "text-gray-400" : "text-gray-900"}`}>
          {product.name}
        </span>
        <div className="flex items-center justify-between w-full">
          <span className={`font-semibold ${outOfStock ? "text-gray-400" : "text-brand-700"}`}>
            {money(Number(product.unitPrice))}
          </span>
          {stock !== undefined && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                outOfStock ? "text-red-600" : lowStock ? "text-amber-600" : "text-green-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  outOfStock ? "bg-red-500" : lowStock ? "bg-amber-500" : "bg-green-500"
                }`}
              />
              {outOfStock ? "Out of Stock" : `${stock} left`}
            </span>
          )}
        </div>
      </button>
      {pickingVariant && (
        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {product.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                onSelect(product, v);
                setPickingVariant(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 flex justify-between"
            >
              <span>{v.value}</span>
              <span className="text-gray-400">
                +{money(Number(v.priceAdjustment))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
