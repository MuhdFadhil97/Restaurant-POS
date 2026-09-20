import { FormEvent, useEffect, useState } from "react";
import { useOutlets } from "@/api/outlets";
import { useCreateUser, useUpdateUser, useUsers } from "@/api/users";
import { Role, UserDto } from "@/api/types";
import { Badge, Button, Card, Input, Modal, Select } from "@/components/ui";

export function UsersTab() {
  const { data: users } = useUsers();
  const { data: outlets } = useOutlets();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New User</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Outlets</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.username}</td>
                <td className="px-4 py-2">
                  <Badge color="blue">{u.role}</Badge>
                </td>
                <td className="px-4 py-2">
                  {outlets?.filter((o) => u.outletIds.includes(o.id)).map((o) => o.name).join(", ") || "-"}
                </td>
                <td className="px-4 py-2">{u.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setEditing(u)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <UserFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        outlets={outlets ?? []}
        onSubmit={async (input) => {
          await createUser.mutateAsync(input);
          setShowForm(false);
        }}
        title="New User"
      />
      <UserFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        outlets={outlets ?? []}
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateUser.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
        title="Edit User"
      />
    </div>
  );
}

function UserFormModal({
  open,
  onClose,
  onSubmit,
  outlets,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  outlets: { id: number; name: string }[];
  initial?: UserDto;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initial?.role ?? "CASHIER");
  const [outletIds, setOutletIds] = useState<number[]>(initial?.outletIds ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  // The modal stays mounted (both the "create" and "edit" instances) while
  // hidden, so its fields must be re-seeded from `initial` every time it
  // opens — otherwise editing a second row shows stale data from the first,
  // or a blank form the very first time (same class of bug as PaymentModal).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmail(initial?.email ?? "");
      setUsername(initial?.username ?? "");
      setPassword("");
      setRole(initial?.role ?? "CASHIER");
      setOutletIds(initial?.outletIds ?? []);
      setIsActive(initial?.isActive ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  function toggleOutlet(id: number) {
    setOutletIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { name, email, username, role, outletIds, isActive };
      if (password) payload.password = password;
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Full name</label>
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Username</label>
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{initial ? "New password" : "Password"}</label>
          <Input
            placeholder={initial ? "Leave blank to keep current password" : "Password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!initial}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="KITCHEN">Kitchen</option>
          </Select>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Outlet Access</p>
          <div className="space-y-1">
            {outlets.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={outletIds.includes(o.id)} onChange={() => toggleOutlet(o.id)} />
                {o.name}
              </label>
            ))}
          </div>
        </div>
        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
