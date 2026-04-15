'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    joinedAt: new Date().toISOString().slice(0, 10),
    designation: '',
    department: '',
    basicSalaryPaise: 0,
    hraPaise: 0,
  });
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const createMut = trpc.payroll.employees.create.useMutation();
  const bulkMut = trpc.payroll.employees.bulkImport.useMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await createMut.mutateAsync({
      employeeCode: form.employeeCode,
      firstName: form.firstName,
      lastName: form.lastName,
      joinedAt: new Date(form.joinedAt),
      designation: form.designation || undefined,
      department: form.department || undefined,
      basicSalaryPaise: Number(form.basicSalaryPaise),
      hraPaise: Number(form.hraPaise),
      daPaise: 0,
      conveyancePaise: 0,
      medicalPaise: 0,
      otherAllowancePaise: 0,
    } as never);
    router.push('/finance/payroll/employees');
  };

  const handleBulk = async () => {
    const r = (await bulkMut.mutateAsync({ csv } as never)) as { created: number; errors: string[] };
    setResult(`Created ${r.created}, errors: ${r.errors.length}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Employee"
        description="Add a single employee or bulk import via CSV."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payroll', href: '/finance/payroll' },
          { label: 'Employees', href: '/finance/payroll/employees' },
          { label: 'New' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-5">
          <h3 className="text-sm font-semibold">Single Employee</h3>
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Employee Code" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <input className="w-full rounded border px-3 py-2 text-sm" type="date" value={form.joinedAt} onChange={(e) => setForm({ ...form, joinedAt: e.target.value })} required />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="w-full rounded border px-3 py-2 text-sm" type="number" placeholder="Basic Salary (paise)" value={form.basicSalaryPaise} onChange={(e) => setForm({ ...form, basicSalaryPaise: Number(e.target.value) })} />
          <input className="w-full rounded border px-3 py-2 text-sm" type="number" placeholder="HRA (paise)" value={form.hraPaise} onChange={(e) => setForm({ ...form, hraPaise: Number(e.target.value) })} />
          <button type="submit" disabled={createMut.isPending} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {createMut.isPending ? 'Saving...' : 'Create Employee'}
          </button>
        </form>

        <div className="space-y-3 rounded-lg border p-5">
          <h3 className="text-sm font-semibold">Bulk Import (CSV)</h3>
          <p className="text-xs text-muted-foreground">Header: employeeCode,firstName,lastName,joinedAt,designation,department,basicSalaryPaise,hraPaise</p>
          <textarea className="h-48 w-full rounded border px-3 py-2 font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button onClick={handleBulk} disabled={bulkMut.isPending || !csv} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {bulkMut.isPending ? 'Importing...' : 'Import CSV'}
          </button>
          {result && <div className="text-sm text-muted-foreground">{result}</div>}
        </div>
      </div>
    </div>
  );
}
