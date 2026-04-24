import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Navigation from "../components/common/Navigation";
import { useAuth } from "../contexts/AuthContext";

const Signup = () => {
	const { signUp } = useAuth();
	const navigate = useNavigate();

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitting(true);
		try {
			await signUp(email, password, fullName);
			toast.success("Account created!");
			navigate("/dashboard");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to sign up");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="ui-page">
			<Navigation variant="public" />
			<div className="ui-container ui-auth">
				<Card className="ui-auth__card">
					<h1 className="ui-h1">Create your account</h1>
					<p className="ui-muted">
						Start generating invoices and payment links.
					</p>

					<form className="ui-stack ui-stack--md" onSubmit={onSubmit}>
						<Input
							label="Full name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							autoComplete="name"
						/>
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
							autoComplete="new-password"
							hint="Use at least 8 characters."
							minLength={8}
							required
						/>
						<Button type="submit" loading={submitting}>
							Create account
						</Button>
					</form>
				</Card>
			</div>
		</div>
	);
};

export default Signup;
