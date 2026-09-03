import { Send } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useSendMessageMutation } from '@/api/clientChat';
import { LIButton, LIInput } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

/**
 * The draft is local state on purpose — it belongs to this screen and nothing
 * else reads it, so it never goes near the store or the query cache.
 */
export default function ChatComposer() {
  const [text, setText] = useState('');
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useSendMessageMutation();

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    // Clear first: the optimistic bubble is already on screen, and a box that
    // stays full reads as a message that did not go.
    setText('');
    void mutateAsync({ text: trimmed }).catch((error: unknown) => {
      setText(trimmed);
      showToast(errorMessage(error), 'danger');
    });
  }, [mutateAsync, showToast, text]);

  return (
    <View className="flex-row items-center gap-2 border-t border-hairline bg-canvas px-4 py-3">
      <LIInput
        containerClassName="flex-1"
        fieldClassName="rounded-pill"
        placeholder="Message"
        value={text}
        onChangeText={setText}
        returnKeyType="send"
        onSubmitEditing={send}
        accessibilityLabel="Message"
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
