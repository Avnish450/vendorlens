'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  unreadAlertCount?: number;
}

export function Header({ unreadAlertCount = 3 }: HeaderProps) {
  const pathname = usePathname();

  const getBreadcrumb = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/vendors/new')) return 'Vendors / Register';
    if (pathname.startsWith('/vendors') && pathname.includes('/edit')) return 'Vendors / Edit';
    if (pathname.startsWith('/vendors/') && pathname.length > 9) return 'Vendors / Evaluation Dossier';
    if (pathname.startsWith('/vendors')) return 'Vendors / Directory';
    if (pathname.startsWith('/remediation')) return 'Governance / Remediation Queue';
    if (pathname.startsWith('/compare')) return 'Evaluation / Comparison Matrix';
    if (pathname.startsWith('/alerts')) return 'Signals / Security Alerts';
    if (pathname.startsWith('/reports')) return 'Compliance / Audit Reports';
    if (pathname.startsWith('/scoring')) return 'Documentation / Scoring Model';
    if (pathname.startsWith('/about')) return 'Documentation / Overview';
    return 'VendorLens';
  };

  return (
    <header className="h-14 border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 lg:pl-8">
      <div className="flex items-center gap-2 pl-10 lg:pl-0 font-mono text-xs">
        <span className="text-muted-foreground">Tenant:</span>
        <span className="text-foreground font-semibold">Production (Global)</span>
        <span className="text-muted-foreground mx-1">/</span>
        <span className="text-foreground">{getBreadcrumb()}</span>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/alerts">
          <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-mono font-bold text-white">
                {unreadAlertCount}
              </span>
            )}
          </Button>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
