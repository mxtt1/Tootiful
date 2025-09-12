import React from "react";
import { Text, Group, Avatar, Menu, UnstyledButton, Box } from "@mantine/core";
import {
  IconDashboard,
  IconUsers,
  IconLogout,
  IconUser,
  IconChevronDown,
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    {
      label: "Dashboard",
      icon: IconDashboard,
      path: "/dashboard",
    },
    {
      label: "User Management",
      icon: IconUsers,
      path: "/users",
    },
  ];

  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase();
    }
    return "A";
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <h2>Tutiful</h2>
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
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <Text size="lg" fw={600}>
            Admin Panel
          </Text>

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
                      {user?.name || "Admin"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {user?.email || "admin@tutiful.com"}
                    </Text>
                  </Box>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUser size={16} />}>
                Profile
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
        </header>

        {/* Content */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
