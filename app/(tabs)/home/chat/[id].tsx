import { Redirect, useLocalSearchParams } from 'expo-router';

export default function HomeChatRedirect() {
  const { id, messageId } = useLocalSearchParams();
  const chatId = Array.isArray(id) ? id[0] : id;
  const target = messageId
    ? { pathname: '/chat/[id]', params: { id: chatId, messageId } }
    : { pathname: '/chat/[id]', params: { id: chatId } };

  return <Redirect href={target as any} />;
}
