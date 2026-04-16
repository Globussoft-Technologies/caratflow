import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { Input } from '@/components/Input';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

interface CollectionItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  outstandingPaise: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';

export default function CollectionsScreen() {
  const { user } = useAuthStore();
  const agentId = user?.id;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [amountStr, setAmountStr] = useState('');

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.financial.outstandingBalances.list.useQuery(
    { agentId: agentId ?? '' },
    { enabled: !!agentId },
  );

  const collectMutation = trpc.financial.payments.recordCollection.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.financial.outstandingBalances.list.invalidate(),
        utils.wholesale.agentDashboard.invalidate(),
      ]);
      setSelectedItem(null);
      setAmountStr('');
      setPaymentRef('');
      Alert.alert('Success', 'Payment collected successfully.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCollect = () => {
    if (!selectedItem || !agentId) return;
    const amount = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }

    collectMutation.mutate({
      customerId: selectedItem.customerId,
      amountPaise: amount,
      method: paymentMethod,
      agentId,
      notes: paymentRef || undefined,
      invoiceId: selectedItem.invoiceId,
    });
  };

  const items = (data?.items ?? []) as CollectionItem[];

  const priorityVariant = (days: number) => {
    if (days > 60) return 'danger' as const;
    if (days > 30) return 'warning' as const;
    return 'default' as const;
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-1">
          Collections
        </Text>
        <Text className="text-sm text-surface-500 mb-2">
          {items.length} outstanding invoice{items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <DataList
        data={items}
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
                label={item.status}
                variant={priorityVariant(item.daysOverdue)}
                size="sm"
              />
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <View>
                <Text className="text-xs text-surface-500">Outstanding</Text>
                <MoneyDisplay
                  amountPaise={Number(item.outstandingPaise)}
                  className="text-lg font-bold text-surface-900"
                />
              </View>
              <View className="items-end">
                <Text className="text-xs text-surface-500">
                  Due: {formatDate(item.dueDate)}
                </Text>
                {item.daysOverdue > 0 && (
                  <Text
                    className={`text-xs ${
                      item.daysOverdue > 30 ? 'text-red-500' : 'text-surface-500'
                    }`}
                  >
                    {item.daysOverdue} days overdue
                  </Text>
                )}
              </View>
            </View>

            <Button
              title="Mark Collected"
              variant="primary"
              size="sm"
              onPress={() => {
                setSelectedItem(item);
                setAmountStr((Number(item.outstandingPaise) / 100).toFixed(2));
              }}
            />
          </Card>
        )}
      />

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
              Outstanding: {formatMoney(Number(selectedItem.outstandingPaise))}
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
              {(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] as const).map((m) => (
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
