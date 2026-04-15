import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportChart } from '../ReportChart';
import { ReportTable } from '../ReportTable';
import { DateRangePicker } from '../DateRangePicker';
import { KpiCard } from '../KpiCard';
import { ForecastChart } from '../ForecastChart';
import { PeriodComparison } from '../PeriodComparison';
import { ExportButton } from '../ExportButton';
import { CustomReportBuilder } from '../CustomReportBuilder';
import { WidgetGrid } from '../WidgetGrid';
import type { ChartTypeEnum as ChartTypeEnumType } from '@caratflow/shared-types';

const ChartTypeEnum = {
  BAR: 'bar',
  LINE: 'line',
  PIE: 'pie',
  TABLE: 'table',
  AREA: 'area',
} as unknown as typeof ChartTypeEnumType;

describe('ReportChart', () => {
  it('renders bar chart', () => {
    const data = {
      title: 'Sales',
      chartType: ChartTypeEnum.BAR,
      labels: ['Jan', 'Feb'],
      datasets: [{ label: 'Sales', data: [100, 200] }],
    };
    render(<ReportChart data={data} />);
    expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
  });

  it('renders line chart', () => {
    const data = {
      title: 'Revenue',
      chartType: ChartTypeEnum.LINE,
      labels: ['Jan', 'Feb'],
      datasets: [{ label: 'Revenue', data: [100, 200] }],
    };
    render(<ReportChart data={data} />);
    expect(screen.getByTestId('chart-line')).toBeInTheDocument();
  });

  it('renders pie chart', () => {
    const data = {
      title: 'Distribution',
      chartType: ChartTypeEnum.PIE,
      labels: ['Gold', 'Silver'],
      datasets: [{ label: 'Value', data: [70, 30] }],
    };
    render(<ReportChart data={data} />);
    expect(screen.getByTestId('chart-pie')).toBeInTheDocument();
  });

  it('shows unsupported message for unknown type', () => {
    const data = {
      title: 'Unknown',
      chartType: 'unknown' as never,
      labels: [],
      datasets: [],
    };
    render(<ReportChart data={data} />);
    expect(screen.getByText(/unsupported chart type/i)).toBeInTheDocument();
  });
});

describe('ReportTable', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Amount', align: 'right' as const },
  ];
  const data = [
    { name: 'Gold Ring', amount: 50000 },
    { name: 'Silver Chain', amount: 3000 },
  ];

  it('renders table with column headers and rows', () => {
    render(<ReportTable columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Gold Ring')).toBeInTheDocument();
    expect(screen.getByText('Silver Chain')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<ReportTable columns={columns} data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows pagination when data exceeds page size', () => {
    const bigData = Array.from({ length: 30 }, (_, i) => ({
      name: `Item ${i}`,
      amount: i * 100,
    }));
    render(<ReportTable columns={columns} data={bigData} pageSize={10} />);
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});

describe('DateRangePicker', () => {
  it('has from and to date inputs', () => {
    const onChange = vi.fn();
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');
    render(<DateRangePicker from={from} to={to} onChange={onChange} />);
    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('shows presets button', () => {
    render(
      <DateRangePicker
        from={new Date('2026-01-01')}
        to={new Date('2026-01-31')}
        onChange={vi.fn()}
        presets={true}
      />,
    );
    expect(screen.getByText('Presets')).toBeInTheDocument();
  });

  it('shows preset options when clicked', () => {
    render(
      <DateRangePicker
        from={new Date('2026-01-01')}
        to={new Date('2026-01-31')}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Presets'));
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
  });
});

describe('KpiCard', () => {
  it('shows value and trend', () => {
    render(
      <KpiCard
        data={{
          label: 'Total Sales',
          value: 1250000,
          formattedValue: '12,50,000',
          trend: { direction: 'up', value: 12.5, label: 'vs last month' },
        }}
      />,
    );
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('12,50,000')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders without trend', () => {
    render(
      <KpiCard
        data={{
          label: 'Inventory Count',
          value: 1245,
          formattedValue: '1,245',
        }}
      />,
    );
    expect(screen.getByText('Inventory Count')).toBeInTheDocument();
    expect(screen.getByText('1,245')).toBeInTheDocument();
  });
});

describe('ForecastChart', () => {
  it('renders prediction area chart', () => {
    const data = {
      entityId: 'e1',
      entityName: 'Gold Ring',
      method: 'ETS',
      accuracy: 92,
      mape: 8.5,
      predictions: [
        { period: 'Jan', actual: 100, predicted: 100, lowerBound: 90, upperBound: 110, confidence: 0.9 },
        { period: 'Feb', actual: null, predicted: 120, lowerBound: 100, upperBound: 140, confidence: 0.85 },
      ],
    };
    render(<ForecastChart data={data} />);
    expect(screen.getByText(/ETS/)).toBeInTheDocument();
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });

  it('shows message when no predictions', () => {
    const data = {
      entityId: 'e1',
      entityName: 'Gold Ring',
      method: 'ETS',
      accuracy: 0,
      mape: 0,
      predictions: [],
    };
    render(<ForecastChart data={data} />);
    expect(screen.getByText(/not enough historical data/i)).toBeInTheDocument();
  });
});

describe('PeriodComparison', () => {
  it('shows side-by-side comparison', () => {
    render(
      <PeriodComparison
        period1Label="This Month"
        period2Label="Last Month"
        metrics={[
          { label: 'Revenue', period1Value: '10L', period2Value: '8L', changePercent: 25 },
          { label: 'Orders', period1Value: '120', period2Value: '100', changePercent: 20 },
        ]}
      />,
    );
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Last Month')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('+25%')).toBeInTheDocument();
  });
});

describe('ExportButton', () => {
  it('shows export button with dropdown', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} />);
    const btn = screen.getByText('Export');
    expect(btn).toBeInTheDocument();
  });

  it('shows CSV, PDF, Excel options when opened', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Excel (XLSX)')).toBeInTheDocument();
  });
});

describe('CustomReportBuilder', () => {
  const entities = [
    {
      name: 'products',
      label: 'Products',
      fields: [
        { name: 'name', label: 'Name', type: 'string', filterable: true, sortable: true, aggregatable: false },
        { name: 'price', label: 'Price', type: 'number', filterable: true, sortable: true, aggregatable: true },
      ],
    },
  ];

  it('has entity and column selectors', () => {
    render(
      <CustomReportBuilder entities={entities} onExecute={vi.fn()} />,
    );
    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByText('Columns')).toBeInTheDocument();
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Price').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Run Report')).toBeInTheDocument();
  });

  it('shows filters and aggregations sections', () => {
    render(
      <CustomReportBuilder entities={entities} onExecute={vi.fn()} />,
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Aggregations')).toBeInTheDocument();
  });
});

describe('WidgetGrid', () => {
  const widgets = [
    { widgetId: 'w1', w: 4, h: 2, x: 0, y: 0, config: { type: 'kpi', title: 'Sales' } },
    { widgetId: 'w2', w: 8, h: 3, x: 4, y: 0, config: { type: 'chart', title: 'Trend' } },
  ];

  it('renders widget cards', () => {
    render(
      <WidgetGrid
        widgets={widgets}
        renderWidget={(w) => <div>{String((w.config as { title?: string } | undefined)?.title ?? '')}</div>}
      />,
    );
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
  });
});
