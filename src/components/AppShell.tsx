"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Package,
  Boxes,
  Warehouse,
  Truck,
  Menu,
  X,
  MoreHorizontal,
  Receipt,
  Tags,
  Bike,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { DemoBanner } from "@/components/DemoBanner";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/items", label: "Items", icon: Tags },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/bags", label: "Bags", icon: Boxes },
  { href: "/transport", label: "Transport", icon: Truck },
  { href: "/lalamove", label: "Lalamove", icon: Bike },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
];

/** Bottom tabs on phone — same idea as the Android app */
const MOBILE_TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/shipments", label: "Ship", icon: Package },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/parties", label: "Parties", icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--ink)]">
      {/* Desktop / tablet sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--line)] bg-[var(--panel)] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[var(--line)] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-white font-display text-lg font-bold">
            L
          </div>
          <div>
            <div className="font-display text-lg leading-none tracking-tight">LogiOp Pro</div>
            <div className="text-[11px] text-[var(--muted)]">India ↔ Thailand</div>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-medium"
                    : "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <DemoBanner />
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--panel)]/95 px-4 backdrop-blur lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base lg:hidden">LogiOp Pro</div>
            <div className="hidden text-sm text-[var(--muted)] lg:block">
              Web app · works on PC & phone Chrome
            </div>
          </div>
          <button
            className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--muted)] lg:hidden"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
          >
            <MoreHorizontal size={16} />
          </button>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>

      {/* Phone bottom tabs — Android-app style */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur lg:hidden safe-bottom">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
          {MOBILE_TABS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                )}
              >
                <Icon size={20} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More sheet: transport + warehouses */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-[var(--line)] bg-[var(--panel)] p-4 pb-8 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-lg">More</div>
              <button onClick={() => setMoreOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2">
              <Link
                href="/items"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <Tags size={18} className="text-[var(--accent)]" />
                Items
              </Link>
              <Link
                href="/billing"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <Receipt size={18} className="text-[var(--accent)]" />
                Billing
              </Link>
              <Link
                href="/transport"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <Truck size={18} className="text-[var(--accent)]" />
                Transport
              </Link>
              <Link
                href="/lalamove"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <Bike size={18} className="text-[var(--accent)]" />
                Lalamove
              </Link>
              <Link
                href="/warehouses"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <Warehouse size={18} className="text-[var(--accent)]" />
                Warehouses
              </Link>
              <Link
                href="/shipments/new"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl bg-[var(--accent)] px-4 py-3 text-white"
              >
                <Package size={18} />
                New shipment
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
