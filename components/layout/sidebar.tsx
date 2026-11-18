'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Building2,
  ClipboardList,
  GitCompare,
  Bell,
  FileText,
  Calculator,
  Info,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Vendors Directory', href: '/vendors', icon: Building2 },
  { title: 'Remediation Queue', href: '/remediation', icon: ClipboardList },
  { title: 'Vendor Comparison', href: '/compare', icon: GitCompare },
  { title: 'Security Alerts', href: '/alerts', icon: Bell },
  { title: 'Reports & Export', href: '/reports', icon: FileText },
  { title: 'Scoring Methodology', href: '/scoring', icon: Calculator },
  { title: 'Platform Overview', href: '/about', icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          className="bg-card shadow-xs border h-9 w-9"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-[#1a1a1a] bg-[#050505] flex flex-col transition-transform duration-150 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center px-5 border-b border-[#1a1a1a] gap-2.5">
          <div className="h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center font-bold">
            <Shield className="h-4 w-4 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground">
              VendorLens
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              Risk Intelligence
            </span>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Workspace
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Minimalist Environment Status Footer */}
        <div className="p-3 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Telemetry: Active</span>
            </div>
            <span>v1.0-prod</span>
          </div>
        </div>
      </aside>
    </>
  );
}
