import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../features/auth/authStore';
import { Activity, Pill, Users, FileText, LayoutDashboard, ChevronLeft, ChevronRight, X } from 'lucide-react';

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW', roles: ['patient', 'doctor', 'admin'] },
    { to: '/symptom', icon: Activity, label: 'Symptom Checker', section: 'PATIENT', roles: ['patient', 'doctor', 'admin'] },
    { to: '/medication', icon: Pill, label: 'Medication', section: 'PATIENT', roles: ['patient', 'doctor', 'admin'] },
    { to: '/queue', icon: Users, label: 'Queue', section: 'CLINICAL', roles: ['patient', 'doctor', 'admin'] },
    { to: '/records', icon: FileText, label: 'Health Records', section: 'CLINICAL', roles: ['patient', 'doctor', 'admin'] },
];

export default function Sidebar({ isOpen, setIsOpen, isMobile, sidebarWidth, setSidebarWidth }) {
    const { user } = useAuthStore();
    const role = user?.role || 'patient';

    const handleNavClick = () => { if (isMobile) setIsOpen(false); };

    const visibleNav = NAV.filter((n) => n.roles.includes(role));
    const sections = [...new Set(visibleNav.map((n) => n.section))];

    // Drag-to-resize logic
    const handleDragStart = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(72, startWidth + (moveEvent.clientX - startX));
            // Cap it around 400px so it doesn't cover everything
            setSidebarWidth(Math.min(newWidth, 400));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // Snap to closed if dragged very narrow
            setSidebarWidth((prevWidth) => {
                if (prevWidth < 120) {
                    setIsOpen(false);
                    return prevWidth; // Width resets when opened next
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
            {/* Desktop collapse toggle */}
            {!isMobile && (
                <>
                    <button className="sidebar-toggle-btn" onClick={() => setIsOpen(!isOpen)} title="Toggle sidebar">
                        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Drag Handle */}
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
            {/* Footer removed — profile & logout moved to header */}
        </aside>
    );
}
