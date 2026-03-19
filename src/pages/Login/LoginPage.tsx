import { LoginForm } from "../../features/auth/ui/LoginForm";
import type { UserRole } from "../../shared/types";

interface Props {
    onLogin: (role: UserRole) => void;
}

export const LoginPage = ({ onLogin }: Props) => {
    return <LoginForm onLogin={onLogin} />;
};
