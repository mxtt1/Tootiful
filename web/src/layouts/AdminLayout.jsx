import React, { useState, useEffect } from "react";
import {
  Text,
  Group,
  Avatar,
  Menu,
  UnstyledButton,
  Box,
  ActionIcon,
} from "@mantine/core";
import {
  IconDashboard,
  IconUsers,
  IconLogout,
  IconUser,
  IconChevronDown,
  IconMenu2,
  IconBuilding,
  IconSettings,
  IconCalendar,
  IconCurrencyDollar,
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import ApiClient from "../api/apiClient";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tenantConfig, setTenantConfig] = useState(null);
  
  useEffect(() => {
    const loadTenantConfig = async () => {
      try {
        const response = await ApiClient.get("/tenant/config");
        if (response.success && response.config) {
          setTenantConfig(response.config);
          applyCustomizations(response.config);
        }
      } catch (error) {
        console.error("Failed to load tenant config:", error);
      }
    };
    
    loadTenantConfig();
  }, []);

  const applyCustomizations = (config) => {
    if (!config.customTheme) return;
    
    console.log("Applying customizations:", config.customTheme);
    
    // Apply colors to CSS variables
    const colors = config.customTheme.colors || [];
    if (colors[0]) {
      document.documentElement.style.setProperty('--mantine-primary-color', colors[0]);
      document.documentElement.style.setProperty('--agency-primary', colors[0]);
      document.documentElement.style.setProperty('--sidebar-accent', colors[0]);
    }
    
    // Apply title with both names
    if (config.customTheme.title || config.customTheme.displayName) {
      const title = config.customTheme.title || config.customTheme.displayName;
      document.title = `${title} - Tutiful Portal`;
    }
    
    // Apply favicon if available
    if (config.customTheme.favicon) {
      let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = config.customTheme.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        {
          label: "Dashboard",
          icon: IconDashboard,
          path: "/admin/dashboard",
        },
        {
          label: "User Management",
          icon: IconUsers,
          path: "/admin/users",
        },
        {
          label: "Agency Management",
          icon: IconBuilding,
          path: "/admin/agencies",
        },
      ];
    }

    // agency users (agency entity + agencyAdmin)
    if (user?.role === "agencyAdmin" || user?.userType === "agency") {
      const agencyItems = [
        {
          label: "Dashboard",
          icon: IconDashboard,
          path: "/agency/dashboard",
        },
        {
          label: "Tutor Management",
          icon: IconUser,
          path: "/agency/tutors",
        },
        {
          label: "Lesson Management",
          icon: IconCalendar,
          path: "/agency/lessons",
        },
        {
          label: "Tutor Payments",
          icon: IconCurrencyDollar,
          path: "/agency/tutor-payments",
        }
      ];

      // Profile only for agencyAdmin
      if (user?.role === "agencyAdmin") {
        agencyItems.push({
          label: "Profile",
          icon: IconSettings,
          path: "/agency/profile",
        });
      }

      // Agency Management only for agency entity
      if (user?.userType === "agency") {
        agencyItems.push({
          label: "Agency Management",
          icon: IconBuilding,
          path: "/agency/management",
        });
      }
      return agencyItems;
    }

    //fallback
    return [
      {
        label: "Dashboard",
        icon: IconDashboard,
        path: "/",
      },
    ];
  };

  const menuItems = getMenuItems();

  const getUserInitials = () => {
    if (user?.firstName || user?.lastName) {
      const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;
      return initials.toUpperCase() || "A";
    }
    return "A";
  };

  // Show agency name from customization
  const getPanelTitle = () => {
    // Show agency name if customization exists
    if (tenantConfig?.customTheme?.displayName) {
      return tenantConfig.customTheme.displayName;
    }
    if (tenantConfig?.customTheme?.title) {
      return tenantConfig.customTheme.title;
    }
    
    // Fallback to original titles
    if (user?.role === "admin") {
      return "Admin Panel";
    } else if (user?.userType === "agencyAdmin") {
      return "Agency Admin Panel";
    } else if (user?.userType === "agency") {
      return "Super Agency Admin Panel";
    } else {
      return "Agency Panel";
    }
  };

  // Get agency display name for sidebar
  const getAgencyDisplayName = () => {
    if (tenantConfig?.customTheme?.displayName) {
      return tenantConfig.customTheme.displayName;
    }
    if (tenantConfig?.customTheme?.title) {
      return tenantConfig.customTheme.title;
    }
    return "MindFlex";
  };

  // Get agency initials for collapsed sidebar
  const getAgencyInitials = () => {
    const name = getAgencyDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const getUserRoleDisplay = () => {
    if (user?.role === "admin") {
      return "Administrator";
    } else if (user?.userType === "agency") {
      return "Agency";
    } else if (user?.userType === "agencyAdmin") {
      return "Agency Administrator";
    } else {
      return user?.email || "User";
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Text size="lg" fw={600}>
          Loading...
        </Text>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div 
        className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{
          // Apply agency color to sidebar accent
          '--sidebar-accent': tenantConfig?.customTheme?.colors?.[0] || '#6155F5'
        }}
      >
        {/* Logo Section - Updated to show agency name */}
        <div className="sidebar-logo">
          {!sidebarCollapsed && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '8px',
              padding: '16px 12px'
            }}>
              {/* Agency Logo - Uses customization data */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--sidebar-accent)',
                  lineHeight: 1.1,
                  marginBottom: '2px'
                }}>
                  {getAgencyDisplayName()}
                </div>
                <Text 
                  size="xs" 
                  style={{ 
                    color: 'var(--sidebar-accent)',
                    fontWeight: 500,
                    opacity: 0.8,
                    fontSize: '10px'
                  }}
                  lineClamp={2}
                >
                  {tenantConfig?.customTheme?.description || 'Home Tuition Agency'}
                </Text>
              </div>

              {/* Tutiful Logo - Smaller and positioned as parent company */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                marginTop: '4px'
              }}>
                <Text size="xs" c="dimmed" style={{ fontSize: '9px' }}>
                  Powered by
                </Text>
                <img
                  src="/src/assets/tooty.png"
                  alt="Tutiful"
                  style={{ 
                    width: '14px', 
                    height: '14px',
                    objectFit: 'contain'
                  }}
                />
                <Text size="xs" c="dimmed" style={{ fontSize: '9px', fontWeight: 500 }}>
                  Tutiful
                </Text>
              </div>
            </div>
          )}
          
          {/* Collapsed state - Show agency initial */}
          {sidebarCollapsed && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--sidebar-accent)',
                lineHeight: 1
              }}>
                {getAgencyInitials()}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : ""}
                style={{
                  // Active state uses agency color
                  backgroundColor: isActive ? 'var(--sidebar-accent)' : 'transparent',
                }}
              >
                <Icon className="nav-icon" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout Button at Bottom */}
        <div className="sidebar-logout">
          <button
            className="logout-button"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : ""}
          >
            <IconLogout className="nav-icon" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`admin-main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        {/* Header */}
        <header className="admin-header"
          style={{
            borderBottomColor: tenantConfig?.customTheme?.colors?.[0] ? 
              `color-mix(in srgb, ${tenantConfig.customTheme.colors[0]} 20%, transparent)` : 
              undefined
          }}
        >
          <Group justify="space-between" style={{ width: "100%" }}>
            <Group>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={toggleSidebar}
                className="sidebar-toggle"
              >
                <IconMenu2 size={18} />
              </ActionIcon>
              <div>
                <Text size="lg" fw={600}>
                  {getPanelTitle()}
                </Text>
                {/* Removed the "Powered by Tutiful" text from top navbar */}
              </div>
            </Group>

            {/* User Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton className="user-menu">
                  <Group gap="sm">
                    <Avatar 
                      color={tenantConfig?.customTheme?.colors?.[0] ? undefined : "violet"}
                      style={{
                        backgroundColor: tenantConfig?.customTheme?.colors?.[0] || undefined
                      }}
                      radius="xl" 
                      size="sm"
                    >
                      {getUserInitials()}
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {user && (user.firstName || user.lastName)
                          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                          : getPanelTitle()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {getUserRoleDisplay()}
                      </Text>
                    </Box>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item disabled>
                  <Text size="sm" c="dimmed">
                    Role: {getUserRoleDisplay()}
                  </Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                  color="red"
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </header>

        {/* Content */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;