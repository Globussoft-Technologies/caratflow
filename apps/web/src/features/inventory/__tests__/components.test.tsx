import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Inventory Feature Components', () => {
  describe('StockItemForm', () => {
    it('renders the dialog with "Add Stock Item" title', async () => {
      const { StockItemForm } = await import('../stock-item-form');
      render(<StockItemForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Add Stock Item')).toBeInTheDocument();
    });

    it('renders Product ID and Location ID fields', async () => {
      const { StockItemForm } = await import('../stock-item-form');
      render(<StockItemForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Product ID')).toBeInTheDocument();
      expect(screen.getByText('Location ID')).toBeInTheDocument();
    });

    it('renders Quantity, Reorder Level, and Reorder Qty fields', async () => {
      const { StockItemForm } = await import('../stock-item-form');
      render(<StockItemForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Reorder Level')).toBeInTheDocument();
      expect(screen.getByText('Reorder Qty')).toBeInTheDocument();
    });

    it('renders Bin Location field', async () => {
      const { StockItemForm } = await import('../stock-item-form');
      render(<StockItemForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Bin Location')).toBeInTheDocument();
    });

    it('renders Cancel and Create buttons', async () => {
      const { StockItemForm } = await import('../stock-item-form');
      render(<StockItemForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  describe('StockMovementForm', () => {
    it('renders the dialog with "Record Stock Movement" title', async () => {
      const { StockMovementForm } = await import('../stock-movement-form');
      render(<StockMovementForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Record Stock Movement')).toBeInTheDocument();
    });

    it('renders movement type select and quantity field', async () => {
      const { StockMovementForm } = await import('../stock-movement-form');
      render(<StockMovementForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Movement Type')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });
  });

  describe('TransferForm', () => {
    it('renders the dialog with "Create Stock Transfer" title', async () => {
      const { TransferForm } = await import('../transfer-form');
      render(<TransferForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('Create Stock Transfer')).toBeInTheDocument();
    });

    it('renders from and to location selectors', async () => {
      const { TransferForm } = await import('../transfer-form');
      render(<TransferForm onClose={vi.fn()} onSuccess={vi.fn()} />);
      expect(screen.getByText('From Location')).toBeInTheDocument();
      expect(screen.getByText('To Location')).toBeInTheDocument();
    });
  });

  describe('MetalStockCard', () => {
    it('displays metal type and purity', async () => {
      const { MetalStockCard } = await import('../metal-stock-card');
      render(
        <MetalStockCard
          metalType="GOLD"
          purityFineness={916}
          weightMg={15000}
          valuePaise={9750000}
        />,
      );
      expect(screen.getByText('Gold')).toBeInTheDocument();
      expect(screen.getByText('22K')).toBeInTheDocument();
    });

    it('displays weight in grams', async () => {
      const { MetalStockCard } = await import('../metal-stock-card');
      render(
        <MetalStockCard
          metalType="GOLD"
          purityFineness={916}
          weightMg={15000}
          valuePaise={9750000}
        />,
      );
      expect(screen.getByText('15.000 g')).toBeInTheDocument();
    });

    it('displays value in INR currency', async () => {
      const { MetalStockCard } = await import('../metal-stock-card');
      render(
        <MetalStockCard
          metalType="SILVER"
          purityFineness={925}
          weightMg={50000}
          valuePaise={350000}
        />,
      );
      expect(screen.getByText('Silver')).toBeInTheDocument();
    });
  });

  describe('StoneStockCard', () => {
    it('displays stone type and weight', async () => {
      const { StoneStockCard } = await import('../stone-stock-card');
      render(
        <StoneStockCard
          stoneType="DIAMOND"
          shape="ROUND"
          color="D"
          clarity="VVS1"
          cutGrade="EXCELLENT"
          sizeRange="0.5-1.0"
          totalWeightCt={5.25}
          totalPieces={10}
          valuePaise={15000000}
          certificationNumber="GIA-12345"
        />,
      );
      expect(screen.getByText('DIAMOND')).toBeInTheDocument();
    });

    it('displays the 4Cs information', async () => {
      const { StoneStockCard } = await import('../stone-stock-card');
      render(
        <StoneStockCard
          stoneType="DIAMOND"
          shape="ROUND"
          color="D"
          clarity="VVS1"
          cutGrade="EXCELLENT"
          sizeRange="0.5-1.0"
          totalWeightCt={5.25}
          totalPieces={10}
          valuePaise={15000000}
          certificationNumber="GIA-12345"
        />,
      );
      expect(screen.getByText(/VVS1/)).toBeInTheDocument();
    });
  });

  describe('MovementTimeline', () => {
    it('renders movement events', async () => {
      const { MovementTimeline } = await import('../movement-timeline');
      const movements = [
        { id: '1', movementType: 'IN', quantityChange: 10, movedAt: '2026-04-01T10:00:00Z', notes: 'Incoming stock', referenceType: null },
        { id: '2', movementType: 'OUT', quantityChange: -3, movedAt: '2026-04-02T14:00:00Z', notes: 'Sold', referenceType: null },
      ];
      render(<MovementTimeline movements={movements} />);
      expect(screen.getByText('Stock In')).toBeInTheDocument();
      expect(screen.getByText('Stock Out')).toBeInTheDocument();
    });

    it('renders empty state when no movements', async () => {
      const { MovementTimeline } = await import('../movement-timeline');
      render(<MovementTimeline movements={[]} />);
      expect(screen.getByText('No movements recorded yet.')).toBeInTheDocument();
    });
  });

  describe('VarianceDisplay', () => {
    it('shows positive variance with plus sign', async () => {
      const { VarianceDisplay } = await import('../variance-display');
      render(<VarianceDisplay variance={5} />);
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('shows negative variance', async () => {
      const { VarianceDisplay } = await import('../variance-display');
      render(<VarianceDisplay variance={-3} />);
      expect(screen.getByText('-3')).toBeInTheDocument();
    });

    it('shows zero variance', async () => {
      const { VarianceDisplay } = await import('../variance-display');
      render(<VarianceDisplay variance={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows dash for null variance', async () => {
      const { VarianceDisplay } = await import('../variance-display');
      render(<VarianceDisplay variance={null} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});
