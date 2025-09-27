import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import { useAuth } from "../../auth/AuthProvider";

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
  const { user } = useAuth();

  console.log("=== useAuth() user data ===");
  console.log("Full user object:", user);
  console.log("User type:", user?.userType);
  console.log("User ID:", user?.id);
  console.log("Agency ID:", user?.agencyId);
  console.log("All user properties:", user ? Object.keys(user) : "No user object");
  console.log("========================");
  const agencyId = user?.userType === 'agency' ? user.id : user?.agencyId || null;
  console.log("Final agencyId:", agencyId);


  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

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

  // Fetch agency admins
  useEffect(() => {
    const fetchAgencyAdmins = async () => {
      if (!agencyId) {
        console.log("No agencyId available");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * limit;
        const params = {
          limit: limit.toString(),
          offset: offset.toString(),
        };

        const response = await apiClient.get(
        `/agencies/${agencyId}/admins?${new URLSearchParams(params).toString()}`
      );
      
        const agencyAdmins = response.rows || response.data || response || [];
        const totalCount = response.totalCount || response.data?.totalCount || agencyAdmins.length;

        const mappedUsers = agencyAdmins.map((user) => ({
          id: user.id,
          email: user.email,
          isActive: !!user.isActive,
          isSuspended: !!user.isSuspended,
          status: user.isSuspended ? "Suspended" : (user.isActive ? "Active" : "Inactive"),
          role: user.role,
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
  }, [agencyId, page, limit]);

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
    if (!agencyId) {
      notifications.show({
        title: "Error",
        message: "No agency selected",
        color: "red",
      });
      return;
    }
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
        // role will be set to 'agencyAdmin' automatically by  service
      };

      const response = await apiClient.post(`/agencies/${agencyId}/admins`, userData);

      // Add new user to the list
      const newUser = {
        id: response.id,
        email: createForm.email,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
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
    if (!userToDelete || !agencyId) return;

    setDeleting(true);
    try {
      console.log(`Deleting user - User ID: ${userToDelete.id}, Agency ID: ${agencyId}, User Email: ${userToDelete.email}`);
      await apiClient.delete(`/agencies/${agencyId}/admins/${userToDelete.id}`);

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
      console.error("Error response:", err.response);

      let errorMessage = "Failed to delete agency admin";
      if (err.message?.includes('404') || err.message?.includes('not found')) {
          errorMessage = "Agency admin not found";
      } else if (err.message) {
          errorMessage = err.message;
      }
      notifications.show({
        title: "Error",
        message: errorMessage || "Failed to delete agency admin",
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
        <Group justify="space-between" align="center" w="100%">
          <Title order={2}>Agency Management</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setCreateModalOpen(true)}
          >
            Create Agency Admin
          </Button>
        </Group>

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
            Are you sure you want to delete <strong>{userToDelete?.email}</strong>?
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