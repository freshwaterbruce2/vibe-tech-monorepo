import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="ui-page">
				<div className="ui-container ui-center">
					<div className="ui-spinner ui-spinner--lg" aria-label="Loading" />
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return <>{children}</>;
};

export default ProtectedRoute;
