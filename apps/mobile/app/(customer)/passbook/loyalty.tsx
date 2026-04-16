import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { formatDate } from '@/utils/date';

/**
 * Loyalty details + points history powered by customerPortal.loyalty
 * tRPC router. The previous /crm/loyalty/balance REST was fictitious.
 */
export default function LoyaltyScreen() {
  const dashboard = trpc.customerPortal.loyalty.dashboard.useQuery();
  const history = trpc.customerPortal.loyalty.history.useQuery({
    page: 1,
    limit: 20,
    sortOrder: 'desc',
  });

  const loyalty = dashboard.data;
  const transactions = (
    history.data as { items?: unknown[] } | undefined
  )?.items as
    | Array<{
        id: string;
        transactionType: string;
        points: number;
        balanceAfter: number;
        description: string | null;
        createdAt: string | Date;
      }>
    | undefined;

  const isLoading = dashboard.isLoading || history.isLoading;
  const error =
    dashboard.error?.message ?? history.error?.message ?? null;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'Loyalty Program' }} />

      <Screen loading={isLoading} error={error} scrollable>
        {loyalty && (
          <>
            {/* Points Card */}
            <Card className="mb-4 bg-primary-50 border-primary-200 items-center">
              <Text className="text-xs text-primary-600 mb-1">
                Current Points
              </Text>
              <Text className="text-4xl font-bold text-primary-600">
                {loyalty.currentPoints}
              </Text>
              {loyalty.tier && (
                <Badge
                  label={`${loyalty.tier} Member`}
                  variant="gold"
                  size="md"
                />
              )}
              {loyalty.nextTier && loyalty.pointsToNextTier ? (
                <Text className="text-xs text-surface-500 mt-2">
                  {loyalty.pointsToNextTier} pts to {loyalty.nextTier}
                </Text>
              ) : null}
            </Card>

            {/* Stats */}
            <View className="flex-row gap-3 mb-4">
              <Card className="flex-1">
                <Text className="text-xs text-surface-500">Earned</Text>
                <Text className="text-lg font-bold text-green-600">
                  {loyalty.lifetimeEarned}
                </Text>
              </Card>
              <Card className="flex-1">
                <Text className="text-xs text-surface-500">Redeemed</Text>
                <Text className="text-lg font-bold text-surface-900">
                  {loyalty.lifetimeRedeemed}
                </Text>
              </Card>
            </View>

            {loyalty.pointsExpiringSoon > 0 && (
              <Card className="mb-4 bg-amber-50 border-amber-200">
                <Text className="text-sm text-amber-700">
                  {loyalty.pointsExpiringSoon} points expiring soon. Use them
                  before they expire!
                </Text>
              </Card>
            )}

            {/* Tier Benefits */}
            {loyalty.tierBenefits.length > 0 && (
              <Card className="mb-4">
                <Text className="text-sm font-semibold text-surface-700 mb-2">
                  Your Tier Benefits
                </Text>
                {loyalty.tierBenefits.map((benefit, idx) => (
                  <Text
                    key={idx}
                    className="text-sm text-surface-600 py-1"
                  >
                    {'  - '}
                    {benefit}
                  </Text>
                ))}
              </Card>
            )}

            {/* Transaction History */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Points History
              </Text>
              {transactions && transactions.length > 0 ? (
                transactions.map((tx) => (
                  <View
                    key={tx.id}
                    className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-sm text-surface-800">
                        {tx.description ?? tx.transactionType}
                      </Text>
                      <Text className="text-xs text-surface-400">
                        {formatDate(tx.createdAt)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`text-sm font-semibold ${
                          tx.points >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.points >= 0 ? '+' : ''}
                        {tx.points}
                      </Text>
                      <Text className="text-xs text-surface-400">
                        Bal: {tx.balanceAfter}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-sm text-surface-400 text-center py-4">
                  No points activity yet
                </Text>
              )}
            </Card>
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
