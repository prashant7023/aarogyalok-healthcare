import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../features/auth/authStore';
import { Activity, Pill, Users, FileText, LayoutDashboard, LogOut, ChevronLeft, ChevronRight, User, X } from 'lucide-react';

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW', roles: ['patient', 'doctor', 'admin'] },
    { to: '/symptom', icon: Activity, label: 'Symptom Checker', section: 'PATIENT', roles: ['patient'] },
    { to: '/medication', icon: Pill, label: 'Medication', section: 'PATIENT', roles: ['patient'] },
    { to: '/queue', icon: Users, label: 'Queue', section: 'CLINICAL', roles: ['doctor', 'admin'] },
    { to: '/records', icon: FileText, label: 'Health Records', section: 'CLINICAL', roles: ['doctor', 'admin'] },
];

export default function Sidebar({ isOpen, setIsOpen, isMobile }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const role = user?.role || 'patient';

    const handleLogout = () => { logout(); navigate('/login'); };

    // On mobile, close sidebar after navigation
    const handleNavClick = () => { if (isMobile) setIsOpen(false); };

    const visibleNav = NAV.filter((n) => n.roles.includes(role));
    const sections = [...new Set(visibleNav.map((n) => n.section))];

    return (
        <aside className="sidebar">
            {/* Desktop collapse toggle */}
            {!isMobile && (
                <button className="sidebar-toggle-btn" onClick={() => setIsOpen(!isOpen)} title="Toggle sidebar">
                    {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            )}

            {/* Mobile close button */}
            {isMobile && (
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'rgba(255,255,255,.1)', border: 'none',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', zIndex: 102,
                    }}
                    aria-label="Close menu"
                >
                    <X size={16} />
                </button>
            )}

            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Activity size={24} color="#60a5fa" strokeWidth={2.5} />
                </div>
                <span className="sidebar-logo-text">AarogyaLok</span>
            </div>

            {/* Navigation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                {sections.map((section) => (
                    <div className="sidebar-section" key={section}>
                        {(isOpen || isMobile) && (
                            <div className="sidebar-section-label">{section}</div>
                        )}
                        {visibleNav.filter((n) => n.section === section).map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/'}
                                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                                title={!isOpen && !isMobile ? label : ''}
                                onClick={handleNavClick}
                            >
                                <div className="sidebar-item-icon"><Icon size={18} /></div>
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </div>

            {/* Footer: user info + logout */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.name?.[0]?.toUpperCase() || <User size={16} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span className="sidebar-user-name" title={user?.name}>{user?.name || 'User'}</span>
                        <span className="sidebar-user-role">{user?.role || 'patient'}</span>
                    </div>
                </div>
                <button
                    className="sidebar-item"
                    style={{ color: 'var(--danger)', marginTop: '0.25rem' }}
                    onClick={handleLogout}
                    title={!isOpen && !isMobile ? 'Logout' : ''}
                >
                    <div className="sidebar-item-icon" style={{ color: 'var(--danger)' }}><LogOut size={18} /></div>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
