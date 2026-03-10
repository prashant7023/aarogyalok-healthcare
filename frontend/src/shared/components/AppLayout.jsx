import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, ChevronDown, LogOut, Shield, Mail } from 'lucide-react';
import Sidebar from './Sidebar';
import useAuthStore from '../../features/auth/authStore';
import { useFCMToken } from '../../hooks/useFCMToken';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return isMobile;
}

const PAGE_TITLES = {
    '/': 'Dashboard',
    '/symptom': 'Symptom Checker',
    '/medication': 'Medication',
    '/queue': 'Queue Management',
    '/records': 'Health Records',
};

/* ── Profile dropdown ────────────────────────────────────────── */
function ProfileDropdown({ user, onClose }) {
    const navigate = useNavigate();
    const { logout } = useAuthStore();

    const handleLogout = () => {
        onClose();
        logout();
        navigate('/login');
    };

    return (
        <div
            className="fade-in"
            style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: 240,
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 16px 48px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06)',
                overflow: 'hidden',
                zIndex: 200,
            }}
        >
            {/* User info header */}
            <div style={{
                padding: '1rem 1.1rem',
                background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
                <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                    {user?.name?.[0]?.toUpperCase() || <User size={16} />}
                </div>
                <div style={{ overflow: 'hidden' }}>
                    <div style={{
                        fontWeight: 700, fontSize: '0.9rem', color: '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {user?.name || 'User'}
                    </div>
                    <div style={{
                        fontSize: '0.75rem', color: 'rgba(255,255,255,.5)',
                        display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
                    }}>
                        <Shield size={11} />
                        <span style={{ textTransform: 'capitalize' }}>{user?.role || 'patient'}</span>
                    </div>
                </div>
            </div>

            {/* Email row */}
            {user?.email && (
                <div style={{
                    padding: '0.6rem 1.1rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.8rem', color: '#64748b',
                }}>
                    <Mail size={13} color="#94a3b8" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                    </span>
                </div>
            )}

            {/* Logout */}
            <div style={{ padding: '0.5rem' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', padding: '0.6rem 0.75rem',
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: 'none', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.875rem', color: '#ef4444',
                        fontWeight: 600, transition: 'all .12s', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                    <LogOut size={15} color="#ef4444" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}

/* ── App shell ───────────────────────────────────────────────── */
export default function AppLayout() {
    const isMobile = useIsMobile();
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const { user } = useAuthStore();
    const location = useLocation();

    // Register FCM push notification token with backend
    useFCMToken();

    const pageTitle = PAGE_TITLES[location.pathname] || 'AarogyaLok';

    useEffect(() => {
        if (isMobile) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    }, [isMobile]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!profileOpen) return;
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [profileOpen]);

    return (
        <div
            className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
            style={!isMobile && isSidebarOpen ? { '--sidebar-w': `${sidebarWidth}px` } : undefined}
        >
            {/* Mobile backdrop */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.55)', zIndex: 99,
                        backdropFilter: 'blur(2px)',
                    }}
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                isMobile={isMobile}
                sidebarWidth={sidebarWidth}
                setSidebarWidth={setSidebarWidth}
            />

            <div className="main-wrapper">
                {/* ── Mobile hamburger bar ───────────────────────── */}
                {isMobile && (
                    <div style={{
                        position: 'sticky', top: 0, zIndex: 50,
                        background: '#0f172a', padding: '0.85rem 1.25rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        borderBottom: '1px solid rgba(255,255,255,.08)',
                    }}>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px' }}
                            aria-label="Open menu"
                        >
                            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2 }} />
                            <span style={{ display: 'block', width: 16, height: 2, background: '#fff', borderRadius: 2 }} />
                            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2 }} />
                        </button>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px', flex: 1 }}>AarogyaLok</span>

                        {/* Mobile right controls (Notifications + Profile) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            {/* Notification bell */}
                            <button style={{
                                position: 'relative', background: 'none', border: 'none',
                                cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Bell size={20} />
                                <span style={{
                                    position: 'absolute', top: 0, right: 0,
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#ef4444', border: '2px solid #0f172a',
                                }} />
                            </button>

                            {/* Profile chip + dropdown */}
                            <div ref={profileRef} style={{ position: 'relative', display: 'flex' }}>
                                <button
                                    onClick={() => setProfileOpen((v) => !v)}
                                    style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                                        border: 'none', cursor: 'pointer', padding: 0,
                                        boxShadow: profileOpen ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
                                    }}
                                >
                                    {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                                </button>

                                {/* Dropdown */}
                                {profileOpen && (
                                    <ProfileDropdown user={user} onClose={() => setProfileOpen(false)} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Desktop header ─────────────────────────────── */}
                {!isMobile && (
                    <header style={{
                        position: 'sticky', top: 0, zIndex: 50,
                        background: 'rgba(248,250,252,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '0 2.5rem',
                        height: '62px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        {/* Page title */}
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
                            {pageTitle}
                        </span>

                        {/* Right controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {/* Notification bell */}
                            <button style={{
                                position: 'relative', background: 'none', border: 'none',
                                cursor: 'pointer', width: 40, height: 40, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#64748b', transition: 'all .15s',
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                            >
                                <Bell size={20} />
                                <span style={{
                                    position: 'absolute', top: 8, right: 8,
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#ef4444', border: '2px solid #f8fafc',
                                }} />
                            </button>

                            {/* Divider */}
                            <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 0.25rem' }} />

                            {/* Profile chip + dropdown */}
                            <div ref={profileRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setProfileOpen((v) => !v)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        padding: '0.35rem 0.75rem 0.35rem 0.4rem',
                                        borderRadius: '999px',
                                        border: `1px solid ${profileOpen ? '#2563eb' : '#e2e8f0'}`,
                                        background: profileOpen ? '#eff6ff' : '#fff',
                                        cursor: 'pointer', transition: 'all .15s',
                                        boxShadow: profileOpen ? '0 0 0 3px rgba(37,99,235,.12)' : '0 1px 3px rgba(0,0,0,.06)',
                                    }}
                                >
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.8rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                                    }}>
                                        {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                                    </div>
                                    <span style={{
                                        fontSize: '0.875rem', fontWeight: 600, color: '#0f172a',
                                        whiteSpace: 'nowrap', maxWidth: 120,
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {user?.name || 'User'}
                                    </span>
                                    <ChevronDown
                                        size={14} color="#94a3b8"
                                        style={{ transform: profileOpen ? 'rotate(180deg)' : '', transition: 'transform .2s' }}
                                    />
                                </button>

                                {/* Dropdown */}
                                {profileOpen && (
                                    <ProfileDropdown user={user} onClose={() => setProfileOpen(false)} />
                                )}
                            </div>
                        </div>
                    </header>
                )}

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
