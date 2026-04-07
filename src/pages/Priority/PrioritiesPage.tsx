import React from "react";
import { PriorityManager } from "../../features/priority/ui/PriorityManager";
import { PriorityAssignment } from "../../features/priority/ui/PriorityAssignment";
import type { UserRole } from "../../shared/types";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const PrioritiesPage: React.FC<Props> = ({ userRole, currentUserAgenceId }) => {
  if (userRole === "super_admin") {
    return <PriorityManager userRole={userRole} />;
  }

  return (
    <PriorityAssignment
      userRole={userRole}
      currentUserAgenceId={currentUserAgenceId}
    />
  );
};
