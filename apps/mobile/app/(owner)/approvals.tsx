import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Button } from '@/components/Button';
import { formatDateTime } from '@/utils/date';

interface ApprovalItem {
  id: string;
  type: 'PO' | 'DISCOUNT' | 'RETURN' | 'CREDIT_LIMIT';
  title: string;
  description: string;
  amountPaise: number;
  requestedBy: string;
  requestedAt: string;
  status: string;
  metadata: Record<string, unknown>;
}

export default function ApprovalsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery<{ items: ApprovalItem[] }>(
    ['owner', 'approvals'],
    '/api/v1/approvals/pending',
    undefined,
    { offlineCacheMs: 2 * 60 * 1000 },
  );

  const approveMutation = useApiMutation<{ id: string; action: 'approve' | 'reject' }>(
    '/api/v1/approvals/action',
    {
      invalidateKeys: [['owner', 'approvals'], ['owner', 'dashboard']],
    },
  );

  const handleAction = (item: ApprovalItem, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject';
    Alert.alert(
      `${actionLabel} ${item.type}`,
      `Are you sure you want to ${action} "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => {
            approveMutation.mutate(
              { id: item.id, action },
              {
                onSuccess: () => refetch(),
                onError: (err) =>
                  Alert.alert('Error', err.message),
              },
            );
          },
        },
      ],
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = data?.items ?? [];

  const typeLabels: Record<string, string> = {
    PO: 'Purchase Order',
    DISCOUNT: 'Discount',
    RETURN: 'Return',
    CREDIT_LIMIT: 'Credit Limit',
  };

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
              <Badge
                label={typeLabels[item.type] ?? item.type}
                variant="info"
              />
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

            {/* Action Buttons */}
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
