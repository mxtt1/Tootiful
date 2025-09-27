import React, { useState, useEffect } from "react";
import ApiClient from "../../api/apiClient";
import UserPieChart from "../../components/userChart";
import GrowthChart from "../../components/growthChart";
import TransactionTable from "../../components/transactionTable";
import { notifications } from "@mantine/notifications";
import {
  FaMoneyBillAlt,
  FaChartLine,
  FaUsers,
  FaBook,
  FaGraduationCap,
} from "react-icons/fa";
import { useAuth } from "../../auth/AuthProvider";

const AgencyDashboard = () => {
  const { user } = useAuth();
  const [totalTutors, setTotalTutors] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("user-distribution");

  // Get agencyId from user context
  const agencyId = user?.userType === "agency" ? user.id : user?.agencyId;

  useEffect(() => {
    if (agencyId) {
      fetchAllTutors();
      fetchAllStudents();
      fetchRevenueData();
    }
  }, [agencyId]);

  const fetchAllTutors = async () => {
    try {
      const res = await ApiClient.get(`/tutors?agencyId=${agencyId}`);
      setTotalTutors(res.data.length); // Real count
    } catch (err) {
      console.error("Error fetching tutors:", err);
      setError("Failed to load tutor data");
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await ApiClient.get(`/students?agencyId=${agencyId}`);
      setTotalStudents(res.data.length); // Real data - filtered by agency
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load student data");
    }
  };

  const fetchRevenueData = async () => {
    try {
      // Placeholder for revenue API - implement if available
      // const res = await ApiClient.get(`/agencies/${agencyId}/revenue`);
      // setTotalRevenue(res.data.total);
      // setTotalSubscriptions(res.data.subscriptions);
      setTotalRevenue(0); // Mock data - no revenue API implemented yet
      setTotalSubscriptions(0); // Mock data - no subscription tracking yet
    } catch (err) {
      console.error("Error fetching revenue:", err);
    } finally {
      setLoading(false);
    }
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
    <div
      style={{
        background: "linear-gradient(to bottom, #C7D3FF, #9B95E2)",
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "2.5rem 0.5rem 2rem 2.5rem", // more left flush
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "0.5rem",
            }}
          >
            Agency Dashboard
          </h1>
          <p style={{ color: "#252627ff", fontSize: "1rem" }}>
            Welcome back, {user?.name || user?.firstName} {user?.lastName}!
            Here's an overview of your agency's performance.
          </p>
        </div>

        <TabNavigation />

        {activeTab === "user-distribution" && (
          <>
            {/* Stats Cards */}
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

            {/* Charts */}
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
                <UserPieChart
                  tutors={totalTutors}
                  students={totalStudents}
                  agencies={0}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "revenue" && (
          <>
            {/* Stats Cards */}
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
                  <FaMoneyBillAlt
                    style={{
                      fontSize: "2rem",
                      color: "#ffc107",
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
                      ${totalRevenue}
                    </h3>
                    <p style={{ color: "#6c757d", margin: 0 }}>Total Revenue</p>
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
                  <FaBook
                    style={{
                      fontSize: "2rem",
                      color: "#dc3545",
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
                      {totalSubscriptions}
                    </h3>
                    <p style={{ color: "#6c757d", margin: 0 }}>
                      Active Subscriptions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
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
                  maxWidth: "900px",
                  flex: "2 1 600px",
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
                  Revenue Growth
                </h3>
                <GrowthChart data={[]} />
              </div>
            </div>
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
      </div>
    </div>
  );
};

export default AgencyDashboard;
