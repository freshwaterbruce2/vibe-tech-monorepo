import type React from "react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Navigation from "../components/common/Navigation";
import { useAuth } from "../contexts/AuthContext";

type LocationState = { from?: string } | null;

const Login = () => {
	const { signIn } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as LocationState;
	const redirectTo = useMemo(() => state?.from ?? "/dashboard", [state]);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitting(true);
		try {
			await signIn(email, password);
			toast.success("Welcome back!");
			navigate(redirectTo);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to sign in");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="ui-page">
			<Navigation variant="public" />
			<div className="ui-container ui-auth">
				<Card className="ui-auth__card">
					<h1 className="ui-h1">Log in</h1>
					<p className="ui-muted">Use your account to manage invoices.</p>

					<form className="ui-stack ui-stack--md" onSubmit={onSubmit}>
						<Input
							label="Email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
							required
						/>
						<Input
							label="Password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							required
						/>
						<Button type="submit" loading={submitting}>
							Log in
						</Button>
					</form>
				</Card>
			</div>
		</div>
	);
};

export default Login;
