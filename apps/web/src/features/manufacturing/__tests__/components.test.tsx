import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Manufacturing Feature Components', () => {
  describe('JobKanbanBoard', () => {
    const mockColumns = [
      { status: 'PLANNED', label: 'Planned', jobs: [{ id: '1', jobNumber: 'JO-001', productName: 'Gold Necklace', priority: 'HIGH' }] },
      { status: 'IN_PROGRESS', label: 'In Progress', jobs: [] },
      { status: 'COMPLETED', label: 'Completed', jobs: [] },
    ];

    it('renders kanban columns', async () => {
      const { JobKanbanBoard } = await import('../job-kanban-board');
      render(<JobKanbanBoard columns={mockColumns} />);
      expect(screen.getByText('Planned')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders job cards within columns', async () => {
      const { JobKanbanBoard } = await import('../job-kanban-board');
      render(<JobKanbanBoard columns={mockColumns} />);
      expect(screen.getByText('JO-001')).toBeInTheDocument();
      expect(screen.getByText('Gold Necklace')).toBeInTheDocument();
    });
  });

  describe('BomBuilder', () => {
    it('renders table with BOM items', async () => {
      const { BomBuilder } = await import('../bom-builder');
      const items = [
        { id: '1', itemType: 'METAL', description: '22K Gold', quantityRequired: 1, unitOfMeasure: 'g', weightMg: 15000, estimatedCostPaise: 9750000, wastagePercent: 5, sortOrder: 1 },
      ];
      render(<BomBuilder items={items} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('22K Gold')).toBeInTheDocument();
    });

    it('renders add item button when not read-only', async () => {
      const { BomBuilder } = await import('../bom-builder');
      render(<BomBuilder items={[]} onChange={vi.fn()} />);
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('hides add button when read-only', async () => {
      const { BomBuilder } = await import('../bom-builder');
      render(<BomBuilder items={[]} onChange={vi.fn()} readOnly />);
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument();
    });
  });

  describe('KarigarCard', () => {
    it('shows karigar profile information', async () => {
      const { KarigarCard } = await import('../karigar-card');
      render(
        <KarigarCard
          id="k1"
          employeeCode="KAR-001"
          firstName="Ramesh"
          lastName="Kumar"
          skillLevel="SENIOR"
          specialization="Gold Work"
          isActive={true}
        />,
      );
      expect(screen.getByText(/Ramesh/)).toBeInTheDocument();
      expect(screen.getByText(/Kumar/)).toBeInTheDocument();
      expect(screen.getByText('KAR-001')).toBeInTheDocument();
    });

    it('shows skill level badge', async () => {
      const { KarigarCard } = await import('../karigar-card');
      render(
        <KarigarCard
          id="k1"
          employeeCode="KAR-001"
          firstName="Ramesh"
          lastName="Kumar"
          skillLevel="MASTER"
          isActive={true}
        />,
      );
      expect(screen.getByText('MASTER')).toBeInTheDocument();
    });
  });

  describe('MetalBalanceLedger', () => {
    it('renders metal balance table', async () => {
      const { MetalBalanceLedger } = await import('../metal-balance-ledger');
      const balances = [
        { id: '1', metalType: 'GOLD', purityFineness: 916, issuedWeightMg: 50000, returnedWeightMg: 45000, wastedWeightMg: 2000, balanceWeightMg: 3000 },
      ];
      render(<MetalBalanceLedger balances={balances} karigarName="Ramesh K." />);
      expect(screen.getByText(/Metal Balance for Ramesh K\./)).toBeInTheDocument();
    });

    it('displays weight values in grams', async () => {
      const { MetalBalanceLedger } = await import('../metal-balance-ledger');
      const balances = [
        { id: '1', metalType: 'GOLD', purityFineness: 916, issuedWeightMg: 50000, returnedWeightMg: 45000, wastedWeightMg: 2000, balanceWeightMg: 3000 },
      ];
      render(<MetalBalanceLedger balances={balances} />);
      expect(screen.getByText('50.000 g')).toBeInTheDocument();
      expect(screen.getByText('45.000 g')).toBeInTheDocument();
    });
  });

  describe('QcCheckpointForm', () => {
    it('renders form fields for QC checkpoint', async () => {
      const { QcCheckpointForm } = await import('../qc-checkpoint-form');
      render(<QcCheckpointForm jobOrderId="job-1" onSubmit={vi.fn()} />);
      expect(screen.getByText('Checkpoint Type')).toBeInTheDocument();
      expect(screen.getByText('Checked By')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders submit button', async () => {
      const { QcCheckpointForm } = await import('../qc-checkpoint-form');
      render(<QcCheckpointForm jobOrderId="job-1" onSubmit={vi.fn()} />);
      expect(screen.getByText('Record Checkpoint')).toBeInTheDocument();
    });
  });

  describe('AttendanceCalendar', () => {
    it('renders calendar grid with day names', async () => {
      const { AttendanceCalendar } = await import('../attendance-calendar');
      render(
        <AttendanceCalendar
          month={3}
          year={2026}
          records={[
            { date: '2026-04-01', status: 'PRESENT' },
            { date: '2026-04-02', status: 'ABSENT' },
          ]}
        />,
      );
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });
  });

  describe('JobTimeline', () => {
    it('renders timeline steps', async () => {
      const { JobTimeline } = await import('../job-timeline');
      const steps = [
        { status: 'PLANNED', label: 'Planned', isActive: false, isCompleted: true, timestamp: '2026-04-01' },
        { status: 'IN_PROGRESS', label: 'In Progress', isActive: true, isCompleted: false },
        { status: 'COMPLETED', label: 'Completed', isActive: false, isCompleted: false },
      ];
      render(<JobTimeline steps={steps} />);
      expect(screen.getByText('Planned')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});
