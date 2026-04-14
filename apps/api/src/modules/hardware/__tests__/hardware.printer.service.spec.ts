import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwarePrinterService } from '../hardware.printer.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    hardwareLabelTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: { ...base.product, findFirst: vi.fn() },
  };
}

function mockEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

describe('HardwarePrinterService (Unit)', () => {
  let service: HardwarePrinterService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let eventBus: ReturnType<typeof mockEventBus>;

  const template = {
    id: 'tpl-1',
    tenantId: TEST_TENANT_ID,
    name: 'Jewelry Label',
    width: 50,
    height: 25,
    fields: [
      { type: 'text', value: '{{productName}}', x: 0, y: 0, fontSize: 12, height: 4 },
      { type: 'text', value: 'Wt: {{grossWeight}}', x: 0, y: 14, fontSize: 10, height: 4 },
      { type: 'barcode', value: '{{barcode}}', x: 0, y: 20, height: 5 },
      { type: 'qr', value: '{{qrCode}}', x: 35, y: 0, height: 10 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    eventBus = mockEventBus();
    service = new HardwarePrinterService(mockPrisma as any, eventBus as any);
  });

  describe('createTemplate', () => {
    it('creates a label template row', async () => {
      mockPrisma.hardwareLabelTemplate.create.mockResolvedValue(template);

      const result = await service.createTemplate(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Jewelry Label',
        width: 50,
        height: 25,
        fields: template.fields,
      } as any);

      expect(result.name).toBe('Jewelry Label');
      expect(result.width).toBe(50);
    });
  });

  describe('getTemplate', () => {
    it('returns template when found', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      const result = await service.getTemplate(TEST_TENANT_ID, 'tpl-1');
      expect(result.name).toBe('Jewelry Label');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(null);
      await expect(service.getTemplate(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTemplate', () => {
    it('updates template name and fields', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.hardwareLabelTemplate.update.mockResolvedValue({ ...template, name: 'Updated Label' });

      const result = await service.updateTemplate(TEST_TENANT_ID, TEST_USER_ID, 'tpl-1', {
        name: 'Updated Label',
      } as any);

      expect(result.name).toBe('Updated Label');
    });
  });

  describe('deleteTemplate', () => {
    it('deletes an existing template', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.hardwareLabelTemplate.delete.mockResolvedValue({});
      await service.deleteTemplate(TEST_TENANT_ID, 'tpl-1');
      expect(mockPrisma.hardwareLabelTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tpl-1' } });
    });

    it('throws NotFoundException for missing template', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(null);
      await expect(service.deleteTemplate(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePrintData', () => {
    it('resolves placeholders in field values', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);

      const result = await service.generatePrintData(TEST_TENANT_ID, {
        templateId: 'tpl-1',
        data: {
          productName: 'Diamond Ring',
          grossWeight: '5.000g',
          barcode: 'DR-001',
          qrCode: '{"sku":"DR-001"}',
        },
      } as any);

      expect(result.renderedFields[0]!.resolvedValue).toBe('Diamond Ring');
      expect(result.renderedFields[1]!.resolvedValue).toBe('Wt: 5.000g');
      expect(result.renderedFields[2]!.resolvedValue).toBe('DR-001');
    });
  });

  describe('generateJewelryLabel', () => {
    it('fetches product data and renders with placeholders resolved', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.product.findFirst.mockResolvedValue({
        sku: 'GR-001',
        name: 'Gold Ring',
        grossWeightMg: 5000n,
        netWeightMg: 4500n,
        metalPurity: 916,
        huidNumber: 'HUID-1',
        sellingPricePaise: 500000n,
      });

      const result = await service.generateJewelryLabel(TEST_TENANT_ID, 'tpl-1', 'p-1');

      expect(result.renderedFields[0]!.resolvedValue).toBe('Gold Ring');
      expect(result.renderedFields[1]!.resolvedValue).toBe('Wt: 5.000g');
      expect(result.renderedFields[2]!.resolvedValue).toBe('GR-001');
    });

    it('throws NotFoundException for missing product', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.generateJewelryLabel(TEST_TENANT_ID, 'tpl-1', 'bad'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateZpl', () => {
    it('emits ZPL framing and per-field commands for a jewelry label', () => {
      const preview = {
        templateId: 'tpl-1',
        templateName: 'Label',
        width: 50,
        height: 25,
        renderedFields: [
          { type: 'text', value: '{{productName}}', resolvedValue: 'Ring', x: 0, y: 0, fontSize: 24, height: 10 },
          { type: 'barcode', value: '{{barcode}}', resolvedValue: 'GR-001', x: 0, y: 10, height: 5 },
          { type: 'qr', value: '{{qrCode}}', resolvedValue: '{"sku":"GR-001"}', x: 30, y: 0, height: 10 },
        ],
      };

      const zpl = service.generateZpl(preview as any, 2);

      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^XZ');
      expect(zpl).toContain('^PQ2');
      expect(zpl).toContain('Ring');
      expect(zpl).toContain('GR-001');
      expect(zpl).toContain('^BQN');
    });
  });

  describe('generateTspl', () => {
    it('emits TSPL framing and per-field commands for the same preview', () => {
      const preview = {
        templateId: 'tpl-1',
        templateName: 'Label',
        width: 50,
        height: 25,
        renderedFields: [
          { type: 'text', value: '{{productName}}', resolvedValue: 'Ring', x: 0, y: 0, fontSize: 24, height: 10 },
          { type: 'barcode', value: '{{barcode}}', resolvedValue: 'GR-001', x: 0, y: 10, height: 5 },
          { type: 'qr', value: '{{qrCode}}', resolvedValue: '{"sku":"GR-001"}', x: 30, y: 0, height: 10 },
        ],
      };

      const tspl = service.generateTspl(preview as any, 3);

      expect(tspl).toContain('SIZE 50 mm,25 mm');
      expect(tspl).toContain('CLS');
      expect(tspl).toContain('TEXT');
      expect(tspl).toContain('BARCODE');
      expect(tspl).toContain('QRCODE');
      expect(tspl).toContain('PRINT 3,1');
    });
  });

  describe('printJewelryLabel', () => {
    it('returns raw ZPL + metadata and emits hardware.label.printed event', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.product.findFirst.mockResolvedValue({
        sku: 'GR-001',
        name: 'Gold Ring',
        grossWeightMg: 5000n,
        netWeightMg: 4500n,
        metalPurity: 916,
        huidNumber: 'HUID-1',
        sellingPricePaise: 500000n,
      });

      const result = await service.printJewelryLabel(TEST_TENANT_ID, 'tpl-1', 'p-1', 2, 'ZPL');

      expect(result.printerLanguage).toBe('ZPL');
      expect(result.copies).toBe(2);
      expect(result.command).toContain('^XA');
      expect(result.command).toContain('^XZ');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.label.printed',
          payload: expect.objectContaining({ templateId: 'tpl-1', productId: 'p-1', copies: 2 }),
        }),
      );
    });

    it('returns TSPL output when requested', async () => {
      mockPrisma.hardwareLabelTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.product.findFirst.mockResolvedValue({
        sku: 'GR-001',
        name: 'Gold Ring',
        grossWeightMg: 5000n,
        netWeightMg: 4500n,
        metalPurity: 916,
        huidNumber: null,
        sellingPricePaise: null,
      });

      const result = await service.printJewelryLabel(TEST_TENANT_ID, 'tpl-1', 'p-1', 1, 'TSPL');

      expect(result.printerLanguage).toBe('TSPL');
      expect(result.command).toContain('SIZE');
      expect(result.command).toContain('PRINT 1,1');
    });
  });
});
