import { CreateUserForm } from "../../features/auth/ui/CreateUserForm";
import type { Agence, UserRole } from "../../shared/types";

interface Props {
  agences: Agence[];
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const AgentsPage = ({
  agences,
  userRole,
  currentUserAgenceId,
}: Props) => {
  return (
    <CreateUserForm
      key={currentUserAgenceId || "agents-main-key"}
      agences={agences}
      userRole={userRole}
      currentUserAgenceId={currentUserAgenceId}
    />
  );
};
