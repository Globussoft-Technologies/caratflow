import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwarePrinterService } from '../hardware.printer.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    setting: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(),
      updateMany: vi.fn(), delete: vi.fn(),
    },
    product: { ...base.product, findFirst: vi.fn() },
  };
}

describe('HardwarePrinterService (Unit)', () => {
  let service: HardwarePrinterService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const template = {
    id: 'tpl-1', tenantId: TEST_TENANT_ID, name: 'Jewelry Label',
    width: 50, height: 25,
    fields: [
      { type: 'text', value: '{{productName}}', x: 0, y: 0, fontSize: 12 },
      { type: 'text', value: 'Wt: {{grossWeight}}', x: 0, y: 14, fontSize: 10 },
      { type: 'barcode', value: '{{barcode}}', x: 0, y: 20, height: 5 },
    ],
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new HardwarePrinterService(mockPrisma as any);
  });

  describe('createTemplate', () => {
    it('creates a label template stored in settings', async () => {
      mockPrisma.setting.create.mockResolvedValue({});

      const result = await service.createTemplate(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Jewelry Label', width: 50, height: 25, fields: template.fields,
      } as any);

      expect(result.name).toBe('Jewelry Label');
      expect(result.id).toBeDefined();
      expect(mockPrisma.setting.create).toHaveBeenCalledOnce();
    });
  });

  describe('getTemplate', () => {
    it('returns template when found', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({
        value: JSON.stringify(template),
      });

      const result = await service.getTemplate(TEST_TENANT_ID, 'tpl-1');
      expect(result.name).toBe('Jewelry Label');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(null);
      await expect(service.getTemplate(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTemplate', () => {
    it('updates template name and fields', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(template) });
      mockPrisma.setting.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateTemplate(TEST_TENANT_ID, TEST_USER_ID, 'tpl-1', {
        name: 'Updated Label',
      } as any);

      expect(result.name).toBe('Updated Label');
    });
  });

  describe('deleteTemplate', () => {
    it('deletes an existing template', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ id: 's-1' });
      mockPrisma.setting.delete.mockResolvedValue({});

      await service.deleteTemplate(TEST_TENANT_ID, 'tpl-1');
      expect(mockPrisma.setting.delete).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException for missing template', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue(null);
      await expect(service.deleteTemplate(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePrintData', () => {
    it('resolves placeholders in field values', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(template) });

      const result = await service.generatePrintData(TEST_TENANT_ID, {
        templateId: 'tpl-1',
        data: { productName: 'Diamond Ring', grossWeight: '5.000g', barcode: 'DR-001' },
      } as any);

      expect(result.renderedFields[0].resolvedValue).toBe('Diamond Ring');
      expect(result.renderedFields[1].resolvedValue).toBe('Wt: 5.000g');
      expect(result.renderedFields[2].resolvedValue).toBe('DR-001');
    });
  });

  describe('generateJewelryLabel', () => {
    it('fetches product data and renders label', async () => {
      // getTemplate mock
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(template) });
      mockPrisma.product.findFirst.mockResolvedValue({
        sku: 'GR-001', name: 'Gold Ring',
        grossWeightMg: 5000n, netWeightMg: 4500n,
        purityFineness: 916, huid: 'HUID-1',
        sellingPricePaise: 500000n, barcode: 'GR-001',
      });

      const result = await service.generateJewelryLabel(TEST_TENANT_ID, 'tpl-1', 'p-1');

      expect(result.renderedFields).toBeDefined();
    });

    it('throws NotFoundException for missing product', async () => {
      mockPrisma.setting.findFirst.mockResolvedValue({ value: JSON.stringify(template) });
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.generateJewelryLabel(TEST_TENANT_ID, 'tpl-1', 'bad'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateZpl', () => {
    it('generates ZPL output with text, barcode, and QR fields', () => {
      const preview = {
        templateId: 'tpl-1', templateName: 'Label',
        width: 50, height: 25,
        renderedFields: [
          { type: 'text', value: '{{productName}}', resolvedValue: 'Ring', x: 0, y: 0, fontSize: 24, height: 10 },
          { type: 'barcode', value: '{{barcode}}', resolvedValue: 'GR-001', x: 0, y: 10, height: 5 },
          { type: 'qr', value: '{{qrCode}}', resolvedValue: '{"sku":"GR-001"}', x: 30, y: 0, height: 10 },
        ],
      };

      const zpl = service.generateZpl(preview as any);

      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^XZ');
      expect(zpl).toContain('Ring');
      expect(zpl).toContain('GR-001');
      expect(zpl).toContain('^BQN'); // QR command
    });
  });
});
