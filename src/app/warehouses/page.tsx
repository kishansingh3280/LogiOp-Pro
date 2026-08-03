"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
  EmptyState,
} from "@/components/ui";

type Warehouse = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
};

export default function WarehousesPage() {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    country: "India",
    address: "",
  });

  const load = () =>
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then(setItems);

  useEffect(() => {
    load();
  }, []);

  async function save() {
    await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ name: "", city: "", country: "India", address: "" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Delhi, Kolkata, Jaipur, Mumbai, Bangkok — add more anytime"
        actions={<Button onClick={() => setOpen(true)}>Add warehouse</Button>}
      />

      {items.length === 0 ? (
        <EmptyState title="No warehouses" hint="Seed data may not have run." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => (
            <Card key={w.id}>
              <div className="font-display text-xl">{w.name}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {w.city}, {w.country}
              </div>
              {w.address && (
                <p className="mt-2 text-sm text-[var(--muted)]">{w.address}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add warehouse">
        <div className="grid gap-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!form.name || !form.city}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
