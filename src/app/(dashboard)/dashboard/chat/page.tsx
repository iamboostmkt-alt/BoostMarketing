'use client';
import dynamic from 'next/dynamic';
const ChatWithChannels = dynamic(
  () => import('@/components/dashboard/ChatWithChannels'),
  { ssr: false }
);
export default function ChatPage() {
  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 h-[calc(100dvh-3.5rem)] flex flex-col">
      <ChatWithChannels />
    </div>
  );
}