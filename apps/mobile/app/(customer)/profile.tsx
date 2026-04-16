import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
  Switch,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

const SUPPORT_PHONE = '+911800123456';

type NotifToggles = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
};

type NotifCategory = 'orders' | 'promotions' | 'schemes' | 'loyalty' | 'reminders';

const NOTIF_CATEGORIES: { key: NotifCategory; label: string }[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'schemes', label: 'Schemes' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'reminders', label: 'Reminders' },
];

const DEFAULT_TOGGLES: NotifToggles = {
  email: true,
  sms: true,
  whatsapp: false,
  push: true,
};

/**
 * Profile screen powered by customerPortal.profile tRPC: real profile
 * load + update, notification preferences toggles, and a working
 * "Contact Support" link via Linking.
 */
export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const utils = trpc.useContext();

  const profileQuery = trpc.customerPortal.profile.get.useQuery();
  const prefsQuery =
    trpc.customerPortal.profile.getNotificationPreferences.useQuery();

  const updateProfile = trpc.customerPortal.profile.update.useMutation({
    onSuccess: async () => {
      await utils.customerPortal.profile.get.invalidate();
      Alert.alert('Saved', 'Your profile has been updated.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const updatePrefs =
    trpc.customerPortal.profile.updateNotificationPreferences.useMutation({
      onSuccess: async () => {
        await utils.customerPortal.profile.getNotificationPreferences.invalidate();
      },
      onError: (err) => Alert.alert('Error', err.message),
    });

  const profile = profileQuery.data;

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
      setCity(profile.city ?? '');
    }
  }, [profile]);

  // Notification preferences - initialize category toggles from server
  const [prefs, setPrefs] = useState<Record<NotifCategory, NotifToggles>>({
    orders: DEFAULT_TOGGLES,
    promotions: DEFAULT_TOGGLES,
    schemes: DEFAULT_TOGGLES,
    loyalty: DEFAULT_TOGGLES,
    reminders: DEFAULT_TOGGLES,
  });

  useEffect(() => {
    if (prefsQuery.data) {
      const src = prefsQuery.data as Partial<
        Record<NotifCategory, Partial<NotifToggles>>
      >;
      setPrefs((p) => ({
        orders: { ...DEFAULT_TOGGLES, ...p.orders, ...src.orders },
        promotions: { ...DEFAULT_TOGGLES, ...p.promotions, ...src.promotions },
        schemes: { ...DEFAULT_TOGGLES, ...p.schemes, ...src.schemes },
        loyalty: { ...DEFAULT_TOGGLES, ...p.loyalty, ...src.loyalty },
        reminders: { ...DEFAULT_TOGGLES, ...p.reminders, ...src.reminders },
      }));
    }
  }, [prefsQuery.data]);

  const fullName = `${firstName} ${lastName}`.trim() || 'Customer';

  const handleSave = () => {
    updateProfile.mutate({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      city: city || undefined,
    });
  };

  const toggleChannel = (
    category: NotifCategory,
    channel: keyof NotifToggles,
  ) => {
    const current = prefs[category];
    const next = { ...current, [channel]: !current[channel] };
    const nextAll = { ...prefs, [category]: next };
    setPrefs(nextAll);
    // Persist just the touched category
    updatePrefs.mutate({ [category]: next } as never);
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to reach us?',
      [
        {
          text: 'Call Support',
          onPress: () => {
            Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
              Alert.alert(
                'Unable to call',
                `Please dial ${SUPPORT_PHONE} manually.`,
              ),
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
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

  if (profileQuery.isLoading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d4af37" />
          <Text className="mt-3 text-surface-500 text-sm">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-surface-900 mb-4">Profile</Text>

        {/* Profile Header */}
        <Card className="mb-4 items-center">
          <Avatar name={fullName} size="lg" />
          <Text className="text-lg font-bold text-surface-900 mt-2">
            {fullName}
          </Text>
          <Text className="text-sm text-surface-500">
            {profile?.phone ?? profile?.email ?? user?.email ?? ''}
          </Text>
          {profile?.city && (
            <Text className="text-xs text-surface-400">{profile.city}</Text>
          )}
          {profile?.loyaltyTier ? (
            <Text className="text-xs text-primary-500 mt-1">
              {profile.loyaltyTier} | {profile.loyaltyPoints} pts
            </Text>
          ) : null}
        </Card>

        {/* Edit Profile */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Personal Information
          </Text>
          <Input
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
          />
          <Input
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91..."
            keyboardType="phone-pad"
          />
          <Input
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="City"
          />
          <Button
            title="Save Profile"
            onPress={handleSave}
            loading={updateProfile.isPending}
          />
        </Card>

        {/* Notification Preferences */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Notification Preferences
          </Text>
          <Text className="text-xs text-surface-500 mb-3">
            Choose how you want to hear from us for each category.
          </Text>
          {prefsQuery.isLoading ? (
            <ActivityIndicator color="#d4af37" />
          ) : (
            NOTIF_CATEGORIES.map((cat) => (
              <View
                key={cat.key}
                className="py-2 border-b border-surface-100"
              >
                <Text className="text-sm font-medium text-surface-800 mb-1.5">
                  {cat.label}
                </Text>
                {(['email', 'sms', 'whatsapp', 'push'] as const).map(
                  (ch) => (
                    <View
                      key={ch}
                      className="flex-row items-center justify-between py-1"
                    >
                      <Text className="text-sm text-surface-600 capitalize">
                        {ch}
                      </Text>
                      <Switch
                        value={prefs[cat.key][ch]}
                        onValueChange={() => toggleChannel(cat.key, ch)}
                        trackColor={{ false: '#e9ecef', true: '#d4af37' }}
                        thumbColor="#fff"
                      />
                    </View>
                  ),
                )}
              </View>
            ))
          )}
        </Card>

        {/* Support */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Store Contact
          </Text>
          <Text className="text-sm text-surface-600">
            Need help? Call our support line or reach out to your nearest
            store.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {})
            }
            className="mt-2"
          >
            <Text className="text-sm text-primary-500 font-medium">
              {SUPPORT_PHONE}
            </Text>
          </Pressable>
          <Button
            title="Contact Support"
            variant="secondary"
            size="sm"
            onPress={handleContactSupport}
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
