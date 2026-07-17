import { ReactElement } from "react";

export interface NavIconProps {
  className?: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: (props: NavIconProps) => ReactElement;
}
