import dynamic from 'next/dynamic';

const ChatContent = dynamic(() => import('@/components/dashboard/ChatContent'), {
  ssr: false,
});

export default function ChatPage() {
  return <ChatContent />;
}
