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
    <>
      {/* Desktop: fixed con offset del sidebar */}
      <div
        className="hidden md:flex fixed inset-0 top-[3rem] flex-col overflow-hidden z-10 transition-all duration-300"
        style={{ left }}
      >
        <ChatWithChannels />
      </div>
      {/* Mobile: flujo normal, ocupa h-full del main */}
      <div className="flex md:hidden h-full flex-col overflow-hidden">
        <ChatWithChannels />
      </div>
    </>
  );
}