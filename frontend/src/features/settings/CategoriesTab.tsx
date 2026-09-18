import { FormEvent, useState } from "react";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/api/products";
import { ProductCategory } from "@/api/types";
import { Button, Card, Input } from "@/components/ui";

export function CategoriesTab() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCategory.mutateAsync(name.trim());
    setName("");
  }

  function startEdit(c: ProductCategory) {
    setEditingId(c.id);
    setEditingName(c.name);
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) return;
    await updateCategory.mutateAsync({ id, name: editingName.trim() });
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    await deleteCategory.mutateAsync(id);
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  {editingId === c.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                      autoFocus
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {editingId === c.id ? (
                    <>
                      <button onClick={() => saveEdit(c.id)} className="text-brand-600 hover:underline">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:underline">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(c)} className="text-brand-600 hover:underline">
                        Rename
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {categories?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Add Category</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" disabled={createCategory.isPending}>
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
