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
  IconClipboardText,
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import ApiClient from "../api/apiClient";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agency, setAgency] = useState(null);

  // Apply custom theme colors and title
  const applyCustomizations = (agencyData) => {
    if (!agencyData?.useCustomTheme || !agencyData.customTheme) return;

    const colors = agencyData.customTheme.colors || [];
    if (colors[0]) {
      document.documentElement.style.setProperty('--mantine-primary-color', colors[0]);
      document.documentElement.style.setProperty('--agency-primary', colors[0]);
      document.documentElement.style.setProperty('--sidebar-accent', colors[0]);
    }

    if (agencyData.customTheme.title || agencyData.name) {
      const title = agencyData.customTheme.title || agencyData.name;
      document.title = `${title} - Tutiful Portal`;
    }

    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }

    // Debug log to see what images are available
    console.log("Available agency images:", {
      agencyImage: agencyData.image,
      customTheme: agencyData.customTheme,
      metadata: agencyData.metadata
    });
  };

  // Load agency data
  useEffect(() => {
    const loadAgency = async () => {
      try {
        // Get agency ID from user context
        const agencyId = user?.agencyId || user?.id;

        if (!agencyId) {
          console.warn("No agency ID available for user");
          setAgency(null);
          return;
        }

        // Use the agency profile endpoint
        const response = await ApiClient.get(`/agencies/${agencyId}`);

        if (response.success && response.data) {
          const agencyData = response.data;
          setAgency(agencyData);
          applyCustomizations(agencyData);
        } else {
          setAgency(null);
        }
      } catch (error) {
        console.error("Failed to load agency:", error);
        setAgency(null);
      }
    };

    loadAgency();
  }, [user]);

  // Listen for customization updates from other components
  useEffect(() => {
    const handleCustomizationUpdate = async () => {
      console.log("Customization update event received in AdminLayout");
      try {
        const agencyId = user?.agencyId || user?.id;
        if (!agencyId) return;

        const response = await ApiClient.get(`/agencies/${agencyId}`);

        if (response.success && response.data) {
          const agencyData = response.data;
          setAgency(agencyData);
          applyCustomizations(agencyData);
        } else {
          setAgency(null);
          // Reset to default if no customization
          document.documentElement.style.setProperty('--mantine-primary-color', '#6155F5');
          document.documentElement.style.setProperty('--agency-primary', '#6155F5');
          document.documentElement.style.setProperty('--sidebar-accent', '#6155F5');
          document.title = "Tutiful Portal";
        }
      } catch (error) {
        console.error("Failed to reload agency:", error);
        setAgency(null);
      }
    };

    window.addEventListener('customizationUpdated', handleCustomizationUpdate);
    return () => window.removeEventListener('customizationUpdated', handleCustomizationUpdate);
  }, [user]);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Generate navigation menu items based on user role
  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        { label: "Dashboard", icon: IconDashboard, path: "/admin/dashboard" },
        { label: "User Management", icon: IconUsers, path: "/admin/users" },
        { label: "Agency Management", icon: IconBuilding, path: "/admin/agencies" },
      ];
    }

    if (user?.role === "agencyAdmin" || user?.userType === "agency") {
      const agencyItems = [
        { label: "Dashboard", icon: IconDashboard, path: "/agency/dashboard" },
        { label: "Tutor Management", icon: IconUser, path: "/agency/tutors" },
        { label: "Lesson Management", icon: IconCalendar, path: "/agency/lessons" },
        { label: "Tutor Payments", icon: IconCurrencyDollar, path: "/agency/tutor-payments" },
        { label: "Resume Screener", icon: IconClipboardText, path: "/agency/resume-screener" }
      ];

      if (user?.role === "agencyAdmin") {
        agencyItems.push({ label: "Profile", icon: IconSettings, path: "/agency/profile" });
      }

      if (user?.userType === "agency") {
        agencyItems.push({ label: "Agency Management", icon: IconBuilding, path: "/agency/management" });
      }

      return agencyItems;
    }

    return [{ label: "Dashboard", icon: IconDashboard, path: "/" }];
  };

  const menuItems = getMenuItems();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.firstName || user?.lastName) {
      const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;
      return initials.toUpperCase() || "A";
    }
    return "A";
  };

  // Get panel title from agency or fallback
  const getPanelTitle = () => {
    if (agency?.useCustomTheme && agency?.customTheme?.title) return agency.customTheme.title;
    if (agency?.name) return agency.name;

    if (user?.role === "admin") return "Admin Panel";
    if (user?.userType === "agencyAdmin") return "Agency Admin Panel";
    if (user?.userType === "agency") return "Super Agency Admin Panel";
    return "Agency Panel";
  };

  // Get agency name for fallback logo
  const getAgencyDisplayName = () => {
    return (agency?.useCustomTheme && agency?.customTheme?.title) ||
      agency?.name ||
      "MindFlex";
  };

  // Get logo URL with priority order
  const getLogoUrl = () => {
    if (!agency) return null;

    // Priority order for sidebar logo display
    if (agency.useCustomTheme && agency.customTheme) {
      return agency.customTheme.selectedImage ||
        agency.customTheme.displayImage ||
        agency.customTheme.logo ||
        agency.customTheme.ogImage ||
        agency.customTheme.twitterImage ||
        agency.customTheme.largeIcon ||
        agency.customTheme.favicon;
    }

    // Fallback to agency image
    return agency.image;
  };

  const getUserRoleDisplay = () => {
    if (user?.role === "admin") return "Administrator";
    if (user?.userType === "agency") return "Agency";
    if (user?.userType === "agencyAdmin") return "Agency Administrator";
    return user?.email || "User";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Text size="lg" fw={600}>Loading...</Text>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <div
        className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{
          '--sidebar-accent': (agency?.useCustomTheme && agency?.customTheme?.colors?.[0]) || '#6155F5'
        }}
      >
        {/* Agency Logo Section */}
        <div className="sidebar-logo">
          {!sidebarCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 8px',
              gap: '8px',
              minHeight: '100px'
            }}>
              {getLogoUrl() ? (
                <img
                  src={getLogoUrl()}
                  alt={getAgencyDisplayName()}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'var(--sidebar-accent)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  {getAgencyDisplayName().charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          {sidebarCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 8px',
              gap: '6px',
              minHeight: '70px'
            }}>
              {getLogoUrl() ? (
                <img
                  src={getLogoUrl()}
                  alt={getAgencyDisplayName()}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '6px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              ) : (
                <div style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: 'var(--sidebar-accent)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {getAgencyDisplayName().charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
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
                  backgroundColor: isActive ? 'var(--sidebar-accent)' : 'transparent',
                }}
              >
                <Icon className="nav-icon" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section - Tutiful Branding & Logout */}
        <div className="sidebar-bottom" style={{ marginTop: 'auto' }}>
          {/* Tutiful Branding */}
          {!sidebarCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '12px 8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '16px'
            }}>
              <Text size="xs" c="dimmed" style={{
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.5px',
                opacity: 0.8
              }}>
                POWERED BY
              </Text>

              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                margin: '4px 0'
              }} />

              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '4px 0'
              }}>
                <img
                  src="/src/assets/tooty.png"
                  alt="Tutiful"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '8px 8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '16px'
            }}>
              <img
                src="/src/assets/tooty.png"
                alt="Tutiful"
                style={{
                  width: '50px',
                  height: '50px',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          {/* Larger Centered Logout Button */}
          <div className="sidebar-logout" style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 8px'
          }}>
            <button
              className="logout-button"
              onClick={handleLogout}
              title={sidebarCollapsed ? "Logout" : ""}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '16px 20px',
                border: 'none',
                background: 'transparent',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '700',
                borderRadius: '8px',
                width: sidebarCollapsed ? 'auto' : '90%',
                minWidth: sidebarCollapsed ? '50px' : 'auto',
                minHeight: '50px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.15)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <IconLogout size={sidebarCollapsed ? 20 : 18} className="nav-icon" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`admin-main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <header className="admin-header"
          style={{
            borderBottomColor: (agency?.useCustomTheme && agency?.customTheme?.colors?.[0]) ?
              `color-mix(in srgb, ${agency.customTheme.colors[0]} 20%, transparent)` :
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
                <Text size="lg" fw={600}>{getPanelTitle()}</Text>
              </div>
            </Group>

            {/* User Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton className="user-menu">
                  <Group gap="sm">
                    <Avatar
                      color={(agency?.useCustomTheme && agency?.customTheme?.colors?.[0]) ? undefined : "violet"}
                      style={{ backgroundColor: (agency?.useCustomTheme && agency?.customTheme?.colors?.[0]) || undefined }}
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
                      <Text size="xs" c="dimmed">{getUserRoleDisplay()}</Text>
                    </Box>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item disabled>
                  <Text size="sm" c="dimmed">Role: {getUserRoleDisplay()}</Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                  color="red"
                  style={{ color: '#ff6b6b', fontWeight: '600' }}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;