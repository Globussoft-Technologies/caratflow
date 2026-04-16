// ─── Owner Approvals ─────────────────────────────────────────
// There is no `approvals` module on the backend. This screen is a
// "Pending Actions" aggregator that pulls from three sources:
//
//   1. financial.journal.list({ status: 'DRAFT' })
//      Unposted journal entries awaiting owner sign-off.
//      Approve -> financial.journal.post
//      Reject  -> financial.journal.void
//
//   2. wholesale.listPurchaseOrders({ filters: { status: 'DRAFT' } })
//      Draft POs waiting to be sent. The Prisma schema defines
//      WholesalePOStatus = DRAFT | SENT | PARTIALLY_RECEIVED | RECEIVED
//      | CANCELLED -- there is no PENDING_APPROVAL state, so DRAFT is
//      the closest analogue for "awaiting owner approval".
//      Approve -> wholesale.sendPurchaseOrder
//      Reject  -> wholesale.cancelPurchaseOrder
//
//   3. aml.alertList({ status: 'NEW' })
//      Open AML alerts. AmlAlertStatusEnum = NEW | UNDER_REVIEW |
//      ESCALATED | CLEARED | REPORTED -- there is no OPEN state, so
//      NEW is the equivalent.
//      Approve (mark reviewed) -> aml.alertReview
//      Reject (dismiss / clear) -> aml.alertClear

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Button } from '@/components/Button';
import { formatDateTime } from '@/utils/date';
import { trpc } from '@/lib/trpc';

type ApprovalSource = 'JOURNAL' | 'PO' | 'AML';

interface ApprovalItem {
  id: string;
  source: ApprovalSource;
  title: string;
  description: string;
  amountPaise: number;
  requestedBy: string;
  requestedAt: string;
  status: string;
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

export default function ApprovalsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const utils = trpc.useUtils();

  const journalQ = trpc.financial.journal.list.useQuery({
    page: 1,
    limit: 20,
    status: 'DRAFT' as never,
  });

  const poQ = trpc.wholesale.listPurchaseOrders.useQuery({
    filters: { status: 'DRAFT' as never },
    pagination: { page: 1, limit: 20 },
  });

  const amlQ = trpc.aml.alertList.useQuery({
    page: 1,
    limit: 20,
    status: 'NEW' as never,
  });

  // ─── Mutations ─────────────────────────────────────────────
  const journalPost = trpc.financial.journal.post.useMutation();
  const journalVoid = trpc.financial.journal.void.useMutation();
  const poSend = trpc.wholesale.sendPurchaseOrder.useMutation();
  const poCancel = trpc.wholesale.cancelPurchaseOrder.useMutation();
  const amlReview = trpc.aml.alertReview.useMutation();
  const amlClear = trpc.aml.alertClear.useMutation();

  type JournalRow = {
    id: string;
    entryNumber: string;
    description: string;
    date: string | Date;
    status: string;
    lines?: Array<{ debitPaise: number | string }>;
  };
  type PoRow = {
    id: string;
    poNumber: string;
    supplierName?: string;
    totalPaise: number | string;
    status: string;
    createdAt: string | Date;
  };
  type AmlAlertRow = {
    id: string;
    alertType?: string;
    severity: string;
    status: string;
    customerName?: string;
    amountPaise: number | string;
    createdAt: string | Date;
    rule?: { ruleName: string } | null;
  };

  const items: ApprovalItem[] = useMemo(() => {
    const out: ApprovalItem[] = [];

    // Journal entries
    const journalItems =
      (journalQ.data as unknown as { items?: JournalRow[] } | undefined)
        ?.items ?? [];
    for (const je of journalItems) {
      // Sum debits as the entry magnitude (debits == credits on a valid entry).
      const total = (je.lines ?? []).reduce(
        (s, l) => s + asNumber(l.debitPaise),
        0,
      );
      out.push({
        id: `journal:${je.id}`,
        source: 'JOURNAL',
        title: `Journal ${je.entryNumber}`,
        description: je.description,
        amountPaise: total,
        requestedBy: 'Accounts',
        requestedAt: new Date(je.date).toISOString(),
        status: je.status,
      });
    }

    // Purchase orders
    const poItems =
      (poQ.data as unknown as { items?: PoRow[] } | undefined)?.items ?? [];
    for (const po of poItems) {
      out.push({
        id: `po:${po.id}`,
        source: 'PO',
        title: `PO ${po.poNumber}`,
        description: po.supplierName
          ? `Supplier: ${po.supplierName}`
          : 'Draft purchase order',
        amountPaise: asNumber(po.totalPaise),
        requestedBy: po.supplierName ?? 'Purchasing',
        requestedAt: new Date(po.createdAt).toISOString(),
        status: po.status,
      });
    }

    // AML alerts
    const amlItems =
      (amlQ.data as unknown as { items?: AmlAlertRow[] } | undefined)?.items ??
      [];
    for (const a of amlItems) {
      out.push({
        id: `aml:${a.id}`,
        source: 'AML',
        title: a.rule?.ruleName ?? a.alertType ?? 'AML Alert',
        description: `${a.severity} severity | ${a.customerName ?? 'Unknown customer'}`,
        amountPaise: asNumber(a.amountPaise),
        requestedBy: a.customerName ?? 'System',
        requestedAt: new Date(a.createdAt).toISOString(),
        status: a.status,
      });
    }

    return out;
  }, [journalQ.data, poQ.data, amlQ.data]);

  const sourceLabels: Record<ApprovalSource, string> = {
    JOURNAL: 'Journal Entry',
    PO: 'Purchase Order',
    AML: 'AML Alert',
  };

  const refetchAll = useCallback(async () => {
    await Promise.all([journalQ.refetch(), poQ.refetch(), amlQ.refetch()]);
    // Also nudge dashboard counts.
    await utils.reporting.getAnalyticsDashboard.invalidate().catch(() => {});
  }, [journalQ, poQ, amlQ, utils]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const handleAction = (
    item: ApprovalItem,
    action: 'approve' | 'reject',
  ) => {
    const [prefix, rawId] = item.id.split(':');
    if (!rawId) return;
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject';

    Alert.alert(
      `${actionLabel} ${sourceLabels[item.source]}`,
      `Are you sure you want to ${action} "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (prefix === 'journal') {
                if (action === 'approve') {
                  await journalPost.mutateAsync({ id: rawId });
                } else {
                  await journalVoid.mutateAsync({
                    id: rawId,
                    reason: 'Rejected by owner',
                  });
                }
              } else if (prefix === 'po') {
                if (action === 'approve') {
                  await poSend.mutateAsync({ poId: rawId });
                } else {
                  await poCancel.mutateAsync({
                    poId: rawId,
                    reason: 'Rejected by owner',
                  });
                }
              } else if (prefix === 'aml') {
                if (action === 'approve') {
                  await amlReview.mutateAsync({
                    alertId: rawId,
                    notes: 'Reviewed by owner',
                  });
                } else {
                  await amlClear.mutateAsync({
                    alertId: rawId,
                    notes: 'Dismissed by owner',
                  });
                }
              }
              await refetchAll();
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Action failed',
              );
            }
          },
        },
      ],
    );
  };

  const isLoading = journalQ.isLoading || poQ.isLoading || amlQ.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900">Approvals</Text>
        <Text className="text-sm text-surface-500">
          {items.length} pending item{items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <DataList
        data={items}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No pending approvals"
        emptySubtitle="You're all caught up!"
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Card className="mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <Badge label={sourceLabels[item.source]} variant="info" />
              <Badge
                label={item.status}
                variant={getStatusVariant(item.status)}
              />
            </View>

            <Text className="text-base font-semibold text-surface-900 mb-1">
              {item.title}
            </Text>
            <Text className="text-sm text-surface-600 mb-2">
              {item.description}
            </Text>

            <View className="flex-row items-center justify-between mb-3">
              <MoneyDisplay
                amountPaise={item.amountPaise}
                className="text-lg font-bold text-surface-900"
              />
              <View>
                <Text className="text-xs text-surface-500 text-right">
                  By {item.requestedBy}
                </Text>
                <Text className="text-xs text-surface-400 text-right">
                  {formatDateTime(item.requestedAt)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Reject"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleAction(item, 'reject')}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Approve"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAction(item, 'approve')}
                />
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
