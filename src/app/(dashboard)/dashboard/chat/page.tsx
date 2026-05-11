import dynamic from 'next/dynamic';

const ChatWithChannels = dynamic(
  () => import('@/components/dashboard/ChatWithChannels'),
  { ssr: false }
);

export default function ChatPage() {
  return <ChatWithChannels />;
}
