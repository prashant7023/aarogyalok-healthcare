import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../features/auth/authStore';
import { ChevronLeft, ChevronRight, Activity, Pill, User, Users, FileText, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW', roles: ['patient', 'doctor', 'admin'] },
    { to: '/symptom', icon: Activity, label: 'Symptom Checker', section: 'PATIENT', roles: ['patient'] },
    { to: '/medication', icon: Pill, label: 'Medication', section: 'PATIENT', roles: ['patient'] },
    { to: '/queue', icon: Users, label: 'Queue', section: 'CLINICAL', roles: ['doctor', 'admin'] },
    { to: '/records', icon: FileText, label: 'Health Records', section: 'CLINICAL', roles: ['doctor', 'admin'] },
];

export default function Sidebar({ isOpen, setIsOpen }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const role = user?.role || 'patient';

    const handleLogout = () => { logout(); navigate('/login'); };

    const visibleNav = NAV.filter(n => n.roles.includes(role));
    const sections = [...new Set(visibleNav.map(n => n.section))];

    return (
        <aside className="sidebar">
            <button className="sidebar-toggle-btn" onClick={() => setIsOpen(!isOpen)} title="Toggle sidebar">
                {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Activity size={24} color="#000" strokeWidth={2.5} />
                </div>
                <div className="sidebar-logo-text">AarogyaLok</div>
            </div>

            {/* Navigation grouped by section */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                {sections.map(section => (
                    <div className="sidebar-section" key={section}>
                        {isOpen && <div className="sidebar-section-label">{section}</div>}
                        {visibleNav.filter(n => n.section === section).map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/'}
                                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                                title={!isOpen ? label : ''}
                            >
                                <div className="sidebar-item-icon">
                                    <Icon size={18} />
                                </div>
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </div>

            {/* User + Logout */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.name?.[0]?.toUpperCase() || <User size={16} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="sidebar-user-name" title={user?.name}>{user?.name || 'User'}</span>
                        <span className="sidebar-user-role">{user?.role || 'patient'}</span>
                    </div>
                </div>
                <button
                    className="sidebar-item"
                    style={{ color: 'var(--danger)', marginTop: '0.25rem' }}
                    onClick={handleLogout}
                    title={!isOpen ? 'Logout' : ''}
                >
                    <div className="sidebar-item-icon" style={{ color: 'var(--danger)' }}><LogOut size={18} /></div>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
