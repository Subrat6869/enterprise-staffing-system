// ============================================
// MCL LOGO COMPONENT - Uses the actual tightly cropped MCL logo image
// ============================================

import React from 'react';

interface MCLLogoProps {
  className?: string;
}

const MCLLogo: React.FC<MCLLogoProps> = ({ 
  className = '' 
}) => {
  return (
    <img
      src="/mcl-logo.png"
      alt="MCL - Mahanadi Coalfields Limited"
      className={`object-contain ${className}`}
    />
  );
};

export default MCLLogo;
