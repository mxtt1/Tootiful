import React, { useState, useEffect } from 'react';
import ApiClient from '../../api/apiClient';
import GenericPieChart from '../../components/userChart';
import GrowthChart from '../../components/growthChart';
import TransactionTable from '../../components/transactionTable';
import { notifications } from "@mantine/notifications";
import { 
  FaMoneyBillAlt, 
  FaChartLine, 
  FaUsers, 
  FaBook, 
  FaGraduationCap, 
  FaBuilding,
  FaArrowLeft
} from 'react-icons/fa';  

const AdminDashboard = () => {
    const [totalTutors, setTotalTutors] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalAgencies, setTotalAgencies] = useState(0);
    const [totalSubscriptions, setTotalSubscriptions] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [revenueData, setRevenueData] = useState(null);
    const [revenueByAgency, setRevenueByAgency] = useState([]);
    const [missedSessionsRate, setMissedSessionsRate] = useState(0);
    const [tutorMissedRates, setTutorMissedRates] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [transactionsPerPage, setTransactionsPerPage] = useState(10);
    const paginatedTransactions = transactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
    );
    const totalPages = Math.ceil(transactions.length / transactionsPerPage);
    const [agencyStats, setAgencyStats] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    // BREAKDOWN STATES
    const [showTutorBreakdown, setShowTutorBreakdown] = useState(false);
    const [showSubscriptionsDetail, setShowSubscriptionsDetail] = useState(false);
    const [showAgencyRevenueBreakdown, setShowAgencyRevenueBreakdown] = useState(false);

    // Add time range filter
    const [selectedTimeRange, setSelectedTimeRange] = useState("this_month");
    
    // Time range options
    const timeRangeOptions = [
        { value: "today", label: "Today" },
        { value: "this_week", label: "This Week" },
        { value: "this_month", label: "This Month" },
        { value: "this_year", label: "This Year" },
        { value: "all_time", label: "All Time" }
    ];

    useEffect(() => {
        fetchDashboardData();
    }, [selectedTimeRange]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            await fetchAllTutors();
            await fetchAllStudents();
            await fetchAllAgencies();
            await fetchRevenueData();
            await fetchMissedSessionData();
            await fetchSubscriptionLessons();
            await fetchAgencyStats();
            await fetchTransactions();
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            setError("Failed to load dashboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            setTransactionsLoading(true);
            
            // Fetch student payments which contain platform fees
            const transactionsRes = await ApiClient.get(
                `/analytics/admin/platform-fee-transactions?timeRange=${selectedTimeRange}`
            );
            const platformFeeTransactions = transactionsRes?.data?.data || transactionsRes?.data || [];
            
            console.log(`Found ${platformFeeTransactions.length} platform fee transactions`);

            // The data is already formatted correctly from the backend
            setTransactions(platformFeeTransactions);
            
        } catch (err) {
            console.error("Error fetching platform fee transactions:", err);
            
            notifications.show({
                title: "Warning",
                message: "Could not load transaction history, showing sample data",
                color: "yellow",
            });
        } finally {
            setTransactionsLoading(false);
        }
    };



    const fetchMissedSessionData = async () => {
        try {
            const res = await ApiClient.get('/analytics/admin/attendance');
            
            if (!res) {
                console.log("NO RESPONSE from API");
                return;
            }
            
            const attendanceData = res?.data?.data || res?.data || {};
            
            if (!attendanceData || Object.keys(attendanceData).length === 0) {
                console.log("Empty attendance data in response");
                setMissedSessionsRate(0);
                setTutorMissedRates([]);
                return;
            }

            setMissedSessionsRate(attendanceData.missedSessionsRate || 0);
            setTutorMissedRates(attendanceData.tutorMissedRates || []);
            
        } catch (err) {
            console.error("ERROR in fetchMissedSessionData:", err);
            setMissedSessionsRate(0);
            setTutorMissedRates([]);
        } 
    };

    const fetchSubscriptionLessons = async () => {
        try {
            const res = await ApiClient.get(`/analytics/admin/subscription-lessons?timeRange=${selectedTimeRange}`);
            
            const subscriptionData = res?.data?.data || res?.data || [];
            setLessons(subscriptionData);
        } catch (err) {
            console.error("Error fetching subscription lessons:", err);
        }
    };

    const fetchAgencyStats = async () => {
        try {
            const res = await ApiClient.get(`/analytics/admin/agency-stats?timeRange=${selectedTimeRange}`);
            
            const statsData = res?.data?.data || res?.data || [];
            setAgencyStats(statsData);
        } catch (err) {
            console.error("Error fetching agency stats:", err);
        }
    };

    const fetchAllTutors = async () => {
        try {
            console.log("Fetching all tutors from backend...");
            const allTutors = await ApiClient.get('/tutors');
            setTotalTutors(allTutors.data.length || 0);
        } catch (error) {
            console.log("Error fetching tutors:", error);
            setError("Failed to load tutors data");
            notifications.show({
                title: "Error",
                message: "Failed to load tutors data",
                color: "red",
            });
        }
    };

    const fetchAllStudents = async () => {
        try {
            console.log("Fetching students from backend...");
            const allStudents = await ApiClient.get('/students');
            setTotalStudents(allStudents.data.length || 0);
        } catch (error) {
            console.log("Error fetching students:", error);
            setError("Failed to load students data");
            notifications.show({
                title: "Error",
                message: "Failed to load students data",
                color: "red",
            });
        }
    };

    const fetchAllAgencies = async () => {
        try {
            console.log("Fetching agencies from backend...");
            const allAgencies = await ApiClient.get('/agencies');
            setTotalAgencies(allAgencies.data.length || 0);
        } catch (error) {
            console.log("Error fetching agencies:", error);
            setError("Failed to load agencies data");
            notifications.show({
                title: "Error",
                message: "Failed to load agencies data",
                color: "red",
            });
        }
    };

    const fetchRevenueData = async () => {
        try {
            console.log("Fetching admin revenue data...");
            const res = await ApiClient.get(`/analytics/admin/revenue-summary?timeRange=${selectedTimeRange}`);
            
            if (!res || !res.data) {
                throw new Error("Invalid response from server");
            }
            
            const revenueData = res.data.success ? res.data.data : res.data;
            
            if (!revenueData) {
                throw new Error("No revenue data in response");
            }
            
            setRevenueData(revenueData);
            setTotalSubscriptions(revenueData.totalSubscriptions || 0);
            
            // Use PLATFORM REVENUE (platform fees) for total revenue
            setTotalRevenue(revenueData.platformRevenue || 0);
            
            const agencyRevenue = revenueData.revenueByAgency || [];
            setRevenueByAgency(agencyRevenue);
            
            console.log("Admin revenue data loaded:", revenueData);
            
        } catch (err) {
            console.error("Error fetching revenue:", err);
            setError(err.message || "Failed to load revenue data");
            setRevenueData({ 
                platformRevenue: 0,
                totalAgencies: 0 
            });
            setTotalSubscriptions(0);
            setTotalRevenue(0);
            setRevenueByAgency([]);
        }
    };

    // Pagination component for transactions
    const PaginationControls = () => {
    return (
        <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '1rem',
        padding: '1rem',
        borderTop: '1px solid #e0e0e0'
        }}>
        <div>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Showing {(currentPage - 1) * transactionsPerPage + 1} to{' '}
            {Math.min(currentPage * transactionsPerPage, transactions.length)} of{' '}
            {transactions.length} transactions
            </span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
                color: currentPage === 1 ? '#999' : '#333',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
            }}
            >
            Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
                pageNum = i + 1;
            } else if (currentPage <= 3) {
                pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
            } else {
                pageNum = currentPage - 2 + i;
            }
            
            return (
                <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: currentPage === pageNum ? '#6155F5' : 'white',
                    color: currentPage === pageNum ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                }}
                >
                {pageNum}
                </button>
            );
            })}
            
            <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
                color: currentPage === totalPages ? '#999' : '#333',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
            }}
            >
            Next
            </button>
        </div>

        <select
            value={transactionsPerPage.toString()}
            onChange={(e) => {
            setTransactionsPerPage(Number(e.target.value));
            setCurrentPage(1);
            }}
            style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.875rem',
            width: '130px'
            }}
        >
            <option value="5">5 per page</option>
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
        </select>
        </div>
    );
    };
    // BREAKDOWN HANDLERS
    const handleShowTutorBreakdown = () => {
        setShowTutorBreakdown(true);
    };

    const handleBackToOverview = () => {
        setShowTutorBreakdown(false);
        setShowAgencyRevenueBreakdown(false);
    };

    const handleShowSubscriptionsDetail = () => {
        setShowSubscriptionsDetail(true);
    };

    const handleBackToGeneral = () => {
        setShowSubscriptionsDetail(false);
        setShowAgencyRevenueBreakdown(false);
    };

    const handleShowAgencyRevenueBreakdown = () => {
        setShowAgencyRevenueBreakdown(true);
    };

    // Prepare user distribution data
    const userDistributionData = [
        { name: 'Agencies', value: totalAgencies },
        { name: 'Tutors', value: totalTutors },
        { name: 'Students', value: totalStudents }
    ].filter(item => item.value > 0);

    // Filter Component
    const FilterSection = () => (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            marginBottom: '1.5rem',
            gap: '1rem'
        }}>
            <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '5px',
                    backgroundColor: 'white',
                    width: '200px',
                    fontSize: '0.875rem'
                }}
            >
                {timeRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );

    // BREAKDOWN COMPONENTS

    // Tutor Missed Sessions Breakdown Component
    const TutorMissedSessionsBreakdown = () => {
        const totalTutors = tutorMissedRates.length;
        const totalSessions = tutorMissedRates.reduce((sum, tutor) => sum + tutor.totalSessions, 0);
        const totalMissed = tutorMissedRates.reduce((sum, tutor) => sum + tutor.missedSessions, 0);

        return (
            <div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <button
                        onClick={handleBackToOverview}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            backgroundColor: "#6155F5",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            marginBottom: "1rem"
                        }}
                    >
                        <FaArrowLeft />
                        Back to Overview
                    </button>
                    
                    <div style={{ 
                        backgroundColor: "white", 
                        padding: "1.5rem", 
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                    }}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
                            Tutor Missed Sessions Breakdown (All Agencies)
                        </h2>
                        <p style={{ color: "#6c757d", margin: 0, fontSize: "1.1rem", fontWeight: "500" }}>
                            {totalTutors} tutors • {totalMissed} missed sessions out of {totalSessions} total
                        </p>
                        <p style={{ color: "#6c757d", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
                            Overall Platform Rate: {missedSessionsRate}% • All Agencies
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                >
                    <h3 style={{ margin: "0 0 1.5rem 0", color: "#333" }}>
                        Tutor Performance Details
                    </h3>
                    
                    {tutorMissedRates.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#6c757d", padding: "2rem" }}>
                            <p>No tutor attendance data available</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "1rem" }}>
                            {tutorMissedRates.map((tutor, index) => (
                                <div
                                    key={tutor.tutorId || index}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "1rem",
                                        backgroundColor: "#f8f9fa",
                                        borderRadius: "8px",
                                        borderLeft: `4px solid ${tutor.missedRate === 0 ? '#28a745' : tutor.missedRate <= 10 ? '#ffc107' : '#dc3545'}`
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: "0 0 0.25rem 0", color: "#333" }}>
                                            {tutor.tutorName}
                                        </h4>
                                        <p style={{ margin: 0, color: "#6c757d", fontSize: "0.875rem" }}>
                                            {tutor.agencyName} • {tutor.totalSessions} sessions • {tutor.missedSessions} missed
                                        </p>
                                    </div>
                                    
                                    <div style={{ textAlign: "right" }}>
                                        <div 
                                            style={{ 
                                                fontSize: "1.25rem", 
                                                fontWeight: "bold", 
                                                color: tutor.missedRate === 0 ? '#28a745' : tutor.missedRate <= 10 ? '#ffc107' : '#dc3545'
                                            }}
                                        >
                                            {tutor.missedRate}%
                                        </div>
                                        <div style={{ 
                                            fontSize: "0.75rem", 
                                            color: tutor.missedRate === 0 ? '#28a745' : tutor.missedRate <= 10 ? '#6c757d' : '#dc3545'
                                        }}>
                                            {tutor.missedRate === 0 ? 'Perfect' : tutor.missedRate <= 10 ? 'Good' : 'Needs Attention'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Subscriptions Detail View Component
    const SubscriptionsDetailView = () => {
        const lessonsWithStudents = lessons
            .filter(lesson => (lesson.paymentCount || 0) > 0)
            .sort((a, b) => {
                const countA = a.paymentCount || 0;
                const countB = b.paymentCount || 0;
                return countB - countA;
            });

        return (
            <div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <button
                        onClick={handleBackToGeneral}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            backgroundColor: "#6155F5",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            marginBottom: "1rem"
                        }}
                    >
                        <FaArrowLeft />
                        Back to Overview
                    </button>
                    
                    <div style={{ 
                        backgroundColor: "white", 
                        padding: "1.5rem", 
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                    }}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
                            Paid Enrollments Breakdown (All Agencies)
                        </h2>
                        <p style={{ color: "#6c757d", margin: 0, fontSize: "1.1rem", fontWeight: "500" }}>
                            {totalSubscriptions} students across {lessonsWithStudents.length} lessons
                        </p>
                        <p style={{ color: "#6c757d", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
                            Filtered by: {selectedTimeRange} • All Agencies
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                >
                    <h3 style={{ margin: "0 0 1.5rem 0", color: "#333" }}>
                        Lessons with Paid Enrollments
                    </h3>
                    
                    {lessonsWithStudents.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#6c757d", padding: "2rem" }}>
                            <p>No lessons with paid enrollments found for the selected filters</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "1rem" }}>
                            {lessonsWithStudents.map((lesson, index) => (
                                <div
                                    key={lesson.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "1rem",
                                        backgroundColor: "#f8f9fa",
                                        borderRadius: "8px",
                                        borderLeft: `4px solid #28a745`
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: "0 0 0.25rem 0", color: "#333" }}>
                                            {lesson.title || `Lesson ${index + 1}`}
                                        </h4>
                                        <p style={{ margin: 0, color: "#6c757d", fontSize: "0.875rem" }}>
                                            {lesson.subjectName} • {lesson.dayOfWeek} • {lesson.startTime} - {lesson.endTime}
                                        </p>
                                        <p style={{ margin: "0.25rem 0 0 0", color: "#6c757d", fontSize: "0.75rem" }}>
                                            Agency: {lesson.agencyName} • Location: {lesson.locationAddress} • Tutor: {lesson.tutorName}
                                        </p>
                                    </div>
                                    
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ 
                                            fontSize: "1.25rem", 
                                            fontWeight: "bold", 
                                            color: "#28a745" 
                                        }}>
                                            {lesson.paymentCount || 0}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                                            students
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Agency Revenue Breakdown Component
    const AgencyRevenueBreakdown = () => {
        const totalPlatformRevenue = revenueByAgency.reduce((sum, agency) => sum + (agency.value || 0), 0);

        return (
            <div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <button
                        onClick={handleBackToGeneral}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            backgroundColor: "#6155F5",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            marginBottom: "1rem"
                        }}
                    >
                        <FaArrowLeft />
                        Back to Overview
                    </button>
                    
                    <div style={{ 
                        backgroundColor: "white", 
                        padding: "1.5rem", 
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                    }}>
                        <h2 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
                            Platform Revenue Breakdown by Agency
                        </h2>
                        <p style={{ color: "#6c757d", margin: 0, fontSize: "1.1rem", fontWeight: "500" }}>
                            ${totalPlatformRevenue.toLocaleString()} total platform revenue from {revenueByAgency.length} agencies
                        </p>
                        <p style={{ color: "#6c757d", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
                            Based on platform fees only • Filtered by: {selectedTimeRange}
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                >
                    <h3 style={{ margin: "0 0 1.5rem 0", color: "#333" }}>
                        Agency Platform Revenue Details
                    </h3>
                    
                    {revenueByAgency.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#6c757d", padding: "2rem" }}>
                            <p>No agency revenue data available</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "1rem" }}>
                            {revenueByAgency.map((agency, index) => {
                                const percentage = totalPlatformRevenue > 0 ? 
                                    ((agency.value || 0) / totalPlatformRevenue * 100).toFixed(1) : 0;
                                
                                return (
                                    <div
                                        key={agency.name || index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "1rem",
                                            backgroundColor: "#f8f9fa",
                                            borderRadius: "8px",
                                            borderLeft: `4px solid #6155F5`
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: "0 0 0.25rem 0", color: "#333" }}>
                                                {agency.name}
                                            </h4>
                                            <p style={{ margin: 0, color: "#6c757d", fontSize: "0.875rem" }}>
                                                {percentage}% of total platform revenue
                                            </p>
                                        </div>
                                        
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ 
                                                fontSize: "1.25rem", 
                                                fontWeight: "bold", 
                                                color: "#28a745" 
                                            }}>
                                                ${(agency.value || 0).toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                                                platform fees
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Agency Revenue Pie Chart */}
                {revenueByAgency.length > 0 && (
                    <div style={{ 
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        marginTop: "2rem"
                    }}>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#333", textAlign: "center" }}>
                            Platform Revenue Distribution by Agency
                        </h3>
                        <GenericPieChart 
                            data={revenueByAgency.slice(0, 8)} // Show top 8 agencies
                            title={null}
                            colors={['#4285B4', '#EA4335', '#FBBC05', '#34A853', '#9B51E0', '#6155F5', '#28a745', '#ffc107']}
                            showLabel={true}
                            labelType="percentage"
                            height={400}
                        />
                    </div>
                )}
            </div>
        );
    };

    // Clickable Cards
    const renderSubscriptionsCard = () => (
        <div
            onClick={handleShowSubscriptionsDetail}
            style={{
                backgroundColor: "white",
                padding: "1.25rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                minWidth: "200px",
                maxWidth: "280px",
                flex: "1 1 220px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "2px solid transparent",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.borderColor = "#6155F5";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "transparent";
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                }}
            >
                <FaBook
                    style={{
                        fontSize: "1.75rem",
                        color: "#9334E6",
                        marginRight: "0.75rem",
                    }}
                />
                <div>
                    <h3
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            color: "#333",
                            margin: 0,
                        }}
                    >
                        {totalSubscriptions}
                    </h3>
                    <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                        Total Paid Enrollments
                    </p>
                </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6155F5" }}>
                Click to view breakdown
            </div>
        </div>
    );

    const renderMissedSessionsCard = () => (
        <div
            onClick={handleShowTutorBreakdown}
            style={{
                backgroundColor: "white",
                padding: "1.25rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                minWidth: "200px",
                maxWidth: "280px",
                flex: "1 1 220px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "2px solid transparent",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.borderColor = "#6155F5";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "transparent";
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                }}
            >
                <FaChartLine
                    style={{
                        fontSize: "1.75rem",
                        color: "#dc3545",
                        marginRight: "0.75rem",
                    }}
                />
                <div>
                    <h3
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            color: "#333",
                            margin: 0,
                        }}
                    >
                        {missedSessionsRate}%
                    </h3>
                    <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                        Missed Sessions Rate
                    </p>
                </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6155F5" }}>
                Click to view tutor breakdown
            </div>
        </div>
    );

    const renderTotalRevenueCard = () => (
        <div
            onClick={handleShowAgencyRevenueBreakdown}
            style={{
                backgroundColor: "white",
                padding: "1.25rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                minWidth: "200px",
                maxWidth: "280px",
                flex: "1 1 220px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "2px solid transparent",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.borderColor = "#6155F5";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "transparent";
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                }}
            >
                <FaMoneyBillAlt
                    style={{
                        fontSize: "1.75rem",
                        color: "#28a745",
                        marginRight: "0.75rem",
                    }}
                />
                <div>
                    <h3
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            color: "#333",
                            margin: 0,
                        }}
                    >
                        ${totalRevenue?.toLocaleString()}
                    </h3>
                    <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                        Platform Revenue
                    </p>
                </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6155F5" }}>
                Click to view agency breakdown
            </div>
        </div>
    );

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center'}}>
                <div>Loading dashboard data...</div>
            </div>
        );
    };

    // BREAKDOWN VIEWS
    if (showTutorBreakdown) {
        return (
            <div style={{ padding: "2.5rem 2.5rem 2rem 2.5rem", width: "100%", boxSizing: "border-box" }}>
                <TutorMissedSessionsBreakdown />
            </div>
        );
    }

    if (showSubscriptionsDetail) {
        return (
            <div style={{ padding: "2.5rem 2.5rem 2rem 2.5rem", width: "100%", boxSizing: "border-box" }}>
                <SubscriptionsDetailView />
            </div>
        );
    }

    if (showAgencyRevenueBreakdown) {
        return (
            <div style={{ padding: "2.5rem 2.5rem 2rem 2.5rem", width: "100%", boxSizing: "border-box" }}>
                <AgencyRevenueBreakdown />
            </div>
        );
    }

    const TabNavigation = () => (
        <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e0e0e0',
            marginBottom: '1.5rem',
            paddingLeft: '0.5rem',
            backgroundColor: 'transparent'
        }}>
            <button
                onClick={() => setActiveTab('general')}
                style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderBottom: activeTab === 'general' ? '2px solid #6155F5' : '2px solid transparent',
                    color: activeTab === 'general' ? '#6155F5' : '#6c757d',
                    fontWeight: activeTab === 'general' ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    marginRight: '0.5rem'
                }}
            >
                General
            </button>
            <button
                onClick={() => setActiveTab('transactions')}
                style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderBottom: activeTab === 'transactions' ? '2px solid #6155F5' : '2px solid transparent',
                    color: activeTab === 'transactions' ? '#6155F5' : '#6c757d',
                    fontWeight: activeTab === 'transactions' ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    marginRight: '0.5rem'
                }}
            >
                Transactions
            </button>
        </div>
    );

    return (
        <>
            <div>
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>Admin Dashboard</h2>
                    
                    <FilterSection />
                    
                    <TabNavigation />
                    
                    {/* General Tab Content */}
                    {activeTab === 'general' && (
                        <div>
                            {/* Main Content Grid */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '2fr 1fr', 
                                gap: '2rem',
                                alignItems: 'stretch', 
                                marginBottom: '2rem'
                            }}>
                                
                                {/* Left Column - Stats Cards */}
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '1.5rem' 
                                }}>
                                    {/* Row 1 */}
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(3, 1fr)', 
                                        gap: '1.5rem',
                                        flex: 1
                                    }}>
                                        {/* TOTAL AGENCIES */}
                                        <div style={{ 
                                            padding: '1.2rem', 
                                            border: '1px solid #dee2e6', 
                                            borderRadius: '8px', 
                                            backgroundColor: 'white',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            height: '100%' 
                                        }}>
                                            <div style={{ 
                                                display: 'flex',
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                marginBottom: '0.8rem' 
                                            }}>
                                                <h3 style={{ 
                                                    margin: 0, 
                                                    color: '#0A0A0A', 
                                                    fontWeight: 'normal',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    Total Agencies
                                                </h3>
                                                <div style={{
                                                    position: 'relative',
                                                    width: '36px',
                                                    height: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(66, 139, 202, 0.2)',
                                                    }}></div>
                                                    <FaBuilding style={{ 
                                                        fontSize: '18px', 
                                                        color: '#4285B4',
                                                        position: 'relative',
                                                        zIndex: 1
                                                    }} />
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0A0A0A' }}>
                                                {totalAgencies}
                                            </p>
                                        </div>

                                        {/* TOTAL TUTORS */}
                                        <div style={{ 
                                            padding: '1.2rem', 
                                            border: '1px solid #dee2e6', 
                                            borderRadius: '8px', 
                                            backgroundColor: 'white',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            height: '100%' 
                                        }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                marginBottom: '0.8rem' 
                                            }}>
                                                <h3 style={{ 
                                                    margin: 0, 
                                                    color: '#0A0A0A', 
                                                    fontWeight: 'normal',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    Total Tutors
                                                </h3>
                                                <div style={{
                                                    position: 'relative',
                                                    width: '36px',
                                                    height: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(234, 67, 53, 0.2)',
                                                    }}></div>
                                                    <FaGraduationCap style={{ 
                                                        fontSize: '18px', 
                                                        color: '#EA4335',
                                                        position: 'relative',
                                                        zIndex: 1
                                                    }} />
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0A0A0A' }}>
                                                {totalTutors}
                                            </p>
                                        </div>

                                        {/* TOTAL STUDENTS */}
                                        <div style={{ 
                                            padding: '1.2rem', 
                                            border: '1px solid #dee2e6', 
                                            borderRadius: '8px', 
                                            backgroundColor: 'white',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            height: '100%'
                                        }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                marginBottom: '0.8rem' 
                                            }}>
                                                <h3 style={{ 
                                                    margin: 0, 
                                                    color: '#0A0A0A', 
                                                    fontWeight: 'normal',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    Total Students
                                                </h3>
                                                <div style={{
                                                    position: 'relative',
                                                    width: '36px',
                                                    height: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(251, 188, 5, 0.2)',
                                                    }}></div>
                                                    <FaUsers style={{ 
                                                        fontSize: '18px', 
                                                        color: '#FBBC05',
                                                        position: 'relative',
                                                        zIndex: 1
                                                    }} />
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0A0A0A' }}>
                                                {totalStudents}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 2 - CLICKABLE CARDS */}
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(3, 1fr)', 
                                        gap: '1.5rem',
                                        flex: 1 
                                    }}>
                                        {/* CLICKABLE TOTAL REVENUE CARD */}
                                        {renderTotalRevenueCard()}
                                        
                                        {/* CLICKABLE SUBSCRIPTIONS CARD */}
                                        {renderSubscriptionsCard()}
                                        
                                        {/* CLICKABLE MISSED SESSIONS CARD */}
                                        {renderMissedSessionsCard()}
                                    </div>
                                </div>

                                {/* Right Column - Pie Chart */}
                                <div style={{
                                    padding: '1.2rem', 
                                    border: '1px solid #dee2e6', 
                                    borderRadius: '8px', 
                                    backgroundColor: 'white', 
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%', 
                                }}>
                                    <h3 style={{ 
                                        margin: '0 0 0.8rem 0', 
                                        color: '#0A0A0A', 
                                        fontWeight: 'normal', 
                                        textAlign: 'center',
                                        fontSize: '1rem'
                                    }}>
                                        User Distribution
                                    </h3>
                                    <div style={{ 
                                        flex: 1, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                    }}>
                                        <div style={{ 
                                            width: '100%', 
                                            height: '100%',
                                        }}>
                                            <GenericPieChart 
                                                data={userDistributionData}
                                                title={null}
                                                colors={['#4285B4', '#EA4335', '#FBBC05']}
                                                showLabel={true}
                                                labelType="percentage"
                                                height={300}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* GROWTH CHARTS */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '2rem',
                                marginBottom: '1.5rem' 
                            }}>
                                {/* Platform Revenue Growth Chart */}
                                <div style={{ 
                                padding: '1.5rem', 
                                border: '1px solid #dee2e6', 
                                borderRadius: '8px', 
                                backgroundColor: 'white', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}>
                                <h3 style={{ 
                                    margin: '0 0 1rem 0', 
                                    color: '#0A0A0A', 
                                    fontWeight: 'normal', 
                                    textAlign: 'center' 
                                }}>
                                    Platform Revenue Growth
                                </h3>
                                <GrowthChart 
                                    dataType="revenue" 
                                    timeRange={selectedTimeRange}  
                                    currentValue={totalRevenue}
                                    isAdmin={true} // Add this prop for admin context
                                />
                                </div>

                                {/* Subscription Growth Chart */}
                                <div style={{ 
                                padding: '1.5rem', 
                                border: '1px solid #dee2e6', 
                                borderRadius: '8px', 
                                backgroundColor: 'white', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}>
                                <h3 style={{ 
                                    margin: '0 0 1rem 0', 
                                    color: '#0A0A0A', 
                                    fontWeight: 'normal', 
                                    textAlign: 'center' 
                                }}>
                                    Subscription Growth
                                </h3>
                                <GrowthChart 
                                    dataType="subscriptions" 
                                    timeRange={selectedTimeRange}  
                                    currentValue={totalSubscriptions}
                                    isAdmin={true} // Add this prop for admin context
                                />
                                </div>
                            </div>
                        </div>
                    )}
                
{/* Transactions Tab Content */}
{activeTab === 'transactions' && (
  <div>
    <div style={{ 
      padding: '1.5rem', 
      border: '1px solid #dee2e6', 
      borderRadius: '8px', 
      backgroundColor: 'white', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem' 
    }}>
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        color: '#0A0A0A', 
        fontWeight: 'normal', 
        textAlign: 'center' 
      }}>
        Platform Fee Transactions
      </h3>
      {transactionsLoading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div>Loading transactions...</div>
        </div>
      ) : (
        <>
          {/* Simple transaction display for admin - platform fees only */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ 
              backgroundColor: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
              minWidth: '100%',
            }}>
              {/* Table Header */}
              <div style={{ 
                display: 'flex', 
                backgroundColor: '#f8f9fa', 
                padding: '12px 0',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '600',
                color: '#374151',
                fontSize: '12px'
              }}>
                <span style={{ padding: '0 8px', minWidth: '120px', flex: '1' }}>Student</span>
                <span style={{ padding: '0 8px', minWidth: '120px', flex: '1' }}>Agency</span>
                <span style={{ padding: '0 8px', minWidth: '100px', flex: '1' }}>Date</span>
                <span style={{ padding: '0 8px', minWidth: '100px', flex: '0.8', textAlign: 'center' }}>Platform Fee</span>
                <span style={{ padding: '0 8px', minWidth: '100px', flex: '1' }}>Payment Method</span>
                <span style={{ padding: '0 8px', minWidth: '100px', flex: '1' }}>Status</span>
              </div>

              {/* Table Rows */}
              {paginatedTransactions.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: '40px 20px', 
                  color: '#6b7280', 
                  fontStyle: 'italic' 
                }}>
                  <span style={{ fontSize: '14px' }}>
                    No platform fee transactions found
                  </span>
                </div>
              ) : (
                paginatedTransactions.map((transaction, index) => {
                  const formatDate = (dateString) => {
                    if (!dateString) return 'N/A';
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return 'Invalid Date';
                    return date.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric'
                    });
                  };

                  return (
                    <div 
                      key={transaction.id || `transaction-${index}`} 
                      style={{ 
                        display: 'flex', 
                        padding: '12px 0', 
                        borderBottom: '1px solid #e5e7eb',
                        alignItems: 'center',
                        fontSize: '12px'
                      }}
                    >
                      <span style={{ padding: '0 8px', minWidth: '120px', flex: '1', fontWeight: '500' }}>
                        {transaction.studentName}
                      </span>
                      <span style={{ padding: '0 8px', minWidth: '120px', flex: '1', color: '#6b7280' }}>
                        {transaction.agencyName}
                      </span>
                      <span style={{ padding: '0 8px', minWidth: '100px', flex: '1', color: '#6b7280' }}>
                        {formatDate(transaction.date)}
                      </span>
                      <span style={{ 
                        padding: '0 8px', 
                        minWidth: '100px', 
                        flex: '0.8', 
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#059669' // Green for platform revenue
                      }}>
                        ${parseFloat(transaction.amount || 0).toFixed(2)}
                      </span>
                      <span style={{ padding: '0 8px', minWidth: '100px', flex: '1', color: '#6b7280' }}>
                        {transaction.paymentMethod}
                      </span>
                      <div style={{ padding: '0 8px', minWidth: '100px', flex: '1' }}>
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#d1fae5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '70px'
                        }}>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '700', 
                            color: '#374151' 
                          }}>
                            COMPLETED
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Pagination Controls */}
          {transactions.length > 0 && <PaginationControls />}
        </>
      )}
    </div>
  </div>
)}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;