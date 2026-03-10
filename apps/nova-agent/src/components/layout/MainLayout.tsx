import { Outlet } from "react-router-dom";
import NovaNavBar from "@/components/nova/NovaNavBar";
import { Toaster } from "@/components/ui/toaster";

const MainLayout = () => {
	return (
		<div className="min-h-screen" style={{ background: 'var(--bg-start)' }}>
			<NovaNavBar />

			{/* VibeTech Background - Subtle radial gradient */}
			<div className="fixed inset-0 -z-50 overflow-hidden">
				{/* Base gradient - dark slate, NOT pure black */}
				<div 
					className="absolute inset-0"
					style={{
						background: 'radial-gradient(ellipse at 50% 0%, #0D0D1A 0%, #07090f 50%, #12141c 100%)',
					}}
				/>
				
				{/* Subtle accent glow - purple/violet, very muted */}
				<div 
					className="absolute top-[-30%] left-[10%] w-[60%] h-[50%] rounded-full opacity-20"
					style={{
						background: 'radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)',
						filter: 'blur(100px)',
					}}
				/>
				<div 
					className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-15"
					style={{
						background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
						filter: 'blur(100px)',
					}}
				/>

				{/* Subtle grid overlay - very faint */}
				<div
					className="absolute inset-0 opacity-[0.02]"
					style={{
						backgroundImage: `
							linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px),
							linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)
						`,
						backgroundSize: '80px 80px',
					}}
				/>
			</div>

			{/* Main Content Area */}
			<main className="relative z-10 pt-28 min-h-screen">
				<Outlet />
			</main>

			<Toaster />
		</div>
	);
};

export default MainLayout;
