'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Edit2,
  Check,
  Save,
} from 'lucide-react';
import Link from 'next/link';

export interface RemediationRow {
  id: string;
  findingId: string;
  vendorId: string;
  vendorName: string;
  domain: string;
  criticality: string;
  checkName: string;
  category: string;
  severity: string;
  evidence: string;
  recommendedFix: string;
  priority: number;
  status: 'Open' | 'In Review' | 'Resolved';
  note: string;
  createdAt: string | Date;
}

interface RemediationListProps {
  initialItems: RemediationRow[];
}

export function RemediationList({ initialItems }: RemediationListProps) {
  const [items, setItems] = React.useState<RemediationRow[]>(initialItems);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState<string>('');

  const filteredItems = React.useMemo(() => {
    return items
      .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
      .sort((a, b) => b.priority - a.priority);
  }, [items, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: 'Open' | 'In Review' | 'Resolved') => {
    try {
      const res = await fetch('/api/remediation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch {
      // Keep optimistic update or fallback
    }
  };

  const handleSaveNote = async (id: string) => {
    try {
      const res = await fetch('/api/remediation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note: noteText }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, note: noteText } : item))
        );
        setEditingNoteId(null);
      }
    } catch {
      setEditingNoteId(null);
    }
  };

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === 'Open').length,
    inReview: items.filter((i) => i.status === 'In Review').length,
    resolved: items.filter((i) => i.status === 'Resolved').length,
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('ALL')}
            className="h-8 text-xs"
          >
            All Action Items ({counts.all})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'Open' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Open')}
            className="h-8 text-xs text-red-600 dark:text-red-400 gap-1"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Open ({counts.open})</span>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'In Review' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('In Review')}
            className="h-8 text-xs text-amber-600 dark:text-amber-400 gap-1"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>In Review ({counts.inReview})</span>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'Resolved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Resolved')}
            className="h-8 text-xs text-emerald-600 dark:text-emerald-400 gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Resolved ({counts.resolved})</span>
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          Sorted by Priority = (Severity Weight × Business Criticality)
        </span>
      </div>

      {/* Remediation Cards List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="text-center py-10 shadow-xs">
            <CardContent>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No remediation tasks in this queue</p>
              <p className="text-xs text-muted-foreground mt-1">
                All identified security gaps are resolved or none match the active filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item, idx) => {
            const isEditingNote = editingNoteId === item.id;

            return (
              <Card key={item.id} className="shadow-xs hover:border-border/80 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-6">#{idx + 1}</span>
                      <Link
                        href={`/vendors/${item.vendorId}`}
                        className="font-bold text-sm text-foreground hover:text-primary hover:underline"
                      >
                        {item.vendorName}
                      </Link>
                      <span className="text-xs text-muted-foreground">({item.domain})</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.criticality} Criticality
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] font-bold ${
                          item.severity === 'Critical' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          item.severity === 'High' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {item.severity} Severity
                      </Badge>

                      <div className="text-xs font-extrabold bg-muted px-2 py-0.5 rounded text-foreground border">
                        Priority: {item.priority}
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                        className={`h-7 px-2 rounded text-xs font-semibold border ${
                          item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                          item.status === 'In Review' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                          'bg-red-500/10 text-red-600 border-red-500/30'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In Review">In Review</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {/* Finding Evidence */}
                  <div className="p-3 rounded-lg bg-muted/30 border text-xs space-y-1">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Security Finding: {item.checkName}</span>
                    </div>
                    <p className="text-muted-foreground font-mono text-[11px] bg-background/50 p-1.5 rounded border">
                      {item.evidence}
                    </p>
                    <p className="text-foreground pt-1">
                      <strong>Fix:</strong> {item.recommendedFix}
                    </p>
                  </div>

                  {/* Internal Notes */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    {isEditingNote ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add tracking ticket (e.g. SEC-4022) or vendor note..."
                          className="h-7 px-2.5 rounded border text-xs flex-1 bg-background text-foreground"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveNote(item.id)}
                          className="h-7 text-xs px-2.5 gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingNoteId(null)}
                          className="h-7 text-xs px-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                          {item.note ? (
                            <strong className="text-foreground font-medium">{item.note}</strong>
                          ) : (
                            <em className="text-muted-foreground">No audit note attached</em>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            setNoteText(item.note || '');
                            setEditingNoteId(item.id);
                          }}
                          className="text-primary hover:underline text-[11px] ml-1 flex items-center gap-0.5"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    )}

                    <Link
                      href={`/vendors/${item.vendorId}`}
                      className="text-primary hover:underline flex items-center gap-1 font-medium ml-auto"
                    >
                      <span>Vendor Dossier</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
