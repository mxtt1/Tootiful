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
  Modal,
  Grid,
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

  //Search user
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");


  // Add delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  //Edit user function
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Add debounced search
  const [searchQuery, setSearchQuery] = useState(""); // What user is typing
  const [debouncedSearch, setDebouncedSearch] = useState(""); // What we actually search with
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * limit;
        const params = {
          limit: limit.toString(),
          offset: offset.toString(),
          // REMOVE the search parameter - don't send it to backend
          ...(statusFilter && {
            active: statusFilter === "Active" ? "true" : "false",
          }),
        };

        let allUsers = [];

        // Fetch students
        if (!roleFilter || roleFilter === "Student") {
          try {
            const studentsRes = await API.get(`/students?${new URLSearchParams(params).toString()}`);
            const students = (studentsRes.rows || studentsRes.data || studentsRes || []).map(user => ({
              ...user,
              role: "Student"
            }));
            allUsers = [...allUsers, ...students];
          } catch (err) {
            console.log("Failed to fetch students:", err);
          }
        }

        // Fetch tutors (if you have a tutors endpoint)
        if (!roleFilter || roleFilter === "Tutor") {
          try {
            const tutorsRes = await API.get(`/tutors?${new URLSearchParams(params).toString()}`);
            const tutors = (tutorsRes.rows || tutorsRes.data || tutorsRes || []).map(user => ({
              ...user,
              role: "Tutor"
            }));
            allUsers = [...allUsers, ...tutors];
          } catch (err) {
            console.log("Failed to fetch tutors:", err);
          }
        }

        // Filter by role if specified
        if (roleFilter) {
          allUsers = allUsers.filter(user => user.role === roleFilter);
        }

        const mappedUsers = allUsers.map((user) => ({
          id: user.id,
          fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
          email: user.email,
          status: user.isActive ? "Active" : "Inactive",
          role: user.role || "Student",
          joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "",
        }));

        // ADD LOCAL SEARCH FILTERING HERE:
        let filteredUsers = mappedUsers;
        if (debouncedSearch) {
          filteredUsers = mappedUsers.filter(user =>
            user.fullName.toLowerCase().includes(debouncedSearch.toLowerCase())
          );
        }

        setRows(filteredUsers);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, limit, debouncedSearch, roleFilter, statusFilter]);

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
    const user = rows.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      // Split fullName back into firstName and lastName
      const nameParts = user.fullName.split(' ');
      setEditForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email,
        isActive: user.status === 'Active',
      });
      setEditModalOpen(true);
    }
  };
  // Add email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleSaveUser = async () => {
    // Validate email before saving
    const emailValidationError = validateEmail(editForm.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        tutorData: {  // Wrap in tutorData for tutor endpoints
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          isActive: editForm.isActive,
        }
      };

      let updateEndpoint;
      if (editingUser.role === "Student") {
        updateEndpoint = `/students/${editingUser.id}`;
        // For students, send data directly (no tutorData wrapper)
        await API.patch(updateEndpoint, {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          isActive: editForm.isActive,
        });
      } else if (editingUser.role === "Tutor") {
        updateEndpoint = `/tutors/${editingUser.id}`;
        // For tutors, wrap in tutorData
        await API.patch(updateEndpoint, updateData);
      } else {
        updateEndpoint = `/users/${editingUser.id}`;
        await API.patch(updateEndpoint, {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          isActive: editForm.isActive,
        });
      }

      // Update local state
      setRows(prevRows =>
        prevRows.map(user =>
          user.id === editingUser.id
            ? {
              ...user,
              fullName: `${editForm.firstName} ${editForm.lastName}`.trim(),
              email: editForm.email,
              status: editForm.isActive ? 'Active' : 'Inactive',
            }
            : user
        )
      );

      setEditModalOpen(false);
      setEmailError(""); // Clear error on success
      notifications.show({
        title: "Success",
        message: "User updated successfully",
        color: "green",
      });
    } catch (err) {
      console.error("Update error:", err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to update user",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };
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
      // Check the user's role and use the correct endpoint
      let deleteEndpoint;
      if (userToDelete.role === "Student") {
        deleteEndpoint = `/students/${userToDelete.id}`;
      } else if (userToDelete.role === "Tutor") {
        deleteEndpoint = `/tutors/${userToDelete.id}`;
      } else {
        // For other roles, you might need different endpoints
        deleteEndpoint = `/users/${userToDelete.id}`;
      }

      await API.delete(deleteEndpoint);

      // Remove from local state
      setRows(prevRows => prevRows.filter(user => user.id !== userToDelete.id));

      setDeleteModalOpen(false);
      setUserToDelete(null);

      notifications.show({
        title: "Success",
        message: "User deleted successfully",
        color: "green",
      });
    } catch (err) {
      console.error("Delete error:", err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to delete user",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };
  const applyFilters = () => {
    setPage(1); // Reset to first page when applying filters
    setDebouncedSearch(searchQuery); // Force immediate search with current query
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                      <Group spacing="xs">
                        <ActionIcon color="blue" variant="light" onClick={() => handleEditUser(user.id)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" variant="light" onClick={() => handleDeleteUser(user.id)}>
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

      {/* Edit User Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEmailError(""); // Clear error when closing modal
        }}
        title="Edit User"
        size="md"
      >
        <Stack spacing="md">
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="First Name"
                placeholder="Enter first name"
                value={editForm.firstName}
                onChange={(e) =>
                  setEditForm({ ...editForm, firstName: e.target.value })
                }
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Last Name"
                placeholder="Enter last name"
                value={editForm.lastName}
                onChange={(e) =>
                  setEditForm({ ...editForm, lastName: e.target.value })
                }
                required
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="Email Address"
            placeholder="Enter email address"
            value={editForm.email}
            onChange={(e) => {
              const newEmail = e.target.value;
              setEditForm({ ...editForm, email: newEmail });

              // Real-time validation
              const error = validateEmail(newEmail);
              setEmailError(error);
            }}
            onBlur={() => {
              // Validate on blur as well
              const error = validateEmail(editForm.email);
              setEmailError(error);
            }}
            error={emailError}
            required
            type="email"
          />

          <Select
            label="Status"
            placeholder="Select status"
            data={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
            value={editForm.isActive ? "true" : "false"}
            onChange={(value) =>
              setEditForm({ ...editForm, isActive: value === "true" })
            }
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setEditModalOpen(false);
                setEmailError(""); // Clear error when canceling
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              loading={saving}
              disabled={
                !editForm.firstName ||
                !editForm.lastName ||
                !editForm.email ||
                emailError !== "" // Disable if there's an email error
              }
            >
              Save Changes
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
        title="Delete User"
        size="sm"
        centered
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete <strong>{userToDelete?.fullName}</strong>?
          </Text>
          <Text size="sm" color="dimmed">
            This action cannot be undone. The user will be permanently removed from the system.
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
              Delete User
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
