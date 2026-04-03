import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { Input } from '@/components/Input';
import { StatCard } from '@/components/StatCard';
import { formatMoneyShort, formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';

interface CollectionItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  outstandingPaise: number;
  dueDate: string;
  ageDays: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  lastFollowUp: string | null;
}

interface CollectionSummary {
  todayTargetPaise: number;
  todayCollectedPaise: number;
  pendingCount: number;
  items: CollectionItem[];
}

export default function CollectionsScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [amountStr, setAmountStr] = useState('');

  const { data, isLoading, refetch } = useApiQuery<CollectionSummary>(
    ['agent', 'collections', user?.id],
    '/api/v1/financial/agent-collections',
    { agentId: user?.id },
  );

  const collectMutation = useApiMutation<{
    invoiceId: string;
    amountPaise: number;
    method: string;
    reference?: string;
  }>('/api/v1/financial/payments', {
    invalidateKeys: [['agent', 'collections'], ['agent', 'dashboard']],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCollect = () => {
    if (!selectedItem) return;
    const amount = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }

    collectMutation.mutate(
      {
        invoiceId: selectedItem.invoiceId,
        amountPaise: amount,
        method: paymentMethod,
        reference: paymentRef || undefined,
      },
      {
        onSuccess: () => {
          setSelectedItem(null);
          setAmountStr('');
          setPaymentRef('');
          Alert.alert('Success', 'Payment collected successfully.');
          refetch();
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const summary = data ?? {
    todayTargetPaise: 0,
    todayCollectedPaise: 0,
    pendingCount: 0,
    items: [],
  };

  const priorityVariant = (p: string) => {
    if (p === 'HIGH') return 'danger' as const;
    if (p === 'MEDIUM') return 'warning' as const;
    return 'default' as const;
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          Collections
        </Text>

        {/* Summary */}
        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Target"
            value={formatMoneyShort(summary.todayTargetPaise)}
          />
          <StatCard
            title="Collected"
            value={formatMoneyShort(summary.todayCollectedPaise)}
          />
        </View>
      </View>

      <DataList
        data={summary.items}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No pending collections"
        emptySubtitle="All collections are up to date"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card className="mb-2">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-surface-900">
                  {item.customerName}
                </Text>
                <Text className="text-xs text-surface-500">
                  {item.invoiceNumber}
                  {item.customerPhone ? ` | ${item.customerPhone}` : ''}
                </Text>
              </View>
              <Badge
                label={item.priority}
                variant={priorityVariant(item.priority)}
                size="sm"
              />
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <View>
                <Text className="text-xs text-surface-500">Outstanding</Text>
                <MoneyDisplay
                  amountPaise={item.outstandingPaise}
                  className="text-lg font-bold text-surface-900"
                />
              </View>
              <View className="items-end">
                <Text className="text-xs text-surface-500">
                  Due: {formatDate(item.dueDate)}
                </Text>
                <Text
                  className={`text-xs ${
                    item.ageDays > 30 ? 'text-red-500' : 'text-surface-500'
                  }`}
                >
                  {item.ageDays} days overdue
                </Text>
              </View>
            </View>

            <Button
              title="Mark Collected"
              variant="primary"
              size="sm"
              onPress={() => {
                setSelectedItem(item);
                setAmountStr(
                  (item.outstandingPaise / 100).toFixed(2),
                );
              }}
            />
          </Card>
        )}
      />

      {/* Collection Bottom Sheet */}
      <BottomSheet
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Record Collection"
      >
        {selectedItem && (
          <>
            <Text className="text-sm text-surface-600 mb-3">
              Collecting from {selectedItem.customerName} ({selectedItem.invoiceNumber})
            </Text>
            <Text className="text-sm text-surface-600 mb-1">
              Outstanding: {formatMoney(selectedItem.outstandingPaise)}
            </Text>

            <Input
              label="Amount Collected"
              placeholder="0.00"
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
            />

            <Text className="text-sm font-medium text-surface-700 mb-2">
              Payment Method
            </Text>
            <View className="flex-row gap-2 mb-4">
              {['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setPaymentMethod(m)}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    paymentMethod === m
                      ? 'bg-primary-400'
                      : 'bg-surface-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      paymentMethod === m
                        ? 'text-white'
                        : 'text-surface-700'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Reference / Receipt No."
              placeholder="Optional reference"
              value={paymentRef}
              onChangeText={setPaymentRef}
            />

            <Button
              title="Submit Collection"
              onPress={handleCollect}
              loading={collectMutation.isPending}
              size="lg"
            />
          </>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}
