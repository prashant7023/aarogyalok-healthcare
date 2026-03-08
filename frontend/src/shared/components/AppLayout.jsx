import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return isMobile;
}

export default function AppLayout() {
    const isMobile = useIsMobile();
    // On desktop: open by default. On mobile: closed by default.
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

    // Close sidebar when switching to mobile
    useEffect(() => {
        if (isMobile) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    }, [isMobile]);

    return (
        <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* Dark backdrop on mobile when sidebar is open */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 99,
                        backdropFilter: 'blur(2px)',
                    }}
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                isMobile={isMobile}
            />

            <div className="main-wrapper">
                {/* Mobile top bar with hamburger */}
                {isMobile && (
                    <div style={{
                        position: 'sticky', top: 0, zIndex: 50,
                        background: '#0f172a',
                        padding: '0.85rem 1rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        borderBottom: '1px solid rgba(255,255,255,.08)',
                    }}>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#fff', padding: '4px', display: 'flex',
                                flexDirection: 'column', gap: '5px', alignItems: 'center',
                            }}
                            aria-label="Open menu"
                        >
                            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2 }} />
                            <span style={{ display: 'block', width: 16, height: 2, background: '#fff', borderRadius: 2 }} />
                            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2 }} />
                        </button>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px' }}>AarogyaLok</span>
                    </div>
                )}

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
