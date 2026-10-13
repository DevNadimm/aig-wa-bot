import React from "react";

interface HugeiconsIconProps extends React.SVGProps<SVGSVGElement> {
  icon: React.ComponentType<any>;
  size?: number | string;
  color?: string;
  className?: string;
}

export function HugeiconsIcon({ icon: Icon, ...props }: HugeiconsIconProps) {
  if (!Icon) return null;
  return <Icon {...props} />;
}
