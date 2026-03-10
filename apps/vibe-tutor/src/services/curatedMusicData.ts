/**
 * Curated Music Library - Updated 2026-02-17
 * Radio stations for live streaming and category-based browsing.
 * Curated downloads removed — see Option B redesign.
 */

import type { RadioStation } from '../types';

/** Radio station category definitions for UI chips */
export const RADIO_CATEGORIES = [
  { id: 'all', name: 'All', icon: '📻' },
  { id: 'anime', name: 'Anime', icon: '🎌' },
  { id: 'edm', name: 'EDM', icon: '🎧' },
  { id: 'ambient', name: 'Ambient', icon: '🌊' },
  { id: 'classical', name: 'Classical', icon: '🎹' },
  { id: 'chill', name: 'Chill', icon: '☕' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'variety', name: 'Variety', icon: '🎵' },
] as const;

export const RADIO_STATIONS: RadioStation[] = [
  // ANIME / J-POP
  {
    id: 'radio-anime-1',
    name: 'LISTEN.moe - Anime Music',
    genre: 'Anime / J-Pop / Soundtracks',
    category: 'anime',
    streamUrl: 'https://listen.moe/stream',
    fallbackUrls: ['https://listen.moe/fallback', 'https://listen.moe/opus'],
    description: '24/7 anime soundtracks, openings, and J-pop',
  },

  // EDM / ELECTRONIC
  {
    id: 'radio-edm-1',
    name: 'SomaFM - Beat Blender',
    genre: 'House / Techno',
    category: 'edm',
    streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/beatblender-128-mp3',
      'https://ice4.somafm.com/beatblender-128-mp3',
    ],
    description: 'Deep house, techno, and progressive beats',
  },
  {
    id: 'radio-edm-2',
    name: 'SomaFM - DEF CON Radio',
    genre: 'Electronic / IDM',
    category: 'edm',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/defcon-128-mp3',
      'https://ice4.somafm.com/defcon-128-mp3',
    ],
    description: 'Electronic and IDM beats',
  },

  // AMBIENT
  {
    id: 'radio-ambient-1',
    name: 'SomaFM - Drone Zone',
    genre: 'Ambient / Drone',
    category: 'ambient',
    streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/dronezone-128-mp3',
      'https://ice4.somafm.com/dronezone-128-mp3',
    ],
    description: 'Atmospheric ambient for deep focus',
  },
  {
    id: 'radio-ambient-2',
    name: 'SomaFM - Space Station',
    genre: 'Space / Ambient',
    category: 'ambient',
    streamUrl: 'https://ice1.somafm.com/spacestation-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/spacestation-128-mp3',
      'https://ice4.somafm.com/spacestation-128-mp3',
    ],
    description: 'Sonic explorations beyond atmosphere',
  },

  // CLASSICAL
  {
    id: 'radio-classical-1',
    name: 'WQXR Classical (New York)',
    genre: 'Classical / Orchestra',
    category: 'classical',
    streamUrl: 'https://stream.wqxr.org/wqxr',
    fallbackUrls: ['https://stream.wqxr.org/wqxr-web'],
    description: "New York's premier classical station",
  },

  // CHILL / LOFI
  {
    id: 'radio-chill-1',
    name: 'SomaFM - Groove Salad',
    genre: 'Chill / Ambient Beats',
    category: 'chill',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/groovesalad-128-mp3',
      'https://ice4.somafm.com/groovesalad-128-mp3',
    ],
    description: 'Chill grooves and ambient beats for studying',
  },
  {
    id: 'radio-chill-2',
    name: 'SomaFM - Cliq Hop',
    genre: 'Trip-Hop / IDM',
    category: 'chill',
    streamUrl: 'https://ice1.somafm.com/cliqhop-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/cliqhop-128-mp3',
      'https://ice4.somafm.com/cliqhop-128-mp3',
    ],
    description: 'Abstract beats and glitch hop',
  },

  // GAMING
  {
    id: 'radio-gaming-1',
    name: 'SomaFM - Sonic Universe',
    genre: 'Gaming / Sci-Fi',
    category: 'gaming',
    streamUrl: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/sonicuniverse-128-mp3',
      'https://ice4.somafm.com/sonicuniverse-128-mp3',
    ],
    description: 'Sci-fi and space game soundtracks',
  },

  // VARIETY
  {
    id: 'radio-variety-1',
    name: 'SomaFM - Indie Pop Rocks',
    genre: 'Indie / Alternative',
    category: 'variety',
    streamUrl: 'https://ice1.somafm.com/indiepop-128-mp3',
    fallbackUrls: [
      'https://ice2.somafm.com/indiepop-128-mp3',
      'https://ice4.somafm.com/indiepop-128-mp3',
    ],
    description: 'Indie pop and rock from the 80s to today',
  },
  {
    id: 'radio-variety-2',
    name: 'SomaFM - Underground 80s',
    genre: 'Synth / New Wave',
    category: 'variety',
    streamUrl: 'https://ice1.somafm.com/u80s-128-mp3',
    fallbackUrls: ['https://ice2.somafm.com/u80s-128-mp3', 'https://ice4.somafm.com/u80s-128-mp3'],
    description: 'Alternative 80s synth and new wave',
  },
];
