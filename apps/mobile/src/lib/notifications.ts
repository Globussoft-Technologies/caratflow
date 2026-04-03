// ─── Push Notification Service ──────────────────────────────────

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { router } from 'expo-router';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationType =
  | 'approval_needed'
  | 'sale_completed'
  | 'scheme_due'
  | 'collection_reminder'
  | 'rate_updated'
  | 'order_status';

interface NotificationData {
  type: NotificationType;
  referenceId?: string;
  [key: string]: unknown;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#d4af37',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  // Register the push token with our backend
  try {
    await api.post('/api/v1/notifications/register-device', {
      pushToken: tokenData.data,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to register push token:', error);
  }

  return tokenData.data;
}

export function handleNotificationNavigation(
  notification: Notifications.Notification,
): void {
  const data = notification.request.content.data as NotificationData | undefined;
  if (!data?.type) return;

  switch (data.type) {
    case 'approval_needed':
      router.push('/(owner)/approvals');
      break;
    case 'sale_completed':
      router.push('/(owner)/dashboard');
      break;
    case 'scheme_due':
      if (data.referenceId) {
        router.push(`/(customer)/passbook/scheme/${data.referenceId}`);
      } else {
        router.push('/(customer)/passbook');
      }
      break;
    case 'collection_reminder':
      router.push('/(agent)/collections');
      break;
    case 'rate_updated':
      router.push('/(customer)/home');
      break;
    case 'order_status':
      router.push('/(agent)/orders');
      break;
    default:
      break;
  }
}

export function addNotificationListeners(): () => void {
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationNavigation(response.notification);
    });

  return () => {
    responseSubscription.remove();
  };
}
