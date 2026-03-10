
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Settings, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { useWarehouseConfig } from '@/config/warehouse';
import cn from '@/utils/cn';

const modules = [
  { name: 'Scheduler', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Maps', path: '/maps' },
  { name: 'Pallet Counter', path: '/pallet-counter' },
  { name: 'Notes', path: '/notes' },
  { name: 'Support', path: '/support' },
  { name: 'Settings', path: '/settings' },
];

const TopNav = () => {
  const location = useLocation();
  const activePath = location.pathname;
  const { config, isAuthenticated } = useWarehouseConfig();

  return (
    <nav
      className="p-3 mb-4 shadow-md text-white"
      style={{ backgroundColor: config.brandColors.primary }}
    >
      <div className="container mx-auto flex items-center justify-between">
        {/* Brand/Warehouse Info */}
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 p-2 h-auto"
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{config.companyName}</div>
                    <div className="text-xs opacity-80">{config.warehouseName}</div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <div className="p-3 border-b">
                <div className="font-medium">{config.companyName}</div>
                <div className="text-sm text-muted-foreground">{config.warehouseName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Code: {config.warehouseCode}
                </div>
              </div>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Warehouse Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/warehouse-setup" className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Advanced Configuration
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/tenant/auth" className="flex items-center">
                  {isAuthenticated() ? (
                    <>
                      <Wifi className="h-4 w-4 mr-2 text-green-600" />
                      Connected to Cloud
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 mr-2 text-orange-600" />
                      Connect to Cloud
                    </>
                  )}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Connection Status Badge */}
          <Badge
            variant={isAuthenticated() ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isAuthenticated() ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"
            )}
          >
            {isAuthenticated() ? "Connected" : "Local"}
          </Badge>
        </div>

        {/* Navigation Modules */}
        <div className="flex space-x-2">
          {modules.map((module) => {
            const isActive = activePath === module.path;
            return (
              <Button
                key={module.name}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'text-white hover:bg-white/10',
                  isActive && 'bg-white/20 font-semibold text-white'
                )}
                asChild
              >
                <Link to={module.path}>{module.name}</Link>
              </Button>
            );
          })}
        </div>

        {/* App Name */}
        <div className="text-right">
          <div className="font-semibold text-sm">{config.appShortName}</div>
          <div className="text-xs opacity-80">
            Doors {config.doorNumberRange.min}-{config.doorNumberRange.max}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;