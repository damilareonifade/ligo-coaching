import { KeyboardAvoidingView, Platform, View } from 'react-native';

import type { ApiClientChat } from '@/api/types';

import ChatArchivedNotice from './ChatArchivedNotice';
import ChatComposer from './ChatComposer';
import ChatHeaderCard from './ChatHeaderCard';
import ChatThread from './ChatThread';

interface ChatContentProps {
  readonly chat: ApiClientChat;
}

/**
 * `LIForm` gives no keyboard avoidance, so the screen owns it — the composer is
 * the one control that must never end up under the keyboard. The header sits
 * outside the avoiding view's scroll area so it stays put while typing.
 */
export default function ChatContent({ chat }: ChatContentProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="px-4 pt-2">
        <ChatHeaderCard
          coachName={chat.coachName}
          context={chat.context}
          chipLabel={chat.chipLabel}
        />
      </View>

      <View className="flex-1">
        <ChatThread messages={chat.messages} coachName={chat.coachName} />
      </View>

      {chat.archived ? <ChatArchivedNotice coachName={chat.coachName} /> : <ChatComposer />}
    </KeyboardAvoidingView>
  );
}
