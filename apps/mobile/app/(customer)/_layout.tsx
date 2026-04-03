import { Tabs } from 'expo-router';

export default function CustomerLayout() {
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
        name="home"
        options={{ title: 'Home', tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="passbook"
        options={{ title: 'Passbook', tabBarLabel: 'Passbook' }}
      />
      <Tabs.Screen
        name="catalog"
        options={{ title: 'Catalog', tabBarLabel: 'Catalog' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tabs>
  );
}
