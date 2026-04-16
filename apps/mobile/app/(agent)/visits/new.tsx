import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SearchBar } from '@/components/SearchBar';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

const OUTCOMES = [
  'Order Placed',
  'Follow-up Needed',
  'Not Interested',
  'Collection Done',
  'Complaint Resolved',
  'Other',
];

export default function NewVisitScreen() {
  const { user } = useAuthStore();
  const agentId = user?.id;
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [outcome, setOutcome] = useState('Order Placed');
  const [notes, setNotes] = useState('');

  const utils = trpc.useUtils();

  const { data: customerResults } = trpc.crm.customerList.useQuery(
    { search: customerSearch, limit: 10 },
    { enabled: customerSearch.length >= 2 },
  );

  const customers = ((customerResults as { items?: CustomerOption[] } | undefined)?.items ?? []) as CustomerOption[];

  const createVisitMutation = trpc.wholesale.recordAgentVisit.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.crm.interactions.list.invalidate(),
        utils.wholesale.agentDashboard.invalidate(),
      ]);
      Alert.alert('Success', 'Visit logged.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const handleCreate = () => {
    if (!customerId) {
      Alert.alert('Validation', 'Please select a customer.');
      return;
    }
    if (!agentId) {
      Alert.alert('Error', 'Missing agent session.');
      return;
    }

    createVisitMutation.mutate({
      agentId,
      customerId,
      visitDate: new Date(),
      notes: notes || undefined,
      outcome,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'New Visit' }} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-sm font-medium text-surface-700 mb-1.5">
          Customer
        </Text>
        {customerId ? (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-surface-900">
                {customerName}
              </Text>
              <Pressable
                onPress={() => {
                  setCustomerId(null);
                  setCustomerName('');
                }}
              >
                <Text className="text-xs text-red-500">Change</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <>
            <SearchBar
              placeholder="Search customer by name or phone..."
              onSearch={setCustomerSearch}
            />
            {customers.map((cust) => (
              <Pressable
                key={cust.id}
                onPress={() => {
                  setCustomerId(cust.id);
                  setCustomerName(`${cust.firstName} ${cust.lastName}`);
                  setCustomerSearch('');
                }}
                className="py-3 border-b border-surface-100"
              >
                <Text className="text-sm text-surface-800">
                  {cust.firstName} {cust.lastName}
                </Text>
                <Text className="text-xs text-surface-500">
                  {cust.phone ?? 'No phone'}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        <Text className="text-sm font-medium text-surface-700 mb-1.5 mt-2">
          Outcome
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {OUTCOMES.map((p) => (
            <Pressable
              key={p}
              onPress={() => setOutcome(p)}
              className={`px-3 py-2 rounded-lg ${
                outcome === p ? 'bg-primary-400' : 'bg-surface-200'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  outcome === p ? 'text-white' : 'text-surface-700'
                }`}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Notes"
          placeholder="Visit notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Button
          title="Log Visit"
          onPress={handleCreate}
          loading={createVisitMutation.isPending}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
