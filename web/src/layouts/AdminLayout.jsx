import React, { useState } from "react";
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
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    ];
  }

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
        label: "Profile",
        icon: IconSettings,
        path: "/agency/profile",
      },
    ];

  // Agency Management only for superAgencyAdmin
  if (user?.role === "superAgencyAdmin") {
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

  const getPanelTitle = () => {
    if (user?.role === "admin") {
      return "Admin Panel";
    } else if (user?.role === "agencyAdmin") {
      return "Agency Admin Panel";
    } else if (user?.role === "superAgencyAdmin") {
      return "Super Agency Admin Panel";
    } else {
      return "Agency Panel";
    }
  };

  const getUserRoleDisplay = () => {
    if (user?.role === "admin") {
      return "Administrator";
    } else if (user?.role === "superAgencyAdmin") {
      return "Super Agency Admin";
    } else if (user?.role === "agencyAdmin") {
      return "Agency Admin";
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
      <div className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          {!sidebarCollapsed && (
            <img
              src="/src/assets/tooty.png"
              alt="Tutiful"
              className="sidebar-logo-img"
            />
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
        <header className="admin-header">
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
              <Text size="lg" fw={600}>
                {getPanelTitle()}
              </Text>
            </Group>

            {/* User Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton className="user-menu">
                  <Group gap="sm">
                    <Avatar color="violet" radius="xl" size="sm">
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