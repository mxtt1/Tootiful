import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";

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

  //Edit user function - UPDATED to include isSuspended
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    isActive: false,
    isSuspended: false, // ADDED
  });
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Add debounced search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
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

        };

        let allUsers = [];

        // Fetch students
        if (!roleFilter || roleFilter === "Student") {
          try {
            const studentsRes = await apiClient.get(`/students?${new URLSearchParams(params).toString()}`);
            const students = (studentsRes.rows || studentsRes.data || studentsRes || []).map(user => ({
              ...user,
              role: "Student"
            }));
            allUsers = [...allUsers, ...students];
          } catch (err) {
            console.log("Failed to fetch students:", err);
          }
        }

        // Fetch tutors
        if (!roleFilter || roleFilter === "Tutor") {
          try {
            const tutorsRes = await apiClient.get(`/tutors?${new URLSearchParams(params).toString()}`);
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

        // UPDATED: Handle isSuspended in mapping
        const mappedUsers = allUsers.map((user) => ({
          id: user.id,
          fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
          email: user.email,
          isActive: !!user.isActive,
          isSuspended: !!user.isSuspended,
          status: user.isSuspended ? "Suspended" : (user.isActive ? "Active" : "Inactive"),
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
        if (statusFilter) {
          filteredUsers = filteredUsers.filter(user => {
            switch (statusFilter) {
              case "Active":
                return user.status === "Active";
              case "Inactive":
                return user.status === "Inactive";
              case "Suspended":
                return user.status === "Suspended";
              default:
                return true;
            }
          });
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

  // UPDATED: Handle isSuspended in edit form
  const handleEditUser = (userId) => {
    const user = rows.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      const nameParts = user.fullName.split(' ');
      setEditForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email,
        isActive: !!user.isActive,
        isSuspended: !!user.isSuspended,
      });
      setEditModalOpen(true);
    }
  };

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

  // UPDATED: Handle isSuspended in save
  const handleSaveUser = async () => {
    const emailValidationError = validateEmail(editForm.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        isActive: editForm.isActive,
        isSuspended: editForm.isSuspended,
      };

      console.log("Sending update data:", updateData); // Debug log

      if (editingUser.role === "Student") {
        await apiClient.patch(`/students/${editingUser.id}`, updateData);
      } else if (editingUser.role === "Tutor") {
        await apiClient.patch(`/tutors/${editingUser.id}`, { tutorData: updateData });
      } else {
        throw new Error("Unsupported role for update");
      }

      // Update local state
      setRows(prevRows =>
        prevRows.map(user =>
          user.id === editingUser.id
            ? {
              ...user,
              fullName: `${editForm.firstName} ${editForm.lastName}`.trim(),
              email: editForm.email,
              isActive: editForm.isActive,
              isSuspended: editForm.isSuspended,
              status: editForm.isSuspended ? 'Suspended' : (editForm.isActive ? 'Active' : 'Inactive'),
            }
            : user
        )
      );

      setEditModalOpen(false);
      setEmailError("");
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
      if (userToDelete.role === "Student") {
        await apiClient.delete(`/students/${userToDelete.id}`);
      } else if (userToDelete.role === "Tutor") {
        await apiClient.delete(`/tutors/${userToDelete.id}`);
      } else {
        throw new Error("Unsupported role for delete");
      }

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
    setPage(1);
    setDebouncedSearch(searchQuery);
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
                { value: "Student", label: "Student" },
                { value: "Tutor", label: "Tutor" },
                { value: "Agency", label: "Agency" },
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
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              style={{ minWidth: 150 }}
            />

            <Button onClick={applyFilters}>Apply Filters</Button>
          </Group>
        </Card>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

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

      {/* UPDATED Modal with Suspended option */}
      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEmailError("");
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
              const error = validateEmail(newEmail);
              setEmailError(error);
            }}
            onBlur={() => {
              const error = validateEmail(editForm.email);
              setEmailError(error);
            }}
            error={emailError}
            required
            type="email"
          />

          {/* UPDATED Select with 3 options */}
          <Select
            label="Status"
            placeholder="Select status"
            data={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "suspended", label: "Suspended" },
            ]}
            value={
              editForm.isSuspended ? "suspended" :
                editForm.isActive ? "active" : "inactive"
            }
            onChange={(value) => {
              console.log("Status changed to:", value); // Debug log
              setEditForm({
                ...editForm,
                isActive: value === "active",
                isSuspended: value === "suspended",
              });
            }}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setEditModalOpen(false);
                setEmailError("");
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
                emailError !== ""
              }
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>

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