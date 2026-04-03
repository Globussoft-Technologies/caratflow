import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { useApiMutation } from '@/hooks/useApi';

export default function SettingsScreen() {
  const { user, logout, activeLocationName, setActiveLocation } = useAuthStore();
  const { theme, setTheme, weightUnit, setWeightUnit } = useAppStore();

  const [goldRate, setGoldRate] = useState('');
  const [silverRate, setSilverRate] = useState('');

  const rateMutation = useApiMutation<{
    goldRatePer10g: number;
    silverRatePer10g: number;
  }>('/api/v1/platform/rates/update', {
    invalidateKeys: [['rates']],
  });

  const handleUpdateRates = () => {
    const goldPaise = Math.round(parseFloat(goldRate) * 100);
    const silverPaise = Math.round(parseFloat(silverRate) * 100);

    if (isNaN(goldPaise) && isNaN(silverPaise)) {
      Alert.alert('Validation', 'Please enter at least one rate.');
      return;
    }

    rateMutation.mutate(
      {
        goldRatePer10g: goldPaise || 0,
        silverRatePer10g: silverPaise || 0,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Rates updated successfully.');
          setGoldRate('');
          setSilverRate('');
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
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
        <Text className="text-2xl font-bold text-surface-900 mb-6">
          Settings
        </Text>

        {/* Profile */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-2">
            Account
          </Text>
          <Text className="text-base font-semibold text-surface-900">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-sm text-surface-600">{user?.email}</Text>
          <Text className="text-xs text-surface-400 mt-1">
            Role: {user?.role} | Location: {activeLocationName ?? 'Not set'}
          </Text>
        </Card>

        {/* Rate Entry */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-3">
            Update Today's Rates
          </Text>
          <Input
            label="Gold Rate (per 10g)"
            placeholder="e.g., 62500.00"
            value={goldRate}
            onChangeText={setGoldRate}
            keyboardType="decimal-pad"
          />
          <Input
            label="Silver Rate (per 10g)"
            placeholder="e.g., 750.00"
            value={silverRate}
            onChangeText={setSilverRate}
            keyboardType="decimal-pad"
          />
          <Button
            title="Update Rates"
            onPress={handleUpdateRates}
            loading={rateMutation.isPending}
            size="md"
          />
        </Card>

        {/* Preferences */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-3">
            Preferences
          </Text>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm text-surface-700">Weight Unit</Text>
            <View className="flex-row gap-1">
              {(['g', 'tola', 'ct'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setWeightUnit(u)}
                  className={`px-3 py-1.5 rounded-lg ${
                    weightUnit === u ? 'bg-primary-400' : 'bg-surface-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      weightUnit === u ? 'text-white' : 'text-surface-700'
                    }`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        {/* About */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-2">
            About
          </Text>
          <Text className="text-sm text-surface-700">CaratFlow Mobile</Text>
          <Text className="text-xs text-surface-400">Version 0.1.0</Text>
        </Card>

        {/* Logout */}
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
