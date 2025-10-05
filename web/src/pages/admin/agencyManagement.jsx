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
    Image,
} from "@mantine/core";
import { IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export default function AgencyManagement() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Modals
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [agencyToDelete, setAgencyToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingAgency, setEditingAgency] = useState(null);
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phone: "",
        isActive: false,
        isSuspended: false,
        image: "",
    });
    const [saving, setSaving] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [phoneError, setPhoneError] = useState("");

    //Image
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch agencies
    useEffect(() => {
        const fetchAgencies = async () => {
            setLoading(true);
            setError(null);
            try {
                const offset = (page - 1) * limit;
                const params = { limit: limit.toString(), offset: offset.toString() };

                const res = await apiClient.get(
                    `/agencies?${new URLSearchParams(params).toString()}`
                );

                // Support both Sequelize style { rows, count } and plain array
                const data = res.data || res;
                const agencies = (data.rows || data || []).map((a) => {
                    let status = "Inactive";
                    if (a.isSuspended) status = "Suspended";
                    else if (a.isActive) status = "Active";

                    return {
                        id: a.id,
                        name: a.name,
                        email: a.email,
                        phone: a.phone,
                        isActive: !!a.isActive,
                        isSuspended: !!a.isSuspended,
                        status,
                        createdAt: a.createdAt
                            ? new Date(a.createdAt).toLocaleDateString()
                            : "",
                        image: a.image,
                    };
                });

                // Local filtering
                let filtered = agencies;
                if (debouncedSearch) {
                    filtered = filtered.filter((a) =>
                        a.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                    );
                }
                if (statusFilter) {
                    filtered = filtered.filter((a) => a.status === statusFilter);
                }

                // pagination is applied HERE locally
                const totalCount = filtered.length;
                setTotalPages(Math.ceil(totalCount / limit));
                const start = (page - 1) * limit;
                const end = start + limit;
                setRows(filtered.slice(start, end))
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load agencies");
            } finally {
                setLoading(false);
            }
        };
        fetchAgencies();
    }, [page, limit, debouncedSearch, statusFilter]);

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

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return "Email is required";
        if (!regex.test(email)) return "Enter a valid email";
        return "";
    };

    //adding validate function for phone for unique phone number and 8 digits.
    const validatePhone = (phone, currentId = null) => {
        const regex = /^[0-9]{8}$/; // must be 8 digits
        if (!regex.test(phone)) {
            return "Phone number must be exactly 8 digits";
        }
        // uniqueness check
        const duplicate = rows.find(
            (a) => a.phone === phone && a.id !== currentId
        );
        if (duplicate) {
            return "Phone number must be unique";
        }
        return "";
    };

    const handleEditAgency = (id) => {
        const agency = rows.find((a) => a.id === id);
        if (agency) {
            setEditingAgency(agency);
            setEditForm({
                name: agency.name,
                email: agency.email,
                phone: agency.phone,
                isActive: agency.isActive,
                isSuspended: agency.isSuspended,
                image: agency.image || "",
            });
            setEditModalOpen(true);
        }
    };

    const handleSaveAgency = async () => {
        const err = validateEmail(editForm.email);
        if (err) {
            setEmailError(err);
            return;
        }

        // validate phone
        const phoneErr = validatePhone(editForm.phone, editingAgency?.id);
        if (phoneErr) {
            setPhoneError(phoneErr);
            return;
        } else {
            setPhoneError("");
        }

        setSaving(true);
        try {
            const updateData = { ...editForm };
            await apiClient.patch(`/agencies/${editingAgency.id}`, updateData);

            setRows((prev) =>
                prev.map((a) =>
                    a.id === editingAgency.id
                        ? {
                            ...a,
                            name: editForm.name,
                            email: editForm.email,
                            phone: editForm.phone,
                            isActive: editForm.isActive,
                            status: editForm.isSuspended
                                ? "Suspended"
                                : editForm.isActive
                                    ? "Active"
                                    : "Inactive",
                            //remove image update cuz its not neeeded
                            //  image: editForm.image,
                        }
                        : a
                )
            );

            setEditModalOpen(false);
            notifications.show({
                title: "Success",
                message: "Agency updated successfully",
                color: "green",
            });
        } catch (err) {
            console.error("Update error:", err);
            notifications.show({
                title: "Error",
                message: err.message || "Failed to update agency",
                color: "red",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAgency = (id) => {
        const agency = rows.find((a) => a.id === id);
        if (agency) {
            setAgencyToDelete(agency);
            setDeleteModalOpen(true);
        }
    };

    const confirmDeleteAgency = async () => {
        if (!agencyToDelete) return;
        setDeleting(true);
        try {
            await apiClient.delete(`/agencies/${agencyToDelete.id}`);
            setRows((prev) => prev.filter((a) => a.id !== agencyToDelete.id));
            setDeleteModalOpen(false);
            setAgencyToDelete(null);
            notifications.show({
                title: "Success",
                message: "Agency deleted successfully",
                color: "green",
            });
        } catch (err) {
            console.error("Delete error:", err);
            notifications.show({
                title: "Error",
                message: err.message || "Failed to delete agency",
                color: "red",
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Container size="xl" py="xl">
            <Stack spacing="lg">
                <Title order={2}>Agency Management</Title>

                {/* Search & Filters */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group spacing="md" mb="md">
                        <TextInput
                            placeholder="Search agencies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftSection={<IconSearch size={16} />}
                            style={{ flexGrow: 1, minWidth: 200 }}
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
                    </Group>
                </Card>

                {/* Error */}
                {error && <Alert color="red">{error}</Alert>}

                {/* Table */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    {loading ? (
                        <Loader />
                    ) : rows.length === 0 ? (
                        <Text align="center" color="dimmed">
                            No agencies found
                        </Text>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Logo</Table.Th>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Phone</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Joined</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.map((a) => (
                                    <Table.Tr key={a.id}>
                                        <Table.Td>
                                            {a.image ? (
                                                <Table.Td>
                                                    {a.image ? (
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            color="blue"
                                                            onClick={() => {
                                                                setPreviewImage(a.image);
                                                                setPreviewOpen(true);
                                                            }}
                                                        >
                                                            View Cert
                                                        </Button>
                                                    ) : (
                                                        <Text size="sm" color="dimmed">No Cert</Text>
                                                    )}
                                                </Table.Td>
                                            ) : (
                                                <Text size="sm" color="dimmed">
                                                    No Image
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>{a.name}</Table.Td>
                                        <Table.Td>{a.email}</Table.Td>
                                        <Table.Td>{a.phone}</Table.Td>
                                        <Table.Td>
                                            <Badge color={getStatusColor(a.status)}>{a.status}</Badge>
                                        </Table.Td>
                                        <Table.Td>{a.createdAt}</Table.Td>
                                        <Table.Td>
                                            <Group spacing="xs">
                                                <ActionIcon
                                                    color="blue"
                                                    onClick={() => handleEditAgency(a.id)}
                                                >
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    color="red"
                                                    onClick={() => handleDeleteAgency(a.id)}
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
                    <Group justify="center" mt="md">
                        <Pagination value={page} onChange={setPage} total={totalPages} />
                    </Group>
                )}

                {/* Edit Modal */}
                <Modal
                    opened={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    title="Edit Agency"
                >
                    <Stack>
                        <TextInput
                            label="Agency Name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            required
                        />
                        {/* Omit email edits for mental health reasons */}
                        {/* <TextInput
                            label="Email"
                            value={editForm.email}
                            onChange={(e) => {
                                const newEmail = e.target.value;
                                setEditForm({ ...editForm, email: newEmail });
                                setEmailError(validateEmail(newEmail));
                            }}
                            error={emailError}
                            required
                        /> */}
                        <TextInput
                            label="Phone"
                            value={editForm.phone}
                            onChange={(e) =>
                                setEditForm({ ...editForm, phone: e.target.value })
                            }
                            error={phoneError}
                            required
                        />
                        {/* added isSuspended field */}
                        <Select
                            label="Status"
                            data={[
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                                { value: "suspended", label: "Suspended" },
                            ]}
                            value={
                                editForm.isSuspended
                                    ? "suspended"
                                    : editForm.isActive
                                        ? "active"
                                        : "inactive"
                            }
                            onChange={(v) =>
                                setEditForm({
                                    ...editForm,
                                    isActive: v === "active",
                                    isSuspended: v === "suspended",
                                })
                            }
                        />

                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={() => setEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveAgency} loading={saving}>
                                Save
                            </Button>
                        </Group>
                    </Stack>
                </Modal>

                {/* Delete Modal */}
                <Modal
                    opened={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title="Delete Agency"
                    centered
                >
                    <Stack>
                        <Text>
                            Delete agency <strong>{agencyToDelete?.name}</strong>?
                        </Text>
                        <Text size="sm" color="dimmed">
                            This cannot be undone.
                        </Text>
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={() => setDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button color="red" onClick={confirmDeleteAgency} loading={deleting}>
                                Delete
                            </Button>
                        </Group>
                    </Stack>
                </Modal>
                {/* Image Preview Modal */}
                <Modal
                    opened={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    title="Agency Certificate"
                    size="lg"
                    centered
                >
                    {previewImage ? (
                        <Image src={previewImage} alt="Agency Certificate" fit="contain" radius="md" />
                    ) : (
                        <Text>No certificate available</Text>
                    )}
                </Modal>
            </Stack>
        </Container>
    );
}
