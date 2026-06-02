'use client';
import dynamic from 'next/dynamic';
import { useSidebar } from '@/components/dashboard/SidebarContext';
const ChatWithChannels = dynamic(
  () => import('@/components/dashboard/ChatWithChannels'),
  { ssr: false }
);
export default function ChatPage() {
  const { collapsed } = useSidebar();
  const left = collapsed ? 72 : 240;
  return (
    <div
      className="fixed inset-0 top-[3.5rem] flex flex-col overflow-hidden z-10 transition-all duration-300"
      style={{ left }}
    >
      <ChatWithChannels />
    </div>
  );
}