import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GirviLoanCard } from '../GirviLoanCard';
import { CollateralInfo } from '../CollateralInfo';
import { InterestCalculator } from '../InterestCalculator';
import { InstallmentGrid } from '../InstallmentGrid';
import { SchemeCard } from '../SchemeCard';
import { MaturityCalculator } from '../MaturityCalculator';
import { LiveRatesTicker } from '../LiveRatesTicker';
import { KycStatusBadge } from '../KycStatusBadge';
import { UpiQrCode } from '../UpiQrCode';
import { PaymentMethodSelector } from '../PaymentMethodSelector';

describe('GirviLoanCard', () => {
  const defaultProps = {
    id: 'loan-1',
    loanNumber: 'GV/2604/001',
    customerName: 'Rajesh Patel',
    metalType: 'GOLD',
    netWeightG: '50.000',
    purityFineness: 916,
    loanAmountPaise: 25000000,
    outstandingPrincipalPaise: 20000000,
    outstandingInterestPaise: 500000,
    dueDate: '2026-06-30',
    status: 'ACTIVE',
  };

  it('renders loan info', () => {
    render(<GirviLoanCard {...defaultProps} />);
    expect(screen.getByText('GV/2604/001')).toBeInTheDocument();
    expect(screen.getByText('Rajesh Patel')).toBeInTheDocument();
    expect(screen.getByText('Loan Amount')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
  });

  it('shows metal details', () => {
    render(<GirviLoanCard {...defaultProps} />);
    expect(screen.getByText(/GOLD 50.000g/)).toBeInTheDocument();
  });
});

describe('CollateralInfo', () => {
  it('shows metal details', () => {
    render(
      <CollateralInfo
        metalType="GOLD"
        grossWeightG="55.500"
        netWeightG="50.000"
        purityFineness={916}
        description="Gold bangles set of 2"
      />,
    );
    expect(screen.getByText('Collateral')).toBeInTheDocument();
    expect(screen.getByText('GOLD')).toBeInTheDocument();
    expect(screen.getByText('55.500g')).toBeInTheDocument();
    expect(screen.getByText('50.000g')).toBeInTheDocument();
    expect(screen.getByText('22K')).toBeInTheDocument();
    expect(screen.getByText('Gold bangles set of 2')).toBeInTheDocument();
  });

  it('shows purity label for 24K', () => {
    render(
      <CollateralInfo
        metalType="GOLD"
        grossWeightG="10.000"
        netWeightG="10.000"
        purityFineness={999}
        description="Gold bar"
      />,
    );
    expect(screen.getByText('24K Pure')).toBeInTheDocument();
  });
});

describe('InterestCalculator', () => {
  it('has inputs and result section', () => {
    render(<InterestCalculator />);
    expect(screen.getByText('Interest Calculator')).toBeInTheDocument();
    expect(screen.getByText('Principal (Rs.)')).toBeInTheDocument();
    expect(screen.getByText('Rate (% p.a.)')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Interest')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('shows type selector with Simple and Compound options', () => {
    render(<InterestCalculator />);
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Simple')).toBeInTheDocument();
    expect(screen.getByText('Compound (Monthly)')).toBeInTheDocument();
  });
});

describe('InstallmentGrid', () => {
  it('renders calendar cells', () => {
    const { container } = render(
      <InstallmentGrid
        totalInstallments={12}
        paidInstallments={5}
        overdueInstallments={2}
      />,
    );
    // Should render 12 cells
    const cells = container.querySelectorAll('[title]');
    expect(cells).toHaveLength(12);
  });

  it('marks paid installments correctly', () => {
    const { container } = render(
      <InstallmentGrid totalInstallments={6} paidInstallments={3} />,
    );
    const cells = container.querySelectorAll('[title]');
    expect(cells[0]?.getAttribute('title')).toBe('#1: Paid');
    expect(cells[3]?.getAttribute('title')).toBe('#4: Due');
    expect(cells[5]?.getAttribute('title')).toBe('#6: Upcoming');
  });
});

describe('SchemeCard', () => {
  const defaultProps = {
    id: 'scheme-1',
    schemeName: 'Gold Savings Plan',
    schemeType: 'GOLD_SAVINGS' as const,
    monthlyAmountPaise: 500000,
    durationMonths: 12,
    currentMembers: 45,
    maxMembers: 100,
    status: 'ACTIVE',
    href: '/india/schemes/scheme-1',
  };

  it('shows scheme info', () => {
    render(<SchemeCard {...defaultProps} />);
    expect(screen.getByText('Gold Savings Plan')).toBeInTheDocument();
    expect(screen.getByText('Gold Savings')).toBeInTheDocument();
    expect(screen.getByText('12mo')).toBeInTheDocument();
    expect(screen.getByText('45/100')).toBeInTheDocument();
  });

  it('shows kitty type label', () => {
    render(<SchemeCard {...defaultProps} schemeType="KITTY" />);
    expect(screen.getByText('Kitty')).toBeInTheDocument();
  });
});

describe('MaturityCalculator', () => {
  it('has inputs for monthly amount, duration, bonus', () => {
    render(<MaturityCalculator />);
    expect(screen.getByText('Maturity Calculator')).toBeInTheDocument();
    expect(screen.getByText('Monthly Amount (Rs.)')).toBeInTheDocument();
    expect(screen.getByText('Duration (mo)')).toBeInTheDocument();
    expect(screen.getByText('Bonus (mo)')).toBeInTheDocument();
    expect(screen.getByText('Bonus %')).toBeInTheDocument();
    expect(screen.getByText('Maturity Value')).toBeInTheDocument();
  });
});

describe('LiveRatesTicker', () => {
  const rates = [
    { metalType: 'GOLD', purity: 999, ratePer10gPaise: 7500000, changePercent: 0.5 },
    { metalType: 'GOLD', purity: 916, ratePer10gPaise: 6900000, changePercent: -0.2 },
    { metalType: 'SILVER', purity: 999, ratePer10gPaise: 95000, changePercent: null },
  ];

  it('scrolls through rates', () => {
    render(<LiveRatesTicker rates={rates} />);
    expect(screen.getByText('GOLD 24K')).toBeInTheDocument();
    expect(screen.getByText('GOLD 22K')).toBeInTheDocument();
    expect(screen.getByText(/\+0.50%/)).toBeInTheDocument();
    expect(screen.getByText(/-0.20%/)).toBeInTheDocument();
  });
});

describe('KycStatusBadge', () => {
  it('shows verified status', () => {
    render(<KycStatusBadge type="AADHAAR" status="VERIFIED" />);
    expect(screen.getByText('Aadhaar: Verified')).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<KycStatusBadge type="PAN" status="PENDING" />);
    expect(screen.getByText('PAN: Pending')).toBeInTheDocument();
  });

  it('shows failed status', () => {
    render(<KycStatusBadge type="PASSPORT" status="FAILED" />);
    expect(screen.getByText('Passport: Failed')).toBeInTheDocument();
  });

  it('shows expired status', () => {
    render(<KycStatusBadge type="DRIVING_LICENSE" status="EXPIRED" />);
    expect(screen.getByText('DL: Expired')).toBeInTheDocument();
  });
});

describe('UpiQrCode', () => {
  const defaultProps = {
    upiUrl: 'upi://pay?pa=shop@upi&pn=ShopName&am=5000.00',
    payeeVpa: 'shop@upi',
    payeeName: 'Sunshine Jewellers',
    amountRupees: '5,000.00',
    transactionNote: 'Gold Ring Payment',
    referenceId: 'REF-001',
  };

  it('renders QR area and payment details', () => {
    render(<UpiQrCode {...defaultProps} />);
    expect(screen.getByText('UPI Payment')).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('Sunshine Jewellers')).toBeInTheDocument();
    expect(screen.getByText('shop@upi')).toBeInTheDocument();
    expect(screen.getByText('5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Gold Ring Payment')).toBeInTheDocument();
    expect(screen.getByText('REF-001')).toBeInTheDocument();
  });

  it('has copy UPI link button', () => {
    render(<UpiQrCode {...defaultProps} />);
    expect(screen.getByText('Copy UPI Link')).toBeInTheDocument();
  });
});

describe('PaymentMethodSelector', () => {
  it('shows all payment options', () => {
    render(
      <PaymentMethodSelector value="CASH" onChange={vi.fn()} />,
    );
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('UPI')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText('Cheque')).toBeInTheDocument();
  });

  it('shows descriptions', () => {
    render(
      <PaymentMethodSelector value="UPI" onChange={vi.fn()} />,
    );
    expect(screen.getByText('Counter payment')).toBeInTheDocument();
    expect(screen.getByText('Google Pay, PhonePe, etc.')).toBeInTheDocument();
    expect(screen.getByText('NEFT/RTGS/IMPS')).toBeInTheDocument();
    expect(screen.getByText('Bank cheque')).toBeInTheDocument();
  });
});
