import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, ChevronDown, LogOut, Shield, Mail, Menu } from 'lucide-react';
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
                width: 250,
                background: '#fff',
                borderRadius: '14px',
                border: '1px solid #e1e3e5',
                boxShadow: '0 14px 34px rgba(0,0,0,.12)',
                overflow: 'hidden',
                zIndex: 200,
            }}
        >
            <div style={{
                padding: '1rem 1.1rem',
                background: '#111213',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
                <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: '#005bd3',
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
                    borderBottom: '1px solid #f0f1f2',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.8rem', color: '#616161',
                }}>
                    <Mail size={13} color="#8a8a8a" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                    </span>
                </div>
            )}

            <div style={{ padding: '0.5rem' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', padding: '0.6rem 0.75rem',
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: 'none', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.875rem', color: '#c43256',
                        fontWeight: 600, transition: 'all .12s', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f4'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                    <LogOut size={15} color="#c43256" />
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
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(17,18,19,0.45)', zIndex: 99,
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
                {isMobile && (
                    <div className="topbar">
                        <div className="topbar-inner">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#303030', padding: '4px', display: 'flex' }}
                                aria-label="Open menu"
                            >
                                <Menu size={18} />
                            </button>
                            <span className="topbar-title" style={{ flex: 1 }}>{pageTitle}</span>

                            <div ref={profileRef} style={{ position: 'relative', display: 'flex' }}>
                                <button
                                    onClick={() => setProfileOpen((v) => !v)}
                                    style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: '#005bd3',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                                        border: 'none', cursor: 'pointer', padding: 0,
                                    }}
                                >
                                    {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                                </button>

                                {profileOpen && (
                                    <ProfileDropdown user={user} onClose={() => setProfileOpen(false)} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!isMobile && (
                    <header className="topbar">
                        <div className="topbar-inner">
                            <span className="topbar-title">{pageTitle}</span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                <div ref={profileRef} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setProfileOpen((v) => !v)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                                            padding: '0.3rem 0.65rem 0.3rem 0.35rem',
                                            borderRadius: '999px',
                                            border: `1px solid ${profileOpen ? '#005bd3' : '#e1e3e5'}`,
                                            background: '#fff',
                                            cursor: 'pointer', transition: 'all .15s',
                                            boxShadow: profileOpen ? '0 0 0 3px rgba(0,91,211,.12)' : '0 1px 2px rgba(0,0,0,.06)',
                                        }}
                                    >
                                        <div style={{
                                            width: 30, height: 30, borderRadius: '50%',
                                            background: '#005bd3',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                                        }}>
                                            {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                                        </div>
                                        <span style={{
                                            fontSize: '0.86rem', fontWeight: 700, color: '#303030',
                                            whiteSpace: 'nowrap', maxWidth: 120,
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {user?.name || 'User'}
                                        </span>
                                        <ChevronDown
                                            size={14} color="#8a8a8a"
                                            style={{ transform: profileOpen ? 'rotate(180deg)' : '', transition: 'transform .2s' }}
                                        />
                                    </button>

                                    {/* Dropdown */}
                                    {profileOpen && (
                                        <ProfileDropdown user={user} onClose={() => setProfileOpen(false)} />
                                    )}
                                </div>
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
