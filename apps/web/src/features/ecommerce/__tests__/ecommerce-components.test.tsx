import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelBadge } from '../ChannelBadge';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { OrderTimeline } from '../OrderTimeline';
import { ShipmentTracker } from '../ShipmentTracker';
import { PaymentStatusBadge } from '../PaymentStatusBadge';
import { CatalogSyncButton } from '../CatalogSyncButton';
import { WebhookLogViewer } from '../WebhookLogViewer';
import { ReviewStars } from '../ReviewStars';
import { ClickCollectQueue } from '../ClickCollectQueue';

describe('ChannelBadge', () => {
  it('shows correct label for SHOPIFY', () => {
    render(<ChannelBadge channelType="SHOPIFY" />);
    expect(screen.getByText('Shopify')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('shows correct label for AMAZON', () => {
    render(<ChannelBadge channelType="AMAZON" />);
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to Custom for unknown type', () => {
    render(<ChannelBadge channelType="UNKNOWN" />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});

describe('SyncStatusIndicator', () => {
  it('shows Synced for SYNCED status', () => {
    render(<SyncStatusIndicator status="SYNCED" />);
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('shows Failed for FAILED status', () => {
    render(<SyncStatusIndicator status="FAILED" error="Connection timeout" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows Pending for unknown status', () => {
    render(<SyncStatusIndicator status="SOMETHING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});

describe('OrderTimeline', () => {
  it('shows timeline steps', () => {
    render(
      <OrderTimeline
        placedAt="2026-01-01T10:00:00Z"
        confirmedAt="2026-01-01T12:00:00Z"
        shippedAt={null}
        deliveredAt={null}
        cancelledAt={null}
        status="CONFIRMED"
      />,
    );
    expect(screen.getByText('Order Timeline')).toBeInTheDocument();
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('shows cancelled status', () => {
    render(
      <OrderTimeline
        placedAt="2026-01-01T10:00:00Z"
        confirmedAt="2026-01-01T12:00:00Z"
        shippedAt={null}
        deliveredAt={null}
        cancelledAt="2026-01-02T10:00:00Z"
        status="CANCELLED"
      />,
    );
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});

describe('ShipmentTracker', () => {
  it('shows shipment progress steps', () => {
    render(
      <ShipmentTracker
        shipmentNumber="SHP-001"
        carrier="BlueDart"
        trackingNumber="BD123456789"
        status="IN_TRANSIT"
        estimatedDeliveryDate="2026-04-15"
      />,
    );
    expect(screen.getByText('SHP-001')).toBeInTheDocument();
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByText('BD123456789')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
  });

  it('shows returned status warning', () => {
    render(
      <ShipmentTracker
        shipmentNumber="SHP-002"
        carrier={null}
        trackingNumber={null}
        status="RETURNED"
        estimatedDeliveryDate={null}
      />,
    );
    expect(screen.getByText('Shipment returned')).toBeInTheDocument();
  });
});

describe('PaymentStatusBadge', () => {
  it('shows correct label for CAPTURED', () => {
    render(<PaymentStatusBadge status="CAPTURED" />);
    expect(screen.getByText('Captured')).toBeInTheDocument();
  });

  it('shows correct label for FAILED', () => {
    render(<PaymentStatusBadge status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows correct label for REFUNDED', () => {
    render(<PaymentStatusBadge status="REFUNDED" />);
    expect(screen.getByText('Refunded')).toBeInTheDocument();
  });

  it('falls back to Initiated for unknown', () => {
    render(<PaymentStatusBadge status="UNKNOWN" />);
    expect(screen.getByText('Initiated')).toBeInTheDocument();
  });
});

describe('CatalogSyncButton', () => {
  it('shows sync button with channel name', () => {
    render(
      <CatalogSyncButton
        channelId="ch-1"
        channelName="Shopify"
        onSync={vi.fn()}
      />,
    );
    expect(screen.getByText('Sync to Shopify')).toBeInTheDocument();
  });

  it('shows loading state when clicked', () => {
    render(
      <CatalogSyncButton
        channelId="ch-1"
        channelName="Shopify"
        onSync={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Sync to Shopify'));
    expect(screen.getByText('Syncing Shopify...')).toBeInTheDocument();
  });
});

describe('WebhookLogViewer', () => {
  const logs = [
    {
      id: 'log-1',
      source: 'shopify',
      eventType: 'order.created',
      status: 'PROCESSED',
      payload: { orderId: '123' },
      error: null,
      processedAt: '2026-04-01T10:00:00Z',
      createdAt: '2026-04-01T09:59:00Z',
    },
    {
      id: 'log-2',
      source: 'amazon',
      eventType: 'order.cancelled',
      status: 'FAILED',
      payload: {},
      error: 'Timeout',
      processedAt: null,
      createdAt: '2026-04-01T11:00:00Z',
    },
  ];

  it('renders log entries', () => {
    render(<WebhookLogViewer logs={logs} />);
    expect(screen.getByText('shopify / order.created')).toBeInTheDocument();
    expect(screen.getByText('amazon / order.cancelled')).toBeInTheDocument();
  });

  it('shows retry button for failed logs', () => {
    render(<WebhookLogViewer logs={logs} onRetry={vi.fn()} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});

describe('ReviewStars', () => {
  it('shows correct number of stars', () => {
    const { container } = render(<ReviewStars rating={4} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('renders with custom max rating', () => {
    const { container } = render(<ReviewStars rating={3} maxRating={10} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(10);
  });
});

describe('ClickCollectQueue', () => {
  const items = [
    {
      id: 'cc-1',
      orderNumber: 'ORD-001',
      customerName: 'Priya Sharma',
      customerPhone: '+919876543210',
      status: 'READY_FOR_PICKUP',
      readyAt: '2026-04-05T10:00:00Z',
      expiresAt: '2026-04-10T10:00:00Z',
      itemCount: 2,
    },
    {
      id: 'cc-2',
      orderNumber: 'ORD-002',
      customerName: 'Vijay Kumar',
      customerPhone: '+919876543211',
      status: 'NOTIFIED',
      readyAt: '2026-04-04T10:00:00Z',
      expiresAt: '2026-04-09T10:00:00Z',
      itemCount: 1,
    },
  ];

  it('renders items with location name', () => {
    render(
      <ClickCollectQueue
        items={items}
        locationName="Showroom A"
        onNotify={vi.fn()}
        onConfirmPickup={vi.fn()}
      />,
    );
    expect(screen.getByText('Showroom A')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
  });

  it('shows empty message when no active items', () => {
    render(
      <ClickCollectQueue
        items={[{ ...items[0], status: 'PICKED_UP' }]}
        locationName="Showroom B"
      />,
    );
    expect(screen.getByText('No items pending pickup at this location.')).toBeInTheDocument();
  });
});
