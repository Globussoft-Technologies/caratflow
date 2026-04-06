// Mock recharts for vitest - provides lightweight component stubs
import * as React from 'react';

export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="responsive-container">{children}</div>
);

const createMockChart = (name: string) =>
  ({ children }: { children?: React.ReactNode }) => (
    <div data-testid={`chart-${name}`}>{children}</div>
  );

export const BarChart = createMockChart('bar');
export const Bar = () => <div data-testid="bar" />;
export const LineChart = createMockChart('line');
export const Line = () => <div data-testid="line" />;
export const PieChart = createMockChart('pie');
export const Pie = ({ children }: { children?: React.ReactNode }) => <div data-testid="pie">{children}</div>;
export const Cell = () => <div />;
export const AreaChart = createMockChart('area');
export const Area = () => <div data-testid="area" />;
export const XAxis = () => <div />;
export const YAxis = () => <div />;
export const CartesianGrid = () => <div />;
export const Tooltip = () => <div />;
export const Legend = () => <div />;
export const ReferenceLine = () => <div />;
