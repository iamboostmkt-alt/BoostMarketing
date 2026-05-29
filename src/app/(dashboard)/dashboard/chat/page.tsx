'use client';
import dynamic from 'next/dynamic';
const ChatWithChannels = dynamic(
  () => import('@/components/dashboard/ChatWithChannels'),
  { ssr: false }
);
export default function ChatPage() {
  return (
    <div className="fixed inset-0 top-[3.5rem] left-[var(--sidebar-width,240px)] flex flex-col overflow-hidden z-10">
      <ChatWithChannels />
    </div>
  );
}