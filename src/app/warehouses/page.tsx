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
import { apiGet, apiPost } from "@/lib/client-api";

type Warehouse = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
};

export default function WarehousesPage() {
  const [items, setItems] = useState<Warehouse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    country: "India",
    address: "",
  });

  const load = () =>
    apiGet<Warehouse[]>("/api/warehouses")
      .then((w) => {
        setItems(w);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));

  useEffect(() => {
    load();
  }, []);

  async function save() {
    try {
      await apiPost("/api/warehouses", form);
      setOpen(false);
      setForm({ name: "", city: "", country: "India", address: "" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save warehouse");
    }
  }

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Delhi, Kolkata, Jaipur, Mumbai, Bangkok — add more anytime"
        actions={<Button onClick={() => setOpen(true)}>Add warehouse</Button>}
      />

      {error && !items ? (
        <Card>
          <div className="text-red-700">{error}</div>
          <Button className="mt-3" onClick={() => load()}>
            Retry
          </Button>
        </Card>
      ) : !items ? (
        <div className="text-[var(--muted)]">Loading warehouses…</div>
      ) : items.length === 0 ? (
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
