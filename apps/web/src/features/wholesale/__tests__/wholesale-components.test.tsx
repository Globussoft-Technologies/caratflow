import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PurchaseOrderForm } from '../PurchaseOrderForm';
import { ConsignmentTracker } from '../ConsignmentTracker';
import { CommissionCalculator } from '../CommissionCalculator';
import { CreditLimitBadge } from '../CreditLimitBadge';
import { OutstandingTable } from '../OutstandingTable';
import { RateContractForm } from '../RateContractForm';
import { GoodsReceiptForm } from '../GoodsReceiptForm';

describe('PurchaseOrderForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders with supplier and items fields', () => {
    render(<PurchaseOrderForm {...defaultProps} />);
    expect(screen.getByText('New Purchase Order')).toBeInTheDocument();
    expect(screen.getByText('Supplier *')).toBeInTheDocument();
    expect(screen.getByText('Delivery Location *')).toBeInTheDocument();
    expect(screen.getByText('Line Items')).toBeInTheDocument();
  });

  it('shows add item button', () => {
    render(<PurchaseOrderForm {...defaultProps} />);
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('disables submit when supplier not selected', () => {
    render(<PurchaseOrderForm {...defaultProps} />);
    const submitBtn = screen.getByText('Create Purchase Order');
    expect(submitBtn).toBeDisabled();
  });
});

describe('ConsignmentTracker', () => {
  it('renders outgoing consignment form', () => {
    render(<ConsignmentTracker direction="out" onClose={vi.fn()} />);
    expect(screen.getByText('New Outgoing Consignment (Memo)')).toBeInTheDocument();
    expect(screen.getByText('Customer *')).toBeInTheDocument();
    expect(screen.getByText('Create Consignment')).toBeInTheDocument();
  });

  it('renders incoming consignment form', () => {
    render(<ConsignmentTracker direction="in" onClose={vi.fn()} />);
    expect(screen.getByText('Receive Incoming Consignment')).toBeInTheDocument();
    expect(screen.getByText('Supplier *')).toBeInTheDocument();
    expect(screen.getByText('Receive Consignment')).toBeInTheDocument();
  });
});

describe('CommissionCalculator', () => {
  it('renders with calculator inputs', () => {
    render(<CommissionCalculator onClose={vi.fn()} />);
    expect(screen.getByText('Commission Calculator')).toBeInTheDocument();
    expect(screen.getByText('Agent *')).toBeInTheDocument();
    expect(screen.getByText('Order Value (Rs)')).toBeInTheDocument();
    expect(screen.getByText('Commission Type')).toBeInTheDocument();
    expect(screen.getByText('Calculated Commission')).toBeInTheDocument();
  });
});

describe('CreditLimitBadge', () => {
  const defaultProps = {
    entityName: 'ABC Jewellers',
    entityType: 'CUSTOMER' as const,
    creditLimitPaise: 10000000,
    outstandingPaise: 5000000,
    availablePaise: 5000000,
  };

  it('shows entity name and utilization percentage', () => {
    render(<CreditLimitBadge {...defaultProps} />);
    expect(screen.getByText('ABC Jewellers')).toBeInTheDocument();
    expect(screen.getByText('50% used')).toBeInTheDocument();
  });

  it('shows limit, outstanding, and available amounts', () => {
    render(<CreditLimitBadge {...defaultProps} />);
    expect(screen.getByText('Limit')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});

describe('OutstandingTable', () => {
  const balances = [
    {
      id: '1',
      entityType: 'CUSTOMER',
      entityName: 'Priya Jewellers',
      invoiceNumber: 'INV-001',
      dueDate: '2026-01-15',
      originalPaise: 5000000,
      paidPaise: 2000000,
      balancePaise: 3000000,
      status: 'OVERDUE',
      daysOverdue: 30,
    },
    {
      id: '2',
      entityType: 'SUPPLIER',
      entityName: 'Gold Refinery',
      invoiceNumber: 'INV-002',
      dueDate: '2026-05-15',
      originalPaise: 8000000,
      paidPaise: 0,
      balancePaise: 8000000,
      status: 'PENDING',
      daysOverdue: 0,
    },
  ];

  it('renders receivable and payable sections', () => {
    render(<OutstandingTable balances={balances} />);
    expect(screen.getByText('Accounts Receivable (Customer Balances)')).toBeInTheDocument();
    expect(screen.getByText('Accounts Payable (Supplier Balances)')).toBeInTheDocument();
  });

  it('renders entity names from balances', () => {
    render(<OutstandingTable balances={balances} />);
    expect(screen.getByText('Priya Jewellers')).toBeInTheDocument();
    expect(screen.getByText('Gold Refinery')).toBeInTheDocument();
  });

  it('shows empty message when no balances', () => {
    render(<OutstandingTable balances={[]} />);
    const emptyMessages = screen.getAllByText('No outstanding balances');
    expect(emptyMessages).toHaveLength(2);
  });
});

describe('RateContractForm', () => {
  it('renders form fields', () => {
    render(<RateContractForm />);
    expect(screen.getByText('Supplier')).toBeInTheDocument();
    expect(screen.getByText('Metal Type')).toBeInTheDocument();
    expect(screen.getByText('Rate per Gram (INR)')).toBeInTheDocument();
    expect(screen.getByText('Valid From')).toBeInTheDocument();
    expect(screen.getByText('Valid To')).toBeInTheDocument();
    expect(screen.getByText('Save Contract')).toBeInTheDocument();
  });
});

describe('GoodsReceiptForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders form with purchase order field', () => {
    render(<GoodsReceiptForm {...defaultProps} />);
    expect(screen.getByText('New Goods Receipt')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order *')).toBeInTheDocument();
    expect(screen.getByText('Received Items')).toBeInTheDocument();
  });

  it('disables create button when no PO selected', () => {
    render(<GoodsReceiptForm {...defaultProps} />);
    const createBtn = screen.getByText('Create Receipt');
    expect(createBtn).toBeDisabled();
  });
});
