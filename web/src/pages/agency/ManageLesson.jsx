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
import { IconEdit, IconTrash, IconSearch, IconPlus, IconClock, IconUser } from "@tabler/icons-react";
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
    const [tutors, setTutors] = useState([]);
    const [fetchingTutors, setFetchingTutors] = useState(false);
    const [allAgencyTutors, setAllAgencyTutors] = useState([]);
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
    const [restrictedEdit, setRestrictedEdit] = useState(false);

    //Set Attendance date:
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [selectedLessonAttendance, setSelectedLessonAttendance] = useState(null);
    const [attendanceDates, setAttendanceDates] = useState([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    //Set update Attendance:
    // Add these new state variables after your existing state declarations
    const [attendanceDetailModalOpen, setAttendanceDetailModalOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [updatingAttendance, setUpdatingAttendance] = useState(false);
    const [attendanceTutors, setAttendanceTutors] = useState([]);
    const [attendanceFormData, setAttendanceFormData] = useState({
        tutorId: "",
        isAttended: false,
        notes: ""
    });

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
        tutorRate: "",
        totalCap: "",
        tutorId: "",
        isActive: true,
        lessonType: "", // Default to Sem 1
        startDate: "", // Add this
        endDate: "", // Add this
    });
    const [formErrors, setFormErrors] = useState({});

    // Dropdown data - only subjects for now
    const [subjects, setSubjects] = useState([]);

    // checking for tutorConflicts.
    const [tutorConflicts, setTutorConflicts] = useState([]);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

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
    }, []);

    // Fetch dropdown data on mount
    useEffect(() => {
        fetchSubjects();
        fetchLocations();
    }, []);

    useEffect(() => {
        filterLessons();
    }, [searchQuery, statusFilter, allLessons]);

    useEffect(() => {
        const fetchAllAgencyTutors = async () => {
            try {
                const agencyId = user?.agencyId || user?.id;
                if (!agencyId) return;

                console.log("Fetching all agency tutors...");
                const response = await apiClient.get(`/tutors?agencyId=${agencyId}`);
                const tutorsData = response.data?.data || response.data || [];
                console.log(`Found ${tutorsData.length} tutors in agency`);
                setAllAgencyTutors(tutorsData);
            } catch (err) {
                console.error("Failed to fetch agency tutors:", err);
            }
        };

        if (user) {
            fetchAllAgencyTutors();
        }
    }, [user]);

    // fetch tutors when subject changes
    useEffect(() => {
        if (formData.subjectId) {
            // Always clear tutor when subject changes in edit mode
            // Only preserve tutor when opening the modal initially
            const isInitialLoad = editingLesson && editingLesson.subjectId === formData.subjectId;
            fetchTutorsBySubject(formData.subjectId, !isInitialLoad);
        } else {
            setTutors([]);
            setFormData(prev => ({ ...prev, tutorId: "" }));
        }
    }, [formData.subjectId]);

    // Add this useEffect to check for conflicts when relevant form data changes
    useEffect(() => {
        const { tutorId, dayOfWeek, startTime, endTime } = formData;

        if (tutorId && dayOfWeek && startTime && endTime) {
            setCheckingAvailability(true);

            // Small delay to avoid checking on every keystroke
            const timer = setTimeout(() => {
                const isAvailable = checkTutorAvailability(tutorId, dayOfWeek, startTime, endTime);

                if (!isAvailable) {
                    setFormErrors(prev => ({
                        ...prev,
                        tutorId: `Tutor has scheduling conflicts. See details below.`
                    }));
                } else {
                    // Clear tutor error if no conflicts
                    setFormErrors(prev => {
                        const { tutorId, ...rest } = prev;
                        return rest;
                    });
                }

                setCheckingAvailability(false);
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setTutorConflicts([]);
            setCheckingAvailability(false);
        }
    }, [formData.tutorId, formData.dayOfWeek, formData.startTime, formData.endTime, allLessons, editingLesson]);

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
            setAllLessons(lessonsData);
            setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
        } catch (err) {
            console.error("Fetch lessons error:", err);
            setError("Failed to load lessons");
        } finally {
            setLoading(false);
        }
    };

    const fetchTutorsBySubject = async (subjectId, shouldClearTutor = true) => {
        if (!subjectId) {
            setTutors([]);
            setFormData(prev => ({ ...prev, tutorId: "" }));
            return;
        }

        setFetchingTutors(true);
        try {
            const agencyId = user?.agencyId || user?.id;
            const url = `/tutors/available-for-subject?subjectId=${subjectId}&agencyId=${agencyId}`;

            const response = await apiClient.get(url);
            const tutorsData = response.data?.data || response.data || response || [];

            // Always set the tutors to what the API returns
            setTutors(Array.isArray(tutorsData) ? tutorsData : []);

            // Only clear tutor if subject changes
            if (shouldClearTutor) {
                setFormData(prev => ({ ...prev, tutorId: "" }));
            }
            // If we're NOT clearing tutor, ensure the current tutor exists in the new list
            else if (formData.tutorId) {
                const tutorExists = tutorsData.some(t => t.id === formData.tutorId);
                if (!tutorExists) {
                    // If current tutor is not in the new subject's tutors, clear it
                    setFormData(prev => ({ ...prev, tutorId: "" }));
                    notifications.show({
                        title: "Note",
                        message: "Current tutor is not available for this subject",
                        color: "yellow",
                    });
                }
            }
        } catch (err) {
            console.error("Failed to fetch tutors:", err);
            notifications.show({
                title: "Warning",
                message: "Could not load tutors for the selected subject",
                color: "yellow",
            });
            setTutors([]);
        } finally {
            setFetchingTutors(false);
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

    // Add this function to check for tutor conflicts
    const checkTutorAvailability = (tutorId, dayOfWeek, startTime, endTime) => {
        if (!tutorId || !dayOfWeek || !startTime || !endTime) {
            setTutorConflicts([]);
            return true;
        }

        // Filter lessons for the same tutor on the same day
        const conflictingLessons = allLessons.filter(lesson => {
            // Skip current lesson when editing
            if (editingLesson && lesson.id === editingLesson.id) {
                return false;
            }

            // Check if same tutor, same day, and lesson is active
            if (lesson.tutorId !== tutorId ||
                lesson.dayOfWeek?.toLowerCase() !== dayOfWeek.toLowerCase() ||
                !lesson.isActive) {
                return false;
            }

            // Check for time overlap
            const newStart = new Date(`1970-01-01T${startTime}`);
            const newEnd = new Date(`1970-01-01T${endTime}`);
            const existingStart = new Date(`1970-01-01T${lesson.startTime}`);
            const existingEnd = new Date(`1970-01-01T${lesson.endTime}`);

            // Times overlap if: new start < existing end AND new end > existing start
            return newStart < existingEnd && newEnd > existingStart;
        });

        const conflicts = conflictingLessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            timeSlot: `${lesson.startTime?.substring(0, 5)} - ${lesson.endTime?.substring(0, 5)}`,
            day: lesson.dayOfWeek
        }));

        setTutorConflicts(conflicts);
        return conflicts.length === 0;
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
            tutorId: "",
            isActive: true,
            lessonType: "",
        });
        setFormErrors({});
        setTutorConflicts([]); // ADD: Clear conflicts
        setCheckingAvailability(false); // ADD: Reset checking state
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.title.trim()) errors.title = "Title is required";
        if (formData.title.length < 3) errors.title = "Title must be at least 3 characters long";
        if (!formData.subjectId) errors.subjectId = "Subject is required";
        if (!formData.dayOfWeek) errors.dayOfWeek = "Day of week is required";
        if (!formData.locationId) errors.locationId = "Location is required"; // Add this
        if (!formData.lessonType) errors.lessonType = "Lesson type is required"; // Add this
        if (formData.isActive && !formData.tutorId) {
            errors.tutorId = "Assigned tutor is required for active lessons";
        }
        if (!formData.startTime) errors.startTime = "Start time is required";
        if (!formData.endTime) errors.endTime = "End time is required";
        if (!formData.studentRate || formData.studentRate <= 0) errors.studentRate = "Valid student rate is required";
        if (!formData.tutorRate || formData.tutorRate <= 0) errors.tutorRate = "Valid tutor rate is required";
        if (!formData.totalCap || formData.totalCap <= 0) errors.totalCap = "Valid total capacity is required";
        if (!formData.startDate) errors.startDate = "Start date is required";
        if (!formData.endDate) errors.endDate = "End date is required";


        if (tutorConflicts.length > 0) {
            errors.tutorId = "Tutor has scheduling conflicts. Please resolve before saving.";
        }

        if (formData.startTime && formData.endTime) {
            const start = new Date(`1970-01-01T${formData.startTime}`);
            const end = new Date(`1970-01-01T${formData.endTime}`);
            if (end <= start) {
                errors.endTime = "End time must be after start time";
            }
        }

        if (formData.startDate && formData.endDate) {
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            if (endDate < startDate) {
                errors.endDate = "End date must be on or after start date";
            }
        }


        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateLesson = () => {
        resetFormData();
        setCreateModalOpen(true);
    };

    const handleViewAttendanceDates = async (lesson) => {
        console.log("🔍 Checking lesson:", lesson.title, "currentCap:", lesson.currentCap);

        if (lesson.currentCap === 0) {
            notifications.show({
                title: "No Students Enrolled",
                message: "This lesson has no enrolled students.",
                color: "yellow",
            });
            return;
        }

        setSelectedLessonAttendance(lesson);
        setLoadingAttendance(true);
        setAttendanceModalOpen(true);

        try {
            console.log(`📋 Fetching attendance dates for lesson: ${lesson.id}`);

            // Fetch all attendance for this lesson (we'll start with all, then filter to unpaid)
            const response = await apiClient.get(`/lessons/${lesson.id}/attendance/unpaid`);
            const attendanceData = response.data?.data || response.data || [];

            console.log(`📊 Found ${attendanceData.length} attendance records:`, attendanceData);

            // Sort by date (newest first)
            const sortedAttendance = attendanceData.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );

            setAttendanceDates(sortedAttendance);

        } catch (error) {
            console.error("❌ Error fetching attendance dates:", error);
            notifications.show({
                title: "Error",
                message: "Failed to load attendance dates",
                color: "red",
            });
            setAttendanceDates([]);
        } finally {
            setLoadingAttendance(false);
        }
    };

    // Add this function after your existing handleViewAttendanceDates function
    const handleAttendanceDetailClick = async (attendance) => {
        console.log("📋 Opening attendance detail for:", attendance);

        setSelectedAttendance(attendance);
        setAttendanceFormData({
            tutorId: attendance.tutorId || "",
            isAttended: attendance.isAttended || false,
            notes: attendance.notes || ""
        });

        // Fetch available tutors for this lesson's subject
        if (selectedLessonAttendance?.subjectId) {
            await fetchTutorsForAttendance(selectedLessonAttendance.subjectId);
        }

        setAttendanceDetailModalOpen(true);
    };

    // Add function to fetch tutors for attendance update
    const fetchTutorsForAttendance = async (subjectId) => {
        try {
            const agencyId = user?.agencyId || user?.id;
            const url = `/tutors/available-for-subject?subjectId=${subjectId}&agencyId=${agencyId}`;

            const response = await apiClient.get(url);
            const tutorsData = response.data?.data || response.data || [];

            setAttendanceTutors(Array.isArray(tutorsData) ? tutorsData : []);
            console.log(`📚 Loaded ${tutorsData.length} tutors for attendance update`);

        } catch (error) {
            console.error("❌ Error fetching tutors for attendance:", error);
            notifications.show({
                title: "Warning",
                message: "Could not load available tutors",
                color: "yellow",
            });
            setAttendanceTutors([]);
        }
    };

    // Add function to update attendance
    const handleUpdateAttendance = async () => {
        if (!selectedAttendance) return;

        setUpdatingAttendance(true);

        try {
            console.log("📝 Updating attendance:", selectedAttendance.id, "with data:", attendanceFormData);

            const updatePayload = {
                tutorId: attendanceFormData.tutorId || null,
                isAttended: attendanceFormData.isAttended,
                notes: attendanceFormData.notes || null
            };

            // Update the attendance record
            await apiClient.patch(`/lessons/${selectedAttendance.id}/attendance`, updatePayload);

            notifications.show({
                title: "Success",
                message: "Attendance updated successfully",
                color: "green",
            });

            // Close the detail modal
            setAttendanceDetailModalOpen(false);
            setSelectedAttendance(null);

            // Refresh the attendance dates
            await handleViewAttendanceDates(selectedLessonAttendance);

        } catch (error) {
            console.error("❌ Error updating attendance:", error);
            notifications.show({
                title: "Error",
                message: error.response?.data?.message || "Failed to update attendance",
                color: "red",
            });
        } finally {
            setUpdatingAttendance(false);
        }
    };

    // Update your handleEditLesson function to check for restricted lessons
    const handleEditLesson = (lesson) => {
        console.log("✏️ Edit clicked for lesson:", lesson.title, "currentCap:", lesson.currentCap);

        // Check if lesson has enrolled students
        if (lesson.currentCap > 0) {
            console.log("🔒 Lesson has enrolled students, showing attendance dates first");
            handleViewAttendanceDates(lesson);
            return; // Don't open edit modal, show attendance first
        }

        // Original edit logic for lessons without students
        console.log("📝 Opening edit modal for lesson without students");
        setEditingLesson(lesson);
        setRestrictedEdit(lesson.currentCap > 0);

        // ... rest of your existing handleEditLesson code stays the same
        if (lesson.tutorId) {
            const currentTutor = allAgencyTutors.find(t => t.id === lesson.tutorId);
            if (currentTutor) {
                setTutors(prev => {
                    if (!prev.some(t => t.id === lesson.tutorId)) {
                        return [...prev, currentTutor];
                    }
                    return prev;
                });
            }
        }

        setFormData({
            title: lesson.title || "",
            description: lesson.description || "",
            subjectId: lesson.subjectId || "",
            locationId: lesson.locationId || "",
            dayOfWeek: lesson.dayOfWeek || "",
            startTime: lesson.startTime ? lesson.startTime.substring(0, 5) : "",
            endTime: lesson.endTime ? lesson.endTime.substring(0, 5) : "",
            studentRate: lesson.studentRate || "",
            tutorRate: lesson.tutorRate || "",
            totalCap: lesson.totalCap || "",
            tutorId: lesson.tutorId || "",
            isActive: lesson.isActive !== false,
            lessonType: lesson.lessonType || "",
            startDate: lesson.startDate ? lesson.startDate.substring(0, 10) : "",
            endDate: lesson.endDate ? lesson.endDate.substring(0, 10) : "",
        });

        if (lesson.subjectId) {
            fetchTutorsBySubject(lesson.subjectId, false);
        }
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
                tutorRate: parseFloat(formData.tutorRate),
                totalCap: parseInt(formData.totalCap),
                // Add some temporary values for required fields
                locationId: formData.locationId,
                agencyId: user.agencyId || user?.id,
                tutorId: formData.tutorId || null, // allow null for inactive lessons
                // lessonType: formData.lessonType || "Sem 1",
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
        return subject ? `${subject.name} (${subject.gradeLevel})` : `Subject ID: ${subjectId}`;
    };

    const getLocationName = (locationId) => {
        const location = locations.find(l => l.id === locationId);
        return location ? location.address : 'Unknown Location';
    };

    const getTutorName = (tutorId) => {
        if (!tutorId) return 'No Tutor Assigned';
        const tutor = allAgencyTutors.find(t => t.id === tutorId);

        // only return tutor details if found in agency tutors
        if (tutor) {
            return `${tutor.firstName} ${tutor.lastName}`;
        }

        // if tutor id exists but not in agency, treat as no tutor assigned
        return 'No Tutor Assigned';
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

    const lessonType = [
        { value: "Sem 1", label: "Semester 1" },
        { value: "Sem 2", label: "Semester 2" },
    ];

    // Update the subjectOptions mapping to include grade level
    const subjectOptions = subjects.map(subject => ({
        value: subject.id,
        label: `${subject.name} (${subject.gradeLevel})` // Add grade level in brackets
    }));

    const locationOptions = locations.map(location => ({
        value: location.id,
        label: location.address

    }));

    const tutorOptions = tutors.map(tutor => ({
        value: tutor.id,
        label: `${tutor.firstName} ${tutor.lastName}`
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

    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedLessons = lessons.slice(startIdx, endIdx);

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
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Tutor</Table.Th>
                                    <Table.Th>Capacity</Table.Th>
                                    <Table.Th>Student Rate</Table.Th>
                                    <Table.Th>Tutor Rate</Table.Th>
                                    <Table.Th>Start Date</Table.Th>
                                    <Table.Th>End Date</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {paginatedLessons.map((lesson) => (
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
                                        <Table.Td>{lesson.lessonType || 'N/A'}</Table.Td>
                                        <Table.Td>
                                            <div>
                                                <Text size="sm" weight={500}>
                                                    {getTutorName(lesson.tutorId)}
                                                </Text>
                                                {/* {lesson.tutorId && (
                                                    <Text size="xs" color="dimmed">
                                                        ID: {lesson.tutorId}
                                                    </Text>
                                                )} */}
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text>
                                                {lesson.currentCap || 0} / {lesson.totalCap}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>${lesson.studentRate}</Table.Td>
                                        <Table.Td>${lesson.tutorRate}</Table.Td>
                                        <Table.Td>{lesson.startDate ? new Date(lesson.startDate).toLocaleDateString() : 'N/A'}</Table.Td>
                                        <Table.Td>{lesson.endDate ? new Date(lesson.endDate).toLocaleDateString() : 'N/A'}</Table.Td>
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
                            Showing {startIdx + 1} to {Math.min(endIdx, lessons.length)} of {lessons.length} results
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
                                disabled={restrictedEdit}
                            />
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Textarea
                                label="Description"
                                placeholder="Enter lesson description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                disabled={restrictedEdit}
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
                                nothingfound="No locations available"
                                disabled={restrictedEdit}
                            />
                            {/* Add debug info */}
                            {/* <Text size="xs" c="dimmed">
                                Debug: {locationOptions.length} locations available
                            </Text> */}
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Select
                                label="Tutor"
                                placeholder={
                                    fetchingTutors
                                        ? "Loading tutors..."
                                        : tutors.length === 0
                                            ? "Select a subject first"
                                            : formData.isActive
                                                ? "Select tutor (required for active lessons)"
                                                : "Select tutor (optional for inactive lessons)"
                                }
                                data={tutorOptions}
                                value={formData.tutorId}
                                onChange={(value) => setFormData({ ...formData, tutorId: value })}
                                error={formErrors.tutorId}
                                required={formData.isActive} // Only required when active
                                disabled={fetchingTutors || tutors.length === 0}
                                leftSection={fetchingTutors ? <Loader size="sm" /> : <IconUser size={16} />}
                                nothingfound={
                                    formData.subjectId
                                        ? "No tutors available for this subject"
                                        : "Select a subject first"
                                }
                                description={
                                    formData.isActive
                                        ? "Tutor is required for active lessons"
                                        : "Tutor is optional for inactive lessons"
                                }
                            />
                            {tutorConflicts.length > 0 && (
                                <Alert color="red" mt="xs" title="⚠️ Scheduling Conflicts Detected">
                                    <Text size="sm" mb="xs">
                                        This tutor is already assigned to the following lessons on {formData.dayOfWeek}:
                                    </Text>
                                    <Stack spacing="xs">
                                        {tutorConflicts.map((conflict, index) => (
                                            <div key={index} style={{
                                                padding: "8px",
                                                backgroundColor: "#ffe6e6",
                                                borderRadius: "4px",
                                                border: "1px solid #ffcccc"
                                            }}>
                                                <Text size="sm" weight={500}>
                                                    📚 {conflict.title}
                                                </Text>
                                                <Text size="xs" color="dimmed">
                                                    🕐 {conflict.timeSlot}
                                                </Text>
                                            </div>
                                        ))}
                                    </Stack>
                                </Alert>
                            )}
                            {formData.subjectId && tutors.length === 0 && !fetchingTutors && (
                                <Text size="sm" color="orange" mt={4}>
                                    No tutors found for this subject in your agency
                                </Text>
                            )}
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
                                disabled={restrictedEdit}
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
                                disabled={restrictedEdit}
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
                                disabled={restrictedEdit}
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
                                disabled={restrictedEdit}
                            />
                        </Grid.Col>


                        <Grid.Col span={4}>
                            <Select
                                label="Lesson Type"
                                placeholder="Select Lesson Type"
                                data={lessonType}
                                value={formData.lessonType}
                                onChange={(value) => setFormData({ ...formData, lessonType: value })}
                                error={formErrors.lessonType}
                                required
                                disabled={restrictedEdit}
                            />
                        </Grid.Col>

                        <Grid.Col span={4}>
                            <TextInput
                                label="Start Date"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                error={formErrors.startDate}
                                required
                                disabled={restrictedEdit}
                            />
                        </Grid.Col>

                        <Grid.Col span={4}>
                            <TextInput
                                label="End Date"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                error={formErrors.endDate}
                                required
                                disabled={restrictedEdit}
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
                                disabled={restrictedEdit}
                            />
                        </Grid.Col>

                        <Grid.Col span={6}>
                            <NumberInput
                                label="Tutor Rate (Monthly)"
                                placeholder="Enter rate"
                                value={formData.tutorRate}
                                onChange={(value) => setFormData({ ...formData, tutorRate: value })}
                                error={formErrors.tutorRate}
                                required
                                min={0}
                                precision={2}
                                prefix="$"
                                disabled={restrictedEdit}
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
                                disabled={restrictedEdit}
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
                                disabled={restrictedEdit}
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
            <Modal
                opened={attendanceModalOpen}
                onClose={() => {
                    setAttendanceModalOpen(false);
                    setSelectedLessonAttendance(null);
                    setAttendanceDates([]);
                }}
                title="Attendance Dates"
                size="md"
            >
                <Stack spacing="md">
                    {selectedLessonAttendance && (
                        <Card withBorder padding="sm">
                            <Text size="lg" fw={600} mb="xs">
                                📚 {selectedLessonAttendance.title}
                            </Text>
                            <Text size="sm" c="dimmed">
                                🔒 This lesson has {selectedLessonAttendance.currentCap} enrolled students
                            </Text>
                        </Card>
                    )}

                    <div>
                        <Text size="md" fw={500} mb="sm">
                            📅 All Attendance Dates:
                        </Text>

                        {loadingAttendance ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                                <Loader size="sm" />
                            </div>
                        ) : attendanceDates.length === 0 ? (
                            <Alert color="yellow" title="No Dates Found">
                                No attendance records found for this lesson.
                            </Alert>
                        ) : (
                            <Card withBorder padding="sm" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                <Stack spacing="xs">
                                    {attendanceDates.map((attendance, index) => (
                                        <div
                                            key={attendance.id || index}
                                            style={{
                                                padding: "12px",
                                                borderRadius: "6px",
                                                border: "1px solid #e9ecef",
                                                backgroundColor: "#f8f9fa",
                                                cursor: "pointer", // ✅ Make it look clickable
                                                transition: "background-color 0.2s"
                                            }}
                                            onClick={() => handleAttendanceDetailClick(attendance)} // ✅ Make it clickable
                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#e2e6ea"}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                        >
                                            <Group justify="space-between">
                                                <div>
                                                    <Text size="sm" fw={500}>
                                                        📅 {new Date(attendance.date).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </Text>
                                                    <Text size="xs" c="dimmed" mt="xs">
                                                        👨‍🏫 {attendance.tutorName || 'No tutor assigned'}
                                                    </Text>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <Badge
                                                        color={attendance.isAttended ? "green" : "gray"}
                                                        size="sm"
                                                    >
                                                        {attendance.isAttended ? "Attended" : "Scheduled"}
                                                    </Badge>
                                                    <Text size="xs" c="dimmed" mt="xs">
                                                        💰 ${attendance.tutorRate || 0}
                                                    </Text>
                                                </div>
                                            </Group>

                                            {/* ✅ Add click hint */}
                                            <Text size="xs" c="blue" mt="xs" style={{ fontStyle: "italic" }}>
                                                Click to edit details →
                                            </Text>
                                        </div>
                                    ))}
                                </Stack>
                            </Card>
                        )}
                    </div>

                    <Group justify="flex-end" mt="lg">
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setAttendanceModalOpen(false);
                                setSelectedLessonAttendance(null);
                                setAttendanceDates([]);
                            }}
                        >
                            Close
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            {/* ✅ NEW: Simple Attendance Dates Modal */}
            <Modal
                opened={attendanceDetailModalOpen}
                onClose={() => {
                    setAttendanceDetailModalOpen(false);
                    setSelectedAttendance(null);
                    setAttendanceFormData({ tutorId: "", isAttended: false, notes: "" });
                    setAttendanceTutors([]);
                }}
                title="Edit Attendance Details"
                size="md"
            >
                <Stack spacing="md">
                    {selectedAttendance && (
                        <Card withBorder padding="sm">
                            <Group justify="space-between" mb="xs">
                                <div>
                                    <Text size="lg" fw={600}>
                                        📅 {new Date(selectedAttendance.date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        📚 {selectedLessonAttendance?.title}
                                    </Text>
                                </div>
                                <Badge
                                    color={selectedAttendance.isPaid ? "green" : "orange"}
                                    size="sm"
                                >
                                    {selectedAttendance.isPaid ? "Paid" : "Unpaid"}
                                </Badge>
                            </Group>

                            <Group spacing="md">
                                <Text size="sm">
                                    <strong>Session ID:</strong> {String(selectedAttendance.id).slice(0, 8)}...
                                </Text>
                                <Text size="sm">
                                    <strong>Rate:</strong> ${selectedAttendance.tutorRate || 0}
                                </Text>
                            </Group>
                        </Card>
                    )}

                    <div>
                        <Text size="md" fw={500} mb="sm">
                            📝 Edit Session Details:
                        </Text>

                        <Stack spacing="md">
                            <Select
                                label="Assigned Tutor"
                                placeholder="Select tutor for this session"
                                data={attendanceTutors.map(tutor => ({
                                    value: tutor.id,
                                    label: `${tutor.firstName} ${tutor.lastName}`
                                }))}
                                value={attendanceFormData.tutorId}
                                onChange={(value) => setAttendanceFormData(prev => ({
                                    ...prev,
                                    tutorId: value
                                }))}
                                searchable
                                clearable
                                description="Change the tutor for this specific session"
                            />

                            {/* <Select
                                label="Attendance Status"
                                data={[
                                    { value: "false", label: "Not Attended" },
                                    { value: "true", label: "Attended" }
                                ]}
                                value={attendanceFormData.isAttended.toString()}
                                onChange={(value) => setAttendanceFormData(prev => ({
                                    ...prev,
                                    isAttended: value === "true"
                                }))}
                                description="Mark whether the session was attended"
                            />

                            <Textarea
                                label="Notes (Optional)"
                                placeholder="Add any notes about this session..."
                                value={attendanceFormData.notes}
                                onChange={(e) => setAttendanceFormData(prev => ({
                                    ...prev,
                                    notes: e.target.value
                                }))}
                                rows={3}
                                description="Optional notes about tutor changes, attendance, etc."
                            /> */}
                        </Stack>
                    </div>

                    {/* ✅ Show warning if changing tutor */}
                    {selectedAttendance && attendanceFormData.tutorId !== selectedAttendance.tutorId && (
                        <Alert color="yellow" title="⚠️ Tutor Change Detected">
                            <Text size="sm">
                                You are changing the tutor for this session from{" "}
                                <strong>{selectedAttendance.tutorName || "Unknown"}</strong> to{" "}
                                <strong>
                                    {attendanceFormData.tutorId
                                        ? attendanceTutors.find(t => t.id === attendanceFormData.tutorId)?.firstName + " " +
                                        attendanceTutors.find(t => t.id === attendanceFormData.tutorId)?.lastName
                                        : "No tutor assigned"
                                    }
                                </strong>.
                            </Text>
                            <Text size="sm" mt="xs">
                                This will affect payment calculations for this specific session.
                            </Text>
                        </Alert>
                    )}

                    <Group justify="flex-end" mt="lg">
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setAttendanceDetailModalOpen(false);
                                setSelectedAttendance(null);
                                setAttendanceFormData({ tutorId: "", isAttended: false, notes: "" });
                                setAttendanceTutors([]);
                            }}
                            disabled={updatingAttendance}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="blue"
                            onClick={handleUpdateAttendance}
                            loading={updatingAttendance}
                            leftSection={<IconEdit size={16} />}
                        >
                            Update Attendance
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}