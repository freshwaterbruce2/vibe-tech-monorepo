import React, { useEffect, useState } from 'react';

interface AvatarCanvasProps {
  baseStyle: string;
  primaryColorHex: string;
  accentColorHex: string;
  bgColorHex: string;
  frameStyle: string;
  accessoryType: string;
  visemeValue?: number;
  className?: string;
}

export const AvatarCanvas = ({
  baseStyle,
  primaryColorHex,
  accentColorHex,
  bgColorHex,
  frameStyle,
  accessoryType,
  visemeValue = 0,
  className = '',
}: AvatarCanvasProps) => {

  const [blink, setBlink] = useState(false);

  // Simple eye blink loop
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Determine mouth path based on viseme index (0-7)
  // 0: Neutral, 1: A, 2: M, 3: O, 4: T, 5: E, 6: W, 7: F
  const getMouthPath = () => {
    switch (visemeValue) {
      case 1: // A - Wide open circle
        return <ellipse cx="100" cy="115" rx="14" ry="10" fill="#2d0b1e" stroke={accentColorHex} strokeWidth="2" />;
      case 2: // M - Closed line
        return <line x1="88" y1="115" x2="112" y2="115" stroke={accentColorHex} strokeWidth="3.5" strokeLinecap="round" />;
      case 3: // O - Tall round oval
        return <ellipse cx="100" cy="115" rx="10" ry="14" fill="#2d0b1e" stroke={accentColorHex} strokeWidth="2.5" />;
      case 4: // T - Semi-open wide flat line
        return (
          <>
            <path d="M 88 113 Q 100 118 112 113" stroke={accentColorHex} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <line x1="92" y1="112" x2="108" y2="112" stroke="#ffffff" strokeWidth="1.5" />
          </>
        );
      case 5: // E - Wide smile/grin
        return <path d="M 86 112 Q 100 124 114 112 Z" fill="#2d0b1e" stroke={accentColorHex} strokeWidth="2" />;
      case 6: // W - Small tight circle
        return <circle cx="100" cy="115" r="6" fill="#2d0b1e" stroke={accentColorHex} strokeWidth="3" />;
      case 7: // F - Closed line with slight teeth showing below lip
        return (
          <>
            <line x1="88" y1="114" x2="112" y2="114" stroke={accentColorHex} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 94 114 L 94 117 L 98 117 L 98 114 M 102 114 L 102 117 L 106 117 L 106 114" fill="#ffffff" />
          </>
        );
      case 0: // Neutral / Default
      default:
        return <path d="M 90 115 Q 100 117 110 115" stroke={accentColorHex} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    }
  };

  // Render accessories
  const renderAccessory = () => {
    switch (accessoryType) {
      case 'GLASSES':
        return (
          <g id="accessory-glasses">
            {/* Left lens */}
            <circle cx="82" cy="95" r="13" fill="none" stroke={primaryColorHex} strokeWidth="2.5" />
            {/* Right lens */}
            <circle cx="118" cy="95" r="13" fill="none" stroke={primaryColorHex} strokeWidth="2.5" />
            {/* Bridge */}
            <path d="M 95 95 Q 100 93 105 95" fill="none" stroke={primaryColorHex} strokeWidth="2.5" />
            {/* Sides */}
            <path d="M 69 95 L 58 92" fill="none" stroke={primaryColorHex} strokeWidth="2" />
            <path d="M 131 95 L 142 92" fill="none" stroke={primaryColorHex} strokeWidth="2" />
          </g>
        );
      case 'HEADPHONES':
        return (
          <g id="accessory-headphones">
            {/* Arch */}
            <path d="M 64 96 A 40 40 0 0 1 136 96" fill="none" stroke={accentColorHex} strokeWidth="4.5" />
            {/* Left ear */}
            <rect x="56" y="84" width="10" height="24" rx="5" fill={primaryColorHex} />
            <circle cx="61" cy="96" r="3" fill="#ffffff" />
            {/* Right ear */}
            <rect x="134" y="84" width="10" height="24" rx="5" fill={primaryColorHex} />
            <circle cx="139" cy="96" r="3" fill="#ffffff" />
          </g>
        );
      case 'MICROPHONE':
        return (
          <g id="accessory-microphone">
            {/* Mic boom */}
            <path d="M 142 120 Q 120 128 114 121" fill="none" stroke={accentColorHex} strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="112" cy="120" rx="4.5" ry="5.5" fill={primaryColorHex} />
          </g>
        );
      case 'HALO':
        return (
          <g id="accessory-halo">
            <ellipse cx="100" cy="46" rx="28" ry="6" fill="none" stroke={accentColorHex} strokeWidth="3" opacity="0.8" />
            {/* Glow */}
            <ellipse cx="100" cy="46" rx="30" ry="7" fill="none" stroke={accentColorHex} strokeWidth="1" opacity="0.3" />
          </g>
        );
      case 'NONE':
      default:
        return null;
    }
  };

  // Render Hair according to baseStyle
  const renderHair = () => {
    switch (baseStyle) {
      case 'TECH_GURU': // Spiky cyber hair
        return (
          <path
            d="M 60 78 L 62 66 L 70 70 L 74 58 L 84 64 L 92 50 L 102 54 L 112 48 L 120 58 L 128 54 L 132 66 L 140 76 L 142 84 H 136 Q 138 72 128 72 Q 122 72 118 68 Q 110 74 100 70 Q 90 74 82 68 Q 78 72 72 72 Q 62 72 64 84 Z"
            fill={primaryColorHex}
          />
        );
      case 'COSMIC_GAMER': // Cyber helmet or spiky bangs with gradient glow
        return (
          <g>
            <path d="M 62 78 Q 100 40 138 78 Q 142 90 140 94 Q 132 94 134 82 Q 100 68 66 82 Q 68 94 60 94 Q 58 90 62 78 Z" fill={primaryColorHex} />
            <path d="M 80 72 L 100 60 L 120 72 Q 100 76 80 72 Z" fill={accentColorHex} opacity="0.8" />
          </g>
        );
      case 'WEALTH_MENTOR': // Sleek formal parted hair
        return (
          <path d="M 63 80 Q 76 60 100 62 Q 126 60 137 80 C 140 70 136 56 120 54 Q 100 52 80 54 C 64 56 60 70 63 80 Z" fill={primaryColorHex} />
        );
      case 'ZEN_COACH': // Calm smooth top-knot or long hair
        return (
          <g>
            {/* Top knot */}
            <circle cx="100" cy="50" r="12" fill={primaryColorHex} />
            {/* Main hair */}
            <path d="M 62 82 Q 100 56 138 82 C 142 94 135 110 135 110 Q 128 92 124 90 Q 100 84 76 90 Q 72 92 65 110 C 65 110 58 94 62 82 Z" fill={primaryColorHex} />
          </g>
        );
      default:
        return null;
    }
  };

  // Render Frame Borders according to frameStyle
  const renderFrameBorder = () => {
    switch (frameStyle) {
      case 'CIRCULAR':
        return <circle cx="100" cy="100" r="96" fill="none" stroke={primaryColorHex} strokeWidth="3" opacity="0.5" />;
      case 'HEXAGON':
        return (
          <polygon
            points="100,4 184,52 184,148 100,196 16,148 16,52"
            fill="none"
            stroke={primaryColorHex}
            strokeWidth="3.5"
            strokeLinejoin="round"
            opacity="0.6"
          />
        );
      case 'SHARP_BOX':
        return <rect x="6" y="6" width="188" height="188" rx="10" fill="none" stroke={primaryColorHex} strokeWidth="4" opacity="0.6" />;
      case 'NEON_RING':
      default:
        return (
          <g>
            {/* Inner ring */}
            <circle cx="100" cy="100" r="95" fill="none" stroke={primaryColorHex} strokeWidth="2.5" />
            {/* Outer neon glow */}
            <circle cx="100" cy="100" r="97" fill="none" stroke={accentColorHex} strokeWidth="1" opacity="0.6" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-full h-full select-none ${className}`}
      style={{ backgroundColor: bgColorHex }}
    >
      {/* Background Frame Elements */}
      {renderFrameBorder()}

      {/* Shadows/Glow effects */}
      <circle cx="100" cy="110" r="60" fill="url(#avatar-radial-glow)" opacity="0.15" />

      {/* Body & Neck */}
      <g id="avatar-body">
        {/* Shoulders */}
        <path d="M 46 165 C 56 142 74 136 100 136 C 126 136 144 142 154 165 C 160 180 156 200 156 200 L 44 200 C 44 200 40 180 46 165 Z" fill="#1b233a" stroke="#25304f" strokeWidth="2" />
        {/* Shirt Collar detail */}
        <path d="M 82 138 L 100 154 L 118 138" fill="none" stroke={primaryColorHex} strokeWidth="2" />
        {/* Neck */}
        <rect x="88" y="118" width="24" height="24" rx="2" fill="#e0a98c" />
        <path d="M 88 128 Q 100 134 112 128" fill="none" stroke="#bd866a" strokeWidth="1.5" />
      </g>

      {/* Face & Head */}
      <g id="avatar-face">
        {/* Ears */}
        <circle cx="64" cy="98" r="9" fill="#e0a98c" />
        <circle cx="136" cy="98" r="9" fill="#e0a98c" />
        {/* Head */}
        <circle cx="100" cy="98" r="38" fill="#f2be9b" />
        {/* Cheeks blush */}
        <circle cx="76" cy="104" r="5" fill="#ff7f7f" opacity="0.3" />
        <circle cx="124" cy="104" r="5" fill="#ff7f7f" opacity="0.3" />
        {/* Nose */}
        <path d="M 98 100 Q 100 106 102 100" fill="none" stroke="#bd866a" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Eyes */}
      <g id="avatar-eyes">
        {blink ? (
          <>
            {/* Blinking eyes - lines */}
            <line x1="74" y1="94" x2="86" y2="94" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            <line x1="114" y1="94" x2="126" y2="94" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Open eyes */}
            <ellipse cx="80" cy="94" rx="5" ry="6" fill="#1f2937" />
            <circle cx="79" cy="92" r="1.8" fill="#ffffff" />
            <ellipse cx="120" cy="94" rx="5" ry="6" fill="#1f2937" />
            <circle cx="119" cy="92" r="1.8" fill="#ffffff" />
            {/* Eyebrows */}
            <path d="M 72 85 Q 80 81 87 86" fill="none" stroke={primaryColorHex} strokeWidth="2" strokeLinecap="round" />
            <path d="M 113 86 Q 120 81 128 85" fill="none" stroke={primaryColorHex} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Hair */}
      {renderHair()}

      {/* Mouth */}
      {getMouthPath()}

      {/* Accessories */}
      {renderAccessory()}

      {/* Definitions for Gradients */}
      <defs>
        <radialGradient id="avatar-radial-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColorHex} />
          <stop offset="100%" stopColor={bgColorHex} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default AvatarCanvas;
