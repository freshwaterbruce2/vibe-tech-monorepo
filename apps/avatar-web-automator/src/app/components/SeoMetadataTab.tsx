import React, { useState } from 'react';
import { VideoProject } from '../types';
import { copyToClipboard } from '../utils';
import { List, Share2 } from 'lucide-react';

interface SeoMetadataTabProps {
  projects: VideoProject[];
}

export function SeoMetadataTab({ projects }: SeoMetadataTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (projects.length === 0) {
    return (
      <div className="h-96 w-full flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <List className="text-soft-gray mx-auto" size={48} />
          <p className="text-soft-gray text-sm">
            Write and save a project script first to enable instant click SEO optimizations.
          </p>
        </div>
      </div>
    );
  }

  const activeProject = projects.find(p => p.id === selectedProjectId) ?? projects[0];

  const handleCopy = (text: string, label: string) => {
    void copyToClipboard(text, label);
    alert(`Copied ${label} to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* 1. SELECT WORKSPACE PROJECT */}
      <div className="space-y-2">
        <h3 className="text-pulsar-aqua text-xs font-bold tracking-widest uppercase px-1">
          Select Workspace Project
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
          {projects.map(proj => {
            const isSelected = activeProject.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`flex-shrink-0 w-40 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-starlet-pink border-transparent shadow-lg scale-[1.02]'
                    : 'bg-nebula-dark-card border-white/5 hover:border-white/10'
                }`}
              >
                <h4 className="text-white font-bold text-xs truncate mb-1">{proj.title}</h4>
                <span className="text-soft-gray text-[9px] block">Niche: {proj.niche}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SEO PACK DETAILS */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm">
          SEO PACK: {activeProject.title}
        </h3>

        {/* Title ideas */}
        <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-pulsar-aqua font-bold text-[10px] uppercase tracking-wider">Title Options</span>
            <button
              onClick={() => handleCopy(activeProject.title, 'SEO Title')}
              className="text-soft-gray hover:text-white p-1 hover:bg-white/5 rounded"
            >
              <Share2 size={16} />
            </button>
          </div>
          <p className="text-xs text-soft-gray leading-relaxed whitespace-pre-wrap">{activeProject.title}</p>
        </div>

        {/* Video Description */}
        <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-pulsar-aqua font-bold text-[10px] uppercase tracking-wider">YouTube Optimized Description</span>
            <button
              onClick={() => handleCopy(activeProject.description || 'N/A', 'SEO Description')}
              className="text-soft-gray hover:text-white p-1 hover:bg-white/5 rounded"
            >
              <Share2 size={16} />
            </button>
          </div>
          <p className="text-xs text-soft-gray leading-relaxed whitespace-pre-wrap">{activeProject.description || 'N/A'}</p>
        </div>

        {/* Tags */}
        <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-pulsar-aqua font-bold text-[10px] uppercase tracking-wider">Tags and Search Arrays</span>
            <button
              onClick={() => handleCopy(activeProject.tags || 'N/A', 'Search Tags')}
              className="text-soft-gray hover:text-white p-1 hover:bg-white/5 rounded"
            >
              <Share2 size={16} />
            </button>
          </div>
          <p className="text-xs text-soft-gray leading-relaxed whitespace-pre-wrap">{activeProject.tags || 'N/A'}</p>
        </div>

        {/* Thumbnail prompt */}
        <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-pulsar-aqua font-bold text-[10px] uppercase tracking-wider">Thumbnail Image Generator Prompt</span>
            <button
              onClick={() => handleCopy(activeProject.thumbnailPrompt || 'N/A', 'Thumbnail Prompt')}
              className="text-soft-gray hover:text-white p-1 hover:bg-white/5 rounded"
            >
              <Share2 size={16} />
            </button>
          </div>
          <p className="text-xs text-soft-gray leading-relaxed whitespace-pre-wrap">{activeProject.thumbnailPrompt || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default SeoMetadataTab;
