// ─── React Native Mock Setup for Vitest ─────────────────────────
// Mocks RN primitives and Expo modules so tests run without a device.

import { vi } from 'vitest';

// ─── React Native ───────────────────────────────────────────────

const mockComponent = (name: string) => {
  const component = ({ children, ...props }: any) => {
    return { type: name, props: { ...props, children } };
  };
  component.displayName = name;
  return component;
};

vi.mock('react-native', () => ({
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  TextInput: mockComponent('TextInput'),
  Pressable: mockComponent('Pressable'),
  TouchableOpacity: mockComponent('TouchableOpacity'),
  ScrollView: mockComponent('ScrollView'),
  FlatList: mockComponent('FlatList'),
  Image: mockComponent('Image'),
  Modal: mockComponent('Modal'),
  ActivityIndicator: mockComponent('ActivityIndicator'),
  RefreshControl: mockComponent('RefreshControl'),
  KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
  SafeAreaView: mockComponent('SafeAreaView'),
  Platform: { OS: 'ios', select: (opts: any) => opts.ios },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: mockComponent('SafeAreaView'),
  SafeAreaProvider: mockComponent('SafeAreaProvider'),
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: mockComponent('GestureHandlerRootView'),
  Swipeable: mockComponent('Swipeable'),
  PanGestureHandler: mockComponent('PanGestureHandler'),
}));

vi.mock('react-native-reanimated', () => ({
  default: {
    createAnimatedComponent: (c: any) => c,
    Value: vi.fn(),
    event: vi.fn(),
  },
  useSharedValue: (init: any) => ({ value: init }),
  useAnimatedStyle: (fn: any) => fn(),
  withTiming: (val: any) => val,
  withSpring: (val: any) => val,
}));

// ─── Expo Modules ───────────────────────────────────────────────

const secureStoreData: Record<string, string> = {};

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => secureStoreData[key] ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStoreData[key] = value;
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    delete secureStoreData[key];
  }),
}));

vi.mock('expo-camera', () => ({
  Camera: mockComponent('Camera'),
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
}));

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: vi.fn(async () => ({ data: 'ExponentPushToken[mock]' })),
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  AndroidImportance: { MAX: 5 },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:4000',
        eas: { projectId: 'test-project-id' },
      },
    },
  },
}));

vi.mock('expo-device', () => ({
  isDevice: true,
}));

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(async () => false),
  isEnrolledAsync: vi.fn(async () => false),
  supportedAuthenticationTypesAsync: vi.fn(async () => []),
  authenticateAsync: vi.fn(async () => ({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// ─── Async Storage ──────────────────────────────────────────────

const asyncStoreData: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStoreData[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStoreData[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete asyncStoreData[key];
    }),
    getAllKeys: vi.fn(async () => Object.keys(asyncStoreData)),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((k) => delete asyncStoreData[k]);
    }),
    clear: vi.fn(async () => {
      Object.keys(asyncStoreData).forEach((k) => delete asyncStoreData[k]);
    }),
  },
}));

// ─── Expo Router ────────────────────────────────────────────────

const createNavigator = (name: string) => {
  const Navigator = mockComponent(name);
  const Screen = mockComponent(`${name}.Screen`);
  return Object.assign(Navigator, { Screen });
};

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: mockComponent('Link'),
  Stack: createNavigator('Stack'),
  Tabs: createNavigator('Tabs'),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
}));

// ─── NetInfo ────────────────────────────────────────────────────

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn(async () => ({ isConnected: true })),
    addEventListener: vi.fn(() => vi.fn()),
  },
}));

// ─── Bottom Tabs ────────────────────────────────────────────────

vi.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: vi.fn(),
}));
