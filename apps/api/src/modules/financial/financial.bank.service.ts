// ─── Financial Bank Service ────────────────────────────────────
// Bank accounts, statement import, auto/manual reconciliation.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { Prisma } from '@caratflow/db';
import type {
  BankAccountInput,
  BankTransactionInput,
  ImportStatementInput,
  BankReconciliationInput,
} from '@caratflow/shared-types';

@Injectable()
export class FinancialBankService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Bank Accounts ────────────────────────────────────────────

  async createBankAccount(tenantId: string, userId: string, input: BankAccountInput) {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        tenantId,
        accountId: input.accountId,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        ifscCode: input.ifscCode ?? null,
        swiftCode: input.swiftCode ?? null,
        branchName: input.branchName ?? null,
        currencyCode: input.currencyCode ?? 'INR',
        currentBalancePaise: BigInt(input.currentBalancePaise ?? 0),
        isDefault: input.isDefault ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { account: true },
    });
  }

  async listBankAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({
      where: { tenantId },
      include: { account: true },
      orderBy: { bankName: 'asc' },
    });
  }

  async getBankAccount(tenantId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.BankAccountWhereInput,
      include: {
        account: true,
        transactions: { orderBy: { transactionDate: 'desc' }, take: 50 },
      },
    });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }

  // ─── Statement Import ────────────────────────────────────────

  async importStatement(tenantId: string, input: ImportStatementInput) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: this.tenantWhere(tenantId, { id: input.bankAccountId }) as Prisma.BankAccountWhereInput,
    });
    if (!bankAccount) throw new NotFoundException('Bank account not found');

    const transactions = input.transactions.map((txn) => ({
      tenantId,
      bankAccountId: input.bankAccountId,
      transactionDate: txn.transactionDate,
      description: txn.description,
      debitPaise: BigInt(txn.debitPaise ?? 0),
      creditPaise: BigInt(txn.creditPaise ?? 0),
      runningBalancePaise: BigInt(txn.runningBalancePaise ?? 0),
      reference: txn.reference ?? null,
      isReconciled: false,
    }));

    const result = await this.prisma.bankTransaction.createMany({ data: transactions });

    // Update the bank account balance to the last transaction's running balance
    if (transactions.length > 0) {
      const lastTxn = transactions[transactions.length - 1]!;
      await this.prisma.bankAccount.update({
        where: { id: input.bankAccountId },
        data: { currentBalancePaise: lastTxn.runningBalancePaise },
      });
    }

    return { imported: result.count };
  }

  // ─── Auto Reconciliation ──────────────────────────────────────

  async autoReconcile(tenantId: string, bankAccountId: string) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: this.tenantWhere(tenantId, { id: bankAccountId }) as Prisma.BankAccountWhereInput,
    });
    if (!bankAccount) throw new NotFoundException('Bank account not found');

    // Get unreconciled bank transactions
    const unreconciledTxns = await this.prisma.bankTransaction.findMany({
      where: { tenantId, bankAccountId, isReconciled: false },
    });

    // Get unmatched payments
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, status: 'COMPLETED' },
    });

    let matchCount = 0;

    for (const txn of unreconciledTxns) {
      const txnAmount = txn.creditPaise > BigInt(0) ? txn.creditPaise : txn.debitPaise;
      const isCredit = txn.creditPaise > BigInt(0);

      // Try to match by amount and reference
      const matchingPayment = payments.find((p) => {
        const paymentAmount = p.amountPaise;
        const amountMatch = paymentAmount === txnAmount;
        const refMatch = txn.reference && p.reference && txn.reference.includes(p.reference);
        const dateMatch = p.processedAt && txn.transactionDate &&
          Math.abs(p.processedAt.getTime() - txn.transactionDate.getTime()) < 3 * 24 * 60 * 60 * 1000; // 3 day window

        return amountMatch && (refMatch || dateMatch);
      });

      if (matchingPayment) {
        await this.prisma.bankTransaction.update({
          where: { id: txn.id },
          data: {
            isReconciled: true,
            reconciledWithId: matchingPayment.id,
            reconciledAt: new Date(),
          },
        });
        matchCount++;
      }
    }

    return { matched: matchCount, unmatched: unreconciledTxns.length - matchCount };
  }

  // ─── Manual Reconciliation ────────────────────────────────────

  async manualReconcile(tenantId: string, input: BankReconciliationInput) {
    const txn = await this.prisma.bankTransaction.findFirst({
      where: this.tenantWhere(tenantId, { id: input.bankTransactionId }) as Prisma.BankTransactionWhereInput,
    });
    if (!txn) throw new NotFoundException('Bank transaction not found');
    if (txn.isReconciled) {
      throw new BadRequestException('Transaction is already reconciled');
    }

    return this.prisma.bankTransaction.update({
      where: { id: input.bankTransactionId },
      data: {
        isReconciled: true,
        reconciledWithId: input.matchWithId,
        reconciledAt: new Date(),
      },
    });
  }

  // ─── List Bank Transactions ───────────────────────────────────

  async listBankTransactions(
    tenantId: string,
    bankAccountId: string,
    input: { page?: number; limit?: number; isReconciled?: boolean },
  ) {
    const { skip, take, page, limit } = parsePagination(input);

    const where: Prisma.BankTransactionWhereInput = { tenantId, bankAccountId };
    if (input.isReconciled !== undefined) {
      where.isReconciled = input.isReconciled;
    }

    const [items, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }
}
