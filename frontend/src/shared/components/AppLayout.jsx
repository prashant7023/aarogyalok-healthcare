import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="main-wrapper">
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
