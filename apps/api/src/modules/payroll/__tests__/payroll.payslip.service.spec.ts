import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollPayslipService } from '../payroll.payslip.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extend(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    payslip: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makePdfServiceStub() {
  return {
    renderTemplate: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake pdf body')),
    renderHtmlToPdf: vi.fn(),
    loadAndFillTemplate: vi.fn(),
    fillTemplate: vi.fn(),
  };
}

function makeEmailServiceStub() {
  return {
    sendEmail: vi
      .fn()
      .mockResolvedValue({ success: true, externalId: 'sg-123', statusCode: 202 }),
  };
}

const samplePayslip = {
  id: 'ps1',
  tenantId: TEST_TENANT_ID,
  basicSalary: BigInt(1500000),
  hra: BigInt(500000),
  grossSalary: BigInt(2000000),
  pfDeduction: BigInt(180000),
  esiDeduction: BigInt(15000),
  tdsDeduction: 0n,
  professionalTax: BigInt(20000),
  totalDeductions: BigInt(215000),
  netSalary: BigInt(1785000),
  employee: {
    employeeCode: 'E001',
    firstName: 'Ravi',
    lastName: 'Kumar',
    designation: 'Manager',
  },
  payrollPeriod: { periodLabel: '2026-04' },
};

describe('PayrollPayslipService', () => {
  let svc: PayrollPayslipService;
  let prisma: ReturnType<typeof extend>;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    svc = new PayrollPayslipService(prisma as any);
  });

  it('list: applies filters', async () => {
    prisma.payslip.findMany.mockResolvedValue([]);
    await svc.list(TEST_TENANT_ID, { payrollPeriodId: 'p1', employeeId: 'e1', status: 'DRAFT' });
    const where = prisma.payslip.findMany.mock.calls[0]![0].where;
    expect(where.tenantId).toBe(TEST_TENANT_ID);
    expect(where.payrollPeriodId).toBe('p1');
    expect(where.employeeId).toBe('e1');
    expect(where.status).toBe('DRAFT');
  });

  it('getById: throws when not found', async () => {
    prisma.payslip.findFirst.mockResolvedValue(null);
    await expect(svc.getById(TEST_TENANT_ID, 'x')).rejects.toThrow(/not found/);
  });

  it('generatePayslip: returns HTML content with expected fields', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.generatePayslip(TEST_TENANT_ID, 'ps1');
    expect(res.format).toBe('HTML');
    expect(res.filename).toBe('payslip-E001-2026-04.html');
    expect(res.content).toContain('Ravi Kumar');
    expect(res.content).toContain('2026-04');
    expect(res.content).toContain('Rs. 20000.00'); // gross in rupees
    expect(res.content).toContain('Rs. 17850.00'); // net
  });

  it('emailPayslip: returns sent result (stub)', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.emailPayslip(TEST_TENANT_ID, 'ps1', 'test@example.com');
    expect(res.sent).toBe(true);
    expect(res.to).toBe('test@example.com');
  });

  it('emailPayslip: falls back to default email when not provided', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.emailPayslip(TEST_TENANT_ID, 'ps1');
    expect(res.sent).toBe(true);
    expect(res.to).toContain('E001');
  });
});

describe('PayrollPayslipService (PDF + Email wired)', () => {
  let svc: PayrollPayslipService;
  let prisma: ReturnType<typeof extend>;
  let pdf: ReturnType<typeof makePdfServiceStub>;
  let email: ReturnType<typeof makeEmailServiceStub>;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    pdf = makePdfServiceStub();
    email = makeEmailServiceStub();
    svc = new PayrollPayslipService(prisma as any, pdf as any, email as any);
  });

  it('generatePdf: calls pdfService.renderTemplate("payslip", data) and returns Buffer', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const buf = await svc.generatePdf(TEST_TENANT_ID, 'ps1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(pdf.renderTemplate).toHaveBeenCalledTimes(1);
    const [templateName, data] = pdf.renderTemplate.mock.calls[0]!;
    expect(templateName).toBe('payslip');
    expect(data).toMatchObject({
      employeeCode: 'E001',
      employeeName: 'Ravi Kumar',
      periodLabel: '2026-04',
      currency: 'INR',
      netSalary: '17850.00',
      grossSalary: '20000.00',
      pfDeduction: '1800.00',
    });
    expect(data.netSalaryInWords).toMatch(/Rupees/);
  });

  it('downloadPdf: returns { filename, mimeType, base64 }', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.downloadPdf(TEST_TENANT_ID, 'ps1');
    expect(res.mimeType).toBe('application/pdf');
    expect(res.filename).toBe('payslip-E001-2026-04.pdf');
    expect(typeof res.base64).toBe('string');
    expect(res.base64.length).toBeGreaterThan(0);
    // base64 of "%PDF-1.4 fake pdf body" starts with "JVBER"
    expect(res.base64.startsWith('JVBER')).toBe(true);
  });

  it('emailPayslipToEmployee: attaches PDF as base64 and calls EmailService', async () => {
    prisma.payslip.findFirst.mockResolvedValue({
      ...samplePayslip,
      employee: { ...samplePayslip.employee, email: 'ravi@example.com' },
    });
    prisma.payslip.update.mockResolvedValue({});

    const res = await svc.emailPayslipToEmployee(TEST_TENANT_ID, 'ps1');
    expect(res.sent).toBe(true);
    expect(res.to).toBe('ravi@example.com');
    expect(res.externalId).toBe('sg-123');

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    const [tenantArg, payload] = email.sendEmail.mock.calls[0]!;
    expect(tenantArg).toBe(TEST_TENANT_ID);
    expect(payload.to).toBe('ravi@example.com');
    expect(payload.subject).toContain('2026-04');
    expect(payload.html).toContain('Ravi');
    expect(payload.attachments).toHaveLength(1);
    const att = payload.attachments[0];
    expect(att.filename).toBe('payslip-E001-2026-04.pdf');
    expect(att.type).toBe('application/pdf');
    expect(typeof att.content).toBe('string');
    // base64 — never the raw buffer
    expect(att.content).not.toContain('%PDF');
    expect(att.content.startsWith('JVBER')).toBe(true);

    // emailedAt stamped
    expect(prisma.payslip.update).toHaveBeenCalled();
    const updateArgs = prisma.payslip.update.mock.calls[0]![0];
    expect(updateArgs.data.allowances).toHaveProperty('_emailedAt');
  });

  it('emailPayslipToEmployee: uses override email when provided', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    prisma.payslip.update.mockResolvedValue({});
    const res = await svc.emailPayslipToEmployee(TEST_TENANT_ID, 'ps1', 'hr@example.com');
    expect(res.to).toBe('hr@example.com');
    expect(email.sendEmail.mock.calls[0]![1].to).toBe('hr@example.com');
  });

  it('emailPayslipToEmployee: throws when no email on file and no override', async () => {
    // samplePayslip.employee has no `email` field -> derivation returns undefined
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    await expect(svc.emailPayslipToEmployee(TEST_TENANT_ID, 'ps1')).rejects.toThrow(
      /no email on file/i,
    );
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});
