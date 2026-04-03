// ─── Splash / Loading Screen ────────────────────────────────────
// Redirects based on auth state and user role.

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { mapRoleToRouteGroup } from '@/lib/auth';

export default function SplashScreen() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
      return;
    }

    const group = mapRoleToRouteGroup(user.role);
    switch (group) {
      case '(owner)':
        router.replace('/(owner)/dashboard');
        break;
      case '(sales)':
        router.replace('/(sales)/bill');
        break;
      case '(customer)':
        router.replace('/(customer)/home');
        break;
      case '(agent)':
        router.replace('/(agent)/collections');
        break;
      default:
        router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, user]);

  return (
    <View className="flex-1 bg-[#1a1a2e] items-center justify-center">
      <Text className="text-primary-400 text-4xl font-bold mb-2">
        CaratFlow
      </Text>
      <Text className="text-surface-400 text-sm mb-8">
        Jewelry ERP System
      </Text>
      <ActivityIndicator size="large" color="#d4af37" />
    </View>
  );
}
