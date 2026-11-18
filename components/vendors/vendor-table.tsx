'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { formatTimeAgo, isStale } from '@/lib/utils';

export interface VendorTableRow {
  id: string;
  name: string;
  domain: string;
  category: string;
  criticality: string;
  score: number;
  grade: string;
  riskTier: string;
  coveragePercent: number;
  lastScanned: string | Date;
  trend: 'up' | 'down' | 'stable';
}

interface VendorTableProps {
  initialVendors: VendorTableRow[];
}

export function VendorTable({ initialVendors }: VendorTableProps) {
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('ALL');
  const [criticalityFilter, setCriticalityFilter] = React.useState('ALL');
  const [tierFilter, setTierFilter] = React.useState('ALL');
  const [sortField, setSortField] = React.useState<'score' | 'name' | 'lastScanned'>('score');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const categories = React.useMemo(() => {
    const set = new Set(initialVendors.map((v) => v.category));
    return Array.from(set);
  }, [initialVendors]);

  const filteredVendors = React.useMemo(() => {
    return initialVendors
      .filter((v) => {
        const matchesSearch =
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.domain.toLowerCase().includes(search.toLowerCase());
        const matchesCategory =
          categoryFilter === 'ALL' || v.category === categoryFilter;
        const matchesCriticality =
          criticalityFilter === 'ALL' || v.criticality === criticalityFilter;
        const matchesTier =
          tierFilter === 'ALL' || v.riskTier === tierFilter;
        return matchesSearch && matchesCategory && matchesCriticality && matchesTier;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'score') {
          diff = a.score - b.score;
        } else if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'lastScanned') {
          diff = new Date(a.lastScanned).getTime() - new Date(b.lastScanned).getTime();
        }
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [initialVendors, search, categoryFilter, criticalityFilter, tierFilter, sortField, sortOrder]);

  const toggleSort = (field: 'score' | 'name' | 'lastScanned') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor name or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-2.5 rounded-md border text-xs bg-background text-foreground"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Criticality Filter */}
          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="h-9 px-2.5 rounded-md border text-xs bg-background text-foreground"
          >
            <option value="ALL">All Criticality</option>
            <option value="High">High Criticality</option>
            <option value="Medium">Medium Criticality</option>
            <option value="Low">Low Criticality</option>
          </select>

          {/* Risk Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-9 px-2.5 rounded-md border text-xs bg-background text-foreground"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="Low">Low Risk (80-100)</option>
            <option value="Medium">Medium Risk (65-79)</option>
            <option value="High">High Risk (40-64)</option>
            <option value="Critical">Critical Risk (0-39)</option>
          </select>

          <Link href="/vendors/new">
            <Button size="sm" className="h-9 gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Add Vendor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[280px]">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1.5 font-semibold text-foreground text-xs hover:text-primary"
                >
                  Vendor / Domain
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-xs font-semibold">Category</TableHead>
              <TableHead className="text-xs font-semibold">Criticality</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('score')}
                  className="flex items-center gap-1.5 font-semibold text-foreground text-xs hover:text-primary"
                >
                  Security Score
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-xs font-semibold">Risk Tier</TableHead>
              <TableHead className="text-xs font-semibold">Coverage</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('lastScanned')}
                  className="flex items-center gap-1.5 font-semibold text-foreground text-xs hover:text-primary"
                >
                  Last Scanned
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right text-xs font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  No vendors found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => {
                const stale = isStale(new Date(vendor.lastScanned));
                const scoreColor =
                  vendor.score >= 80 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' :
                  vendor.score >= 65 ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' :
                  'text-red-600 bg-red-500/10 border-red-500/20';

                return (
                  <TableRow key={vendor.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="font-semibold text-xs text-foreground hover:underline flex flex-col"
                      >
                        <span>{vendor.name}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">{vendor.domain}</span>
                      </Link>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {vendor.category}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className={`text-xs font-mono font-medium ${
                        vendor.criticality === 'High' ? 'text-orange-500 font-semibold' :
                        vendor.criticality === 'Medium' ? 'text-foreground' :
                        'text-muted-foreground'
                      }`}>
                        {vendor.criticality}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${scoreColor}`}>
                          {vendor.score} ({vendor.grade})
                        </div>
                        <div className="text-muted-foreground">
                          {vendor.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                          {vendor.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                          {vendor.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`text-xs font-mono font-medium ${
                        vendor.riskTier === 'Low' ? 'text-emerald-500' :
                        vendor.riskTier === 'Medium' ? 'text-amber-500' :
                        'text-red-500 font-semibold'
                      }`}>
                        {vendor.riskTier}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {vendor.coveragePercent}%
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{formatTimeAgo(new Date(vendor.lastScanned))}</span>
                        {stale && (
                          <span title="Last evaluated > 7 days ago">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Link href={`/vendors/${vendor.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                          <span>Inspect</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
