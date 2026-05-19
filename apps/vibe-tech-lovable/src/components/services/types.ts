
import type { LucideIcon } from "lucide-react";

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  icon: {
    type: LucideIcon;
    props: {
      className: string;
    }
  };
  features: string[];
  technologies?: string[];
  realProjects?: string[];
  businessValue?: string;
}
