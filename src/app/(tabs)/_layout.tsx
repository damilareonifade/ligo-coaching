import { Tabs } from 'expo-router/js-tabs';
import {
  Apple,
  ClipboardList,
  Dumbbell,
  House,
  MessageCircle,
  Settings,
  TrendingUp,
  User,
  Users,
} from 'lucide-react-native';

import { useAuthStore } from '@/store/authStore';
import { tokens } from '@/theme/tokens';

/**
 * One tab bar, two audiences. Both roles keep Today first; everything after it
 * swaps — the coach gets Roster/Programs/Messages/Settings, the client gets
 * Train/Food/Progress/Profile. The two last tabs are not interchangeable:
 * Settings is the coach's app-level screen, Profile is the client's own
 * account, so each role hides the other's. Hidden tabs stay mounted with
 * `href: null` so a deep link still resolves.
 */
export default function TabsLayout() {
  const role = useAuthStore((state) => state.user?.role);
  const isClient = role === 'client';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.violet,
        tabBarInactiveTintColor: tokens.muted,
        tabBarStyle: { backgroundColor: tokens.white, borderTopColor: tokens.hairline },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          href: isClient ? '/train' : null,
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: 'Food',
          href: isClient ? '/food' : null,
          tabBarIcon: ({ color, size }) => <Apple color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          href: isClient ? '/progress' : null,
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          href: isClient ? null : '/roster',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          href: isClient ? null : '/programs',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      {/* Coach-side only. The client's messaging is one thread reached from
          their Today card, not a tab — a coach has forty conversations, a
          client has one. */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: isClient ? null : '/messages',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: isClient ? '/profile' : null,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: isClient ? null : '/settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
