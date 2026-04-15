import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollEmployeeService } from '../payroll.employee.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extend(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    employee: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('PayrollEmployeeService', () => {
  let svc: PayrollEmployeeService;
  let prisma: ReturnType<typeof extend>;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    svc = new PayrollEmployeeService(prisma as any);
  });

  const sampleInput = () => ({
    employeeCode: 'E001',
    firstName: 'Ravi',
    lastName: 'Kumar',
    joinedAt: new Date('2024-01-01'),
    basicSalaryPaise: 1500000,
    hraPaise: 500000,
    daPaise: 0,
    conveyancePaise: 0,
    medicalPaise: 0,
    otherAllowancePaise: 0,
  });

  it('create: rejects duplicate employee code', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'x' });
    await expect(svc.create(TEST_TENANT_ID, sampleInput())).rejects.toThrow(/already exists/);
  });

  it('create: persists with BigInt conversion', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);
    prisma.employee.create.mockResolvedValue({ id: 'e1' });
    await svc.create(TEST_TENANT_ID, sampleInput());
    const arg = prisma.employee.create.mock.calls[0]![0];
    expect(arg.data.basicSalaryPaise).toBe(BigInt(1500000));
    expect(arg.data.tenantId).toBe(TEST_TENANT_ID);
    expect(arg.data.status).toBe('ACTIVE');
  });

  it('getById: throws when not found', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(svc.getById(TEST_TENANT_ID, 'x')).rejects.toThrow(/not found/);
  });

  it('list: applies tenant filter and pagination', async () => {
    prisma.employee.findMany.mockResolvedValue([]);
    prisma.employee.count.mockResolvedValue(0);
    await svc.list(TEST_TENANT_ID, { page: 1, limit: 10 });
    expect(prisma.employee.findMany.mock.calls[0]![0].where.tenantId).toBe(TEST_TENANT_ID);
  });

  it('list: applies search OR clause', async () => {
    prisma.employee.findMany.mockResolvedValue([]);
    prisma.employee.count.mockResolvedValue(0);
    await svc.list(TEST_TENANT_ID, { search: 'ravi' });
    const where = prisma.employee.findMany.mock.calls[0]![0].where;
    expect(where.OR).toBeDefined();
    expect(where.OR).toHaveLength(3);
  });

  it('deactivate: sets INACTIVE and leftAt', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
    prisma.employee.update.mockResolvedValue({ id: 'e1', status: 'INACTIVE' });
    await svc.deactivate(TEST_TENANT_ID, 'e1');
    const arg = prisma.employee.update.mock.calls[0]![0];
    expect(arg.data.status).toBe('INACTIVE');
    expect(arg.data.leftAt).toBeInstanceOf(Date);
  });

  it('update: converts BigInt fields when supplied', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
    prisma.employee.update.mockResolvedValue({ id: 'e1' });
    await svc.update(TEST_TENANT_ID, 'e1', { basicSalaryPaise: 2000000 } as any);
    const arg = prisma.employee.update.mock.calls[0]![0];
    expect(arg.data.basicSalaryPaise).toBe(BigInt(2000000));
  });

  describe('bulkImport', () => {
    it('imports valid CSV rows', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue({ id: 'e1' });
      const csv =
        'employeeCode,firstName,lastName,joinedAt,basicSalaryPaise,hraPaise\n' +
        'E001,A,B,2024-01-01,1000000,200000\n' +
        'E002,C,D,2024-02-01,1100000,220000';
      const result = await svc.bulkImport(TEST_TENANT_ID, csv);
      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects CSV missing required header', async () => {
      const csv = 'firstName\nA';
      await expect(svc.bulkImport(TEST_TENANT_ID, csv)).rejects.toThrow(/Missing column/);
    });

    it('collects errors for failing rows', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'existing' });
      const csv =
        'employeeCode,firstName,lastName,joinedAt\nE001,A,B,2024-01-01';
      const result = await svc.bulkImport(TEST_TENANT_ID, csv);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});
