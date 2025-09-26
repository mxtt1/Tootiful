import React, { useState, useEffect } from "react";
import { Button, Table, Modal, Group, Text, Loader, ActionIcon, Card, Stack, TextInput } from "@mantine/core";
import { IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
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

    const fetchTutors = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/tutors?agencyId=${agencyId}`);
            setTutors(res.data);
        } catch (err) {
            // handle error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (agencyId) fetchTutors();
    }, [agencyId]);

    // Filter tutors by search query (full name, email, phone)
    const filteredTutors = tutors.filter(tutor => {
        const fullName = `${tutor.firstName} ${tutor.lastName}`.toLowerCase();
        const email = tutor.email?.toLowerCase() || "";
        const phone = tutor.phone?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return (
            fullName.includes(query) ||
            email.includes(query) ||
            phone.includes(query)
        );
    });

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack spacing="lg">
                <Group justify="space-between" mb="md">
                    <Text size="xl" fw={700}>Tutor Management</Text>
                    <Button leftSection={<IconEdit size={16} />} styles={{ root: { backgroundColor: 'var(--tutiful-primary)', color: 'white' }, rootHovered: { backgroundColor: 'var(--tutiful-primary-dark)' } }} onClick={() => setCreateModalOpen(true)}>
                        Create Tutor
                    </Button>
                </Group>
                <Group mb="md">
                    <TextInput
                        placeholder="Search by name, email, or phone"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        leftSection={<IconSearch size={16} />}
                        style={{ maxWidth: 300 }}
                    />
                </Group>
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                        <Loader />
                    </div>
                ) : filteredTutors.length === 0 ? (
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
                                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date of Birth</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTutors.map(tutor => (
                                <tr key={tutor.id}>
                                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>{`${tutor.firstName} ${tutor.lastName}`.trim()}</td>
                                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>{tutor.email}</td>
                                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>{tutor.phone}</td>
                                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>{tutor.dateOfBirth ? new Date(tutor.dateOfBirth).toLocaleDateString() : ""}</td>
                                    <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                                        <Group spacing="xs">
                                            <ActionIcon styles={{ root: { backgroundColor: 'var(--tutiful-primary-light)' } }} onClick={() => { setSelectedTutor(tutor); setEditModalOpen(true); }}>
                                                <IconEdit size={16} color="var(--tutiful-primary)" />
                                            </ActionIcon>
                                            <ActionIcon styles={{ root: { backgroundColor: 'var(--tutiful-error)' } }} onClick={() => { setTutorToDelete(tutor); setDeleteModalOpen(true); }}>
                                                <IconTrash size={16} color="white" />
                                            </ActionIcon>
                                        </Group>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
                <TutorCreateForm
                    opened={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onCreated={fetchTutors}
                    agencyId={agencyId}
                />
                <EditTutorModal
                    opened={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    tutor={selectedTutor}
                    onUpdated={fetchTutors}
                />
                <Modal
                    opened={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title="Delete Tutor"
                    size="sm"
                >
                    <Text mb="md">Are you sure you want to delete tutor <b>{tutorToDelete ? `${tutorToDelete.firstName} ${tutorToDelete.lastName}` : ""}</b>?</Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={() => setDeleteModalOpen(false)} disabled={deleting} styles={{ root: { color: 'var(--tutiful-gray-700)' } }}>Cancel</Button>
                        <Button styles={{ root: { backgroundColor: 'var(--tutiful-error)', color: 'white' }, rootHovered: { backgroundColor: '#991b1b' } }} loading={deleting} onClick={async () => {
                            if (!tutorToDelete) return;
                            setDeleting(true);
                            try {
                                await apiClient.delete(`/tutors/${tutorToDelete.id}`);
                                setDeleteModalOpen(false);
                                setTutorToDelete(null);
                                await fetchTutors();
                            } catch (err) {
                                // handle error
                            } finally {
                                setDeleting(false);
                            }
                        }}>Delete</Button>
                    </Group>
                </Modal>
            </Stack>
        </Card>
    );
}
