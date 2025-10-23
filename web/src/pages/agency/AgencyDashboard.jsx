import React, { useState, useEffect } from "react";
import ApiClient from "../../api/apiClient";
import GenericPieChart from "../../components/userChart";
import GrowthChart from "../../components/growthChart";
import TransactionTable from "../../components/transactionTable";
import { notifications } from "@mantine/notifications";
import { Container, Title, Text, Stack } from "@mantine/core";
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
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [gradeLevelRevenue, setGradeLevelRevenue] = useState([]);
  const [subjectRevenueByGrade, setSubjectRevenueByGrade] = useState({});
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(null);
  const [showSubscriptionsDetail, setShowSubscriptionsDetail] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("user-distribution");

  // Get agencyId from user context
  const agencyId = user?.userType === "agency" ? user.id : user?.agencyId;

  const getSubjectName = (subjectId) => {
    if (!subjectId) return 'No subject';
    if (!subjects || subjects.length === 0) return 'Loading...';
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? `${subject.name} (${subject.gradeLevel})` : `Subject ID: ${subjectId}`;
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

  useEffect(() => {
    if (agencyId) {
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          await Promise.all([
            fetchAllTutors(),
            fetchAllStudents(),
            fetchRevenueData(),
            fetchAttendanceData(),
            fetchLessonData(),
            fetchSubjects()
          ]);
        } catch (error) {
          console.error("Failed to load dashboard data:", error);
          setError("Failed to load dashboard data. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      
      fetchDashboardData();
    } else {
      console.error("No agencyId found for user:", user);
      setError("No agency ID found. Please contact support.");
      setLoading(false);
    }
  }, [agencyId]);

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
      const res = await ApiClient.get(`/tutors?agencyId=${agencyId}`);
      const tutorsData = res?.data || [];
      setTotalTutors(tutorsData.length || 0);
    } catch (err) {
      console.error("Error fetching tutors:", err);
      setError("Failed to load tutor data");
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await ApiClient.get(`/students?agencyId=${agencyId}`);
      const studentsData = res?.data || [];
      setTotalStudents(studentsData.length || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load student data");
    }
  };

  const fetchRevenueData = async () => {
    try {
      const res = await ApiClient.get(`/analytics/agency/${agencyId}/revenue-summary`);
      
      if (!res) {
        throw new Error("No response from server");
      }
      
      const revenueData = res.data?.data || res.data;
      
      if (revenueData) {
        setRevenueData(revenueData);
        setTotalSubscriptions(revenueData.totalSubscriptions || 0);
        
        const gradeRevenue = revenueData.revenueByGradeLevel || revenueData.gradeLevelRevenue || [];
        setGradeLevelRevenue(gradeRevenue);
        
        const subjectRevenue = revenueData.subjectRevenueByGrade || revenueData.subjectsByGrade || {};
        setSubjectRevenueByGrade(subjectRevenue);
      } else {
        console.warn("No revenue data found in response");
        setError("No revenue data available");
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError("Failed to load revenue data");
    }
  };

  const fetchLessonData = async () => {
    try {
      const res = await ApiClient.get(`/lessons/agency/${agencyId}`);
      const lessonsData = res?.data?.data || res?.data || [];
      setLessons(lessonsData);
    } catch (err) {
      console.error("Error fetching lesson data:", err);
      setError("Failed to load lesson data");
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const res = await ApiClient.get(`/lessons/agency/${agencyId}/attendance`);
      const attendanceData = res?.data?.data || res?.data || [];
      
      if (!attendanceData || attendanceData.length === 0) {
        setAttendanceRate(0);
        return;
      }

      let totalSessions = 0;
      let presentCount = 0;

      // loop thru each lesson
      attendanceData.forEach(lesson => {
        // Get sessions from different possible field names
        const sessions = lesson.allSessions || lesson.instances || lesson.sessions || [];
        
        // Loop through each session in the lesson
        sessions.forEach(session => {
          totalSessions++; // Count every session
          
          // Check if student was present using multiple indicators:
          if (session.isAttended === true) {
            presentCount++;
          // check session status
          } else if (session.status === 'present' || session.status === 'completed') {
            presentCount++;
          }
        });
      });

      // Calculate percentage
      // Attendance Rate = (Present Sessions ÷ Total Sessions) × 100
      const rate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
      setAttendanceRate(Math.round(rate));

    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
      notifications.show({
        title: "Error",
        message: err.response?.data?.message || "Failed to load attendance records",
        color: "red",
      });
      setAttendanceRate(0);
    } 
  };

  const handleShowSubscriptionsDetail = () => {
    setShowSubscriptionsDetail(true);
  };

  const handleBackToRevenue = () => {
    setShowSubscriptionsDetail(false);
  };

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
    const lessonsWithStudents = lessons.filter(lesson => (lesson.currentCap || 0) > 0);
    const calculatedTotal = lessonsWithStudents.reduce((sum, lesson) => sum + (lesson.currentCap || 0), 0);

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
              {calculatedTotal} students across {lessonsWithStudents.length} lessons
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
            Active Lessons with Enrolled Students
          </h3>
          
          {lessonsWithStudents.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6c757d", padding: "2rem" }}>
              <p>No lessons with enrolled students found</p>
              <p style={{ fontSize: "0.875rem" }}>All {lessons.length} lessons have 0 students enrolled</p>
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
                      {getSubjectName(lesson.subjectId)} • {lesson.dayOfWeek} • {lesson.startTime} - {lesson.endTime}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      fontSize: "1.25rem", 
                      fontWeight: "bold", 
                      color: "#28a745" 
                    }}>
                      {lesson.currentCap || 0}
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
                    <FaGraduationCap
                      style={{
                        fontSize: "2rem",
                        color: "#28a745",
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
                        {totalStudents}
                      </h3>
                      <p style={{ color: "#6c757d", margin: 0 }}>
                        Total Students
                      </p>
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
                            Total Subscriptions
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6155F5" }}>
                        Click to view breakdown
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
                            {attendanceRate}%
                          </h3>
                          <p style={{ color: "#6c757d", margin: 0, fontSize: "0.875rem" }}>
                            Attendance Rate
                          </p>
                        </div>
                      </div>
                    </div>
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
                      timeRange="monthly"
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
                      timeRange="monthly"
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
              <TransactionTable data={[]} />
            </div>
          )}
        </Stack>
      </div>
    </Container>
  );
};

export default AgencyDashboard;