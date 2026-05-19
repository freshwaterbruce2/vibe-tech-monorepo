
export interface Project {
  id: number;
  title: string;
  category: string;
  description: string;
  image: string;
  imageFit?: "cover" | "contain";
  screenshots?: string[];
  tags: string[];
}
