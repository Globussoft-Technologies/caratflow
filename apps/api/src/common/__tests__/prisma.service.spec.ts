import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PrismaClient before importing PrismaService
vi.mock('@caratflow/db', () => {
  class MockPrismaClient {
    $connect = vi.fn().mockResolvedValue(undefined);
    $disconnect = vi.fn().mockResolvedValue(undefined);
    constructor(_opts?: any) {}
  }
  return { PrismaClient: MockPrismaClient };
});

import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('connects to the database on module init', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalledOnce();
  });

  it('disconnects from the database on module destroy', async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalledOnce();
  });

  it('is an instance that has connect and disconnect methods', () => {
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');
  });
});
