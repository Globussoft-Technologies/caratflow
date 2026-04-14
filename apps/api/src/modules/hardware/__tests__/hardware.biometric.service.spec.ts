import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HardwareBiometricService } from '../hardware.biometric.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    hardwareBiometricEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    karigar: { ...base.karigar, findFirst: vi.fn() },
    karigarAttendance: { ...base.karigarAttendance, upsert: vi.fn() },
    user: { ...base.user, findFirst: vi.fn() },
  };
}

function mockEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

describe('HardwareBiometricService (Unit)', () => {
  let service: HardwareBiometricService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let eventBus: ReturnType<typeof mockEventBus>;

  const mockRow = (over: Record<string, unknown> = {}) => ({
    id: 'ev-1',
    tenantId: TEST_TENANT_ID,
    deviceId: 'bio-1',
    employeeCode: 'EMP-001',
    employeeName: 'John Doe',
    eventType: 'CHECK_IN',
    eventAt: new Date('2026-03-15T09:00:00Z'),
    processed: true,
    rawPayload: null,
    createdAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    eventBus = mockEventBus();
    service = new HardwareBiometricService(mockPrisma as any, eventBus as any);
  });

  describe('processEvent', () => {
    it('processes a CHECK_IN, upserts karigar attendance, and emits event', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'k-1',
        firstName: 'John',
        lastName: 'Doe',
      });
      mockPrisma.hardwareBiometricEvent.create.mockResolvedValue(mockRow());
      mockPrisma.karigarAttendance.upsert.mockResolvedValue({});

      const result = await service.processEvent(TEST_TENANT_ID, {
        employeeCode: 'EMP-001',
        eventType: 'CHECK_IN',
        timestamp: '2026-03-15T09:00:00Z',
        deviceId: 'bio-1',
      });

      expect(result.processed).toBe(true);
      expect(result.employeeName).toBe('John Doe');
      expect(result.eventType).toBe('CHECK_IN');
      expect(mockPrisma.karigarAttendance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            karigarId: 'k-1',
            checkInTime: expect.any(Date),
          }),
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.biometric.received',
          payload: expect.objectContaining({
            deviceId: 'bio-1',
            employeeCode: 'EMP-001',
            eventType: 'CHECK_IN',
          }),
        }),
      );
    });

    it('processes a CHECK_OUT and upserts checkOutTime', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'k-2',
        firstName: 'Jane',
        lastName: 'Smith',
      });
      mockPrisma.hardwareBiometricEvent.create.mockResolvedValue(
        mockRow({ id: 'ev-2', employeeCode: 'EMP-002', employeeName: 'Jane Smith', eventType: 'CHECK_OUT' }),
      );
      mockPrisma.karigarAttendance.upsert.mockResolvedValue({});

      const result = await service.processEvent(TEST_TENANT_ID, {
        employeeCode: 'EMP-002',
        eventType: 'CHECK_OUT',
        timestamp: '2026-03-15T18:00:00Z',
        deviceId: 'bio-1',
      });

      expect(result.eventType).toBe('CHECK_OUT');
      const upsertArg = mockPrisma.karigarAttendance.upsert.mock.calls[0][0];
      expect(upsertArg.create.checkOutTime).toBeInstanceOf(Date);
    });

    it('handles unknown employee gracefully (no attendance upsert)', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.hardwareBiometricEvent.create.mockResolvedValue(
        mockRow({ employeeName: null, employeeCode: 'UNKNOWN' }),
      );

      const result = await service.processEvent(TEST_TENANT_ID, {
        employeeCode: 'UNKNOWN',
        eventType: 'CHECK_IN',
        timestamp: '2026-03-15T09:00:00Z',
        deviceId: 'bio-1',
      });

      expect(result.processed).toBe(true);
      expect(result.employeeName).toBeNull();
      expect(mockPrisma.karigarAttendance.upsert).not.toHaveBeenCalled();
    });
  });

  describe('processWebhook', () => {
    it('normalizes ZKTeco/ESSL payload using deviceId or deviceSerial', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'k-1',
        firstName: 'A',
        lastName: 'B',
      });
      mockPrisma.hardwareBiometricEvent.create.mockResolvedValue(mockRow());
      mockPrisma.karigarAttendance.upsert.mockResolvedValue({});

      // Payload uses deviceSerial instead of deviceId
      const result = await service.processWebhook(TEST_TENANT_ID, {
        deviceSerial: 'ZK-123',
        employeeCode: 'EMP-001',
        eventType: 'CHECK_IN',
        timestamp: '2026-03-15T09:00:00Z',
        raw: { vendor: 'ZKTeco' },
      } as any);

      expect(result.processed).toBe(true);
      const createArg = mockPrisma.hardwareBiometricEvent.create.mock.calls[0][0];
      expect(createArg.data.deviceId).toBe('ZK-123');
      // Raw payload persisted
      expect(createArg.data.rawPayload).toEqual({ vendor: 'ZKTeco' });
    });

    it('falls back to "unknown" deviceId when neither deviceId nor deviceSerial provided', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.hardwareBiometricEvent.create.mockResolvedValue(mockRow({ deviceId: 'unknown' }));

      const result = await service.processWebhook(TEST_TENANT_ID, {
        employeeCode: 'E-X',
        eventType: 'CHECK_IN',
        timestamp: '2026-03-15T09:00:00Z',
      } as any);

      expect(result.deviceId).toBe('unknown');
    });
  });

  describe('getAttendance', () => {
    it('returns filtered attendance events', async () => {
      mockPrisma.hardwareBiometricEvent.findMany.mockResolvedValue([
        mockRow(),
        mockRow({ id: 'ev-2', employeeCode: 'EMP-002', employeeName: 'Jane' }),
      ]);

      const result = await service.getAttendance(TEST_TENANT_ID, { date: '2026-03-15' });

      expect(result).toHaveLength(2);
      expect(result[0]!.employeeCode).toBe('EMP-001');
      const where = mockPrisma.hardwareBiometricEvent.findMany.mock.calls[0][0].where;
      expect(where.tenantId).toBe(TEST_TENANT_ID);
      expect(where.eventAt.gte).toBeInstanceOf(Date);
      expect(where.eventAt.lt).toBeInstanceOf(Date);
    });

    it('filters by deviceId', async () => {
      mockPrisma.hardwareBiometricEvent.findMany.mockResolvedValue([]);
      await service.getAttendance(TEST_TENANT_ID, { deviceId: 'bio-1' } as any);

      const where = mockPrisma.hardwareBiometricEvent.findMany.mock.calls[0][0].where;
      expect(where.deviceId).toBe('bio-1');
    });
  });

  describe('getAttendanceSummary', () => {
    it('summarizes check-ins and check-outs per employee', async () => {
      mockPrisma.hardwareBiometricEvent.findMany.mockResolvedValue([
        mockRow({ id: 'e1', employeeCode: 'E1', employeeName: 'John', eventType: 'CHECK_IN', eventAt: new Date('2026-03-15T09:00:00Z') }),
        mockRow({ id: 'e2', employeeCode: 'E1', employeeName: 'John', eventType: 'CHECK_OUT', eventAt: new Date('2026-03-15T18:00:00Z') }),
        mockRow({ id: 'e3', employeeCode: 'E2', employeeName: 'Jane', eventType: 'CHECK_IN', eventAt: new Date('2026-03-15T09:30:00Z') }),
      ]);

      const result = await service.getAttendanceSummary(TEST_TENANT_ID, '2026-03-15');

      expect(result.totalCheckIns).toBe(2);
      expect(result.totalCheckOuts).toBe(1);
      expect(result.employees).toHaveLength(2);
    });
  });
});
