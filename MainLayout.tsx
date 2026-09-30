import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export const MainLayout = ({ children, title }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={title} />
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
