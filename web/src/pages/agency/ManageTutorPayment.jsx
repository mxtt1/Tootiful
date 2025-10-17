import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import {
    Table,
    Button,
    TextInput,
    Loader,
    Text,
    Group,
    Stack,
    Badge,
    Container,
    Title,
    Card,
    Alert,
    Modal,
    SegmentedControl,
    Pagination,
    Select,
} from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { IconSearch, IconCurrencyDollar, IconCalendar } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../auth/AuthProvider";

export default function ManageTutorPayment() {
    const [allPayments, setAllPayments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [monthFilter, setMonthFilter] = useState(null);
    const [activeTab, setActiveTab] = useState("unpaid"); // unpaid | paid

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [paginatedPayments, setPaginatedPayments] = useState([]);
    const [totalPages, setTotalPages] = useState(0);

    // Modal states
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [paymentToPay, setPaymentToPay] = useState(null);
    const [processing, setProcessing] = useState(false);

    // State for counts
    const [unpaidCount, setUnpaidCount] = useState(0);
    const [paidCount, setPaidCount] = useState(0);

    useEffect(() => {
        fetchPayments();
    }, [activeTab]);

    useEffect(() => {
        filterPayments();
    }, [searchQuery, monthFilter, allPayments]);

    // ✅ NEW: Update pagination when filtered payments change
    useEffect(() => {
        updatePagination();
    }, [payments, currentPage, pageSize]);

    // ✅ NEW: Reset to page 1 when switching tabs or applying filters
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, monthFilter]);

    // ✅ FIXED: Handle both attendance records and TutorPayment records
    const aggregatePaymentsByTutorMonth = (payments) => {
        const tutorMonthMap = new Map();

        payments.forEach(payment => {
            // ✅ FIX: Handle different date formats and sources
            let dateToUse;
            if (payment.attendanceDate) {
                dateToUse = new Date(payment.attendanceDate);
            } else if (payment.paymentDate) {
                dateToUse = new Date(payment.paymentDate);
            } else if (payment.createdAt) {
                dateToUse = new Date(payment.createdAt);
            } else {
                dateToUse = new Date(); // Fallback to current date
            }

            // ✅ Check if date is valid
            if (isNaN(dateToUse.getTime())) {
                console.warn('Invalid date found in payment:', payment);
                dateToUse = new Date(); // Fallback to current date
            }

            const monthKey = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
            const tutorMonthKey = `${payment.tutorId}-${monthKey}`;

            if (!tutorMonthMap.has(tutorMonthKey)) {
                tutorMonthMap.set(tutorMonthKey, {
                    id: `summary-${payment.tutorId}-${monthKey}`,
                    tutorId: payment.tutorId,
                    tutorName: payment.tutorName,
                    tutorFirstName: payment.tutorFirstName,
                    tutorLastName: payment.tutorLastName,
                    month: monthKey,
                    monthDisplay: dateToUse.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                    paymentAmount: 0,
                    sessionCount: 0,
                    paidSessionsCount: 0,
                    paymentStatus: 'Not Paid',
                    paymentDate: null,
                    attendanceDate: dateToUse.toISOString(),
                    sessions: [],
                    earliestDate: dateToUse.toISOString(),
                    latestDate: dateToUse.toISOString()
                });
            }

            const summary = tutorMonthMap.get(tutorMonthKey);

            summary.paymentAmount += parseFloat(payment.paymentAmount || 0);
            summary.sessionCount += 1;
            summary.sessions.push(payment);

            // Count paid sessions
            if (payment.paymentStatus === 'Paid' || payment.isPaid === true) {
                summary.paidSessionsCount += 1;
                if (!summary.paymentDate || new Date(payment.paymentDate) > new Date(summary.paymentDate)) {
                    summary.paymentDate = payment.paymentDate;
                }
            }

            // Update date range
            const currentDateISO = dateToUse.toISOString();
            if (new Date(currentDateISO) < new Date(summary.earliestDate)) {
                summary.earliestDate = currentDateISO;
            }
            if (new Date(currentDateISO) > new Date(summary.latestDate)) {
                summary.latestDate = currentDateISO;
                summary.attendanceDate = currentDateISO;
            }
        });

        return Array.from(tutorMonthMap.values()).map(summary => {
            // Determine status based on sessions
            if (summary.paidSessionsCount === summary.sessionCount && summary.sessionCount > 0) {
                summary.paymentStatus = 'Paid';
            } else {
                summary.paymentStatus = 'Not Paid';
            }
            return summary;
        }).sort((a, b) => {
            if (a.tutorName !== b.tutorName) {
                return a.tutorName.localeCompare(b.tutorName);
            }
            return b.month.localeCompare(a.month);
        });
    };

    // ✅ UPDATED: Handle aggregation vs individual records based on tab
    const fetchPayments = async () => {
        setLoading(true);
        setError(null);
        try {
            const agencyId = user?.agencyId || user?.id;
            if (!agencyId) {
                console.error("No agency ID found");
                setError("No agency ID found");
                return;
            }

            console.log(`🚀 Fetching ${activeTab} payments for agency:`, agencyId);

            let endpoint;
            if (activeTab === "paid") {
                endpoint = `/tutorPayments/agency/${agencyId}/payments`;
            } else {
                endpoint = `/tutorPayments/agency/${agencyId}`;
            }

            const response = await apiClient.get(endpoint);
            const rawPayments = response.data?.data || response.data || [];

            // ✅ FIX: For paid tab, show individual records. For unpaid, aggregate by month
            let processedPayments;
            if (activeTab === "paid") {
                // Show individual payment records as-is
                processedPayments = rawPayments.map(payment => ({
                    ...payment,
                    paymentStatus: 'Paid' // Ensure all paid records show as paid
                }));
            } else {
                // Aggregate unpaid payments by tutor/month
                processedPayments = aggregatePaymentsByTutorMonth(rawPayments);
            }

            console.log("🎯 Processed Payments:", processedPayments);

            setAllPayments(processedPayments);
            setPayments(processedPayments);

            // Update counts
            if (activeTab === "paid") {
                setPaidCount(processedPayments.length);
            } else {
                setUnpaidCount(processedPayments.length);
            }

        } catch (err) {
            console.error("❌ Fetch payments error:", err);
            setError("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    // ✅ UPDATED: Fetch counts properly for both types
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const agencyId = user?.agencyId || user?.id;
                if (!agencyId) return;

                const [unpaidRes, paidRes] = await Promise.all([
                    apiClient.get(`/tutorPayments/agency/${agencyId}`),
                    apiClient.get(`/tutorPayments/agency/${agencyId}/payments`)
                ]);

                const unpaidData = unpaidRes.data?.data || [];
                const paidData = paidRes.data?.data || [];

                // Unpaid: aggregate by month, Paid: individual records
                const unpaidAggregated = aggregatePaymentsByTutorMonth(unpaidData);
                const paidIndividual = paidData; // Individual records

                setUnpaidCount(unpaidAggregated.length);
                setPaidCount(paidIndividual.length);
            } catch (err) {
                console.error("Error fetching counts:", err);
            }
        };

        fetchCounts();
    }, [user?.agencyId, user?.id]);

    // ✅ UPDATED: Filter function that works for both individual and aggregated records
    const filterPayments = () => {
        let filtered = [...allPayments];

        // Search by tutor name
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.tutorName?.toLowerCase().includes(q) ||
                    p.tutorFirstName?.toLowerCase().includes(q) ||
                    p.tutorLastName?.toLowerCase().includes(q)
            );
        }

        // Filter by month/year
        if (monthFilter) {
            try {
                const filterDate = monthFilter instanceof Date ? monthFilter : new Date(monthFilter);
                if (!isNaN(filterDate.getTime())) {
                    const selectedMonth = `${filterDate.getFullYear()}-${String(filterDate.getMonth() + 1).padStart(2, '0')}`;

                    filtered = filtered.filter((record) => {
                        if (activeTab === "paid") {
                            // For paid records, check against payment date
                            const paymentDate = new Date(record.paymentDate || record.attendanceDate || record.createdAt);
                            const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                            return paymentMonth === selectedMonth;
                        } else {
                            // For unpaid summaries, check against month field
                            return record.month === selectedMonth;
                        }
                    });
                }
            } catch (error) {
                console.error("Error parsing month filter date", error);
            }
        }

        console.log("🎯 Filtered records:", filtered);
        setPayments(filtered);
    };

    // ✅ NEW: Pagination logic
    const updatePagination = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginated = payments.slice(startIndex, endIndex);

        setPaginatedPayments(paginated);
        setTotalPages(Math.ceil(payments.length / pageSize));
    };

    // ✅ NEW: Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPageSize(parseInt(newPageSize));
        setCurrentPage(1); // Reset to first page
    };

    const handlePayment = (payment) => {
        setPaymentToPay(payment);
        setPayModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!paymentToPay) return;

        setProcessing(true);

        try {
            // ✅ FIX: Update each attendance record to mark as paid
            const attendanceUpdatePromises = paymentToPay.sessions.map(session =>
                apiClient.patch(`/tutorPayments/attendances/${session.attendanceId}`, {
                    isPaid: true
                })
            );

            // ✅ FIX: Create a consolidated payment record
            const paymentData = {
                agencyId: user?.agencyId || user?.id,
                tutorId: paymentToPay.tutorId,
                paymentType: 'monthly_consolidated',
                month: paymentToPay.month,
                monthDisplay: paymentToPay.monthDisplay,
                totalAmount: paymentToPay.paymentAmount,
                sessionCount: paymentToPay.sessionCount,
                paymentStatus: 'Paid',
                paymentDate: new Date().toISOString(),
                sessionIds: paymentToPay.sessions.map(session => session.attendanceId)
            };

            // ✅ Execute both updates in parallel
            const [attendanceResults, paymentResult] = await Promise.all([
                Promise.all(attendanceUpdatePromises),
                apiClient.post('/tutorPayments', paymentData)
            ]);

            console.log('✅ Attendance updates:', attendanceResults);
            console.log('✅ Payment created:', paymentResult);

            notifications.show({
                title: "Success",
                message: `Payment of ${formatCurrency(paymentToPay.paymentAmount)} marked as paid for ${paymentToPay.sessionCount} sessions`,
                color: "green",
            });

            setPayModalOpen(false);
            setPaymentToPay(null);
            fetchPayments(); // Refresh the data
        } catch (err) {
            console.error("Payment error:", err);
            notifications.show({
                title: "Error",
                message: err.response?.data?.message || "Failed to process payment",
                color: "red",
            });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status) => status === "Paid" ? "green" : "orange";

    const formatCurrency = (amt) => `$${parseFloat(amt || 0).toFixed(2)}`;

    const formatDate = (d) => {
        if (!d) return "N/A";
        return new Date(d).toLocaleDateString();
    };

    if (loading) {
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
                <Group justify="space-between" align="center">
                    <Title order={2}>Tutor Payment Management</Title>
                </Group>

                {/* Filter Section */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack spacing="md">
                        <SegmentedControl
                            value={activeTab}
                            onChange={setActiveTab}
                            data={[
                                {
                                    label: "Unpaid",
                                    value: "unpaid",
                                },
                                {
                                    label: "Paid",
                                    value: "paid",
                                },
                            ]}
                            size="md"
                            fullWidth
                        />

                        <Group spacing="md" grow>
                            <TextInput
                                placeholder="Search by tutor name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftSection={<IconSearch size={16} />}
                            />
                            <MonthPickerInput
                                placeholder="Select month and year"
                                value={monthFilter}
                                onChange={setMonthFilter}
                                leftSection={<IconCalendar size={16} />}
                                maxDate={new Date()}
                                clearable
                            />
                        </Group>
                    </Stack>
                </Card>

                {error && (
                    <Alert color="red" title="Error">
                        {error}
                    </Alert>
                )}

                {/* Payments Table */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                            <Loader />
                        </div>
                    ) : payments.length === 0 ? (
                        <Text ta="center" py="xl" c="dimmed">
                            No {activeTab} payments found
                        </Text>
                    ) : (
                        <>
                            {/* ✅ NEW: Table header with pagination info and page size selector */}
                            <Group justify="space-between" mb="md">
                                <Text c="dimmed">
                                    Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, payments.length)} of {payments.length} tutor payment{payments.length !== 1 ? (activeTab === "paid" ? ' records' : ' summaries') : (activeTab === "paid" ? ' record' : ' summary')}
                                </Text>

                                <Group spacing="xs">
                                    <Text size="sm" c="dimmed">Show:</Text>
                                    <Select
                                        value={pageSize.toString()}
                                        onChange={handlePageSizeChange}
                                        data={[
                                            { value: '5', label: '5' },
                                            { value: '10', label: '10' },
                                            { value: '25', label: '25' },
                                            { value: '50', label: '50' },
                                            { value: '100', label: '100' },
                                        ]}
                                        size="sm"
                                        w={80}
                                    />
                                    <Text size="sm" c="dimmed">per page</Text>
                                </Group>
                            </Group>

                            {/* ✅ UPDATED: Table that handles both individual records and aggregated summaries */}
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Tutor Name</Table.Th>
                                        <Table.Th>{activeTab === "paid" ? "Payment Date" : "Month"}</Table.Th>
                                        <Table.Th>Total Amount</Table.Th>
                                        {activeTab !== "paid" && <Table.Th>Sessions</Table.Th>}
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {/* ✅ NEW: Use paginatedPayments instead of payments */}
                                    {paginatedPayments.map((record) => (
                                        <Table.Tr key={record.id}>
                                            <Table.Td>
                                                <div>
                                                    <Text fw={500}>
                                                        {record.tutorName}
                                                    </Text>
                                                    <Text size="sm" c="dimmed">
                                                        ID: {record.tutorId.slice(0, 8)}...
                                                    </Text>
                                                </div>
                                            </Table.Td>

                                            <Table.Td>
                                                <Text fw={500}>
                                                    {/* ✅ Show payment date for paid, month for unpaid */}
                                                    {activeTab === "paid"
                                                        ? formatDate(record.paymentDate)
                                                        : record.monthDisplay
                                                    }
                                                </Text>
                                            </Table.Td>

                                            <Table.Td>
                                                <Text fw={500} c="green">
                                                    {formatCurrency(record.paymentAmount)}
                                                </Text>
                                                {/* ✅ Only show session count for unpaid tab */}
                                                {activeTab !== "paid" && (
                                                    <Text size="xs" c="dimmed">
                                                        {record.sessionCount} session{record.sessionCount !== 1 ? 's' : ''}
                                                    </Text>
                                                )}
                                            </Table.Td>

                                            {activeTab !== "paid" && (
                                                <Table.Td>
                                                    <Badge variant="light" color="blue">
                                                        {record.sessionCount}
                                                    </Badge>
                                                </Table.Td>
                                            )}

                                            <Table.Td>
                                                <Badge color={getStatusColor(record.paymentStatus)} variant="filled">
                                                    {record.paymentStatus}
                                                </Badge>
                                            </Table.Td>

                                            <Table.Td>
                                                {record.paymentStatus === "Not Paid" ? (
                                                    <Button
                                                        size="xs"
                                                        color="green"
                                                        leftSection={<IconCurrencyDollar size={14} />}
                                                        onClick={() => handlePayment(record)}
                                                    >
                                                        Pay Month
                                                    </Button>
                                                ) : (
                                                    <Badge color="green" variant="light">
                                                        Completed
                                                    </Badge>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>

                            {/* ✅ NEW: Pagination controls */}
                            {totalPages > 1 && (
                                <Group justify="center" mt="lg">
                                    <Pagination
                                        value={currentPage}
                                        onChange={setCurrentPage}
                                        total={totalPages}
                                        size="sm"
                                        withEdges
                                        siblings={1}
                                        boundaries={1}
                                    />
                                </Group>
                            )}
                        </>
                    )}
                </Card>
            </Stack>

            {/* Payment Confirmation Modal */}
            <Modal
                opened={payModalOpen}
                onClose={() => {
                    setPayModalOpen(false);
                    setPaymentToPay(null);
                }}
                title="Confirm Payment"
                size="sm"
                centered
            >
                <Stack spacing="md">
                    <Text>Are you sure you want to mark this payment as paid?</Text>

                    {paymentToPay && (
                        <Card withBorder padding="sm">
                            <Stack spacing="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Tutor:</Text>
                                    <Text size="sm" fw={500}>
                                        {paymentToPay.tutorName}
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">{activeTab === "paid" ? "Payment Date:" : "Month:"}</Text>
                                    <Text size="sm" fw={500}>
                                        {activeTab === "paid"
                                            ? formatDate(paymentToPay.paymentDate)
                                            : paymentToPay.monthDisplay
                                        }
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Sessions:</Text>
                                    <Text size="sm" fw={500}>
                                        {paymentToPay.sessionCount}
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Total Amount:</Text>
                                    <Text size="sm" fw={500} c="green">
                                        {formatCurrency(paymentToPay.paymentAmount)}
                                    </Text>
                                </Group>
                            </Stack>
                        </Card>
                    )}

                    <Group justify="flex-end" mt="lg">
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setPayModalOpen(false);
                                setPaymentToPay(null);
                            }}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="green"
                            onClick={confirmPayment}
                            loading={processing}
                            leftSection={<IconCurrencyDollar size={16} />}
                        >
                            Confirm Payment
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}