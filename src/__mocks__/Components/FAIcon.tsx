import React from 'react';

const FAIcon: React.FC<{ icon: string; style?: React.CSSProperties }> = ({ icon, style }) => (
  <span data-testid="fa-icon" data-icon={icon} style={style}>
    {icon}
  </span>
);

export default FAIcon;
