import type { ReactNode } from "react";

interface CommandCenterLayoutProps {
	leftPanel?: ReactNode;
	centerPanel: ReactNode;
	rightPanel?: ReactNode;
}

export const CommandCenterLayout = ({
	leftPanel,
	centerPanel,
	rightPanel,
}: CommandCenterLayoutProps) => {
	return (
		<div className="flex h-screen w-full bg-[#09090b] text-zinc-100 overflow-hidden">
			{/* Left Sidebar */}
			{leftPanel && (
				<aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 p-4 hidden md:flex flex-col">
					{leftPanel}
				</aside>
			)}

			{/* Main Content */}
			<main className="flex-1 flex flex-col relative min-w-0">
				<div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800">
					{centerPanel}
				</div>
			</main>

			{/* Right Sidebar */}
			{rightPanel && (
				<aside className="w-80 border-l border-zinc-800 bg-zinc-900/30 p-4 hidden lg:flex flex-col">
					{rightPanel}
				</aside>
			)}
		</div>
	);
};
