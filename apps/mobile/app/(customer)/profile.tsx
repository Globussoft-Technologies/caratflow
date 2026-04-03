import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { useAuthStore } from '@/store/auth-store';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import { formatDate } from '@/utils/date';

interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  anniversary: string | null;
  city: string | null;
  occasions: Array<{
    id: string;
    occasionType: string;
    date: string;
    description: string | null;
  }>;
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const { data: profile } = useApiQuery<CustomerProfile>(
    ['customer', 'profile', user?.id],
    `/api/v1/crm/customers/${user?.id}/profile`,
    undefined,
    { enabled: !!user?.id },
  );

  const [showAddOccasion, setShowAddOccasion] = useState(false);
  const [occasionType, setOccasionType] = useState('BIRTHDAY');
  const [occasionDate, setOccasionDate] = useState('');
  const [occasionDesc, setOccasionDesc] = useState('');

  const addOccasionMutation = useApiMutation<{
    customerId: string;
    occasionType: string;
    date: string;
    description?: string;
  }>('/api/v1/crm/occasions', {
    invalidateKeys: [['customer', 'profile']],
  });

  const handleAddOccasion = () => {
    if (!occasionDate || !user?.id) return;
    addOccasionMutation.mutate(
      {
        customerId: user.id,
        occasionType,
        date: occasionDate,
        description: occasionDesc || undefined,
      },
      {
        onSuccess: () => {
          setShowAddOccasion(false);
          setOccasionDate('');
          setOccasionDesc('');
          Alert.alert('Success', 'Occasion added.');
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-surface-900 mb-4">
          Profile
        </Text>

        {/* Profile Card */}
        <Card className="mb-4 items-center">
          <Avatar name={fullName} size="lg" />
          <Text className="text-lg font-bold text-surface-900 mt-2">
            {fullName}
          </Text>
          <Text className="text-sm text-surface-500">
            {profile?.phone ?? user?.email ?? ''}
          </Text>
          {profile?.city && (
            <Text className="text-xs text-surface-400">{profile.city}</Text>
          )}
        </Card>

        {/* Occasions */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-surface-700">
              My Occasions
            </Text>
            <Pressable onPress={() => setShowAddOccasion(!showAddOccasion)}>
              <Text className="text-xs text-primary-500 font-medium">
                + Add
              </Text>
            </Pressable>
          </View>

          {showAddOccasion && (
            <View className="bg-surface-50 rounded-lg p-3 mb-3">
              <View className="flex-row gap-2 mb-2">
                {['BIRTHDAY', 'ANNIVERSARY', 'WEDDING', 'OTHER'].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setOccasionType(t)}
                    className={`px-2 py-1 rounded-full ${
                      occasionType === t ? 'bg-primary-400' : 'bg-surface-200'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-medium ${
                        occasionType === t ? 'text-white' : 'text-surface-700'
                      }`}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Input
                placeholder="Date (YYYY-MM-DD)"
                value={occasionDate}
                onChangeText={setOccasionDate}
              />
              <Input
                placeholder="Description (optional)"
                value={occasionDesc}
                onChangeText={setOccasionDesc}
              />
              <Button
                title="Save Occasion"
                size="sm"
                onPress={handleAddOccasion}
                loading={addOccasionMutation.isPending}
              />
            </View>
          )}

          {(profile?.occasions ?? []).map((occ) => (
            <View
              key={occ.id}
              className="flex-row items-center justify-between py-2 border-b border-surface-100"
            >
              <View>
                <Badge label={occ.occasionType} variant="info" size="sm" />
                {occ.description && (
                  <Text className="text-xs text-surface-500 mt-0.5">
                    {occ.description}
                  </Text>
                )}
              </View>
              <Text className="text-xs text-surface-600">
                {formatDate(occ.date)}
              </Text>
            </View>
          ))}
          {(profile?.occasions ?? []).length === 0 && !showAddOccasion && (
            <Text className="text-sm text-surface-400 text-center py-2">
              Add birthdays, anniversaries for reminders
            </Text>
          )}
        </Card>

        {/* Contact Store */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Store Contact
          </Text>
          <Text className="text-sm text-surface-600">
            Need help? Contact your nearest store or call our support line.
          </Text>
          <Button
            title="Contact Support"
            variant="secondary"
            size="sm"
            onPress={() =>
              Alert.alert(
                'Support',
                'Call us at 1800-XXX-XXXX or visit your nearest store.',
              )
            }
            style={{ marginTop: 12 }}
          />
        </Card>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={handleLogout}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
