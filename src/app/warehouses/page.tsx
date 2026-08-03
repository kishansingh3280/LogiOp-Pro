"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
  EmptyState,
  Badge,
} from "@/components/ui";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/client-api";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { MapPin } from "lucide-react";

type Warehouse = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

const emptyForm = {
  name: "",
  city: "",
  country: "India",
  address: "",
  latitude: null as number | null,
  longitude: null as number | null,
  placeId: null as string | null,
};

export default function WarehousesPage() {
  const [items, setItems] = useState<Warehouse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () =>
    apiGet<Warehouse[]>("/api/warehouses")
      .then((w) => {
        setItems(w);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(w: Warehouse) {
    setEditId(w.id);
    setForm({
      name: w.name,
      city: w.city,
      country: w.country,
      address: w.address || "",
      latitude: w.latitude,
      longitude: w.longitude,
      placeId: w.placeId,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.city.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country.trim() || "India",
      address: form.address || null,
      latitude: form.latitude,
      longitude: form.longitude,
      placeId: form.placeId,
    };
    try {
      if (editId) await apiPatch(`/api/warehouses/${editId}`, payload);
      else await apiPost("/api/warehouses", payload);
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save warehouse");
    } finally {
      setSaving(false);
    }
  }

  async function remove(w: Warehouse) {
    if (
      !confirm(
        `Remove warehouse “${w.name}”? It will be hidden from new shipments.`
      )
    )
      return;
    try {
      await apiDelete(`/api/warehouses/${w.id}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function onLocation(loc: LocationValue) {
    setForm((f) => ({
      ...f,
      address: loc.address || f.address,
      city: loc.city || f.city,
      country: loc.country || f.country,
      latitude: loc.latitude,
      longitude: loc.longitude,
      placeId: loc.placeId,
    }));
  }

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Hub locations with map pins — used as Lalamove pickup when bags arrive"
        actions={<Button onClick={openCreate}>Add warehouse</Button>}
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
        <EmptyState
          title="No warehouses"
          hint="Add your Delhi, Bangkok, or other hubs with a map pin."
        />
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
              <div className="mt-2 flex flex-wrap gap-2">
                {w.latitude != null && w.longitude != null ? (
                  <Badge tone="ok">
                    <MapPin size={12} className="mr-1 inline" />
                    Mapped
                  </Badge>
                ) : (
                  <Badge tone="warn">No map pin</Badge>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  className="text-sm text-[var(--accent)]"
                  onClick={() => openEdit(w)}
                >
                  Modify
                </button>
                <button
                  className="text-sm text-red-600"
                  onClick={() => remove(w)}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Modify warehouse" : "Add warehouse"}
        wide
      >
        <div className="grid gap-3">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Bangkok Warehouse"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="City *"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <LocationPicker
            label="Search map / pin location (Lalamove pickup)"
            value={{
              address: form.address,
              city: form.city,
              country: form.country,
              latitude: form.latitude,
              longitude: form.longitude,
              placeId: form.placeId,
            }}
            onChange={onLocation}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!form.name || !form.city || saving}
            >
              {saving ? "Saving…" : editId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
