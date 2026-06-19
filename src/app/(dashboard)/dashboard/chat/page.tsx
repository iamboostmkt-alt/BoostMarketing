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
      {/* Mobile: altura fija = 100dvh menos topnav, sin scroll externo */}
      <div className="flex md:hidden flex-col overflow-hidden"
        style={{
          position: 'fixed',
          top: 'calc(56px + env(safe-area-inset-top, 0px))',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
        }}>
        <ChatWithChannels />
      </div>
    </>
  );
}