import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../../widgets/sidebar/ui/Sidebar";
import { Navbar } from "../../widgets/navbar/ui/Navbar";
import type { UserRole } from "../../shared/types";
import "../../layout.css";

interface MainLayoutProps {
    userRole: UserRole | null;
    onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    userRole,
    onLogout,
}) => {
    if (!userRole) return <Outlet />;

    return (
        <div className="app-layout">
            <Sidebar userRole={userRole} />
            <div className="app-content-wrapper">
                <Navbar onLogout={onLogout} />
                <main className="app-main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
