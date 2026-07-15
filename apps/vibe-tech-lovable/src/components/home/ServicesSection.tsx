import { useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle,
  Cpu,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  Workflow,
} from 'lucide-react';

interface Service {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  features: string[];
  accent: string;
  link: string;
}

const services: Service[] = [
  {
    icon: Cpu,
    title: 'Micro-SaaS Launches',
    description:
      'Productized web apps with landing pages, auth, billing, analytics, and deployment paths wired from the start.',
    features: [
      'Generated SaaS foundations',
      'Stripe Checkout readiness',
      'Vercel and Railway deployment shapes',
      'Reusable app-factory patterns',
    ],
    accent: '#38bdf8',
    link: '/services#micro-saas',
  },
  {
    icon: GraduationCap,
    title: 'Education Platforms',
    description:
      'Tutor-first learning products, student dashboards, practice games, Android delivery, and AI-supported study workflows.',
    features: [
      'Vibe Tutor project home',
      'Learning dashboards',
      'Game-based practice',
      'Mobile delivery paths',
    ],
    accent: '#2dd4bf',
    link: '/portfolio/project-7',
  },
  {
    icon: BrainCircuit,
    title: 'AI Business Tools',
    description:
      'Focused AI workflows that review proposals, rewrite sales language, generate content, and reduce manual review time.',
    features: [
      'Proposal scoring and rewrite guidance',
      'AI usage metering patterns',
      'Operator dashboards',
      'Actionable review outputs',
    ],
    accent: '#a78bfa',
    link: '/services#ai-tools',
  },
  {
    icon: HeartPulse,
    title: 'Clinic Operations',
    description:
      'Practical healthcare operations software for reminders, reschedules, no-show visibility, and repeatable patient workflows.',
    features: [
      'Appointment reminder sweeps',
      'Magic reschedule links',
      'No-show analytics',
      'Tenant-aware clinic data',
    ],
    accent: '#34d399',
    link: '/services#clinic-operations',
  },
  {
    icon: Workflow,
    title: 'Business Automation',
    description:
      'Back-office tools for invoicing, client records, templates, tax rates, payment workflows, and operational reporting.',
    features: [
      'Invoice and payment flows',
      'Client and expense tracking',
      'Template-driven operations',
      'Protected dashboards',
    ],
    accent: '#67e8f9',
    link: '/services#business-automation',
  },
];

interface CircuitTraceProps {
  className: string;
  delay: number;
  reverse?: boolean;
  reduceMotion: boolean;
}

const CircuitTrace = ({ className, delay, reverse = false, reduceMotion }: CircuitTraceProps) => (
  <div
    className={`absolute h-px bg-gradient-to-r from-cyan-300/10 via-cyan-300/45 to-violet-400/20 ${className}`}
  >
    <span className={`absolute top-0 h-10 w-px bg-cyan-300/25 ${reverse ? 'left-0' : 'right-0'}`} />
    <span
      className={`absolute top-[-2px] h-[5px] w-[5px] border border-cyan-200/50 bg-[#07101e] ${
        reverse ? 'left-0' : 'right-0'
      }`}
    />
    <motion.span
      className="absolute top-[-1px] h-[3px] w-16 bg-gradient-to-r from-transparent via-cyan-200 to-transparent shadow-[0_0_10px_rgba(103,232,249,0.8)]"
      animate={reduceMotion ? undefined : { left: reverse ? ['100%', '-15%'] : ['-15%', '100%'] }}
      transition={{ duration: 4.8, delay, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

const ProcessorDivider = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const pins = [22, 50, 78];

  return (
    <div className="relative mx-auto mb-12 h-20 w-full max-w-md" aria-hidden="true">
      <div className="absolute left-0 right-[calc(50%+3rem)] top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-cyan-200/70">
        <motion.span
          className="absolute top-[-1px] h-[3px] w-12 bg-gradient-to-r from-transparent via-cyan-100 to-transparent shadow-[0_0_9px_rgba(103,232,249,0.75)]"
          animate={reduceMotion ? undefined : { left: ['-15%', '100%'] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div className="absolute left-[calc(50%+3rem)] right-0 top-1/2 h-px bg-gradient-to-r from-violet-300/70 via-violet-300/35 to-transparent">
        <motion.span
          className="absolute top-[-1px] h-[3px] w-12 bg-gradient-to-r from-transparent via-violet-100 to-transparent shadow-[0_0_9px_rgba(196,181,253,0.7)]"
          animate={reduceMotion ? undefined : { left: ['100%', '-15%'] }}
          transition={{ duration: 3.4, delay: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div className="absolute left-1/2 top-1/2 h-16 w-20 -translate-x-1/2 -translate-y-1/2 border border-cyan-200/60 bg-[#07101e] shadow-[0_0_24px_rgba(0,247,255,0.13)]">
        {pins.map((position) => (
          <span key={'side-' + position}>
            <span
              className="absolute -left-2.5 h-px w-2.5 bg-cyan-200/65"
              style={{ top: position + '%' }}
            />
            <span
              className="absolute -right-2.5 h-px w-2.5 bg-cyan-200/65"
              style={{ top: position + '%' }}
            />
          </span>
        ))}
        {pins.map((position) => (
          <span key={'vertical-' + position}>
            <span
              className="absolute -top-2.5 h-2.5 w-px bg-violet-200/55"
              style={{ left: position + '%' }}
            />
            <span
              className="absolute -bottom-2.5 h-2.5 w-px bg-violet-200/55"
              style={{ left: position + '%' }}
            />
          </span>
        ))}
        <motion.div
          className="absolute inset-2.5 border border-violet-300/45 bg-[linear-gradient(135deg,rgba(0,247,255,0.06),rgba(141,77,255,0.12))]"
          animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="absolute left-2 right-2 top-2 h-px bg-cyan-200/40" />
          <span className="absolute bottom-2 left-2 right-5 h-px bg-cyan-200/40" />
          <span className="absolute bottom-2 left-2 top-2 w-px bg-violet-200/35" />
          <span className="absolute bottom-2 right-2 top-4 w-px bg-violet-200/35" />
        </motion.div>
      </div>
    </div>
  );
};

const CircuitBackdrop = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const traces = [
    { className: 'left-0 top-[22%] w-[43%]', delay: 0 },
    { className: 'left-[5%] top-[39%] w-[38%]', delay: 1.4 },
    { className: 'left-0 top-[71%] w-[43%]', delay: 2.6 },
    { className: 'right-0 top-[27%] w-[43%]', delay: 0.7, reverse: true },
    { className: 'right-[4%] top-[53%] w-[39%]', delay: 2.1, reverse: true },
    { className: 'right-0 top-[76%] w-[43%]', delay: 3.2, reverse: true },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(82,138,172,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(82,138,172,0.12) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,247,255,0.11),transparent_52%)]" />
      {traces.map((trace) => (
        <CircuitTrace
          key={trace.className}
          className={trace.className}
          delay={trace.delay}
          reverse={trace.reverse}
          reduceMotion={reduceMotion}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050814]/45 via-transparent to-[#050814]/80" />
    </div>
  );
};

interface ServiceCardProps {
  service: Service;
  index: number;
  isActive: boolean;
  isHovered: boolean;
  onActivate: () => void;
  onHover: (hovered: boolean) => void;
}

const ServiceCard = ({
  service,
  index,
  isActive,
  isHovered,
  onActivate,
  onHover,
}: ServiceCardProps) => {
  const Icon = service.icon;
  const detailsId = 'service-details-' + index;

  return (
    <motion.div
      data-testid={`service-card-${index}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      className={'relative transition-all duration-300 ' + (isActive ? 'lg:col-span-2' : '')}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div
        className={
          'glass-card h-full border border-white/10 bg-[rgba(7,12,25,0.88)] p-6 transition-all duration-300 ' +
          (isHovered || isActive
            ? '-translate-y-1 border-cyan-300/40 shadow-[0_18px_60px_rgba(0,0,0,0.4)]'
            : 'hover:-translate-y-0.5 hover:border-white/20')
        }
      >
        <button
          type="button"
          className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          aria-expanded={isActive}
          aria-controls={detailsId}
          aria-label={service.title + '. ' + (isActive ? 'Open service page' : 'Show key features')}
          onClick={onActivate}
        >
          <div className="mb-6 flex items-center gap-4">
            <div
              className="relative grid h-12 w-12 place-items-center border border-white/15 bg-black/20"
              style={{ color: service.accent }}
            >
              <span className="absolute -left-1 top-2 h-4 w-px bg-current opacity-60" />
              <span className="absolute -right-1 bottom-2 h-4 w-px bg-current opacity-60" />
              <Icon className="h-6 w-6" strokeWidth={1.55} />
            </div>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">
              System 0{index + 1}
            </span>
          </div>
          <h3 className="mb-3 font-heading text-xl font-semibold text-slate-100">
            {service.title}
          </h3>
          <p className="mb-4 leading-relaxed text-slate-300">{service.description}</p>
        </button>

        <AnimatePresence initial={false}>
          {isActive && (
            <motion.div
              id={detailsId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="mt-4 overflow-hidden border-t border-white/10 pt-4"
            >
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-300">
                <CheckCircle className="h-4 w-4" strokeWidth={1.6} />
                Key Features
              </h4>
              <ul className="space-y-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-px w-3 bg-cyan-300/70" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-white/10 pt-4">
                <Link
                  to={service.link}
                  className="group inline-flex min-h-11 items-center gap-2 text-sm text-cyan-300 transition-colors hover:text-cyan-200"
                >
                  Learn More About {service.title}
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-5 flex items-center justify-between">
          <motion.div
            animate={{
              width: isHovered || isActive ? '58%' : '28%',
              opacity: isHovered || isActive ? 0.9 : 0.45,
            }}
            className="h-px"
            style={{ backgroundColor: service.accent }}
          />
          <motion.div animate={{ x: isHovered ? 4 : 0, opacity: isHovered ? 1 : 0.65 }}>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const ServicesSection = () => {
  const [activeService, setActiveService] = useState<number | null>(null);
  const [hoveredService, setHoveredService] = useState<number | null>(null);
  const navigate = useNavigate();
  const activateService = (index: number, link: string) => {
    if (activeService === index) {
      navigate(link);
      return;
    }
    setActiveService(index);
  };

  return (
    <section
      className="relative overflow-hidden border-y border-white/10 bg-[rgba(5,8,20,0.86)] px-4 py-16 shadow-[inset_0_1px_0_rgba(0,255,255,0.08),inset_0_-1px_0_rgba(185,51,255,0.08)] md:py-24"
      data-testid="services-section"
    >
      <CircuitBackdrop />
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="mb-5 inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300/80">
            <span className="h-px w-8 bg-cyan-300/60" />
            Product Systems
            <span className="h-px w-8 bg-cyan-300/60" />
          </div>
          <h2 className="mb-4 bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] bg-clip-text font-heading text-4xl font-bold text-transparent md:text-5xl">
            The Vibe-Tech Project Front Door
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-slate-300">
            A growing portfolio of education tools, productized apps, AI workflows, and operational
            software built from the same factory.
          </p>
        </motion.div>
        <ProcessorDivider />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {services.map((service, index) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={index}
              isActive={activeService === index}
              isHovered={hoveredService === index}
              onActivate={() => activateService(index, service.link)}
              onHover={(hovered) => setHoveredService(hovered ? index : null)}
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 text-center"
        >
          <p className="mb-6 text-slate-300">Ready to turn your ideas into reality?</p>
          <Link
            to="/contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-cyan-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            Get Started Today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
