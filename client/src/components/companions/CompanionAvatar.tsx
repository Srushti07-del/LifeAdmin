export interface CompanionAvatarProps {
  id: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export default function CompanionAvatar({
  id,
  size = 'md',
  animated = true,
  className = '',
}: CompanionAvatarProps) {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-28 h-28',
    xl: 'w-44 h-44',
  }[size];

  const animClass = animated ? 'animate-companion-breathe' : '';

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${sizeMap} ${className}`}>
      {id === 'aura' && <AuraIllustration animClass={animClass} />}
      {id === 'mossy' && <MossyIllustration animClass={animClass} />}
      {id === 'nori' && <NoriIllustration animClass={animClass} />}
      {id === 'zephyr' && <ZephyrIllustration animClass={animClass} />}
    </div>
  );
}

function AuraIllustration({ animClass }: { animClass: string }) {
  return (
    <svg viewBox="0 0 160 160" className={`w-full h-full drop-shadow-md ${animClass}`} fill="none">
      <defs>
        <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DDF1EF" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#35B8B2" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#087E83" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="auraBody" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="40%" stopColor="#35B8B2" />
          <stop offset="100%" stopColor="#075E63" />
        </radialGradient>
        <radialGradient id="auraGem" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        <filter id="auraShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#064B4F" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ambient Celestial Halo */}
      <circle cx="80" cy="80" r="70" fill="url(#auraGlow)" />

      {/* Floating Orbital Motes */}
      <circle cx="28" cy="50" r="4" fill="#FDE68A" opacity="0.8" className="animate-pulse" />
      <circle cx="132" cy="62" r="5" fill="#A7F3D0" opacity="0.7" />
      <circle cx="120" cy="115" r="3.5" fill="#FDE68A" opacity="0.6" />

      {/* 3D Clay Body Orb */}
      <circle cx="80" cy="82" r="48" fill="url(#auraBody)" filter="url(#auraShadow)" />

      {/* Surface Light Highlight */}
      <ellipse cx="64" cy="56" rx="20" ry="12" fill="#FFFFFF" opacity="0.32" transform="rotate(-25 64 56)" />

      {/* Forehead Star Gem */}
      <polygon points="80,42 85,52 96,54 88,62 90,73 80,67 70,73 72,62 64,54 75,52" fill="url(#auraGem)" />

      {/* Expressive Clay Eyes */}
      <ellipse cx="66" cy="82" rx="4.5" ry="6.5" fill="#042E31" />
      <circle cx="68" cy="80" r="1.8" fill="#FFFFFF" />
      <ellipse cx="94" cy="82" rx="4.5" ry="6.5" fill="#042E31" />
      <circle cx="96" cy="80" r="1.8" fill="#FFFFFF" />

      {/* Subtle Blush */}
      <ellipse cx="58" cy="91" rx="6" ry="3.5" fill="#F472B6" opacity="0.35" />
      <ellipse cx="102" cy="91" rx="6" ry="3.5" fill="#F472B6" opacity="0.35" />

      {/* Peaceful Smile */}
      <path d="M74 92 Q80 97 86 92" stroke="#042E31" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function MossyIllustration({ animClass }: { animClass: string }) {
  return (
    <svg viewBox="0 0 160 160" className={`w-full h-full drop-shadow-md ${animClass}`} fill="none">
      <defs>
        <radialGradient id="mossyBody" cx="36%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#064E3B" />
        </radialGradient>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BEF264" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* Soft Ground Shadow */}
      <ellipse cx="80" cy="135" rx="42" ry="9" fill="#064E3B" opacity="0.2" />

      {/* Sprout Leaves on Head */}
      <path d="M80 50 C70 30 50 35 55 52 C58 60 76 56 80 54" fill="url(#leafGrad)" />
      <path d="M80 52 C90 28 112 35 106 52 C102 60 84 56 80 54" fill="url(#leafGrad)" />
      <circle cx="80" cy="54" r="3" fill="#BEF264" />

      {/* Pear-shaped Clay Body */}
      <path
        d="M80 48 C115 48 126 90 122 112 C118 128 98 132 80 132 C62 132 42 128 38 112 C34 90 45 48 80 48 Z"
        fill="url(#mossyBody)"
      />

      {/* Soft Top Highlight */}
      <ellipse cx="66" cy="68" rx="16" ry="10" fill="#FFFFFF" opacity="0.28" transform="rotate(-15 66 68)" />

      {/* Gentle Little Eyes */}
      <ellipse cx="64" cy="88" rx="4" ry="5.5" fill="#022C22" />
      <circle cx="65.5" cy="86.5" r="1.5" fill="#FFFFFF" />
      <ellipse cx="96" cy="88" rx="4" ry="5.5" fill="#022C22" />
      <circle cx="97.5" cy="86.5" r="1.5" fill="#FFFFFF" />

      {/* Rosy Leaf-spirit Cheeks */}
      <ellipse cx="54" cy="98" rx="7" ry="4" fill="#FB7185" opacity="0.4" />
      <ellipse cx="106" cy="98" rx="7" ry="4" fill="#FB7185" opacity="0.4" />

      {/* Content Smile */}
      <path d="M73 99 Q80 106 87 99" stroke="#022C22" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function NoriIllustration({ animClass }: { animClass: string }) {
  return (
    <svg viewBox="0 0 160 160" className={`w-full h-full drop-shadow-md ${animClass}`} fill="none">
      <defs>
        <radialGradient id="noriBody" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="45%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>
        <radialGradient id="noriFin" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
      </defs>

      {/* Water ripple underneath */}
      <ellipse cx="80" cy="132" rx="44" ry="8" fill="#0284C7" opacity="0.18" />

      {/* Side Fins */}
      <path d="M36 86 C20 80 18 100 32 104 C40 106 42 94 36 86" fill="url(#noriFin)" />
      <path d="M124 86 C140 80 142 100 128 104 C120 106 118 94 124 86" fill="url(#noriFin)" />

      {/* Droplet Clay Form */}
      <path
        d="M80 34 C94 54 122 84 122 106 C122 126 103 134 80 134 C57 134 38 126 38 106 C38 84 66 54 80 34 Z"
        fill="url(#noriBody)"
      />

      {/* Light sheen on crest */}
      <ellipse cx="68" cy="62" rx="14" ry="8" fill="#FFFFFF" opacity="0.4" transform="rotate(-20 68 62)" />

      {/* Curious Big Eyes */}
      <ellipse cx="65" cy="94" rx="5" ry="7" fill="#082F49" />
      <circle cx="67" cy="92" r="2.2" fill="#FFFFFF" />
      <circle cx="64" cy="97" r="1.1" fill="#FFFFFF" />

      <ellipse cx="95" cy="94" rx="5" ry="7" fill="#082F49" />
      <circle cx="97" cy="92" r="2.2" fill="#FFFFFF" />
      <circle cx="94" cy="97" r="1.1" fill="#FFFFFF" />

      {/* Cheerful Mouth */}
      <path d="M74 105 Q80 112 86 105" stroke="#082F49" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function ZephyrIllustration({ animClass }: { animClass: string }) {
  return (
    <svg viewBox="0 0 160 160" className={`w-full h-full drop-shadow-md ${animClass}`} fill="none">
      <defs>
        <radialGradient id="zephyrBody" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#E0E7FF" />
          <stop offset="45%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#3730A3" />
        </radialGradient>
        <radialGradient id="cloudEar" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#818CF8" />
        </radialGradient>
      </defs>

      {/* Gentle Floating Shadow */}
      <ellipse cx="80" cy="136" rx="38" ry="7" fill="#312E81" opacity="0.18" />

      {/* Cloud Ears / Wings */}
      <circle cx="44" cy="66" r="18" fill="url(#cloudEar)" />
      <circle cx="116" cy="66" r="18" fill="url(#cloudEar)" />

      {/* Main Fluffy Cloud Body */}
      <circle cx="80" cy="88" r="44" fill="url(#zephyrBody)" />

      {/* Cloud Puff Highlights */}
      <ellipse cx="68" cy="68" rx="18" ry="11" fill="#FFFFFF" opacity="0.35" />

      {/* Dreamy Sleeping / Happy Eyes */}
      <path d="M58 88 Q65 94 72 88" stroke="#1E1B4B" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M88 88 Q95 94 102 88" stroke="#1E1B4B" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Pastel Cheeks */}
      <ellipse cx="54" cy="97" rx="6" ry="3.5" fill="#F472B6" opacity="0.45" />
      <ellipse cx="106" cy="97" rx="6" ry="3.5" fill="#F472B6" opacity="0.45" />

      {/* Tiny Whimsical Nose / Smile */}
      <circle cx="80" cy="93" r="2" fill="#F43F5E" />
      <path d="M76 98 Q80 102 84 98" stroke="#1E1B4B" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

