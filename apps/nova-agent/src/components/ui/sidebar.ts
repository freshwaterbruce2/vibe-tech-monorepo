// Barrel re-export - preserves all existing import paths
// Split into: sidebar-provider.tsx, sidebar-sections.tsx, sidebar-menu.tsx

export {
	SIDEBAR_KEYBOARD_SHORTCUT,
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_ICON,
	SIDEBAR_WIDTH_MOBILE,
	useSidebar,
} from "./sidebar-context";
export type { SidebarContextType } from "./sidebar-context";
export { SidebarProvider } from "./sidebar-provider";
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
