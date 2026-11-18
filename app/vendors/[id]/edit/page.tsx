import { prisma } from '@/lib/db';
import { VendorForm } from '@/components/vendors/vendor-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
  });

  if (!vendor) {
    notFound();
  }

  return (
    <div className="py-6">
      <VendorForm
        isEdit
        initialData={{
          id: vendor.id,
          name: vendor.name,
          domain: vendor.domain,
          category: vendor.category,
          criticality: vendor.criticality,
          declaredProducts: vendor.declaredProducts,
        }}
      />
    </div>
  );
}
