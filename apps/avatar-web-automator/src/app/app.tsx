import { useState } from 'react';
import { VideoProject, CustomAvatar } from './types';
import HubTab from './components/HubTab';
import AvatarLabTab from './components/AvatarLabTab';
import ScriptwriterTab from './components/ScriptwriterTab';
import SeoMetadataTab from './components/SeoMetadataTab';
import PlannerTab from './components/PlannerTab';
import { Home, Smile, Edit3, Search, Calendar, Star, Info } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState(0);

  // Initialize state directly from local storage to avoid useEffect setState cascades
  const [videoProjects, setVideoProjects] = useState<VideoProject[]>(() => {
    const stored = localStorage.getItem('AUTOMATOR_PROJECTS');
    if (stored) {
      return JSON.parse(stored) as VideoProject[];
    }
    // Seed default projects
    const seed = [
      {
        id: 101,
        title: 'Unlocking Infinite Wealth: Secrets of Warren Buffett',
        niche: 'Crypto/Wealth',
        tone: 'Explanatory',
        scriptText: 'Warren Buffett is widely regarded as one of the most successful investors in history. But what are the underlying principles that guided his decisions? In this video, we deep dive into value investing, compound interest, and emotional temperament.',
        description: 'Explore the investment strategies of Berkshire Hathaway chairman Warren Buffett. Perfect for beginner and advanced finance enthusiasts looking to scale their investment portfolios.',
        tags: 'Warren Buffett, value investing, finance, stock market, wealth secrets, how to invest',
        thumbnailPrompt: 'Close up portrait of a seasoned wealth mentor with neon dollar graphic charts overlays in the background, sharp 3D render',
        status: 'SCRIPTED' as const,
        scheduledTimeMillis: 0,
        createdAt: Date.now() - 86400000,
      },
    ];
    localStorage.setItem('AUTOMATOR_PROJECTS', JSON.stringify(seed));
    return seed;
  });

  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>(() => {
    const stored = localStorage.getItem('AUTOMATOR_AVATARS');
    if (stored) {
      return JSON.parse(stored) as CustomAvatar[];
    }
    // Seed default custom avatar presets
    const seed = [
      {
        id: 201,
        name: 'Quantum Host',
        baseStyle: 'TECH_GURU',
        primaryColor: '#00E5FF',
        accentColor: '#FF2A85',
        bgColor: '#141929',
        frameStyle: 'NEON_RING',
        accessory: 'HEADPHONES',
        aiPrompt: 'AI Avatar portrait: Quantum Host, style: TECH_GURU, frames: NEON_RING, primary accent: #00E5FF, accessory: HEADPHONES',
        createdAt: Date.now() - 172800000,
      },
      {
        id: 202,
        name: 'Aura Guide',
        baseStyle: 'ZEN_COACH',
        primaryColor: '#00E676',
        accentColor: '#FFD700',
        bgColor: '#0C101B',
        frameStyle: 'CIRCULAR',
        accessory: 'HALO',
        aiPrompt: 'AI Avatar portrait: Aura Guide, style: ZEN_COACH, frames: CIRCULAR, primary accent: #00E676, accessory: HALO',
        createdAt: Date.now() - 86400000,
      },
    ];
    localStorage.setItem('AUTOMATOR_AVATARS', JSON.stringify(seed));
    return seed;
  });

  const [readyPlayerMeModelId, setReadyPlayerMeModelId] = useState<string>(() => {
    return localStorage.getItem('AUTOMATOR_MODEL_ID') ?? 'Astronaut';
  });

  // Project persistence helpers
  const handleAddProject = (project: Omit<VideoProject, 'id' | 'createdAt'>) => {
    const newProject: VideoProject = {
      ...project,
      id: Date.now(),
      createdAt: Date.now(),
    };
    const updated = [newProject, ...videoProjects];
    setVideoProjects(updated);
    localStorage.setItem('AUTOMATOR_PROJECTS', JSON.stringify(updated));
  };

  const handleUpdateProjectStatus = (project: VideoProject, status: VideoProject['status'], time: number) => {
    const updated = videoProjects.map(p => {
      if (p.id === project.id) {
        return { ...p, status, scheduledTimeMillis: time };
      }
      return p;
    });
    setVideoProjects(updated);
    localStorage.setItem('AUTOMATOR_PROJECTS', JSON.stringify(updated));
  };

  const handleDeleteProject = (id: number) => {
    const updated = videoProjects.filter(p => p.id !== id);
    setVideoProjects(updated);
    localStorage.setItem('AUTOMATOR_PROJECTS', JSON.stringify(updated));
  };

  // Avatar persistence helpers
  const handleSaveAvatar = (avatar: Omit<CustomAvatar, 'id' | 'createdAt'>) => {
    const newAvatar: CustomAvatar = {
      ...avatar,
      id: Date.now(),
      createdAt: Date.now(),
    };
    const updated = [newAvatar, ...customAvatars];
    setCustomAvatars(updated);
    localStorage.setItem('AUTOMATOR_AVATARS', JSON.stringify(updated));
  };

  const handleDeleteAvatar = (id: number) => {
    const updated = customAvatars.filter(a => a.id !== id);
    setCustomAvatars(updated);
    localStorage.setItem('AUTOMATOR_AVATARS', JSON.stringify(updated));
  };

  const handleSaveRpmModelId = (url: string) => {
    setReadyPlayerMeModelId(url);
    localStorage.setItem('AUTOMATOR_MODEL_ID', url);
  };

  // Alert security popup
  const triggerSecurityAlert = () => {
    alert(
      'Security Warning: Keep your Gemini API keys secure. Browser environments run client-side; make sure to restrict key accesses in the Google Cloud Console.'
    );
  };

  // Tab router
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <HubTab projects={videoProjects} avatars={customAvatars} onTabChange={setActiveTab} />;
      case 1:
        return (
          <AvatarLabTab
            avatars={customAvatars}
            onSaveAvatar={handleSaveAvatar}
            onDeleteAvatar={handleDeleteAvatar}
            readyPlayerMeModelId={readyPlayerMeModelId}
            onSaveRpmModelId={handleSaveRpmModelId}
          />
        );
      case 2:
        return <ScriptwriterTab onAddProject={handleAddProject} />;
      case 3:
        return <SeoMetadataTab projects={videoProjects} />;
      case 4:
        return (
          <PlannerTab
            projects={videoProjects}
            onUpdateProjectStatus={handleUpdateProjectStatus}
            onDeleteProject={handleDeleteProject}
          />
        );
      default:
        return <HubTab projects={videoProjects} avatars={customAvatars} onTabChange={setActiveTab} />;
    }
  };

  const menuItems = [
    { label: 'Hub', icon: Home },
    { label: 'Avatar Lab', icon: Smile },
    { label: 'Scriptwriter', icon: Edit3 },
    { label: 'SEO Tool', icon: Search },
    { label: 'Planner', icon: Calendar },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-space-slate text-foreground">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-space-slate/95 backdrop-blur border-b border-white/5 py-3.5 px-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 mx-auto md:mx-0">
          <Star className="text-pulsar-aqua fill-pulsar-aqua/20" size={20} />
          <h1 className="font-extrabold text-white text-sm tracking-wider uppercase">
            AI Avatar & YT Automator
          </h1>
        </div>
        <button
          onClick={triggerSecurityAlert}
          className="hidden md:flex text-pulsar-aqua hover:bg-pulsar-aqua/10 p-2 rounded-full transition-colors"
          title="Security Information"
        >
          <Info size={18} />
        </button>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 pb-24">
        {renderTabContent()}
      </main>

      {/* Responsive Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-nebula-dark-card border-t border-white/5 shadow-2xl py-2 px-2 flex justify-around items-center">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isSelected = activeTab === idx;
          return (
            <button
              key={item.label}
              onClick={() => setActiveTab(idx)}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all"
            >
              <div
                className={`p-1.5 rounded-lg mb-1 transition-all ${
                  isSelected ? 'bg-pulsar-aqua/10 text-pulsar-aqua scale-105' : 'text-soft-gray hover:text-white'
                }`}
              >
                <Icon size={20} />
              </div>
              <span
                className={`text-[9px] font-medium tracking-wide transition-colors ${
                  isSelected ? 'text-pulsar-aqua font-bold' : 'text-soft-gray'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
