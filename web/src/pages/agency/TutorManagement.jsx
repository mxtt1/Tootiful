import React, { useState, useEffect, useRef } from "react";
import { Button, Table, Modal, Group, Text, Loader, ActionIcon, Card, Stack, TextInput, Container, Title, Badge, Alert, Pagination } from "@mantine/core";
import { IconEdit, IconTrash, IconSearch, IconPlus } from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthProvider";
import apiClient from "../../api/apiClient";
import TutorCreateForm from "../../components/TutorCreateForm";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { notifications } from "@mantine/notifications";

function EditTutorModal({ opened, onClose, tutor, onUpdated }) {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: null
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (tutor) {
            setForm({
                firstName: tutor.firstName || "",
                lastName: tutor.lastName || "",
                email: tutor.email || "",
                phone: tutor.phone || "",
                dateOfBirth: tutor.dateOfBirth ? new Date(tutor.dateOfBirth) : null,
            });
        }
    }, [tutor]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Only send changed fields
            const patchData = {};
            if (form.firstName !== tutor.firstName) patchData.firstName = form.firstName;
            if (form.lastName !== tutor.lastName) patchData.lastName = form.lastName;
            if (form.email !== tutor.email) patchData.email = form.email;
            if (form.phone !== tutor.phone) patchData.phone = form.phone;
            if ((form.dateOfBirth && (!tutor.dateOfBirth || new Date(tutor.dateOfBirth).toISOString().split("T")[0] !== form.dateOfBirth.toISOString().split("T")[0])) || (!form.dateOfBirth && tutor.dateOfBirth)) {
                patchData.dateOfBirth = form.dateOfBirth ? form.dateOfBirth.toISOString().split("T")[0] : null;
            }
            if (Object.keys(patchData).length > 0) {
                await apiClient.patch(`/tutors/${tutor.id}`, { tutorData: patchData });
                notifications.show({ title: "Success", message: "Tutor updated successfully", color: "green" });
            }
            onUpdated && onUpdated();
            onClose();
        } catch (err) {
            notifications.show({ title: "Error", message: err.message || "Failed to update tutor", color: "red" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Edit Tutor" size="md">
            <Stack spacing="md">
                <Group grow>
                    <TextInput
                        label="First Name"
                        value={form.firstName}
                        onChange={e => setForm({ ...form, firstName: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Last Name"
                        value={form.lastName}
                        onChange={e => setForm({ ...form, lastName: e.target.value })}
                        required
                    />
                </Group>
                <TextInput
                    label="Email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                />
                <TextInput
                    label="Phone Number"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                />
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4, color: 'var(--tutiful-gray-700)', fontWeight: 500 }}>Date of Birth</label>
                    <DatePicker
                        selected={form.dateOfBirth}
                        onChange={date => setForm({ ...form, dateOfBirth: date })}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        className="form-input"
                        maxDate={new Date()}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        isClearable
                    />
                </div>
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} loading={saving}>Save</Button>
                </Group>
            </Stack>
        </Modal>
    );
}

export default function TutorManagement() {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tutorToDelete, setTutorToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimeout = useRef(null);
    const { user } = useAuth();

    let agencyId = null;
    if (user?.agencyId) {
        agencyId = user.agencyId;
    } else if (user?.userType === 'agency') {
        agencyId = user.id;
    }

    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // Debounce search input
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 400); // 400ms debounce
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [searchQuery]);

    // Fetch tutors (with server-side search)
    useEffect(() => {
        const fetchTutors = async () => {
            if (!agencyId) return;
            setLoading(true);
            setError(null);
            try {
                const offset = (page - 1) * limit;
                const params = {
                    limit: limit.toString(),
                    offset: offset.toString(),
                    search: debouncedSearch
                };
                const res = await apiClient.get(`/tutors?agencyId=${agencyId}&${new URLSearchParams(params).toString()}`);
                const tutorsData = res.data || res.rows || res || [];
                setTutors(tutorsData);
                // If backend provides totalCount, set totalPages
                const totalCount = res.pagination?.total || tutorsData.length;
                setTotalPages(Math.ceil(totalCount / limit));
            } catch (err) {
                setError("Failed to load tutors");
            } finally {
                setLoading(false);
            }
        };
        fetchTutors();
    }, [agencyId, page, limit, debouncedSearch]);

    // Status color logic
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

    // Map tutors to rows with status
    const mappedTutors = tutors.map((tutor) => ({
        ...tutor,
        status: tutor.isSuspended ? "Suspended" : tutor.isActive ? "Active" : "Inactive",
    }));

    return (
        <Container size="xl" py="xl">
            <Stack spacing="lg">
                <Group justify="space-between" align="center" w="100%">
                    <Title order={2}>Tutor Management</Title>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
                        Create Tutor
                    </Button>
                </Group>

                <TextInput
                    w="100%"
                    placeholder="Search by name, email, or phone"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    leftSection={<IconSearch size={16} />}
                />

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
                    ) : mappedTutors.length === 0 ? (
                        <Text align="center" py="xl" color="dimmed">
                            No tutors found
                        </Text>
                    ) : (
                        <Table striped highlightOnHover>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Full Name</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Email</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Phone</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date of Birth</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappedTutors.map((tutor) => (
                                    <tr key={tutor.id}>
                                        <td>{`${tutor.firstName} ${tutor.lastName}`.trim()}</td>
                                        <td>{tutor.email}</td>
                                        <td>{tutor.phone}</td>
                                        <td>
                                            <Badge color={getStatusColor(tutor.status)} variant="filled">
                                                {tutor.status}
                                            </Badge>
                                        </td>
                                        <td>{tutor.dateOfBirth ? new Date(tutor.dateOfBirth).toLocaleDateString() : ""}</td>
                                        <td>
                                            <Group spacing="xs">
                                                <ActionIcon styles={{ root: { backgroundColor: "var(--tutiful-primary-light)" } }} onClick={() => { setSelectedTutor(tutor); setEditModalOpen(true); }}>
                                                    <IconEdit size={16} color="white" />
                                                </ActionIcon>
                                                <ActionIcon styles={{ root: { backgroundColor: "var(--tutiful-error)" } }} onClick={() => { setTutorToDelete(tutor); setDeleteModalOpen(true); }}>
                                                    <IconTrash size={16} color="white" />
                                                </ActionIcon>
                                            </Group>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card>

                {totalPages > 1 && (
                    <Group justify="center">
                        <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
                    </Group>
                )}
            </Stack>

            <TutorCreateForm
                opened={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onCreated={() => setPage(1)}
                agencyId={agencyId}
            />
            <EditTutorModal
                opened={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                tutor={selectedTutor}
                onUpdated={() => setPage(1)}
            />
            <Modal
                opened={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Tutor"
                size="sm"
            >
                <Text mb="md">Are you sure you want to delete tutor <b>{tutorToDelete ? `${tutorToDelete.firstName} ${tutorToDelete.lastName}` : ""}</b>?</Text>
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={() => setDeleteModalOpen(false)} disabled={deleting} styles={{ root: { color: "var(--tutiful-gray-700)" } }}>Cancel</Button>
                    <Button styles={{ root: { backgroundColor: "var(--tutiful-error)", color: "white" }, rootHovered: { backgroundColor: "#991b1b" } }} loading={deleting} onClick={async () => {
                        if (!tutorToDelete) return;
                        setDeleting(true);
                        try {
                            await apiClient.delete(`/tutors/${tutorToDelete.id}`);
                            setDeleteModalOpen(false);
                            setTutorToDelete(null);
                            setPage(1);
                        } catch (err) {
                            // handle error
                        } finally {
                            setDeleting(false);
                        }
                    }}>Delete</Button>
                </Group>
            </Modal>
        </Container>
    );
}
