import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

interface AgentVisit {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  subject: string | null;
  content: string | null;
  outcome: string | null;
  visitDate: string | null;
  createdAt: string;
}

export default function VisitsScreen() {
  const { user } = useAuthStore();
  const agentId = user?.id;
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.crm.interactions.list.useQuery(
    { type: 'AGENT_VISIT', agentId: agentId ?? '' },
    { enabled: !!agentId },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const visits = (data?.items ?? []) as AgentVisit[];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-surface-900">
            My Visits
          </Text>
          <Text className="text-sm text-surface-500">
            {visits.length} visit{visits.length !== 1 ? 's' : ''} logged
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
        emptyTitle="No visits logged"
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
              {item.outcome && (
                <Badge
                  label={item.outcome}
                  variant="default"
                  size="sm"
                />
              )}
            </View>

            <Text className="text-xs text-surface-600 mb-1">
              {item.subject ?? 'Agent visit'}
            </Text>
            <Text className="text-xs text-surface-500 mb-1">
              {formatDate(item.visitDate ?? item.createdAt)}
            </Text>
            {item.content && (
              <Text className="text-xs text-surface-500 italic mt-1">
                {item.content}
              </Text>
            )}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
