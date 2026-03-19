import type { UserRole } from "../../shared/types";

interface Props {
    userRole: UserRole | null;
}

export const DashboardPage = ({ userRole }: Props) => {
    return (
        <div className="dashboard-header">
            <div className="dashboard-header-info">
                <h2>Tableau de bord</h2>
                {userRole && (
                    <span className={`auth-role-badge auth-role-badge--${userRole}`}>
                        {userRole === "super_admin" ? "Super Admin" : userRole === "admin" ? "Admin" : "User"}
                    </span>
                )}
            </div>
        </div>
    );
};
