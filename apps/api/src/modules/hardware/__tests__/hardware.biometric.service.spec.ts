import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HardwareBiometricService } from '../hardware.biometric.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    setting: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
  };
}

describe('HardwareBiometricService (Unit)', () => {
  let service: HardwareBiometricService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new HardwareBiometricService(mockPrisma as any);
  });

  describe('processEvent', () => {
    it('processes a CHECK_IN event and records attendance', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1', firstName: 'John', lastName: 'Doe',
      });
      mockPrisma.setting.create.mockResolvedValue({});

      const result = await service.processEvent(TEST_TENANT_ID, {
        employeeCode: 'EMP-001',
        eventType: 'CHECK_IN',
        timestamp: '2025-03-15T09:00:00Z',
        deviceId: 'bio-1',
      });

      expect(result.processed).toBe(true);
      expect(result.employeeName).toBe('John Doe');
      expect(result.eventType).toBe('CHECK_IN');
    });

    it('processes a CHECK_OUT event', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1', firstName: 'Jane', lastName: 'Smith',
      });
      mockPrisma.setting.create.mockResolvedValue({});

      const result = await service.processEvent(TEST_TENANT_ID, {
        employeeCode: 'EMP-002',
        eventType: 'CHECK_OUT',
        timestamp: '2025-03-15T18:00:00Z',
        deviceId: 'bio-1',
      });

      expect(result.eventType).toBe('CHECK_OUT');
    });

    it('handles unknown employee gracefully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.setting.create.mockResolvedValue({});

      const result = await service.processEvent(TEST_TENANT_ID, {
        employeeCode: 'UNKNOWN',
        eventType: 'CHECK_IN',
        timestamp: '2025-03-15T09:00:00Z',
        deviceId: 'bio-1',
      });

      expect(result.processed).toBe(true);
      expect(result.employeeName).toBeNull();
    });
  });

  describe('getAttendance', () => {
    it('returns filtered attendance events', async () => {
      const event = {
        id: 'ev-1', tenantId: TEST_TENANT_ID, employeeCode: 'EMP-001',
        eventType: 'CHECK_IN', timestamp: '2025-03-15T09:00:00Z',
        deviceId: 'bio-1', employeeName: 'John Doe', processed: true,
      };
      mockPrisma.setting.findMany.mockResolvedValue([
        { value: JSON.stringify(event) },
      ]);

      const result = await service.getAttendance(TEST_TENANT_ID, {
        date: '2025-03-15',
      });

      expect(result).toHaveLength(1);
      expect(result[0].employeeCode).toBe('EMP-001');
    });

    it('filters by deviceId', async () => {
      const ev1 = { deviceId: 'bio-1', employeeCode: 'E1', timestamp: '2025-03-15T09:00:00Z', eventType: 'CHECK_IN' };
      const ev2 = { deviceId: 'bio-2', employeeCode: 'E2', timestamp: '2025-03-15T09:00:00Z', eventType: 'CHECK_IN' };
      mockPrisma.setting.findMany.mockResolvedValue([
        { value: JSON.stringify(ev1) },
        { value: JSON.stringify(ev2) },
      ]);

      const result = await service.getAttendance(TEST_TENANT_ID, { deviceId: 'bio-1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('getAttendanceSummary', () => {
    it('summarizes check-ins and check-outs for a date', async () => {
      const events = [
        { employeeCode: 'E1', employeeName: 'John', eventType: 'CHECK_IN', timestamp: '2025-03-15T09:00:00Z', deviceId: 'bio-1' },
        { employeeCode: 'E1', employeeName: 'John', eventType: 'CHECK_OUT', timestamp: '2025-03-15T18:00:00Z', deviceId: 'bio-1' },
        { employeeCode: 'E2', employeeName: 'Jane', eventType: 'CHECK_IN', timestamp: '2025-03-15T09:30:00Z', deviceId: 'bio-1' },
      ];
      mockPrisma.setting.findMany.mockResolvedValue(
        events.map((e) => ({ value: JSON.stringify(e) })),
      );

      const result = await service.getAttendanceSummary(TEST_TENANT_ID, '2025-03-15');

      expect(result.totalCheckIns).toBe(2);
      expect(result.totalCheckOuts).toBe(1);
      expect(result.employees).toHaveLength(2);
    });
  });
});
