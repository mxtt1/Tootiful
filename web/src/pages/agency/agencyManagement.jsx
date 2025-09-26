import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";

import {
  Table,
  Button,
  TextInput,
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
  Modal,
  Grid,
} from "@mantine/core";
import { IconTrash, IconSearch, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export default function AgencyManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  // Search only
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [createErrors, setCreateErrors] = useState({});

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch agency admins
  useEffect(() => {
    const fetchAgencyAdmins = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * limit;
        const params = {
          limit: limit.toString(),
          offset: offset.toString(),
          ...(debouncedSearch && { search: debouncedSearch })
        };

        const response = await apiClient.get(`/agency-admins?${new URLSearchParams(params).toString()}`);
        const agencyAdmins = response.rows || response.data || response || [];
        const totalCount = response.totalCount || response.data?.totalCount || agencyAdmins.length;

        const mappedUsers = agencyAdmins.map((user) => ({
          id: user.id,
          fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
          email: user.email,
          isActive: !!user.isActive,
          isSuspended: !!user.isSuspended,
          status: user.isSuspended ? "Suspended" : (user.isActive ? "Active" : "Inactive"),
          role: "Agency Admin",
          joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "",
        }));

        setRows(mappedUsers);
        setTotalPages(Math.ceil(totalCount / limit));
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load agency admins");
      } finally {
        setLoading(false);
      }
    };
    fetchAgencyAdmins();
  }, [page, limit, debouncedSearch]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "green";
      case "Inactive":
        return "gray";
      case "Suspended":
        return "orange";
      default:
        return "gray";
    }
  };

  // Validate create form
  const validateCreateForm = () => {
    const errors = {};
    
    if (!createForm.firstName.trim()) errors.firstName = "First name is required";
    if (!createForm.lastName.trim()) errors.lastName = "Last name is required";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!createForm.email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(createForm.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!createForm.password) {
      errors.password = "Password is required";
    } else if (createForm.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (createForm.password !== createForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    return errors;
  };

  // Create agency admin
  const handleCreateAgencyAdmin = async () => {
    const errors = validateCreateForm();
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreating(true);
    try {
      const userData = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: "agencyAdmin",
      };

      const response = await apiClient.post("/agency-admins", userData);

      // Add new user to the list
      const newUser = {
        id: response.id,
        fullName: `${createForm.firstName} ${createForm.lastName}`.trim(),
        email: createForm.email,
        isActive: true,
        isSuspended: false,
        status: "Active",
        role: "Agency Admin",
        joinedDate: new Date().toLocaleDateString(),
      };

      setRows(prevRows => [newUser, ...prevRows]);
      setCreateModalOpen(false);
      resetCreateForm();

      notifications.show({
        title: "Success",
        message: "Agency admin created successfully",
        color: "green",
      });
    } catch (err) {
      console.error("Create error:", err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to create agency admin",
        color: "red",
      });
    } finally {
      setCreating(false);
    }
  };

  // Reset create form
  const resetCreateForm = () => {
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setCreateErrors({});
  };

  // Delete agency admin
  const handleDeleteUser = async (userId) => {
    const user = rows.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/agency-admins/${userToDelete.id}`);

      setRows(prevRows => prevRows.filter(user => user.id !== userToDelete.id));
      setDeleteModalOpen(false);
      setUserToDelete(null);

      notifications.show({
        title: "Success",
        message: "Agency admin deleted successfully",
        color: "green",
      });
    } catch (err) {
      console.error("Delete error:", err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to delete agency admin",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <Container size="xl" py="xl">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
          <Loader size="lg" />
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack spacing="lg">
        <Group position="apart">
          <Title order={2}>Agency Management</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setCreateModalOpen(true)}
          >
            Create Agency Admin
          </Button>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group spacing="md" mb="md">
            <TextInput
              placeholder="Search agency admins by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flexGrow: 1, minWidth: 300 }}
            />
          </Group>
        </Card>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader />
            </div>
          ) : rows.length === 0 ? (
            <Text align="center" py="xl" color="dimmed">
              No agency admins found
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Full Name</Table.Th>
                  <Table.Th>Email</Table.Th>
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
                    <Table.Td>
                      <Badge color={getStatusColor(user.status)} variant="filled">
                        {user.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{user.role}</Table.Td>
                    <Table.Td>{user.joinedDate}</Table.Td>
                    <Table.Td>
                      <ActionIcon color="red" variant="light" onClick={() => handleDeleteUser(user.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        {totalPages > 1 && (
          <Group justify="center">
            <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
          </Group>
        )}
      </Stack>

      {/* Create Agency Admin Modal */}
      <Modal
        opened={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create Agency Admin"
        size="md"
      >
        <Stack spacing="md">
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="First Name"
                placeholder="Enter first name"
                value={createForm.firstName}
                onChange={(e) => {
                  setCreateForm({ ...createForm, firstName: e.target.value });
                  if (createErrors.firstName) setCreateErrors({ ...createErrors, firstName: "" });
                }}
                error={createErrors.firstName}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Last Name"
                placeholder="Enter last name"
                value={createForm.lastName}
                onChange={(e) => {
                  setCreateForm({ ...createForm, lastName: e.target.value });
                  if (createErrors.lastName) setCreateErrors({ ...createErrors, lastName: "" });
                }}
                error={createErrors.lastName}
                required
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="Email Address"
            placeholder="Enter email address"
            value={createForm.email}
            onChange={(e) => {
              setCreateForm({ ...createForm, email: e.target.value });
              if (createErrors.email) setCreateErrors({ ...createErrors, email: "" });
            }}
            error={createErrors.email}
            required
            type="email"
          />

          <TextInput
            label="Password"
            placeholder="Enter password"
            type="password"
            value={createForm.password}
            onChange={(e) => {
              setCreateForm({ ...createForm, password: e.target.value });
              if (createErrors.password) setCreateErrors({ ...createErrors, password: "" });
            }}
            error={createErrors.password}
            required
          />

          <TextInput
            label="Confirm Password"
            placeholder="Confirm password"
            type="password"
            value={createForm.confirmPassword}
            onChange={(e) => {
              setCreateForm({ ...createForm, confirmPassword: e.target.value });
              if (createErrors.confirmPassword) setCreateErrors({ ...createErrors, confirmPassword: "" });
            }}
            error={createErrors.confirmPassword}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setCreateModalOpen(false);
                resetCreateForm();
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAgencyAdmin}
              loading={creating}
            >
              Create Agency Admin
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        title="Delete Agency Admin"
        size="sm"
        centered
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete <strong>{userToDelete?.fullName}</strong>?
          </Text>
          <Text size="sm" color="dimmed">
            This action cannot be undone. The agency admin will be permanently removed from the system.
          </Text>

          <Group justify="flex-end" mt="lg">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpen(false);
                setUserToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={confirmDeleteUser}
              loading={deleting}
            >
              Delete Agency Admin
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}