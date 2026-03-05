import React from 'react';

/**
 * ModuleHeader - Znovupoužitelná komponenta pro header modulů
 * Konzistentní vizuální styl napříč všemi moduly
 * 
 * Props:
 * - icon: Lucide ikona komponenta
 * - title: string - název modulu
 * - subtitle: string (volitelné) - popis nebo počet položek
 * - iconColor: string (výchozí 'text-cyan-400') - barva ikony
 * - iconStyle: object (volitelné) - inline styly pro ikonu (např. scale)
 * - actions: ReactNode (volitelné) - tlačítka vpravo
 */
const ModuleHeader = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  iconColor = 'text-cyan-400',
  iconStyle,
  actions 
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColor}`} style={iconStyle} />
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleHeader;
