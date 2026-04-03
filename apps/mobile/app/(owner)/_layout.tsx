import { Tabs } from 'expo-router';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#adb5bd',
        tabBarStyle: {
          borderTopColor: '#e9ecef',
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }}
      />
      <Tabs.Screen
        name="approvals"
        options={{ title: 'Approvals', tabBarLabel: 'Approvals' }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reports', tabBarLabel: 'Reports' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarLabel: 'Settings' }}
      />
    </Tabs>
  );
}
