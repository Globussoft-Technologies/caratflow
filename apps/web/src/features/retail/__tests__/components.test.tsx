import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { CartItem } from '../PosCart';

const mockCartItem: CartItem = {
  id: 'item-1',
  productId: 'p1',
  description: '22K Gold Necklace',
  quantity: 1,
  unitPricePaise: 9500000,
  metalWeightMg: 15000,
  metalRatePaise: 650000,
  makingChargesPaise: 250000,
  wastageChargesPaise: 50000,
  discountPaise: 0,
  hsnCode: '7113',
  gstRate: 3,
  cgstPaise: 142500,
  sgstPaise: 142500,
  igstPaise: 0,
  lineTotalPaise: 9785000,
};

describe('Retail Feature Components', () => {
  describe('PosCart', () => {
    it('renders cart header', async () => {
      const { PosCart } = await import('../PosCart');
      render(
        <PosCart
          items={[mockCartItem]}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          subtotalPaise={9500000}
          discountPaise={0}
          taxPaise={285000}
          totalPaise={9785000}
        />,
      );
      expect(screen.getByText('Cart')).toBeInTheDocument();
      expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    it('renders cart items with descriptions', async () => {
      const { PosCart } = await import('../PosCart');
      render(
        <PosCart
          items={[mockCartItem]}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          subtotalPaise={9500000}
          discountPaise={0}
          taxPaise={285000}
          totalPaise={9785000}
        />,
      );
      expect(screen.getByText('22K Gold Necklace')).toBeInTheDocument();
    });

    it('renders empty cart message when no items', async () => {
      const { PosCart } = await import('../PosCart');
      render(
        <PosCart
          items={[]}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          subtotalPaise={0}
          discountPaise={0}
          taxPaise={0}
          totalPaise={0}
        />,
      );
      expect(screen.getByText('No items in cart')).toBeInTheDocument();
    });

    it('renders totals section with subtotal and GST', async () => {
      const { PosCart } = await import('../PosCart');
      render(
        <PosCart
          items={[mockCartItem]}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          subtotalPaise={9500000}
          discountPaise={0}
          taxPaise={285000}
          totalPaise={9785000}
        />,
      );
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('Tax (GST)')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  describe('PosProductSearch', () => {
    it('renders search input', async () => {
      const { PosProductSearch } = await import('../PosProductSearch');
      render(
        <PosProductSearch
          products={[
            { id: 'p1', sku: 'GN-001', name: 'Gold Necklace', productType: 'GOLD', metalWeightMg: 15000, metalPurity: 916, makingCharges: 250000, sellingPricePaise: 9500000 },
          ]}
          onSelect={vi.fn()}
        />,
      );
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });
  });

  describe('PosPaymentDialog', () => {
    it('renders payment method options', async () => {
      const { PosPaymentDialog } = await import('../PosPaymentDialog');
      render(
        <PosPaymentDialog
          open={true}
          onOpenChange={vi.fn()}
          totalPaise={9785000}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Card')).toBeInTheDocument();
      expect(screen.getByText('UPI')).toBeInTheDocument();
    });
  });

  describe('SaleInvoice', () => {
    it('renders invoice with sale number and date', async () => {
      const { SaleInvoice } = await import('../SaleInvoice');
      render(
        <SaleInvoice
          saleNumber="INV/2604/0001"
          date={new Date('2026-04-07')}
          customerName="Priya Sharma"
          customerPhone="9876543210"
          items={[
            {
              description: '22K Gold Necklace',
              quantity: 1,
              unitPricePaise: 9500000,
              metalWeightMg: 15000,
              makingChargesPaise: 250000,
              cgstPaise: 142500,
              sgstPaise: 142500,
              igstPaise: 0,
              lineTotalPaise: 9785000,
              hsnCode: '7113',
            },
          ]}
          subtotalPaise={9500000}
          discountPaise={0}
          taxPaise={285000}
          roundOffPaise={0}
          totalPaise={9785000}
          payments={[{ method: 'CASH', amountPaise: 9785000 }]}
        />,
      );
      expect(screen.getByText(/INV\/2604\/0001/)).toBeInTheDocument();
      expect(screen.getByText(/Priya Sharma/)).toBeInTheDocument();
    });
  });

  describe('RepairStatusBoard', () => {
    it('renders board columns', async () => {
      const { RepairStatusBoard } = await import('../RepairStatusBoard');
      render(
        <RepairStatusBoard
          columns={{
            RECEIVED: [{ id: 'r1', repairNumber: 'REP-001', customerId: 'c1', customerName: 'John', itemDescription: 'Ring resize', status: 'RECEIVED', promisedDate: '2026-04-10', createdAt: '2026-04-05' }],
            IN_PROGRESS: [],
            COMPLETED: [],
          }}
        />,
      );
      expect(screen.getByText('Received')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders repair items within columns', async () => {
      const { RepairStatusBoard } = await import('../RepairStatusBoard');
      render(
        <RepairStatusBoard
          columns={{
            RECEIVED: [{ id: 'r1', repairNumber: 'REP-001', customerId: 'c1', customerName: 'John', itemDescription: 'Ring resize', status: 'RECEIVED', promisedDate: '2026-04-10', createdAt: '2026-04-05' }],
          }}
        />,
      );
      expect(screen.getByText('REP-001')).toBeInTheDocument();
      expect(screen.getByText('Ring resize')).toBeInTheDocument();
    });
  });

  describe('OldGoldCalculator', () => {
    it('renders input fields for weight and purity', async () => {
      const { OldGoldCalculator } = await import('../OldGoldCalculator');
      render(<OldGoldCalculator onCalculate={vi.fn()} />);
      expect(screen.getByText('Gross Weight (g)')).toBeInTheDocument();
      expect(screen.getByText('Purity (Fineness)')).toBeInTheDocument();
    });
  });

  describe('PricingBreakdown', () => {
    it('shows metal value, making charges, and GST lines', async () => {
      const { PricingBreakdown } = await import('../PricingBreakdown');
      render(
        <PricingBreakdown
          metalValuePaise={9000000}
          makingChargesPaise={250000}
          wastageChargesPaise={50000}
          cgstPaise={142500}
          sgstPaise={142500}
          igstPaise={0}
          totalPaise={9585000}
        />,
      );
      expect(screen.getByText('Metal Value')).toBeInTheDocument();
      expect(screen.getByText('Making Charges')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });
});
