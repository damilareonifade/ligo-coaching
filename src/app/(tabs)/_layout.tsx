import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import {
  ChartLine,
  ClipboardList,
  Dumbbell,
  House,
  MessageCircle,
  Settings,
  User,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { hasFeature } from '@/lib/features';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

/**
 * The selected tab carries a filled pill behind its icon, not just a tint —
 * a colour change alone is easy to miss at a glance mid-workout, and the pill
 * is the one element that survives being looked at from a bench.
 */
function tabIcon(Icon: LucideIcon) {
  // The tab bar hands back a `ColorValue`; lucide wants a string. Both are the
  // token we set in `screenOptions`, so read the focused state instead.
  return function TabIcon({ focused }: { focused: boolean }) {
    // Inside the returned component, not in `tabIcon` — that is a factory, and
    // a hook there would run once at module setup and never follow the theme.
    const tokens = useThemeTokens();
    return (
      <View
        className={cn(
          'h-8 w-14 items-center justify-center rounded-xl',
          focused && 'bg-violet-weak',
        )}
      >
        <Icon color={focused ? tokens.violet : tokens['foreground-subtle']} size={22} />
      </View>
    );
  };
}

/**
 * One tab bar, two audiences. Both roles keep Today first; everything after it
 * swaps — the coach gets Roster/Programs/Messages/Settings, the client gets
 * Train/Food/Progress/Profile. The two last tabs are not interchangeable:
 * Settings is the coach's app-level screen, Profile is the client's own
 * account, so each role hides the other's. Hidden tabs stay mounted with
 * `href: null` so a deep link still resolves.
 */
export default function TabsLayout() {
  const tokens = useThemeTokens();
  const role = useAuthStore((state) => state.user?.role);
  const needsRole = useAuthStore((state) => state.needsRole);
  const needsOnboarding = useAuthStore((state) => state.needsOnboarding);
  // Not `role === 'client'`. That made an unknown role render the *coach*
  // app — every tab, the roster, every client's data — to a session whose
  // role had not loaded. The client side is the one without other people's
  // information in it, so it is the safe answer to an unanswered question.
  const isClient = role !== 'coach';

  // A Google account arrives signed in but roleless, and the tab bar below is
  // a choice between two apps — so ask before rendering either. Checked here
  // rather than in the root guard because the picker itself has to be
  // reachable on the signed-in side of it.
  if (needsRole) {
    return <Redirect href="/onboarding/choose-role" />;
  }

  // And the same for onboarding, which until now nothing held anyone in:
  // `users.onboarded_at` was stamped and read by nobody. It matters most on
  // this project, where email signup requires a confirmation — so signup
  // returns no session, the route into onboarding is never taken, and the
  // person's first entry is the sign-in screen. Without this they land here
  // having never been asked anything, and a coach never sees their own code.
  if (needsOnboarding) {
    return <Redirect href={isClient ? '/onboarding/welcome' : '/onboarding/coach-profile'} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.violet,
        tabBarInactiveTintColor: tokens['foreground-subtle'],
        tabBarStyle: { backgroundColor: tokens.inverse, borderTopColor: tokens.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: tabIcon(House),
        }}
      />
      {/* `href: null` keeps the route resolvable for a deep link while taking
          the tab off the bar — which is what a feature being off should do.
          A tab that opens onto an error is worse than a tab that is absent,
          and the flag removes the feature everywhere at once. */}
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          href: isClient && hasFeature('train') ? '/train' : null,
          tabBarIcon: tabIcon(Dumbbell),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: 'Food',
          href: isClient && hasFeature('food') ? '/food' : null,
          tabBarIcon: tabIcon(Utensils),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          href: isClient && hasFeature('progress') ? '/progress' : null,
          tabBarIcon: tabIcon(ChartLine),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          href: isClient ? null : '/roster',
          tabBarIcon: tabIcon(Users),
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          href: isClient ? null : '/programs',
          tabBarIcon: tabIcon(ClipboardList),
        }}
      />
      {/* Both seats now. It was coach-only, because "a client has one
          conversation" and one conversation does not want a tab — which was
          true until a group could belong to anybody. A client can be in any
          number of them, with other clients and with coaches who are not
          theirs, and those had nowhere to live but three taps down under
          Profile. */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: hasFeature('messaging') ? '/messages' : null,
          tabBarIcon: tabIcon(MessageCircle),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: isClient ? '/profile' : null,
          tabBarIcon: tabIcon(User),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: isClient ? null : '/settings',
          tabBarIcon: tabIcon(Settings),
        }}
      />
    </Tabs>
  );
}
