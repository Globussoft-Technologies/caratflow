import { describe, it, expect } from 'vitest';
import {
  BomInputSchema,
  BomItemInputSchema,
  JobOrderInputSchema,
  KarigarInputSchema,
  KarigarAttendanceInputSchema,
  KarigarTransactionInputSchema,
  QualityCheckpointInputSchema,
  ProductionPlanInputSchema,
  JobOrderFilterSchema,
  BomItemType,
  JobPriority,
  KarigarSkillLevel,
  AttendanceStatus,
  KarigarMetalType,
  KarigarTransactionType,
  QcCheckpointType,
  QcStatus,
  MfgJobOrderStatus,
} from '../manufacturing';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('BomItemInputSchema', () => {
  it('should parse valid BOM item', () => {
    const result = BomItemInputSchema.safeParse({
      itemType: BomItemType.METAL,
      description: 'Gold sheet',
      quantityRequired: 2,
      unitOfMeasure: 'g',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid itemType', () => {
    const result = BomItemInputSchema.safeParse({
      itemType: 'INVALID',
      description: 'test',
      quantityRequired: 1,
      unitOfMeasure: 'g',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty description', () => {
    const result = BomItemInputSchema.safeParse({
      itemType: BomItemType.STONE,
      description: '',
      quantityRequired: 1,
      unitOfMeasure: 'ct',
    });
    expect(result.success).toBe(false);
  });
});

describe('BomInputSchema', () => {
  const validBomItem = {
    itemType: BomItemType.METAL,
    description: 'Gold sheet',
    quantityRequired: 1,
    unitOfMeasure: 'g',
  };

  it('should parse valid BOM with items', () => {
    const result = BomInputSchema.safeParse({
      name: 'Gold Ring BOM',
      productId: validUuid,
      items: [validBomItem],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.outputQuantity).toBe(1);
    }
  });

  it('should reject BOM with empty items array', () => {
    const result = BomInputSchema.safeParse({
      name: 'Gold Ring BOM',
      productId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing name', () => {
    const result = BomInputSchema.safeParse({
      productId: validUuid,
      items: [validBomItem],
    });
    expect(result.success).toBe(false);
  });

  it('should validate nested items', () => {
    const result = BomInputSchema.safeParse({
      name: 'Test BOM',
      productId: validUuid,
      items: [{ itemType: 'INVALID', description: '', quantityRequired: -1, unitOfMeasure: '' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('JobOrderInputSchema', () => {
  it('should parse valid job order with defaults', () => {
    const result = JobOrderInputSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(JobPriority.MEDIUM);
      expect(result.data.quantity).toBe(1);
    }
  });

  it('should accept optional fields as null', () => {
    const result = JobOrderInputSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
      bomId: null,
      customerId: null,
      assignedKarigarId: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid priority enum', () => {
    const result = JobOrderInputSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
      priority: 'SUPER_URGENT',
    });
    expect(result.success).toBe(false);
  });

  it('should reject quantity less than 1', () => {
    const result = JobOrderInputSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('KarigarInputSchema', () => {
  it('should parse valid karigar input with defaults', () => {
    const result = KarigarInputSchema.safeParse({
      employeeCode: 'EMP001',
      firstName: 'Raju',
      lastName: 'Kumar',
      locationId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skillLevel).toBe(KarigarSkillLevel.JUNIOR);
      expect(result.data.isActive).toBe(true);
    }
  });

  it('should accept optional nullable fields', () => {
    const result = KarigarInputSchema.safeParse({
      employeeCode: 'EMP002',
      firstName: 'Suresh',
      lastName: 'Verma',
      locationId: validUuid,
      phone: null,
      email: null,
      specialization: 'Gold jewelry',
      skillLevel: KarigarSkillLevel.MASTER,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = KarigarInputSchema.safeParse({
      employeeCode: 'EMP003',
      firstName: 'A',
      lastName: 'B',
      locationId: validUuid,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty employeeCode', () => {
    const result = KarigarInputSchema.safeParse({
      employeeCode: '',
      firstName: 'A',
      lastName: 'B',
      locationId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe('KarigarAttendanceInputSchema', () => {
  it('should parse valid attendance', () => {
    const result = KarigarAttendanceInputSchema.safeParse({
      karigarId: validUuid,
      date: '2026-04-07',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(AttendanceStatus.PRESENT);
    }
  });
});

describe('KarigarTransactionInputSchema', () => {
  it('should parse valid transaction', () => {
    const result = KarigarTransactionInputSchema.safeParse({
      karigarId: validUuid,
      transactionType: KarigarTransactionType.ISSUE,
      metalType: KarigarMetalType.GOLD,
      purityFineness: 916,
      weightMg: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero weightMg', () => {
    const result = KarigarTransactionInputSchema.safeParse({
      karigarId: validUuid,
      transactionType: KarigarTransactionType.RETURN,
      metalType: KarigarMetalType.SILVER,
      purityFineness: 999,
      weightMg: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('QualityCheckpointInputSchema', () => {
  it('should parse valid QC checkpoint', () => {
    const result = QualityCheckpointInputSchema.safeParse({
      jobOrderId: validUuid,
      checkpointType: QcCheckpointType.FINAL,
      checkedBy: 'Inspector Singh',
      status: QcStatus.PASSED,
    });
    expect(result.success).toBe(true);
  });
});

describe('ProductionPlanInputSchema', () => {
  it('should parse valid production plan', () => {
    const result = ProductionPlanInputSchema.safeParse({
      name: 'Q1 2026 Plan',
      locationId: validUuid,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
    expect(result.success).toBe(true);
  });
});

describe('JobOrderFilterSchema', () => {
  it('should parse empty filter', () => {
    const result = JobOrderFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should parse with all optional fields', () => {
    const result = JobOrderFilterSchema.safeParse({
      status: MfgJobOrderStatus.IN_PROGRESS,
      priority: JobPriority.HIGH,
      search: 'ring',
    });
    expect(result.success).toBe(true);
  });
});
