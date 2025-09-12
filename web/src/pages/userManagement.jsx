import React, { useEffect, useState } from "react";
import API from "../api/apiClient"; // your backend service

import {
  Table,
  Button,
  TextInput,
  Select,
  ActionIcon,
  Loader,
  Text,
  Group,
  Stack,
  Badge,
  Container,
  Title,
  Card,
  Pagination,
  Alert,
} from "@mantine/core";
import { IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export default function UserManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * limit;

        // Fix 1: Change from /users to /students (matches your backend)
        // Fix 2: Build query params properly
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          ...(search && { search }),
          ...(roleFilter && { role: roleFilter }),
          ...(statusFilter && {
            active: statusFilter === "Active" ? "true" : "false",
          }),
        });

        const res = await API.get(`/students?${params.toString()}`);

        // Fix 3: Handle your backend response structure and map fields
        const users = res.rows || res.data || res || [];
        const mappedUsers = users.map((user) => ({
          id: user.id,
          fullName:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username,
          email: user.email,
          username: user.username,
          status: user.isActive ? "Active" : "Inactive",
          role: user.role || "Student",
          joinedDate: user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "",
        }));

        setRows(mappedUsers);

        // Calculate total pages if response includes count
        if (res.count) {
          setTotalPages(Math.ceil(res.count / limit));
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load users");
        notifications.show({
          title: "Error",
          message: "Failed to load users",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, limit, search, roleFilter, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "green";
      case "Inactive":
        return "gray";
      case "Suspended":
        return "orange";
      case "Pending":
        return "blue";
      case "Banned":
        return "red";
      default:
        return "gray";
    }
  };

  const handleEditUser = (userId) => {
    // TODO: Implement edit functionality
    notifications.show({
      title: "Coming Soon",
      message: "User editing functionality will be available soon.",
      color: "blue",
    });
  };

  const handleDeleteUser = (userId) => {
    // TODO: Implement delete functionality
    notifications.show({
      title: "Coming Soon",
      message: "User deletion functionality will be available soon.",
      color: "blue",
    });
  };

  const applyFilters = () => {
    setPage(1); // Reset to first page when applying filters
  };

  if (loading && rows.length === 0) {
    return (
      <Container size="xl" py="xl">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "400px",
          }}
        >
          <Loader size="lg" />
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack spacing="lg">
        <Title order={2}>User Management</Title>

        {/* Filters */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group spacing="md" mb="md">
            <TextInput
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flexGrow: 1, minWidth: 200 }}
            />

            <Select
              placeholder="All Roles"
              data={[
                { value: "", label: "All Roles" },
                { value: "Admin", label: "Admin" },
                { value: "Student", label: "Student" },
                { value: "Tutor", label: "Tutor" },
                { value: "Moderator", label: "Moderator" },
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              clearable
              style={{ minWidth: 150 }}
            />

            <Select
              placeholder="All Status"
              data={[
                { value: "", label: "All Status" },
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Suspended", label: "Suspended" },
                { value: "Pending", label: "Pending" },
                { value: "Banned", label: "Banned" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              style={{ minWidth: 150 }}
            />

            <Button onClick={applyFilters}>Apply Filters</Button>
          </Group>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Table */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px",
              }}
            >
              <Loader />
            </div>
          ) : rows.length === 0 ? (
            <Text align="center" py="xl" color="dimmed">
              No users found
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Full Name</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Joined Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>{user.fullName}</Table.Td>
                    <Table.Td>{user.email}</Table.Td>
                    <Table.Td>{user.username}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(user.status)}
                        variant="filled"
                      >
                        {user.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{user.role}</Table.Td>
                    <Table.Td>{user.joinedDate}</Table.Td>
                    <Table.Td>
                      <Group spacing="xs">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => handleEditUser(user.id)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              value={page}
              onChange={setPage}
              total={totalPages}
              size="sm"
            />
          </Group>
        )}
      </Stack>
    </Container>
  );
}
