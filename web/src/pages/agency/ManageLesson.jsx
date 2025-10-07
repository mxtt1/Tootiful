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
    NumberInput,
    Textarea,
} from "@mantine/core";
import { TimeInput } from '@mantine/dates';
import { IconEdit, IconTrash, IconSearch, IconPlus, IconClock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../auth/AuthProvider";


export default function ManageLesson() {
    const [allLessons, setAllLessons] = useState([]); // For all lessons without pagination, this is purely for search and active filters
    const [lessons, setLessons] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const { user } = useAuth();

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form data - simplified for testing
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        subjectId: "",
        locationId: "",// Add this
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        studentRate: "",
        totalCap: "",
        isActive: true,
    });
    const [formErrors, setFormErrors] = useState({});

    // Dropdown data - only subjects for now
    const [subjects, setSubjects] = useState([]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch lessons
    useEffect(() => {
        fetchLessons();
    }, [page, limit]);

    // Fetch dropdown data on mount
    useEffect(() => {
        fetchSubjects();
        fetchLocations();
    }, []);

    useEffect(() => {
        filterLessons();
    }, [searchQuery, statusFilter, allLessons]);

    const fetchLessons = async () => {
        setLoading(true);
        setError(null);
        try {
            const agencyId = user?.agencyId || user?.id;
            if (!agencyId) {
                console.error("No agency ID found");
                setError("No agency ID found");
                return;
            }

            const response = await apiClient.get(`/lessons/agency/${agencyId}`);

            const lessonsData = response.data || response || [];
            const totalCount = response.data?.total || lessonsData.length;

            setLessons(lessonsData);
            setAllLessons(response.data);
            setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
        } catch (err) {
            console.error("Fetch lessons error:", err);
            setError("Failed to load lessons");
        } finally {
            setLoading(false);
        }
    };

    const filterLessons = () => {
        let filtered = [...allLessons];

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((lesson) =>
                lesson.title?.toLowerCase().includes(query) ||
                lesson.description?.toLowerCase().includes(query)
            );
        }

        // Status
        if (statusFilter === "active") {
            filtered = filtered.filter((lesson) => lesson.isActive === true);
        } else if (statusFilter === "inactive") {
            filtered = filtered.filter((lesson) => lesson.isActive === false);
        }

        setLessons(filtered);
        setPage(1);
    };
    // Add fetch locations function
    const fetchLocations = async () => {
        try {
            const agencyId = user?.agencyId || user?.id;

            console.log("🔍 Fetching locations for agencyId:", agencyId);

            if (!agencyId) {
                console.error("No agency ID found");
                return;
            }

            //Use apiclient to fetch locations using agency Id
            const response = await apiClient.get(`/agencies/${agencyId}/locations`);

            console.log("Locations response:", response.data);

            setLocations(response.data);
        } catch (err) {
            console.error("Failed to fetch locations:", err);
            notifications.show({
                title: "Warning",
                message: "Could not load locations",
                color: "yellow",
            });
        }
    };



    // Simplified to only fetch subjects
    const fetchSubjects = async () => {
        try {
            const response = await apiClient.get('/lessons/subjects');
            setSubjects(response.data || response || []);
            console.log("Subjects loaded:", response.data || response);
        } catch (err) {
            console.error("Failed to fetch subjects:", err);
            notifications.show({
                title: "Warning",
                message: "Could not load subjects",
                color: "yellow",
            });
        }
    };

    const resetFormData = () => {
        setFormData({
            title: "",
            description: "",
            subjectId: "",
            locationId: "", // Add this
            dayOfWeek: "",
            startTime: "",
            endTime: "",
            studentRate: "",
            totalCap: "",
            isActive: true,
        });
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.title.trim()) errors.title = "Title is required";
        if (formData.title.length < 3) errors.title = "Title must be at least 3 characters long";
        if (!formData.subjectId) errors.subjectId = "Subject is required";
        if (!formData.dayOfWeek) errors.dayOfWeek = "Day of week is required";
        if (!formData.locationId) errors.locationId = "Location is required"; // Add this
        if (!formData.startTime) errors.startTime = "Start time is required";
        if (!formData.endTime) errors.endTime = "End time is required";
        if (!formData.studentRate || formData.studentRate <= 0) errors.studentRate = "Valid student rate is required";
        if (!formData.totalCap || formData.totalCap <= 0) errors.totalCap = "Valid total capacity is required";

        if (formData.startTime && formData.endTime) {
            const start = new Date(`1970-01-01T${formData.startTime}`);
            const end = new Date(`1970-01-01T${formData.endTime}`);
            if (end <= start) {
                errors.endTime = "End time must be after start time";
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateLesson = () => {
        resetFormData();
        setCreateModalOpen(true);
    };

    const handleEditLesson = (lesson) => {
        setEditingLesson(lesson);

        // Helper function to convert time string to Date object
        const parseTimeString = (timeStr) => {
            if (!timeStr) return null;
            const [hours, minutes] = timeStr.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return date;
        };

        setFormData({
            title: lesson.title || "",
            description: lesson.description || "",
            subjectId: lesson.subjectId || "",
            locationId: lesson.locationId || "", // Add this
            dayOfWeek: lesson.dayOfWeek || "",
            startTime: lesson.startTime ? lesson.startTime.substring(0, 5) : "", // "HH:mm:ss" -> "HH:mm"
            endTime: lesson.endTime ? lesson.endTime.substring(0, 5) : "",       // "HH:mm:ss" -> "HH:mm"
            studentRate: lesson.studentRate || "",
            totalCap: lesson.totalCap || "",
            isActive: lesson.isActive !== false,
        });
        setEditModalOpen(true);
    };


    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            const payload = {
                ...formData,
                // Fix: Use formData instead of undefined 'lesson' variable
                startTime: formData.startTime,  // This should already be in "HH:mm:ss" format
                endTime: formData.endTime,      // This should already be in "HH:mm:ss" format
                studentRate: parseFloat(formData.studentRate),
                totalCap: parseInt(formData.totalCap),
                // Add some temporary values for required fields
                locationId: formData.locationId,
                agencyId: user.agencyId || user?.id,
                //tutorId: user.id, // Tarsha take note
            };

            console.log("Submitting payload:", payload);

            if (editingLesson) {
                await apiClient.patch(`/lessons/${editingLesson.id}`, payload);
                notifications.show({
                    title: "Success",
                    message: "Lesson updated successfully",
                    color: "green",
                });
                setEditModalOpen(false);
            } else {
                await apiClient.post('/lessons', payload);
                notifications.show({
                    title: "Success",
                    message: "Lesson created successfully",
                    color: "green",
                });
                setCreateModalOpen(false);
            }

            fetchLessons();
            resetFormData();
            setEditingLesson(null);
        } catch (err) {
            console.error("Submit error:", err);
            notifications.show({
                title: "Error",
                message: err.response?.data?.message || "Failed to save lesson",
                color: "red",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLesson = (lesson) => {
        setLessonToDelete(lesson);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!lessonToDelete) return;

        setDeleting(true);
        try {
            await apiClient.delete(`/lessons/${lessonToDelete.id}`);
            notifications.show({
                title: "Success",
                message: "Lesson deleted successfully",
                color: "green",
            });
            setDeleteModalOpen(false);
            setLessonToDelete(null);
            fetchLessons();
        } catch (err) {
            console.error("Delete error:", err);
            notifications.show({
                title: "Error",
                message: err.response?.data?.message || "Failed to delete lesson",
                color: "red",
            });
        } finally {
            setDeleting(false);
        }
    };

    const getStatusColor = (isActive) => {
        return isActive ? "green" : "gray";
    };

    const getSubjectName = (subjectId) => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name : `Subject ID: ${subjectId}`;
    };

    const getLocationName = (locationId) => {
        const location = locations.find(l => l.id === locationId);
        return location ? location.address : 'Unknown Location';
    };


    const dayOptions = [
        { value: "monday", label: "Monday" },
        { value: "tuesday", label: "Tuesday" },
        { value: "wednesday", label: "Wednesday" },
        { value: "thursday", label: "Thursday" },
        { value: "friday", label: "Friday" },
        { value: "saturday", label: "Saturday" },
        { value: "sunday", label: "Sunday" },
    ];

    const subjectOptions = subjects.map(subject => ({
        value: subject.id,
        label: subject.name
    }));

    const locationOptions = locations.map(location => ({
        value: location.id,
        label: location.address

    }));

    if (loading && lessons.length === 0) {
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
                <Group justify="space-between" align="center">
                    <Title order={2}>Lesson Management</Title>
                    <Button leftSection={<IconPlus size={16} />} onClick={handleCreateLesson}>
                        Create Lesson
                    </Button>
                </Group>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group spacing="md" mb="md">
                        <TextInput
                            placeholder="Search lessons..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftSection={<IconSearch size={16} />}
                            style={{ flexGrow: 1, minWidth: 200 }}
                        />

                        <Select
                            placeholder="All Status"
                            data={[
                                { value: "", label: "All Status" },
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                            ]}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            clearable
                            style={{ minWidth: 150 }}
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
                    ) : lessons.length === 0 ? (
                        <Text align="center" py="xl" color="dimmed">
                            No lessons found
                        </Text>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Title</Table.Th>
                                    <Table.Th>Day & Time</Table.Th>
                                    <Table.Th>Location</Table.Th>
                                    <Table.Th>Subject</Table.Th>
                                    <Table.Th>Capacity</Table.Th>
                                    <Table.Th>Rate</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {lessons.map((lesson) => (
                                    <Table.Tr key={lesson.id}>
                                        <Table.Td>
                                            <div>
                                                <Text weight={500}>{lesson.title}</Text>
                                                {lesson.description && (
                                                    <Text size="sm" color="dimmed">
                                                        {lesson.description.length > 50
                                                            ? `${lesson.description.substring(0, 50)}...`
                                                            : lesson.description}
                                                    </Text>
                                                )}
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <div>
                                                <Text size="sm" transform="capitalize">{lesson.dayOfWeek}</Text>
                                                <Text size="sm" color="dimmed">
                                                    {lesson.startTime} - {lesson.endTime}
                                                </Text>
                                            </div>
                                        </Table.Td>
                                        <Table.Td> {getLocationName(lesson.locationId)}</Table.Td>
                                        <Table.Td> {getSubjectName(lesson.subjectId)}</Table.Td>
                                        <Table.Td>
                                            <Text>
                                                {lesson.currentCap || 0} / {lesson.totalCap}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>${lesson.studentRate}</Table.Td>
                                        <Table.Td>
                                            <Badge color={getStatusColor(lesson.isActive)} variant="filled">
                                                {lesson.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group spacing="xs">
                                                <ActionIcon
                                                    color="blue"
                                                    variant="light"
                                                    onClick={() => handleEditLesson(lesson)}
                                                >
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    color="red"
                                                    variant="light"
                                                    onClick={() => handleDeleteLesson(lesson)}
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

                {totalPages > 1 && (
                    <Group justify="space-between" align="center">
                        <Text size="sm" color="dimmed">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, lessons.length)} results
                        </Text>
                        <Pagination
                            value={page}
                            onChange={setPage}
                            total={totalPages}
                            size="sm"
                        />
                    </Group>
                )}
            </Stack>

            {/* Create/Edit Modal - Simplified */}
            <Modal
                opened={createModalOpen || editModalOpen}
                onClose={() => {
                    setCreateModalOpen(false);
                    setEditModalOpen(false);
                    resetFormData();
                    setEditingLesson(null);
                }}
                title={editingLesson ? "Edit Lesson" : "Create Lesson"}
                size="lg"
            >
                <Stack spacing="md">
                    <Grid>
                        <Grid.Col span={12}>
                            <TextInput
                                label="Lesson Title"
                                placeholder="Enter lesson title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                error={formErrors.title}
                                required
                            />
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Textarea
                                label="Description"
                                placeholder="Enter lesson description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Select
                                label="Location"
                                placeholder={
                                    locationOptions.length === 0 ? "No locations found" : "Select location"
                                }
                                data={locationOptions}
                                value={formData.locationId}
                                onChange={(value) => {
                                    console.log("Location selected:", value);
                                    setFormData({ ...formData, locationId: value });
                                }}
                                error={formErrors.locationId}
                                required
                                searchable
                                nothingFound="No locations available"
                            />
                            {/* Add debug info */}
                            {/* <Text size="xs" c="dimmed">
                                Debug: {locationOptions.length} locations available
                            </Text> */}
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Select
                                label="Subject"
                                placeholder="Select subject"
                                data={subjectOptions}
                                value={formData.subjectId}
                                onChange={(value) => setFormData({ ...formData, subjectId: value })}
                                error={formErrors.subjectId}
                                required
                                searchable
                            />
                        </Grid.Col>

                        <Grid.Col span={4}>
                            <Select
                                label="Day of Week"
                                placeholder="Select day"
                                data={dayOptions}
                                value={formData.dayOfWeek}
                                onChange={(value) => setFormData({ ...formData, dayOfWeek: value })}
                                error={formErrors.dayOfWeek}
                                required
                            />
                        </Grid.Col>

                        {/* Update the TimeInput handlers in the modal section, update: save it as a string format at the end */}
                        <Grid.Col span={4}>
                            <TextInput
                                label="Start Time"
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => {
                                    const value = e.target.value ? `${e.target.value}:00` : "";
                                    console.log("Start time selected:", value);
                                    setFormData((prev) => ({ ...prev, startTime: value }));
                                }}
                                error={formErrors.startTime}
                                required
                            />
                        </Grid.Col>

                        <Grid.Col span={4}>
                            <TextInput
                                label="End Time"
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => {
                                    const value = e.target.value ? `${e.target.value}:00` : "";
                                    console.log("End time selected:", value);
                                    setFormData((prev) => ({ ...prev, endTime: value }));
                                }}
                                error={formErrors.endTime}
                                required
                            />
                        </Grid.Col>

                        <Grid.Col span={6}>
                            <NumberInput
                                label="Student Rate (Monthly)"
                                placeholder="Enter rate"
                                value={formData.studentRate}
                                onChange={(value) => setFormData({ ...formData, studentRate: value })}
                                error={formErrors.studentRate}
                                required
                                min={0}
                                precision={2}
                                prefix="$"
                            />
                        </Grid.Col>

                        <Grid.Col span={6}>
                            <NumberInput
                                label="Total Capacity"
                                placeholder="Enter capacity"
                                value={formData.totalCap}
                                onChange={(value) => setFormData({ ...formData, totalCap: value })}
                                error={formErrors.totalCap}
                                required
                                min={1}
                            />
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Select
                                label="Status"
                                data={[
                                    { value: "true", label: "Active" },
                                    { value: "false", label: "Inactive" },
                                ]}
                                value={formData.isActive ? "true" : "false"}
                                onChange={(value) => setFormData({ ...formData, isActive: value === "true" })}
                                required
                            />
                        </Grid.Col>
                    </Grid>

                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setCreateModalOpen(false);
                                setEditModalOpen(false);
                                resetFormData();
                                setEditingLesson(null);
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            {editingLesson ? "Update Lesson" : "Create Lesson"}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Delete Modal */}
            <Modal
                opened={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setLessonToDelete(null);
                }}
                title="Delete Lesson"
                size="sm"
                centered
            >
                <Stack spacing="md">
                    <Text>
                        Are you sure you want to delete the lesson{" "}
                        <strong>"{lessonToDelete?.title}"</strong>?
                    </Text>

                    <Group justify="flex-end" mt="lg">
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setLessonToDelete(null);
                            }}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button color="red" onClick={confirmDelete} loading={deleting}>
                            Delete Lesson
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}