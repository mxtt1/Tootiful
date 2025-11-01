import React, { useState, useEffect } from "react";
import ApiClient from "../../api/apiClient";
import GenericPieChart from "../../components/userChart";
import GrowthChart from "../../components/growthChart";
import TransactionTable from "../../components/transactionTable";
import { notifications } from "@mantine/notifications";
import { Container, Title, Text, Stack, Select, Group } from "@mantine/core";
import { FaFilter } from "react-icons/fa";
import {
  FaMoneyBillAlt,
  FaChartLine,
  FaUsers,
  FaBook,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaSchool,
  FaUserGraduate,
  FaArrowLeft 
} from "react-icons/fa";
import { useAuth } from "../../auth/AuthProvider";

const AgencyDashboard = () => {
  const { user } = useAuth();
  const [totalTutors, setTotalTutors] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [revenueData, setRevenueData] = useState(null);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [missedSessionsRate, setMissedSessionsRate] = useState(0);
  const [showTutorBreakdown, setShowTutorBreakdown] = useState(false);
  const [tutorMissedRates, setTutorMissedRates] = useState([]); // store tutor data
  const [gradeLevelRevenue, setGradeLevelRevenue] = useState([]);
  const [subjectRevenueByGrade, setSubjectRevenueByGrade] = useState({});
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(null);
  const [showSubscriptionsDetail, setShowSubscriptionsDetail] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("user-distribution");

  // filters
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("this_month");
  
  // Time range options
  const timeRangeOptions = [
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "this_year", label: "This Year" },
    { value: "all_time", label: "All Time" }
  ];

  // Get agencyId from user context
  const agencyId = user?.userType === "agency" ? user.id : user?.agencyId;

  // Helper function that mimics backend logic
  const determineIfSessionIsMissed = (session, lesson, now = new Date()) => {
    // If already attended, it's not missed
    if (session.isAttended) {
      return false;
    }

    // If session has status field, use it directly
    if (session.status === 'missed') {
      return true;
    }

    // Calculate marking window similar to backend
    try {
      const markingWindow = calculateMarkingWindow(session.date, lesson.startTime, lesson.endTime);
      
      // If current time is after marking window and not attended, it's missed
      return now > markingWindow.windowEnd;
    } catch (error) {
      console.error("Error calculating marking window:", error);
      // Fallback: if session date is in past and not attended, consider missed
      const sessionDate = new Date(session.date);
      return sessionDate < now && !session.isAttended;
    }
  };

  // Helper function to calculate marking window (similar to backend)
  const calculateMarkingWindow = (dateStr, startTime, endTime) => {
    const ONE_HOUR_IN_MS = 60 * 60 * 1000;

    if (!dateStr || !startTime || !endTime) {
      throw new Error('Missing values for marking window calculation');
    }

    const parseDateTime = (timeStr) => {
      const dateTime = new Date(`${dateStr}T${timeStr}`);
      if (Number.isNaN(dateTime.getTime())) {
        throw new Error('Invalid date/time');
      }
      return dateTime;
    };

    const startDateTime = parseDateTime(startTime);
    const endDateTime = parseDateTime(endTime);

    return {
      windowStart: new Date(startDateTime.getTime() - ONE_HOUR_IN_MS),
      windowEnd: new Date(endDateTime.getTime() + ONE_HOUR_IN_MS),
      startDateTime,
      endDateTime
    };
  };

  // Prepare user distribution data for GenericPieChart
  const userDistributionData = [
    { name: 'Tutors', value: totalTutors },
    { name: 'Students', value: totalStudents }
  ].filter(item => item.value > 0);

  // Get subject revenue data for selected grade level
  const selectedGradeSubjectRevenue = selectedGradeLevel 
    ? subjectRevenueByGrade[selectedGradeLevel] || []
    : [];

  // Fetch locations for filter
  const fetchLocations = async () => {
    try {
      const response = await ApiClient.get(`/agencies/${agencyId}/locations`);
      const locationsData = response?.data?.data || response?.data || [];
      // Format the locations for the dropdown
      const formattedLocations = locationsData.map(location => ({
        value: location.address,
        label: location.address
      }));
      setLocations([{ value: "all", label: "All Locations" }, ...formattedLocations]);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      // If API fails, provide default location
      setLocations([{ value: "all", label: "All Locations" }]);
    } 
  };

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      
      // Fetch both student payments and tutor payments
      const revenueRes = await ApiClient.get(
        `/analytics/agency/${agencyId}/revenue-summary?timeRange=${selectedTimeRange}${
          selectedLocation !== 'all' ? `&location=${selectedLocation}` : ''
        }`
      );

      const revenueData = revenueRes?.data?.data || revenueRes?.data || {};
      const studentPayments = revenueData.studentPayments || [];
    
      console.log(`Found ${studentPayments.length} student payments in revenue summary`);

      // Format student payments for transaction table
      const formattedStudentPayments = studentPayments.map(payment => ({
        id: `student-${payment.id}`,
        type: 'student_payment',
        studentId: payment.studentId,
        studentName: payment.studentName || `Student ${payment.studentId?.slice(0, 8)}`,
        amount: payment.amount,
        date: payment.paymentDate || payment.createdAt,
        cardType: 'Stripe',
        status: 'completed',
        createdAt: payment.createdAt
      }));

      // ADD THIS: Fetch tutor payments separately
      let formattedTutorPayments = [];
      try {
        const tutorPaymentsRes = await ApiClient.get(
          `/tutorPayments/agency/${agencyId}/payments?timeRange=${selectedTimeRange}${
            selectedLocation !== 'all' ? `&location=${selectedLocation}` : ''
          }`
        );
        const tutorPayments = tutorPaymentsRes?.data?.data || tutorPaymentsRes?.data || [];
        
        formattedTutorPayments = tutorPayments.map(payment => ({
          id: `tutor-${payment.id}`,
          type: 'tutor_payment',
          tutorId: payment.tutorId,
          tutorName: payment.tutorName,
          paymentAmount: payment.paymentAmount,
          amount: payment.paymentAmount,
          date: payment.paymentDate || payment.createdAt,
          status: 'paid',
          createdAt: payment.createdAt
        }));
      } catch (tutorError) {
        console.warn('Tutor payments endpoint not available:', tutorError.message);
      }

      // Combine and sort by date (newest first)
      const allTransactions = [...formattedStudentPayments, ...formattedTutorPayments]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(allTransactions);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      notifications.show({
        title: "Warning",
        message: "Could not load transaction history",
        color: "yellow",
      });
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (agencyId) {
      fetchLocations();
    }
  }, [agencyId]);

  useEffect(() => {
    if (!agencyId) {
      console.error("No agencyId available");
      setError("Unable to load dashboard: No agency ID found");
      setLoading(false);
      return;
    }
    
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchAllTutors();
      await fetchAllStudents();
      await fetchRevenueData();
      await fetchMissedSessionData();
      await fetchSubscriptionLessons();
      await fetchSubjects();
      await fetchTransactions();
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
    
    fetchDashboardData();
  }, [agencyId, selectedLocation, selectedTimeRange]);

  const fetchSubjects = async () => {
    try {
      const response = await ApiClient.get('/lessons/subjects');
      const subjectsData = response?.data || response || [];
      setSubjects(subjectsData);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
      notifications.show({
        title: "Warning",
        message: "Could not load subjects",
        color: "yellow",
      });
    }
  };

  const fetchAllTutors = async () => {
    try {
      const res = await ApiClient.get(`/tutors?agencyId=${agencyId}${selectedLocation !== 'all' ? `&location=${selectedLocation}` : ''}`);
      const tutorsData = res?.data || [];
      setTotalTutors(tutorsData.length || 0);
    } catch (err) {
      console.error("Error fetching tutors:", err);
      setError("Failed to load tutor data");
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await ApiClient.get(`/students?agencyId=${agencyId}${selectedLocation !== 'all' ? `&location=${selectedLocation}` : ''}`);
      const studentsData = res?.data || [];
      setTotalStudents(studentsData.length || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load student data");
    }
  };

  const fetchRevenueData = async () => {
    try {
      const res = await ApiClient.get(`/analytics/agency/${agencyId}/revenue-summary?timeRange=${selectedTimeRange}${selectedLocation !== 'all' ? `&location=${selectedLocation}` : ''}`);
      
      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }
      
      // Consistent data extraction
      const revenueData = res.data.success ? res.data.data : res.data;
      
      if (!revenueData) {
        throw new Error("No revenue data in response");
      }
      
      setRevenueData(revenueData);
      setTotalSubscriptions(revenueData.totalSubscriptions || 0);
      
      const gradeRevenue = revenueData.revenueByGradeLevel || revenueData.gradeLevelRevenue || [];
      setGradeLevelRevenue(gradeRevenue);
      
      const subjectRevenue = revenueData.subjectRevenueByGrade || revenueData.subjectsByGrade || {};
      setSubjectRevenueByGrade(subjectRevenue);
      
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError(err.message || "Failed to load revenue data");
      // Set default empty values
      setRevenueData({ studentRevenue: 0, netRevenue: 0, tutorPaymentsPaid: 0 });
      setTotalSubscriptions(0);
      setGradeLevelRevenue([]);
      setSubjectRevenueByGrade({});
    }
  };

  const fetchSubscriptionLessons = async () => {
    try {
      const res = await ApiClient.get(`/analytics/agency/${agencyId}/subscription-lessons?timeRange=${selectedTimeRange}${selectedLocation !== 'all' ? `&location=${selectedLocation}` : ''}`);
      
      const subscriptionData = res?.data?.data || res?.data || [];
      setLessons(subscriptionData);
    } catch (err) {
      console.error("Error fetching subscription lessons:", err);
      // Fallback to regular lesson fetch
      fetchLessonData();
    }
  };

  const fetchLessonData = async () => {
    try {
      const res = await ApiClient.get(`/lessons/agency/${agencyId}${selectedLocation !== 'all' ? `?location=${selectedLocation}` : ''}`);
      const lessonsData = res?.data?.data || res?.data || [];
      setLessons(lessonsData);
    } catch (err) {
      console.error("Error fetching lesson data:", err);
      setError("Failed to load lesson data");
    }
  };

  const fetchMissedSessionData = async () => {
    try {

      // Test the API call directly first
      const testUrl = `/analytics/agency/${agencyId}/attendance${selectedLocation !== 'all' ? `?location=${selectedLocation}` : ''}`;

      const res = await ApiClient.get(testUrl);
    
      
      if (!res) {
        console.log("NO RESPONSE from API");
        return;
      }
      
      const attendanceData = res?.data?.data || res?.data || {};
      console.log("Processed attendance data:", attendanceData);
      
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
      console.error("Error message:", err.message);
      console.error("Error response:", err.response);
      setMissedSessionsRate(0);
      setTutorMissedRates([]);
    } 
  };

  // Add this missing handler function
  const handleBackToOverview = () => {
    setShowTutorBreakdown(false);
  };

  // Add this missing handler function for tutor breakdown
  const handleShowTutorBreakdown = () => {
    setShowTutorBreakdown(true);
  };

  // Tutor missed session breakdown view - FIXED VERSION
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
              Tutor Missed Sessions Breakdown
            </h2>
            <p style={{ color: "#6c757d", margin: 0, fontSize: "1.1rem", fontWeight: "500" }}>
              {totalTutors} tutors • {totalMissed} missed sessions out of {totalSessions} total
            </p>
            <p style={{ color: "#6c757d", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
              Overall Agency Rate: {missedSessionsRate}% • {selectedLocation === 'all' ? 'All Locations' : selectedLocation}
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
              <p>No tutor attendance data available for the selected filters</p>
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
                      {tutor.totalSessions} sessions • {tutor.missedSessions} missed
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

  // Filter Component
  const FilterSection = () => (
    <Group spacing="md" style={{ justifyContent: "flex-end", marginBottom: "1.5rem" }}>
      <Select
        value={selectedLocation}
        onChange={setSelectedLocation}
        data={locations}
        placeholder="Select location"
        style={{ width: "200px" }}
      />
      
      <Select
        value={selectedTimeRange}
        onChange={setSelectedTimeRange}
        data={timeRangeOptions}
        placeholder="Select time range"
        style={{ width: "200px" }}
      />

  </Group>
);

  const handleShowSubscriptionsDetail = () => {
    setShowSubscriptionsDetail(true);
  };

  const handleBackToRevenue = () => {
    setShowSubscriptionsDetail(false);
  };

  // In your revenue section, add the clickable missed sessions card:
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

  // Grade Level Revenue Cards Component
  const GradeLevelRevenueCards = () => {
    if (!gradeLevelRevenue || gradeLevelRevenue.length === 0) {
      return (
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            marginBottom: "2rem",
            textAlign: "center",
            color: "#6c757d"
          }}
        >
          <h3>No Grade Level Revenue Data Available</h3>
          <p>Revenue data by grade level will appear here once available.</p>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
          justifyContent: "flex-start",
        }}
      >
        {gradeLevelRevenue.map((grade, index) => {
          const colors = ['#6155F5', '#28a745', '#ffc107', '#dc3545', '#9334E6'];
          const icons = [FaUserGraduate, FaSchool, FaChalkboardTeacher, FaGraduationCap, FaUsers];
          const IconComponent = icons[index % icons.length];
          
          return (
            <div
              key={grade.name || index}
              onClick={() => setSelectedGradeLevel(grade.name)}
              style={{
                backgroundColor: "white",
                padding: "1.25rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                minWidth: "200px",
                maxWidth: "280px",
                flex: "1 1 220px",
                borderLeft: `4px solid ${colors[index % colors.length]}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform: selectedGradeLevel === grade.name ? "scale(1.02)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                if (selectedGradeLevel !== grade.name) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <IconComponent
                  style={{
                    fontSize: "2rem",
                    color: colors[index % colors.length],
                    marginRight: "1rem",
                  }}
                />
                <div>
                  <h3
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#333",
                      margin: 0,
                    }}
                  >
                    ${(grade.value || 0).toLocaleString()}
                  </h3>
                  <p style={{ color: "#6c757d", margin: 0 }}>
                    {grade.name || `Grade Level ${index + 1}`} Revenue
                  </p>
                </div>
              </div>
              <div style={{ fontSize: "0.875rem", color: colors[index % colors.length] }}>
                Click to view subject breakdown
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const SubscriptionsDetailView = () => {
    const lessonsWithStudents = lessons
      .filter(lesson => (lesson.paymentCount || 0) > 0)
      .sort((a, b) => {
        // Sort by payment count (descending)
        const countA = a.paymentCount || 0;
        const countB = b.paymentCount || 0;
        return countB - countA;
      });

    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={handleBackToRevenue}
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
            Back to Revenue Overview
          </button>
          
          <div style={{ 
            backgroundColor: "white", 
            padding: "1.5rem", 
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            <h2 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
              Subscriptions Breakdown
            </h2>
            <p style={{ color: "#6c757d", margin: 0, fontSize: "1.1rem", fontWeight: "500" }}>
              {totalSubscriptions} students across {lessonsWithStudents.length} lessons
            </p>
            <p style={{ color: "#6c757d", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
              Filtered by: {selectedTimeRange} • {selectedLocation === 'all' ? 'All Locations' : selectedLocation}
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
            Lessons with Subscriptions
          </h3>
          
          {lessonsWithStudents.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6c757d", padding: "2rem" }}>
              <p>No lessons with subscriptions found for the selected filters</p>
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
                      Location: {lesson.locationAddress} • Tutor: {lesson.tutorName}
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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6155F5",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "1rem"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const TabNavigation = () => (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #e0e0e0",
        marginBottom: "1.5rem",
        paddingLeft: "0.5rem",
        backgroundColor: "transparent",
      }}
    >
      <button
        onClick={() => setActiveTab("user-distribution")}
        style={{
          padding: "0.75rem 1.5rem",
          border: "none",
          borderBottom:
            activeTab === "user-distribution"
              ? "2px solid #6155F5"
              : "2px solid transparent",
          color: activeTab === "user-distribution" ? "#6155F5" : "#6c757d",
          fontWeight: activeTab === "user-distribution" ? "600" : "400",
          cursor: "pointer",
          fontSize: "0.95rem",
          transition: "all 0.2s ease",
          marginRight: "0.5rem",
        }}
      >
        User Distribution
      </button>
      <button
        onClick={() => setActiveTab("revenue")}
        style={{
          padding: "0.75rem 1.5rem",
          border: "none",
          borderBottom:
            activeTab === "revenue"
              ? "2px solid #6155F5"
              : "2px solid transparent",
          color: activeTab === "revenue" ? "#6155F5" : "#6c757d",
          fontWeight: activeTab === "revenue" ? "600" : "400",
          cursor: "pointer",
          fontSize: "0.95rem",
          transition: "all 0.2s ease",
          marginRight: "0.5rem",
        }}
      >
        Revenue
      </button>
      <button
        onClick={() => setActiveTab("transactions")}
        style={{
          padding: "0.75rem 1.5rem",
          border: "none",
          borderBottom:
            activeTab === "transactions"
              ? "2px solid #6155F5"
              : "2px solid transparent",
          color: activeTab === "transactions" ? "#6155F5" : "#6c757d",
          fontWeight: activeTab === "transactions" ? "600" : "400",
          cursor: "pointer",
          fontSize: "0.95rem",
          transition: "all 0.2s ease",
          marginRight: "0.5rem",
        }}
      >
        Transaction History
      </button>
    </div>
  );

  // Then in your revenue tab render:
  if (showTutorBreakdown) {
    return (
      <Container size="xl" py="xl" style={{ background: "linear-gradient(to bottom, #C7D3FF, #9B95E2)", minHeight: "100vh", margin: 0, padding: 0, maxWidth: "100%" }}>
        <div style={{ padding: "2.5rem 2.5rem 2rem 2.5rem", width: "100%", boxSizing: "border-box" }}>
          <TutorMissedSessionsBreakdown />
        </div>
      </Container>
    );
  }

  return (
    <Container 
      size="xl" 
      py="xl"
      style={{
        background: "linear-gradient(to bottom, #C7D3FF, #9B95E2)",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          padding: "2.5rem 2.5rem 2rem 2.5rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Stack spacing="lg">
          <div style={{ marginBottom: "2rem" }}>
            <Title order={1} style={{ color: "#333", marginBottom: "0.5rem" }}>
              Agency Dashboard
            </Title>
            <Text color="dimmed" size="lg">
              Welcome back, {user?.name || user?.firstName} {user?.lastName}!
              Here's an overview of your agency's performance.
            </Text>
          </div>

          <FilterSection />

          <TabNavigation />

          {activeTab === "user-distribution" && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    minWidth: "240px",
                    maxWidth: "320px",
                    flex: "1 1 260px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <FaUsers
                      style={{
                        fontSize: "2rem",
                        color: "#6155F5",
                        marginRight: "1rem",
                      }}
                    />
                    <div>
                      <h3
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#333",
                          margin: 0,
                        }}
                      >
                        {totalTutors}
                      </h3>
                      <p style={{ color: "#6c757d", margin: 0 }}>Total Tutors</p>
                    </div>
                  </div>
                </div>
             
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    minWidth: "340px",
                    maxWidth: "600px",
                    flex: "2 1 400px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      color: "#333",
                      marginBottom: "1rem",
                    }}
                  >
                    User Distribution
                  </h3>
                  <GenericPieChart 
                    data={userDistributionData}
                    title={null} 
                    colors={['#6155F5', '#28a745']} 
                    showLabel={true}
                    labelType="percentage"
                    height={300}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "revenue" && (
            <>
              {showSubscriptionsDetail ? (
                <SubscriptionsDetailView />
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginBottom: "2rem",
                      flexWrap: "wrap",
                      justifyContent: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "1.25rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        minWidth: "200px",
                        maxWidth: "280px",
                        flex: "1 1 220px",
                        borderLeft: "4px solid #28a745",
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
                            ${revenueData?.studentRevenue?.toLocaleString() || '0'}
                          </h3>
                          <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                            Gross Revenue
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#28a745" }}>
                        Total from students
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "1.25rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        minWidth: "200px",
                        maxWidth: "280px",
                        flex: "1 1 220px",
                        borderLeft: "4px solid #dc3545",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <FaUsers
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
                            ${((revenueData?.tutorPaymentsOwed || 0) + (revenueData?.tutorPaymentsPaid || 0)).toLocaleString()}
                          </h3>
                          <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                            Tutor Payments
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#dc3545" }}>
                        Total to tutors
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "1.25rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        minWidth: "200px",
                        maxWidth: "280px",
                        flex: "1 1 220px",
                        borderLeft: "4px solid #6155F5",
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
                            color: "#6155F5",
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
                            ${(revenueData?.netRevenue || 0).toLocaleString()}
                          </h3>
                          <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                            Net Profit
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6155F5" }}>
                        Gross - Tutor Payments
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginBottom: "2rem",
                      flexWrap: "wrap",
                      justifyContent: "flex-start",
                    }}
                  >
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

                    {renderMissedSessionsCard()}
                  </div>

                  <GradeLevelRevenueCards />

                  {selectedGradeLevel && selectedGradeSubjectRevenue.length > 0 && (
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        marginTop: "2rem",
                        marginBottom: "3rem",
                        minWidth: "340px",
                        maxWidth: "600px",
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            color: "#333",
                            margin: 0,
                          }}
                        >
                          Subject Revenue - {selectedGradeLevel}
                        </h3>
                        <button
                          onClick={() => setSelectedGradeLevel(null)}
                          style={{
                            padding: "0.5rem 1rem",
                            border: "none",
                            borderRadius: "5px",
                            backgroundColor: "#6c757d",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                          }}
                        >
                          Back to Overview
                        </button>
                      </div>
                      <GenericPieChart 
                        data={selectedGradeSubjectRevenue}
                        title={null}
                        showLabel={true}
                        labelType="value"
                        height={300}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      minWidth: "340px",
                      maxWidth: "900px",
                      flex: "2 1 600px",
                    }}
                  >
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#333", marginBottom: "1rem" }}>
                      Revenue Growth
                    </h3>
                    <GrowthChart 
                      dataType="revenue" 
                      agencyId={agencyId} 
                      timeRange={selectedTimeRange}  
                      location={selectedLocation}  
                      currentValue={revenueData?.studentRevenue} 
                    />
                  </div>

                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      minWidth: "340px",
                      maxWidth: "900px",
                      flex: "2 1 600px",
                    }}
                  >
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#333", marginBottom: "1rem" }}>
                      Subscription Growth
                    </h3>
                    <GrowthChart 
                      dataType="subscriptions" 
                      agencyId={agencyId} 
                      timeRange={selectedTimeRange}  
                      location={selectedLocation}  
                      currentValue={totalSubscriptions} 
                    />
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "transactions" && (
            <div
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                marginTop: "2rem",
                marginBottom: "3rem",
                minWidth: "340px",
                maxWidth: "100%",
              }}
            >
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "#333",
                  marginBottom: "1rem",
                }}
              >
                Transaction History
              </h3>
              {transactionsLoading ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <div>Loading transactions...</div>
                </div>
              ) : (
                <TransactionTable data={transactions} />
              )}
            </div>
          )}
        </Stack>
      </div>
    </Container>
  );
};

export default AgencyDashboard;