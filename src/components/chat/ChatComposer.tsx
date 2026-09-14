import { Send } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { LIButton, LIInput } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

interface ChatComposerProps {
  /** Resolves when the message is accepted; rejects to restore the draft. */
  readonly onSend: (text: string) => Promise<unknown>;
  readonly isPending: boolean;
  readonly placeholder?: string;
}

/**
 * The draft is local state on purpose — it belongs to this screen and nothing
 * else reads it, so it never goes near the store or the query cache.
 *
 * The mutation is the caller's: the client posts to their one thread, the coach
 * posts to a named client's, and neither belongs inside a composer.
 */
export default function ChatComposer({
  onSend,
  isPending,
  placeholder = 'Message',
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const showToast = useUiStore((state) => state.showToast);

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    // Clear first: the optimistic bubble is already on screen, and a box that
    // stays full reads as a message that did not go.
    setText('');
    void onSend(trimmed).catch((error: unknown) => {
      setText(trimmed);
      showToast(errorMessage(error), 'danger');
    });
  }, [onSend, showToast, text]);

  return (
    <View className="flex-row items-center gap-2 border-t border-hairline bg-canvas px-4 py-3">
      <LIInput
        containerClassName="flex-1"
        fieldClassName="rounded-pill"
        placeholder={placeholder}
        value={text}
        onChangeText={setText}
        returnKeyType="send"
        onSubmitEditing={send}
        accessibilityLabel={placeholder}
        testID="chat-composer-input"
      />
      <LIButton
        title=""
        accessibilityLabel="Send message"
        onPress={send}
        loading={isPending}
        disabled={text.trim().length === 0}
        icon={<Send color={tokens.white} size={18} />}
        className="h-12 w-12 gap-0 px-0"
        testID="chat-send"
      />
    </View>
  );
}
