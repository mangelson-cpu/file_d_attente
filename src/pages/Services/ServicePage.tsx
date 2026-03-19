import { ServiceManager } from "../../features/service/ui/ServiceManager";
import { GuichetAssignment } from "../../features/guichet/ui/GuichetAssignment";
import type { UserRole } from "../../shared/types";

interface Props {
    userRole: UserRole;
    currentUserAgenceId: string | null;
}

export const ServicePage = ({ userRole, currentUserAgenceId }: Props) => {
    // Le super_admin gère les services globaux
    if (userRole === "super_admin") {
        return <ServiceManager key="super-admin-services" userRole={userRole} />;
    }

    // L'admin gère l'affectation des guichets de son agence
    return (
        <GuichetAssignment
            key={currentUserAgenceId || "no-agency"}
            userRole={userRole}
            currentUserAgenceId={currentUserAgenceId}
        />
    );
};
