import React, { useEffect, useRef } from 'react';
import { VideoProject, CustomAvatar } from '../types';
import AvatarCanvas from './AvatarCanvas';
import { TrendingUp, Users, Eye, Percent, Tv, ChevronRight } from 'lucide-react';

interface HubTabProps {
  projects: VideoProject[];
  avatars: CustomAvatar[];
  onTabChange: (index: number) => void;
}

export function HubTab({ projects, avatars, onTabChange }: HubTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw animated analytics chart mimicking the Compose canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const draw = () => {
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Coordinate lines
      ctx.strokeStyle = 'rgba(144, 164, 174, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const y = h * (i / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw vector wave paths
      ctx.strokeStyle = '#00E5FF'; // PulsarAqua
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const points: [number, number][] = [];
      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        // Construct composite sinusoids representing peak analytics
        const angle1 = (i / steps) * Math.PI * 2.5 + offset;
        const angle2 = (i / steps) * Math.PI * 5 + offset * 1.5;
        const yBase = h * 0.5;
        const wave = Math.sin(angle1) * (h * 0.2) + Math.cos(angle2) * (h * 0.1);
        points.push([x, yBase + wave]);
      }

      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();

      // Shadow fill underneath wave
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = grad;
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Draw peaks indicator circle
      const peakX = w * 0.85;
      const index = Math.floor(steps * 0.85);
      if (points[index]) {
        const [, peakY] = points[index];
        ctx.fillStyle = '#FF2A85'; // StarletPink
        ctx.beginPath();
        ctx.arc(peakX, peakY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      offset += 0.015;
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const scheduledCount = projects.filter(p => p.status === 'SCHEDULED').length;

  return (
    <div className="space-y-6">
      {/* Welcome Header Card */}
      <div className="bg-nebula-dark-card border border-pulsar-aqua/20 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Channel Creator Hub</h2>
          <p className="text-soft-gray text-sm max-w-xl">
            Track analytics, coordinate scripts & visual AI anchors in one system.
          </p>
        </div>
        <button
          onClick={() => onTabChange(2)}
          className="self-start md:self-auto bg-gradient-to-r from-pulsar-aqua to-starlet-pink text-black p-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <Tv size={24} />
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="space-y-3">
        <h3 className="text-pulsar-aqua text-xs font-bold tracking-widest uppercase px-1">
          Channel Automation Analytics (Global)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subscriptions */}
          <div className="bg-nebula-dark-card border border-white/5 rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center text-soft-gray text-xs mb-2">
              <span>Subscribers</span>
              <Users size={16} />
            </div>
            <div className="text-2xl font-bold text-white">12,482</div>
            <div className="text-[10px] font-semibold text-emerald-cash mt-1">+24% this mo</div>
          </div>
          {/* Total Views */}
          <div className="bg-nebula-dark-card border border-white/5 rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center text-soft-gray text-xs mb-2">
              <span>Total Views</span>
              <Eye size={16} />
            </div>
            <div className="text-2xl font-bold text-white">381,902</div>
            <div className="text-[10px] font-semibold text-emerald-cash mt-1">+7.2K today</div>
          </div>
          {/* CTR */}
          <div className="bg-nebula-dark-card border border-white/5 rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center text-soft-gray text-xs mb-2">
              <span>Avg CTR</span>
              <Percent size={16} />
            </div>
            <div className="text-2xl font-bold text-white">9.4%</div>
            <div className="text-[10px] font-semibold text-pulsar-aqua mt-1">Optimized</div>
          </div>
          {/* Videos Active */}
          <div className="bg-nebula-dark-card border border-white/5 rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center text-soft-gray text-xs mb-2">
              <span>Videos Active</span>
              <TrendingUp size={16} />
            </div>
            <div className="text-2xl font-bold text-white">{projects.length}</div>
            <div className="text-[10px] font-semibold text-starlet-pink mt-1">{scheduledCount} Queue</div>
          </div>
        </div>
      </div>

      {/* Analytics Chart Canvas */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow-lg">
        <h4 className="text-white font-bold text-sm mb-4">Real-time Traffic Growth</h4>
        <div className="h-28 w-full relative">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
        <div className="flex justify-between text-[10px] text-soft-gray mt-2 px-1">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
          <span className="text-pulsar-aqua font-bold">Now (Peak)</span>
        </div>
      </div>

      {/* Generated AI Hosts Gallery */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow-lg">
        <h4 className="text-white font-bold text-sm mb-4">Generated AI Hosts ({avatars.length})</h4>
        {avatars.length === 0 ? (
          <div className="flex items-center gap-3 text-soft-gray text-sm py-4">
            <div className="p-3 bg-white/5 rounded-full">🤖</div>
            <p>
              No Custom AI Hosts created yet.{' '}
              <button onClick={() => onTabChange(1)} className="text-pulsar-aqua hover:underline font-semibold">
                Design your host in the Avatar Lab!
              </button>
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            {avatars.map(avatar => (
              <div key={avatar.id} className="flex flex-col items-center flex-shrink-0 text-center w-16">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-space-slate border border-white/10 flex-shrink-0">
                  <AvatarCanvas
                    baseStyle={avatar.baseStyle}
                    primaryColorHex={avatar.primaryColor}
                    accentColorHex={avatar.accentColor}
                    bgColorHex={avatar.bgColor}
                    frameStyle={avatar.frameStyle}
                    accessoryType={avatar.accessory}
                  />
                </div>
                <span className="text-[10px] font-bold text-white mt-2 truncate w-full px-1">
                  {avatar.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions list */}
      <div className="space-y-3">
        <h3 className="text-starlet-pink text-xs font-bold tracking-widest uppercase px-1">
          How to Automate your Channel
        </h3>
        <div className="space-y-3">
          {[
            {
              text: 'Select theme and design a custom AI Avatar as your profile anchor inside the Avatar Lab.',
              tab: 1,
            },
            {
              text: 'Input video topic and leverage Gemini to write detailed multi-stage automated scripts.',
              tab: 2,
            },
            {
              text: 'Copy SEO titles & tag blocks instantly to boost YouTube algorithm visibility.',
              tab: 3,
            },
            {
              text: 'Schedule written ideas into the video agenda queue database of the Planner.',
              tab: 4,
            },
          ].map((step, idx) => (
            <div
              key={idx}
              onClick={() => onTabChange(step.tab)}
              className="flex items-start gap-4 p-3 bg-nebula-dark-card/40 border border-white/5 rounded-xl hover:border-pulsar-aqua/20 cursor-pointer transition-all hover:translate-x-1"
            >
              <div className="w-6 h-6 rounded-full bg-pulsar-aqua/10 text-pulsar-aqua text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-soft-gray text-xs flex-1 pr-4">{step.text}</p>
              <ChevronRight size={14} className="text-soft-gray self-center" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HubTab;
