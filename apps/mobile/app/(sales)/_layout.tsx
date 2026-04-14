import { Tabs } from 'expo-router';

export default function SalesLayout() {
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
        name="bill"
        options={{ title: 'Quick Bill', tabBarLabel: 'Bill' }}
      />
      <Tabs.Screen
        name="customers"
        options={{ title: 'Customers', tabBarLabel: 'Customers' }}
      />
      <Tabs.Screen
        name="stock"
        options={{ title: 'Stock', tabBarLabel: 'Stock' }}
      />
      <Tabs.Screen
        name="today"
        options={{ title: 'Today', tabBarLabel: 'Today' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
    </Tabs>
  );
}
