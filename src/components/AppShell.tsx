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
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/bags", label: "Bag tracker", icon: Boxes },
  { href: "/transport", label: "Transport", icon: Truck },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--ink)]">
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
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--panel)]/90 px-4 backdrop-blur lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm text-[var(--muted)]">
            Cross-border cargo · ledger · FX
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
