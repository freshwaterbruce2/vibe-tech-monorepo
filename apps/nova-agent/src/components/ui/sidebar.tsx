// Barrel re-export — preserves all existing import paths
// Split into: sidebar-provider.tsx, sidebar-sections.tsx, sidebar-menu.tsx

export { SidebarProvider, useSidebar } from "./sidebar-provider";
export type { SidebarContextType } from "./sidebar-provider";
export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from "./sidebar-sections";
export {
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "./sidebar-menu";
