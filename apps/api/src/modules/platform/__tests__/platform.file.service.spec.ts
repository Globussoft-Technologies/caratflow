import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlatformFileService } from '../platform.file.service';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    fileUpload: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('PlatformFileService (Unit)', () => {
  let service: PlatformFileService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new PlatformFileService(mockPrisma as any);
  });

  describe('uploadFile', () => {
    it('creates file metadata after upload', async () => {
      mockPrisma.fileUpload.create.mockResolvedValue({
        id: 'f-1',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
      });

      const result = await service.uploadFile(TEST_TENANT_ID, {
        fileName: 'photo.jpg',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        buffer: Buffer.from('fake'),
      }, TEST_USER_ID);

      expect(result.fileName).toBe('photo.jpg');
      expect(mockPrisma.fileUpload.create).toHaveBeenCalledOnce();
    });

    it('rejects disallowed MIME types', async () => {
      await expect(
        service.uploadFile(TEST_TENANT_ID, {
          fileName: 'script.js',
          originalName: 'script.js',
          mimeType: 'application/javascript',
          sizeBytes: 100,
          buffer: Buffer.from('bad'),
        }, TEST_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects files exceeding max size', async () => {
      await expect(
        service.uploadFile(TEST_TENANT_ID, {
          fileName: 'huge.pdf',
          originalName: 'huge.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100 * 1024 * 1024, // 100MB
          buffer: Buffer.from(''),
        }, TEST_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPresignedUrl', () => {
    it('returns a URL and expiry date', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue({
        id: 'f-1',
        storageKey: 'tenant/general/f-1.jpg',
      });

      const result = await service.getPresignedUrl(TEST_TENANT_ID, 'f-1');
      expect(result.url).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when file not found', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue(null);
      await expect(
        service.getPresignedUrl(TEST_TENANT_ID, 'bad'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('deletes file metadata and storage', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue({
        id: 'f-1',
        storageKey: 'key',
      });
      mockPrisma.fileUpload.delete.mockResolvedValue({});

      const result = await service.deleteFile(TEST_TENANT_ID, 'f-1');
      expect(result.success).toBe(true);
    });

    it('throws NotFoundException for missing file', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue(null);
      await expect(service.deleteFile(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkFileToEntity', () => {
    it('links a file to an entity', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue({ id: 'f-1' });
      mockPrisma.fileUpload.update.mockResolvedValue({ id: 'f-1', entityType: 'product', entityId: 'p-1' });

      const result = await service.linkFileToEntity(TEST_TENANT_ID, 'f-1', 'product', 'p-1');
      expect(result.entityType).toBe('product');
    });

    it('throws NotFoundException when file not found', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue(null);
      await expect(
        service.linkFileToEntity(TEST_TENANT_ID, 'bad', 'product', 'p-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilesForEntity', () => {
    it('returns files linked to an entity', async () => {
      mockPrisma.fileUpload.findMany.mockResolvedValue([{ id: 'f-1' }, { id: 'f-2' }]);

      const result = await service.getFilesForEntity(TEST_TENANT_ID, 'product', 'p-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getFileById', () => {
    it('returns file metadata', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue({ id: 'f-1', fileName: 'doc.pdf' });
      const result = await service.getFileById(TEST_TENANT_ID, 'f-1');
      expect(result.fileName).toBe('doc.pdf');
    });

    it('throws NotFoundException if not found', async () => {
      mockPrisma.fileUpload.findFirst.mockResolvedValue(null);
      await expect(service.getFileById(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });
});
