import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HuidBadge } from '../huid-badge';
import { HallmarkStatusTracker } from '../hallmark-status-tracker';
import { CertificateCard } from '../certificate-card';
import { TraceabilityTimeline } from '../traceability-timeline';
import { ExpiryAlert } from '../expiry-alert';
import { CoverageGauge } from '../coverage-gauge';
import { AuditFindingsTable } from '../audit-findings-table';

describe('HuidBadge', () => {
  it('shows HUID number when provided', () => {
    render(<HuidBadge huidNumber="HU1234567890" status="ACTIVE" />);
    expect(screen.getByText('HU1234567890')).toBeInTheDocument();
  });

  it('shows warning when no HUID', () => {
    render(<HuidBadge huidNumber={null} />);
    expect(screen.getByText('No HUID')).toBeInTheDocument();
  });

  it('shows warning for undefined HUID', () => {
    render(<HuidBadge huidNumber={undefined} />);
    expect(screen.getByText('No HUID')).toBeInTheDocument();
  });
});

describe('HallmarkStatusTracker', () => {
  it('shows step labels', () => {
    render(
      <HallmarkStatusTracker
        status="IN_PROGRESS"
        totalItems={10}
        passedItems={5}
        failedItems={1}
      />,
    );
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows summary counts', () => {
    render(
      <HallmarkStatusTracker
        status="COMPLETED"
        totalItems={20}
        passedItems={18}
        failedItems={2}
      />,
    );
    expect(screen.getByText('Total: 20')).toBeInTheDocument();
    expect(screen.getByText('Passed: 18')).toBeInTheDocument();
    expect(screen.getByText('Failed: 2')).toBeInTheDocument();
    expect(screen.getByText('Pending: 0')).toBeInTheDocument();
  });
});

describe('CertificateCard', () => {
  const defaultProps = {
    id: 'cert-1',
    certificateNumber: 'GIA-12345678',
    issuingLab: 'GIA',
    stoneType: 'Diamond',
    caratWeight: 150,
    color: 'D',
    clarity: 'VVS1',
    cut: 'Excellent',
    shape: 'Round',
    isVerified: true,
    imageUrl: null,
    productName: 'Solitaire Ring',
  };

  it('shows lab name and certificate number', () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByText('GIA')).toBeInTheDocument();
    expect(screen.getByText('GIA-12345678')).toBeInTheDocument();
  });

  it('shows 4Cs details', () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByText('1.50 ct')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('VVS1')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('renders product name', () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByText('Solitaire Ring')).toBeInTheDocument();
  });
});

describe('TraceabilityTimeline', () => {
  const events = [
    {
      id: 'e1',
      eventType: 'SOURCED',
      fromEntityType: 'Supplier',
      fromEntityId: 's1',
      toEntityType: 'Warehouse',
      toEntityId: 'w1',
      eventDate: '2026-01-01T10:00:00Z',
      documentReference: 'PO-001',
      notes: 'Sourced from ABC Refinery',
    },
    {
      id: 'e2',
      eventType: 'MANUFACTURED',
      fromEntityType: null,
      fromEntityId: null,
      toEntityType: 'Workshop',
      toEntityId: 'ws1',
      eventDate: '2026-02-15T10:00:00Z',
      documentReference: null,
      notes: null,
    },
  ];

  it('renders custody events', () => {
    render(<TraceabilityTimeline events={events} />);
    expect(screen.getByText('Sourced')).toBeInTheDocument();
    expect(screen.getByText('Manufactured')).toBeInTheDocument();
  });

  it('shows empty message when no events', () => {
    render(<TraceabilityTimeline events={[]} />);
    expect(screen.getByText('No custody events recorded for this product.')).toBeInTheDocument();
  });
});

describe('ExpiryAlert', () => {
  it('shows warning for expiring docs', () => {
    render(<ExpiryAlert count={5} />);
    expect(screen.getByText('5 documents expiring within 30 days')).toBeInTheDocument();
  });

  it('returns null when count is 0', () => {
    const { container } = render(<ExpiryAlert count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows danger variant', () => {
    render(<ExpiryAlert count={3} label="licenses expired" variant="danger" />);
    expect(screen.getByText('3 licenses expired')).toBeInTheDocument();
  });
});

describe('CoverageGauge', () => {
  it('renders SVG circle with percentage', () => {
    render(<CoverageGauge percent={85} label="HUID Coverage" />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('HUID Coverage')).toBeInTheDocument();
  });

  it('clamps percent to 100', () => {
    render(<CoverageGauge percent={150} label="Test" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps percent to 0', () => {
    render(<CoverageGauge percent={-10} label="Test" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('AuditFindingsTable', () => {
  const audits = [
    {
      id: 'a1',
      auditType: 'HALLMARK',
      auditDate: '2026-03-01',
      auditorName: 'BIS Inspector',
      status: 'PASSED',
      findings: 'All items compliant',
    },
    {
      id: 'a2',
      auditType: 'GST',
      auditDate: '2026-03-15',
      auditorName: 'Tax Auditor',
      status: 'PENDING',
      findings: null,
    },
  ];

  it('renders audit rows', () => {
    render(<AuditFindingsTable audits={audits} />);
    expect(screen.getByText('HALLMARK')).toBeInTheDocument();
    expect(screen.getByText('BIS Inspector')).toBeInTheDocument();
    expect(screen.getByText('Tax Auditor')).toBeInTheDocument();
  });

  it('shows empty message when no audits', () => {
    render(<AuditFindingsTable audits={[]} />);
    expect(screen.getByText('No audits scheduled.')).toBeInTheDocument();
  });
});
