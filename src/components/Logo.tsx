import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  light?: boolean;
}

export const Logo = ({ className = "", size = 40, light = false }: LogoProps) => {
  const primaryColor = light ? "#FFFFFF" : "#1e3a8a";
  const secondaryColor = "#3b82f6";

  return (
    <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="eagleGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={light ? "#F1F5F9" : "#3b82f6"} />
            </linearGradient>
          </defs>
          
          {/* Eagle / 'e' Shape - stylized as a 'D' for Diplomatic but keeping the eagle feel */}
          <path 
            d="M80 50 C 80 20, 30 20, 30 50 C 30 80, 80 80, 80 50 L 50 50" 
            stroke="url(#eagleGradient)" 
            strokeWidth="14" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Wing Feathers on the top left */}
          <path d="M35 35 C 25 25, 10 25, 5 30" stroke="url(#eagleGradient)" strokeWidth="8" strokeLinecap="round" />
          <path d="M32 45 C 22 35, 7 35, 2 40" stroke="url(#eagleGradient)" strokeWidth="8" strokeLinecap="round" />
          <path d="M40 25 C 30 15, 15 15, 10 20" stroke="url(#eagleGradient)" strokeWidth="8" strokeLinecap="round" />
          
          {/* Road Element at the bottom right */}
          <g transform="translate(55, 82)">
            <rect width="40" height="12" rx="2" fill={secondaryColor} />
            <rect x="6" y="5" width="8" height="2" fill="white" opacity="0.9" />
            <rect x="26" y="5" width="8" height="2" fill="white" opacity="0.9" />
          </g>
        </svg>
      </div>
      
      <div className="flex flex-col justify-center">
        <div className={`flex items-baseline gap-1 leading-none`}>
          <span className={`text-sm sm:text-base md:text-xl font-black tracking-tighter uppercase ${light ? "text-white" : "text-[#1e3a8a]"}`}>
            Diplomatic
          </span>
          <span className={`text-sm sm:text-base md:text-xl font-black tracking-tighter uppercase flex items-baseline ${light ? "text-white" : "text-[#1e3a8a]"}`}>
            <span className="text-[#3b82f6]">X</span>press
          </span>
        </div>
        <div className={`text-[8px] md:text-[10px] font-bold tracking-[0.3em] uppercase mt-0.5 leading-none ${light ? "text-white/80" : "text-[#1e3a8a]/80"}`}>
          Logistics
        </div>
      </div>
    </div>
  );
};
