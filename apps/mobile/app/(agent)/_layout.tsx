import { Tabs } from 'expo-router';

export default function AgentLayout() {
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
        name="collections"
        options={{ title: 'Collections', tabBarLabel: 'Collect' }}
      />
      <Tabs.Screen
        name="visits"
        options={{ title: 'Visits', tabBarLabel: 'Visits' }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarLabel: 'Orders' }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }}
      />
    </Tabs>
  );
}
