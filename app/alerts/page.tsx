import { prisma } from '@/lib/db';
import { AlertList, AlertItem } from '@/components/alerts/alert-list';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const alerts = await prisma.alert.findMany({
    include: {
      vendor: {
        select: { name: true, domain: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted: AlertItem[] = alerts.map((a) => ({
    id: a.id,
    vendorId: a.vendorId,
    vendorName: a.vendor.name,
    domain: a.vendor.domain,
    type: a.type as any,
    title: a.title,
    message: a.message,
    severity: a.severity,
    dismissed: a.dismissed,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Security Telemetry Alerts
        </h2>
        <p className="text-xs text-muted-foreground">
          Automated real-time notifications triggered on score drops (≥10 pts), active CISA KEV matches, or imminent certificate expirations
        </p>
      </div>

      <AlertList initialAlerts={formatted} />
    </div>
  );
}
