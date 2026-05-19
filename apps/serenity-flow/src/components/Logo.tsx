export default function Logo() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl font-serif tracking-tight text-white">
        Serenity <span className="italic font-light opacity-60">Flow</span>
      </h1>
      <div className="flex items-center gap-2 mt-1">
        <div className="h-[1px] w-4 bg-white/20" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Zen Companion</span>
        <div className="h-[1px] w-4 bg-white/20" />
      </div>
    </div>
  );
}
