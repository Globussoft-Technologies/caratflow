import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeviceStatusIndicator } from '../DeviceStatusIndicator';
import { RfidScanMonitor } from '../RfidScanMonitor';
import { BarcodeScanInput } from '../BarcodeScanInput';
import { WeightCapture } from '../WeightCapture';
import { LabelPreview } from '../LabelPreview';
import { LabelTemplateEditor } from '../LabelTemplateEditor';
import { CustomerDisplayPreview } from '../CustomerDisplayPreview';
import { BiometricEventLog } from '../BiometricEventLog';
import { RfidStockTakeWizard } from '../RfidStockTakeWizard';
import { DeviceConfigForm } from '../DeviceConfigForm';

describe('DeviceStatusIndicator', () => {
  it('renders green dot for connected status', () => {
    render(
      <DeviceStatusIndicator
        deviceId="dev-1"
        initialStatus={'CONNECTED' as any}
        showLabel
      />,
    );
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders red dot for disconnected status', () => {
    render(
      <DeviceStatusIndicator
        deviceId="dev-1"
        initialStatus={'DISCONNECTED' as any}
        showLabel
      />,
    );
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});

describe('RfidScanMonitor', () => {
  it('shows tag list placeholder', () => {
    render(<RfidScanMonitor locationId="loc-1" />);
    expect(screen.getByText('RFID Scan Monitor')).toBeInTheDocument();
    expect(screen.getByText('Waiting for RFID scans...')).toBeInTheDocument();
  });

  it('shows listening indicator', () => {
    render(<RfidScanMonitor locationId="loc-1" />);
    expect(screen.getByText('Listening')).toBeInTheDocument();
  });
});

describe('BarcodeScanInput', () => {
  it('renders input field with placeholder', () => {
    render(<BarcodeScanInput />);
    expect(screen.getByPlaceholderText('Scan barcode or type SKU...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(<BarcodeScanInput placeholder="Enter barcode..." />);
    expect(screen.getByPlaceholderText('Enter barcode...')).toBeInTheDocument();
  });
});

describe('WeightCapture', () => {
  it('shows weight display with tare button', () => {
    render(
      <WeightCapture deviceId="dev-1" locationId="loc-1" />,
    );
    expect(screen.getByText('Weighing Scale')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
    expect(screen.getByText('Tare')).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeInTheDocument();
  });
});

describe('LabelPreview', () => {
  it('shows no preview message when null', () => {
    render(<LabelPreview preview={null} />);
    expect(screen.getByText('No preview available')).toBeInTheDocument();
  });

  it('renders label fields when preview provided', () => {
    const preview = {
      templateId: 'tpl-1',
      templateName: 'Standard Label',
      width: 50,
      height: 25,
      renderedFields: [
        { type: 'text' as const, x: 2, y: 2, width: 30, height: 5, value: 'Gold Ring', resolvedValue: 'Gold Ring', fontSize: 10 },
        { type: 'barcode' as const, x: 2, y: 10, width: 40, height: 8, value: '1234567890', resolvedValue: '1234567890' },
      ],
    };
    render(<LabelPreview preview={preview} />);
    expect(screen.getByText('Standard Label (50mm x 25mm)')).toBeInTheDocument();
    expect(screen.getByText('Gold Ring')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
  });
});

describe('LabelTemplateEditor', () => {
  it('renders field list and template info', () => {
    render(
      <LabelTemplateEditor
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Template Name')).toBeInTheDocument();
    expect(screen.getByText('Width (mm)')).toBeInTheDocument();
    expect(screen.getByText('Height (mm)')).toBeInTheDocument();
    expect(screen.getByText('Label Preview')).toBeInTheDocument();
    expect(screen.getByText('+ Text')).toBeInTheDocument();
    expect(screen.getByText('+ Barcode')).toBeInTheDocument();
    expect(screen.getByText('Save Template')).toBeInTheDocument();
  });

  it('shows load defaults button', () => {
    render(
      <LabelTemplateEditor onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('Load Jewelry Defaults')).toBeInTheDocument();
  });
});

describe('CustomerDisplayPreview', () => {
  it('shows dark VFD display', () => {
    render(
      <CustomerDisplayPreview
        deviceId="dev-1"
        locationId="loc-1"
      />,
    );
    expect(screen.getByText('Customer Display Preview')).toBeInTheDocument();
  });

  it('shows initial message lines', () => {
    render(
      <CustomerDisplayPreview
        deviceId="dev-1"
        locationId="loc-1"
        initialMessage={{ deviceId: 'dev-1', line1: 'Welcome', line2: 'Total: Rs.5000', amount: 500000 }}
      />,
    );
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Total: Rs.5000')).toBeInTheDocument();
  });
});

describe('BiometricEventLog', () => {
  it('renders event table header', () => {
    render(<BiometricEventLog />);
    expect(screen.getByText('Biometric Events')).toBeInTheDocument();
  });
});

describe('RfidStockTakeWizard', () => {
  it('shows step indicators', () => {
    render(<RfidStockTakeWizard />);
    expect(screen.getByText('Select Location')).toBeInTheDocument();
    expect(screen.getByText('Scan Tags')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
  });

  it('shows location selection on first step', () => {
    render(<RfidStockTakeWizard />);
    expect(screen.getByText('Select Location for Stock Take')).toBeInTheDocument();
    expect(screen.getByText('Start Scanning')).toBeInTheDocument();
  });
});

describe('DeviceConfigForm', () => {
  it('renders device config fields', () => {
    render(
      <DeviceConfigForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Device Name')).toBeInTheDocument();
    expect(screen.getByText('Device Type')).toBeInTheDocument();
    expect(screen.getByText('Connection Type')).toBeInTheDocument();
    expect(screen.getByText('Location ID')).toBeInTheDocument();
    expect(screen.getByText('Save Device')).toBeInTheDocument();
  });

  it('shows active checkbox', () => {
    render(
      <DeviceConfigForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('Device is active')).toBeInTheDocument();
  });
});
