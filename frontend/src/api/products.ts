import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { BulkAdjustPreview, BulkAdjustSummary, ImportPreview, ImportSummary, Product, ProductCategory } from "./types";

export function useProducts(outletId?: number) {
  return useQuery({
    queryKey: ["products", outletId],
    queryFn: async () =>
      (await apiClient.get<Product[]>("/products", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      (await apiClient.post<Product>("/products", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Record<string, unknown> }) =>
      (await apiClient.patch<Product>(`/products/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return (await apiClient.post<{ imageUrl: string }>("/products/upload-image", formData)).data;
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function usePreviewImportProducts() {
  return useMutation({
    mutationFn: async ({ csv, outletId }: { csv: string; outletId?: number }) =>
      (await apiClient.post<ImportPreview>("/products/import/preview", { csv }, { params: { outletId } })).data,
  });
}

export function useImportProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ csv, outletId }: { csv: string; outletId?: number }) =>
      (await apiClient.post<ImportSummary>("/products/import", { csv }, { params: { outletId } })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export async function downloadProductImportTemplate() {
  const response = await apiClient.get<string>("/products/import/template", { responseType: "text" });
  const blob = new Blob([response.data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "products-import-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function usePreviewBulkAdjustProducts() {
  return useMutation({
    mutationFn: async ({ csv, outletId }: { csv: string; outletId: number }) =>
      (await apiClient.post<BulkAdjustPreview>("/products/bulk-adjust/preview", { csv }, { params: { outletId } })).data,
  });
}

export function useBulkAdjustProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ csv, outletId }: { csv: string; outletId: number }) =>
      (await apiClient.post<BulkAdjustSummary>("/products/bulk-adjust", { csv }, { params: { outletId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

export async function downloadBulkAdjustmentTemplate() {
  const response = await apiClient.get<string>("/products/bulk-adjust/template", { responseType: "text" });
  const blob = new Blob([response.data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "products-bulk-adjustment-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<ProductCategory[]>("/categories")).data,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<ProductCategory>("/categories", { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      (await apiClient.patch<ProductCategory>(`/categories/${id}`, { name })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
