import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmLeadService } from '../crm.lead.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('CrmLeadService (Unit)', () => {
  let service: CrmLeadService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new CrmLeadService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Lead Pipeline ─────────────────────────────────────────────

  describe('updateLeadStatus', () => {
    it('allows NEW -> CONTACTED transition', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        tenantId: TEST_TENANT_ID,
        status: 'NEW',
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'CONTACTED',
      });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const result = await service.updateLeadStatus(TEST_TENANT_ID, TEST_USER_ID, {
        leadId: 'lead-1',
        status: 'CONTACTED',
      });

      expect(result.status).toBe('CONTACTED');
    });

    it('allows CONTACTED -> QUALIFIED transition', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        status: 'CONTACTED',
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'QUALIFIED',
      });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const result = await service.updateLeadStatus(TEST_TENANT_ID, TEST_USER_ID, {
        leadId: 'lead-1',
        status: 'QUALIFIED',
      });

      expect(result.status).toBe('QUALIFIED');
    });

    it('allows QUALIFIED -> WON transition', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        status: 'QUALIFIED',
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'WON',
      });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const result = await service.updateLeadStatus(TEST_TENANT_ID, TEST_USER_ID, {
        leadId: 'lead-1',
        status: 'WON',
      });

      expect(result.status).toBe('WON');
    });

    it('records lost reason when status is LOST', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        status: 'NEGOTIATION',
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'LOST',
        lostReason: 'Price too high',
      });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      await service.updateLeadStatus(TEST_TENANT_ID, TEST_USER_ID, {
        leadId: 'lead-1',
        status: 'LOST',
        lostReason: 'Price too high',
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lostReason: 'Price too high',
          }),
        }),
      );
    });

    it('logs status change as activity', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        status: 'NEW',
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'CONTACTED',
      });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      await service.updateLeadStatus(TEST_TENANT_ID, TEST_USER_ID, {
        leadId: 'lead-1',
        status: 'CONTACTED',
      });

      expect(mockPrisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining('Status changed from NEW to CONTACTED'),
          }),
        }),
      );
    });
  });

  // ─── Lead Assignment ───────────────────────────────────────────

  describe('assignLead', () => {
    it('assigns lead to salesperson', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        tenantId: TEST_TENANT_ID,
        assignedTo: TEST_USER_ID,
      });
      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        assignedTo: 'sales-user-1',
      });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const result = await service.assignLead(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'lead-1',
        'sales-user-1',
      );

      expect(result.assignedTo).toBe('sales-user-1');
      expect(mockPrisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining('Lead assigned to sales-user-1'),
          }),
        }),
      );
    });
  });

  // ─── Lead Conversion ───────────────────────────────────────────

  describe('convertToCustomer', () => {
    it('creates customer from lead info on WON', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        tenantId: TEST_TENANT_ID,
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+919876543210',
        email: 'priya@example.com',
        customerId: null,
        status: 'QUALIFIED',
      });

      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-new',
        firstName: 'Priya',
        lastName: 'Sharma',
      });

      mockPrisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'WON',
        customerId: 'cust-new',
      });

      mockPrisma.leadActivity.create.mockResolvedValue({});

      const result = await service.convertToCustomer(TEST_TENANT_ID, TEST_USER_ID, 'lead-1');

      expect(result.customerId).toBe('cust-new');
      expect(result.alreadyExisted).toBe(false);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            firstName: 'Priya',
            lastName: 'Sharma',
          }),
        }),
      );
    });

    it('uses existing customer if lead already linked', async () => {
      mockPrisma.lead.findFirstOrThrow.mockResolvedValue({
        id: 'lead-1',
        tenantId: TEST_TENANT_ID,
        firstName: 'Existing',
        lastName: 'Customer',
        customerId: 'cust-existing',
        status: 'QUALIFIED',
      });

      // For updateLeadStatus called internally
      mockPrisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'WON' });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const result = await service.convertToCustomer(TEST_TENANT_ID, TEST_USER_ID, 'lead-1');

      expect(result.customerId).toBe('cust-existing');
      expect(result.alreadyExisted).toBe(true);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });
  });

  // ─── Lead CRUD ─────────────────────────────────────────────────

  describe('createLead', () => {
    it('creates lead with NEW status', async () => {
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-1',
        tenantId: TEST_TENANT_ID,
        firstName: 'New',
        lastName: 'Lead',
        status: 'NEW',
        source: 'WALK_IN',
        assignedTo: TEST_USER_ID,
      });

      const result = await service.createLead(TEST_TENANT_ID, TEST_USER_ID, {
        firstName: 'New',
        lastName: 'Lead',
        source: 'WALK_IN',
      } as any);

      expect(result.status).toBe('NEW');
      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'NEW',
            tenantId: TEST_TENANT_ID,
          }),
        }),
      );
    });
  });
});
