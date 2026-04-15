// ─── Payroll Employee Service ─────────────────────────────────
// CRUD + CSV bulk import for Employee records (staff).

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { EmployeeInput, EmployeeUpdate } from '@caratflow/shared-types';
import { EmployeeStatus } from '@caratflow/shared-types';

export interface ListEmployeesQuery {
  page?: number;
  limit?: number;
  status?: EmployeeStatus;
  search?: string;
  branchId?: string;
}

@Injectable()
export class PayrollEmployeeService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async list(tenantId: string, query: ListEmployeesQuery) {
    const { skip, take, page, limit } = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { employeeCode: { contains: query.search } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.employee.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getById(tenantId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException(`Employee ${id} not found`);
    return emp;
  }

  async create(tenantId: string, input: EmployeeInput) {
    const existing = await this.prisma.employee.findFirst({
      where: { tenantId, employeeCode: input.employeeCode },
    });
    if (existing) {
      throw new BadRequestException(`Employee code ${input.employeeCode} already exists`);
    }
    return this.prisma.employee.create({
      data: {
        tenantId,
        userId: input.userId ?? null,
        employeeCode: input.employeeCode,
        firstName: input.firstName,
        lastName: input.lastName,
        dob: input.dob ?? null,
        gender: input.gender ?? null,
        joinedAt: input.joinedAt,
        designation: input.designation ?? null,
        department: input.department ?? null,
        branchId: input.branchId ?? null,
        basicSalaryPaise: BigInt(input.basicSalaryPaise),
        hraPaise: BigInt(input.hraPaise),
        daPaise: BigInt(input.daPaise),
        conveyancePaise: BigInt(input.conveyancePaise),
        medicalPaise: BigInt(input.medicalPaise),
        otherAllowancePaise: BigInt(input.otherAllowancePaise),
        panNumber: input.panNumber ?? null,
        aadhaarNumber: input.aadhaarNumber ?? null,
        pfNumber: input.pfNumber ?? null,
        esiNumber: input.esiNumber ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        bankIfsc: input.bankIfsc ?? null,
        bankName: input.bankName ?? null,
        status: 'ACTIVE',
      },
    });
  }

  async update(tenantId: string, id: string, input: EmployeeUpdate) {
    await this.getById(tenantId, id);
    const data: Record<string, unknown> = { ...input };
    for (const key of [
      'basicSalaryPaise',
      'hraPaise',
      'daPaise',
      'conveyancePaise',
      'medicalPaise',
      'otherAllowancePaise',
    ] as const) {
      if (input[key] != null) data[key] = BigInt(input[key] as number);
    }
    return this.prisma.employee.update({ where: { id }, data });
  }

  async deactivate(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE', leftAt: new Date() },
    });
  }

  /**
   * Bulk import from simple CSV text. Columns:
   * employeeCode,firstName,lastName,joinedAt,designation,department,basicSalaryPaise,hraPaise
   */
  async bulkImport(tenantId: string, csv: string): Promise<{ created: number; errors: string[] }> {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header and at least one row');
    }
    const header = lines[0]!.split(',').map((h) => h.trim());
    const required = ['employeeCode', 'firstName', 'lastName', 'joinedAt'];
    for (const r of required) {
      if (!header.includes(r)) throw new BadRequestException(`Missing column: ${r}`);
    }
    let created = 0;
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(',').map((c) => c.trim());
      const row: Record<string, string> = {};
      header.forEach((h, idx) => (row[h] = cols[idx] ?? ''));
      try {
        await this.create(tenantId, {
          employeeCode: row.employeeCode!,
          firstName: row.firstName!,
          lastName: row.lastName!,
          joinedAt: new Date(row.joinedAt!),
          designation: row.designation || undefined,
          department: row.department || undefined,
          basicSalaryPaise: parseInt(row.basicSalaryPaise || '0', 10),
          hraPaise: parseInt(row.hraPaise || '0', 10),
          daPaise: 0,
          conveyancePaise: 0,
          medicalPaise: 0,
          otherAllowancePaise: 0,
        });
        created++;
      } catch (err) {
        errors.push(`Row ${i}: ${(err as Error).message}`);
      }
    }
    return { created, errors };
  }
}
