import React from 'react';
import { PremiumHeader } from './PremiumHeader';
import { ProfessionalFooter } from './ProfessionalFooter';

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className="min-h-screen flex flex-col">
			<PremiumHeader />
			<main className="flex-1">{children}</main>
			<ProfessionalFooter />
		</div>
	);
}
