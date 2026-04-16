export function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#00E5FF]" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
          Vibe-Tech Command Center
        </h1>
        <p className="mt-4 text-slate-400">v{window.commandCenter?.version ?? '?'} — scaffolding online</p>
      </div>
    </div>
  );
}
