import type { ReactNode } from "react";

interface SettingsLayoutProps {
	children: ReactNode;
}

const SettingsLayout = ({ children }: SettingsLayoutProps) => {
	return (
		<div className="min-h-screen bg-black/95 text-white">
			<main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">{children}</main>
		</div>
	);
};

export default SettingsLayout;
