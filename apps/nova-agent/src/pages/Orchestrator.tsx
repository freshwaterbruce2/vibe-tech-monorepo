import PageLayout from "@/components/layout/PageLayout";
import { useAgentLoop } from "./nova-hands/useAgentLoop";

// Import modular sub-components
import { DisplayViewport } from "./orchestrator/components/DisplayViewport";
import { HistoryLog } from "./orchestrator/components/HistoryLog";
import { ControlConsole } from "./orchestrator/components/ControlConsole";
import { StatusPanel } from "./orchestrator/components/StatusPanel";
import { ConsentGate } from "./orchestrator/components/ConsentGate";

const Orchestrator = () => {
	const {
		goal,
		setGoal,
		isLoopRunning,
		isAutoMode,
		setIsAutoMode,
		loopStatus,
		currentScreenshot,
		focusedWindow,
		currentThought,
		nextAction,
		history,
		error,
		hoverCoords,
		startAgentLoop,
		stopAgentLoop,
		handleApproveAction,
		handleRejectAction,
		handleRefreshScreenshot,
		handleImageMouseMove,
		handleImageMouseLeave,
	} = useAgentLoop();

	return (
		<PageLayout
			title="Nova Hands"
			description="OS-level desktop automation loop. Direct mouse and keyboard control backed by Gemini."
		>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Screen View */}
				<div className="lg:col-span-2 space-y-6">
					<DisplayViewport
						currentScreenshot={currentScreenshot}
						nextAction={nextAction}
						hoverCoords={hoverCoords}
						handleImageMouseMove={handleImageMouseMove}
						handleImageMouseLeave={handleImageMouseLeave}
						handleRefreshScreenshot={() => { void handleRefreshScreenshot(); }}
					/>

					<HistoryLog history={history} />
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<ControlConsole
						goal={goal}
						setGoal={setGoal}
						isLoopRunning={isLoopRunning}
						isAutoMode={isAutoMode}
						setIsAutoMode={setIsAutoMode}
						startAgentLoop={() => { void startAgentLoop(); }}
						stopAgentLoop={() => { void stopAgentLoop(); }}
					/>

					<StatusPanel
						loopStatus={loopStatus}
						focusedWindow={focusedWindow}
						error={error}
					/>

					{loopStatus === "awaiting_consent" && nextAction && (
						<ConsentGate
							nextAction={nextAction}
							currentThought={currentThought}
							handleRejectAction={handleRejectAction}
							handleApproveAction={(action) => { void handleApproveAction(action); }}
						/>
					)}
				</div>
			</div>
		</PageLayout>
	);
};

export default Orchestrator;
