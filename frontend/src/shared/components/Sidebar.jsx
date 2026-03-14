import { NavLink } from 'react-router-dom';
import useAuthStore from '../../features/auth/authStore';
import { Activity, Pill, Users, FileText, LayoutDashboard, ChevronLeft, ChevronRight, X } from 'lucide-react';

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW', roles: ['patient', 'user', 'doctor', 'admin', 'hospital'] },
    { to: '/symptom', icon: Activity, label: 'Symptom Checker', section: 'PATIENT', roles: ['patient', 'user', 'doctor', 'admin', 'hospital'] },
    { to: '/medication', icon: Pill, label: 'Medication', section: 'PATIENT', roles: ['patient', 'user', 'doctor', 'admin', 'hospital'] },
    { to: '/queue', icon: Users, label: 'Queue', section: 'CLINICAL', roles: ['patient', 'user', 'doctor', 'admin', 'hospital'] },
    { to: '/records', icon: FileText, label: 'Health Records', section: 'CLINICAL', roles: ['patient', 'user', 'doctor', 'admin', 'hospital'] },
];

export default function Sidebar({ isOpen, setIsOpen, isMobile, sidebarWidth, setSidebarWidth }) {
    const { user } = useAuthStore();
    const role = String(user?.role || 'patient').toLowerCase();

    const handleNavClick = () => { if (isMobile) setIsOpen(false); };

    const visibleNav = NAV
        .filter((n) => n.roles.includes(role))
        .map((n) => {
            if (n.to === '/' && (role === 'patient' || role === 'user')) {
                return { ...n, label: 'Personalized Report' };
            }
            return n;
        });
    const sections = [...new Set(visibleNav.map((n) => n.section))];

    const handleDragStart = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
            setSidebarWidth(Math.min(newWidth, 400));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setSidebarWidth((prevWidth) => {
                if (prevWidth < 120) {
                    setIsOpen(false);
                    return prevWidth;
                } else if (!isOpen) {
                    setIsOpen(true);
                }
                return prevWidth;
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <aside
            className="sidebar"
            style={isMobile ? undefined : { width: isOpen ? sidebarWidth : undefined }}
        >
            {!isMobile && (
                <>
                    <button className="sidebar-toggle-btn" onClick={() => setIsOpen(!isOpen)} title="Toggle sidebar">
                        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {isOpen && (
                        <div
                            onMouseDown={handleDragStart}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '6px',
                                height: '100%',
                                cursor: 'col-resize',
                                zIndex: 102,
                            }}
                            className="sidebar-resizer"
                        />
                    )}
                </>
            )}

            {isMobile && (
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'rgba(255,255,255,.08)', border: 'none',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', zIndex: 102,
                    }}
                    aria-label="Close menu"
                >
                    <X size={16} />
                </button>
            )}

            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Activity size={20} color="#6eb1ff" strokeWidth={2.4} />
                </div>
                <span className="sidebar-logo-text">AarogyaLok</span>
            </div>

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
        </aside>
    );
}
