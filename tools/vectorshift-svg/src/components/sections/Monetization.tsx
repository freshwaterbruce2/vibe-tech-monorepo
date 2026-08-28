import { Zap, Check } from 'lucide-react';

export function Monetization() {
  const plans = [
    {
      name: "Strategy A / Freemium",
      price: "$0",
      period: "Forever",
      desc: "Low-barrier user acquisition funnel",
      features: [
        "Unlimited web previews",
        "Export limited to PNG (Rasterized)",
        "Watermarked SVG exports",
        "Max file size: 2MB"
      ],
      cta: "Deploy Funnel",
      popular: false
    },
    {
      name: "Strategy B / Subscription",
      price: "$19.99",
      period: "/ month",
      desc: "Unlimited exports and high-speed priority",
      features: [
        "Unlimited vector exports (SVG, EPS, PDF)",
        "Fully commercial rights",
        "Priority processing queues",
        "Batch process 10 at a time"
      ],
      cta: "Activate Tier",
      popular: true
    },
    {
      name: "Strategy C / API Credits",
      price: "$0.02",
      period: "/ image",
      desc: "Wholesale enterprise integration for B2B",
      features: [
        "Pay-as-you-go credit system",
        "Volume discounts (>10k/mo)",
        "99.9% Uptime SLA",
        "Dedicated technical support"
      ],
      cta: "Generate API Keys",
      popular: false
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end border-b border-[#333] pb-6">
        <div className="flex flex-col">
          <span className="text-[#CCFF00] font-mono text-xs tracking-widest mb-2 uppercase">[ Revenue Streams ]</span>
          <h2 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter italic">Monetization <span className="text-[#CCFF00]">Strategy</span></h2>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div key={i} className={`bg-neutral-900 border p-8 flex flex-col transition-colors group ${plan.popular ? 'border-[#CCFF00]' : 'border-[#333] hover:border-neutral-500'}`}>
            {plan.popular && (
              <span className="text-[#0A0A0A] bg-[#CCFF00] px-3 py-1 font-black uppercase tracking-widest text-[10px] self-start mb-4">
                Primary Driver
              </span>
            )}

            {!plan.popular && (
              <div className="h-6 mb-4"></div>
            )}

            <span className="block text-[10px] uppercase font-mono tracking-widest text-[#CCFF00] mb-2">{plan.name}</span>
            <div className="mb-4">
              <span className="text-3xl font-black italic uppercase text-[#F0F0F0] mr-2">{plan.price}</span>
              <span className="text-xs font-bold uppercase text-neutral-500">{plan.period}</span>
            </div>
            <p className="text-sm text-neutral-400 mb-8 pb-8 border-b border-[#333]">{plan.desc}</p>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, j) => (
                <li key={j} className="flex items-start gap-4 text-sm text-[#F0F0F0]">
                  <span className="text-[#CCFF00] font-black italic mt-0.5">/</span>
                  <span className="uppercase font-bold tracking-tighter text-xs">{feature}</span>
                </li>
              ))}
            </ul>

            <button className={`w-full py-4 font-black uppercase text-xs tracking-widest transition-colors ${plan.popular ? 'bg-[#CCFF00] text-[#0A0A0A] hover:bg-[#AACC00]' : 'border border-[#CCFF00] text-[#CCFF00] hover:bg-[#CCFF00] hover:text-[#0A0A0A]'}`}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px] border border-[#333] p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCFF00] rounded-full mix-blend-multiply filter blur-3xl opacity-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

         <div className="w-16 h-16 border border-[#CCFF00] flex items-center justify-center text-[#CCFF00] shrink-0 bg-[#0A0A0A] relative z-10">
           <Zap className="w-8 h-8" />
         </div>

         <div className="relative z-10 w-full">
           <h4 className="bg-[#CCFF00] text-[#0A0A0A] inline-block px-2 py-1 text-[10px] font-black uppercase mb-2">Credit Expiration Policy</h4>
           <p className="text-sm text-neutral-400 max-w-2xl font-mono">A key revenue driver for the API strategy: purchased credits expire after 12 months, creating recurring revenue even for pay-as-you-go customers.</p>
         </div>
      </div>
    </div>
  );
}
