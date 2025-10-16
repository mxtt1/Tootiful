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

    // Modal states
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [paymentToPay, setPaymentToPay] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, []);

    useEffect(() => {
        filterPayments();
    }, [searchQuery, monthFilter, activeTab, allPayments]);

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

            console.log("🚀 Fetching payments for agency:", agencyId);
            const response = await apiClient.get(`/tutorPayments/agency/${agencyId}`);

            console.log("📦 Full API Response:", response);
            console.log("📊 Response Data:", response.data);
            console.log("🔢 Data Length:", response.data?.length);

            const paymentsData = response.data || [];
            setAllPayments(paymentsData);
            setPayments(paymentsData);

        } catch (err) {
            console.error("❌ Fetch payments error:", err);
            setError("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    const filterPayments = () => {
        let filtered = [...allPayments];

        // Filter by status
        if (activeTab === "unpaid") {
            filtered = filtered.filter((p) => p.paymentStatus === "Not Paid");
        } else if (activeTab === "paid") {
            filtered = filtered.filter((p) => p.paymentStatus === "Paid");
        }

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

        // Filter by month/year based on attendance date
        if (monthFilter) {
            const selectedYear = monthFilter.getFullYear();
            const selectedMonth = monthFilter.getMonth();

            filtered = filtered.filter((p) => {
                const date = new Date(p.attendanceDate);
                return (
                    date.getFullYear() === selectedYear &&
                    date.getMonth() === selectedMonth
                );
            });
        }

        console.log("🎯 Filtered payments:", filtered);
        setPayments(filtered);
    };

    const handlePayment = (payment) => {
        setPaymentToPay(payment);
        setPayModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!paymentToPay) return;

        setProcessing(true);
        try {
            // Note: You'll need to create this backend endpoint later
            await apiClient.patch(`/tutorPayments/${paymentToPay.id}`, {
                paymentStatus: "Paid",
                paymentDate: new Date().toISOString(),
            });

            notifications.show({
                title: "Success",
                message: "Payment marked as paid successfully",
                color: "green",
            });

            setPayModalOpen(false);
            setPaymentToPay(null);
            fetchPayments();
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
                                    label: `Unpaid (${allPayments.filter(
                                        (p) => p.paymentStatus === "Not Paid"
                                    ).length})`,
                                    value: "unpaid",
                                },
                                {
                                    label: `Paid (${allPayments.filter(
                                        (p) => p.paymentStatus === "Paid"
                                    ).length})`,
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
                            <Text mb="md" c="dimmed">
                                Showing {payments.length} payment{payments.length !== 1 ? 's' : ''}
                            </Text>

                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Tutor Name</Table.Th>
                                        <Table.Th>Payment Amount</Table.Th>
                                        <Table.Th>Lesson Details</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Attendance Date</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {payments.map((payment) => (
                                        <Table.Tr key={payment.id}>
                                            <Table.Td>
                                                <div>
                                                    <Text fw={500}>
                                                        {payment.tutorName}
                                                    </Text>
                                                    <Text size="sm" c="dimmed">
                                                        ID: {payment.tutorId.slice(0, 8)}...
                                                    </Text>
                                                </div>
                                            </Table.Td>

                                            <Table.Td>
                                                <Text fw={500} c="green">
                                                    {formatCurrency(payment.paymentAmount)}
                                                </Text>
                                            </Table.Td>

                                            <Table.Td>
                                                <div>
                                                    <Text size="sm" fw={500}>
                                                        {payment.lessonTitle}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        Attendance ID: {payment.attendanceId.slice(0, 8)}...
                                                    </Text>
                                                </div>
                                            </Table.Td>

                                            <Table.Td>
                                                <Badge color={getStatusColor(payment.paymentStatus)} variant="filled">
                                                    {payment.paymentStatus}
                                                </Badge>
                                            </Table.Td>

                                            <Table.Td>
                                                <Text size="sm">
                                                    {formatDate(payment.attendanceDate)}
                                                </Text>
                                            </Table.Td>

                                            <Table.Td>
                                                {payment.paymentStatus === "Not Paid" ? (
                                                    <Button
                                                        size="xs"
                                                        color="green"
                                                        leftSection={<IconCurrencyDollar size={14} />}
                                                        onClick={() => handlePayment(payment)}
                                                    >
                                                        Pay
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
                                    <Text size="sm" c="dimmed">Lesson:</Text>
                                    <Text size="sm" fw={500}>
                                        {paymentToPay.lessonTitle}
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Amount:</Text>
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