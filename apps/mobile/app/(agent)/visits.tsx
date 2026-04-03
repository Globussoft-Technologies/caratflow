import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { Button } from '@/components/Button';
import { formatTime, formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';

interface Visit {
  id: string;
  customerName: string;
  customerPhone: string | null;
  purpose: string;
  scheduledAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export default function VisitsScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery<{ items: Visit[] }>(
    ['agent', 'visits', user?.id],
    '/api/v1/crm/agent-visits',
    { agentId: user?.id, date: new Date().toISOString().split('T')[0] },
  );

  const checkInMutation = useApiMutation<{ visitId: string; action: 'check_in' | 'check_out' }>(
    '/api/v1/crm/agent-visits/action',
    { invalidateKeys: [['agent', 'visits']] },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCheckAction = (visit: Visit, action: 'check_in' | 'check_out') => {
    checkInMutation.mutate(
      { visitId: visit.id, action },
      {
        onSuccess: () => {
          refetch();
          Alert.alert(
            'Success',
            action === 'check_in' ? 'Checked in.' : 'Checked out.',
          );
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const visits = data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-surface-900">
            Today's Visits
          </Text>
          <Text className="text-sm text-surface-500">
            {visits.length} visit{visits.length !== 1 ? 's' : ''} scheduled
          </Text>
        </View>
        <Button
          title="+ New"
          variant="primary"
          size="sm"
          onPress={() => router.push('/(agent)/visits/new' as never)}
        />
      </View>

      <DataList
        data={visits}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No visits today"
        emptySubtitle="Tap + New to log a visit"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card className="mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-surface-900">
                  {item.customerName}
                </Text>
                {item.customerPhone && (
                  <Text className="text-xs text-surface-500">
                    {item.customerPhone}
                  </Text>
                )}
              </View>
              <Badge
                label={item.status.replace('_', ' ')}
                variant={getStatusVariant(item.status)}
                size="sm"
              />
            </View>

            <Text className="text-xs text-surface-600 mb-1">
              Purpose: {item.purpose}
            </Text>
            <Text className="text-xs text-surface-500 mb-2">
              Scheduled: {formatTime(item.scheduledAt)}
            </Text>

            {item.checkInAt && (
              <Text className="text-xs text-green-600 mb-1">
                Checked in: {formatTime(item.checkInAt)}
              </Text>
            )}
            {item.checkOutAt && (
              <Text className="text-xs text-surface-500 mb-1">
                Checked out: {formatTime(item.checkOutAt)}
              </Text>
            )}
            {item.notes && (
              <Text className="text-xs text-surface-500 italic mb-2">
                Notes: {item.notes}
              </Text>
            )}

            {/* Action Buttons */}
            {item.status === 'SCHEDULED' && (
              <Button
                title="Check In"
                variant="primary"
                size="sm"
                onPress={() => handleCheckAction(item, 'check_in')}
                loading={checkInMutation.isPending}
              />
            )}
            {item.status === 'IN_PROGRESS' && (
              <Button
                title="Check Out"
                variant="secondary"
                size="sm"
                onPress={() => handleCheckAction(item, 'check_out')}
                loading={checkInMutation.isPending}
              />
            )}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
