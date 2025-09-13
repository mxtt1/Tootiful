import React, { useState, useEffect } from 'react';
import ApiClient from '../api/apiClient';
import UserPieChart from '../components/userChart';
import GrowthLineChart from '../components/growthChart';
import { notifications } from "@mantine/notifications";
import { FaMoneyBillAlt, FaChartLine, FaUsers, FaBook, FaGraduationCap } from 'react-icons/fa';  


const AdminDashboard = () => {
    const [totalTutors, setTotalTutors] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalAgencies, setTotalAgencies] = useState(10);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllTutors();
        fetchAllStudents(); 
    }, []);

    const fetchAllTutors = async () => {
        try {
            console.log("Fetching all tutors from backend...");
            const allTutors = await ApiClient.get('/tutors');
            console.log('Tutors received: ', allTutors);

            setTotalTutors(allTutors.data.length || 1);
        } catch (error) {
            console.log("Error fetching tutors:", error);
            setError("Failed to load tutors data");
                notifications.show({
                title: "Error",
                message: "Failed to load tutors data",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAllStudents = async () => {
        try {
            console.log("Fetching students from backend...");
            const allStudents = await ApiClient.get('/students');
            console.log('Students receieved', allStudents);

            setTotalStudents(allStudents.data.length || 1);
        } catch (error) {
            console.log("Error fetching students:", error);
            setError("Failed to load students data");
                notifications.show({
                title: "Error",
                message: "Failed to load students data",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div>Loading dashboard data...</div>
            </div>
        );
    }

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-container">
                    <h2 style={{ marginBottom: '1.5rem' }}>Admin Dashboard</h2>
                    
                    {/* Main Content Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr', 
                        gap: '2rem',
                        alignItems: 'start',
                        marginBottom: '2rem'
                    }}>
                        
                        {/* Left Column - Stats Cards */}
                        <div>
                            {/* Row 1 */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(3, 1fr)', 
                                gap: '1.5rem', 
                                marginBottom: '1.5rem' 
                            }}>
                                {/* TOTAL AGENCIES */}
                                <div style={{ 
                                    padding: '1.2rem', 
                                    border: '1px solid #dee2e6', 
                                    borderRadius: '8px', 
                                    backgroundColor: 'white',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    position: 'relative'
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
                                            <FaUsers style={{ 
                                                fontSize: '18px', 
                                                color: '#4285B4',
                                                position: 'relative',
                                                zIndex: 1
                                            }} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0A0A0A' }}>
                                        10
                                    </p>
                                </div>

                                {/* TOTAL TUTORS */}
                                <div style={{ 
                                    padding: '1.2rem', 
                                    border: '1px solid #dee2e6', 
                                    borderRadius: '8px', 
                                    backgroundColor: 'white',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    position: 'relative'
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
                                    position: 'relative'
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
                                            <FaBook style={{ 
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

                            {/* Row 2 */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(2, 1fr)', 
                                gap: '1.5rem', 
                                marginBottom: '2rem' 
                            }}>
                                {/* TOTAL SUBSCRIPTIONS */}
                                <div style={{ 
                                    padding: '1.2rem', 
                                    border: '1px solid #dee2e6', 
                                    borderRadius: '8px', 
                                    backgroundColor: 'white',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    position: 'relative'
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
                                            Total Subscriptions
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
                                                backgroundColor: 'rgba(52, 168, 83, 0.2)',
                                            }}></div>
                                            <FaChartLine style={{ 
                                                fontSize: '18px', 
                                                color: '#34A853',
                                                position: 'relative',
                                                zIndex: 1
                                            }} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0A0A0A' }}>
                                        156
                                    </p>
                                </div>
                                
                                {/* TOTAL REVENUE */}
                                <div style={{ 
                                    padding: '1.2rem', 
                                    border: '1px solid #dee2e6', 
                                    borderRadius: '8px', 
                                    backgroundColor: 'white', 
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    position: 'relative'
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
                                            Total Revenue
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
                                                backgroundColor: 'rgba(155, 81, 224, 0.2)',
                                            }}></div>
                                            <FaMoneyBillAlt style={{ 
                                                fontSize: '18px', 
                                                color: '#9B51E0',
                                                position: 'relative',
                                                zIndex: 1
                                            }} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0A0A0A' }}>
                                        $12,456
                                    </p>
                                </div>
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
                            position: 'relative',
                            overflow: 'hidden'
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
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                height: '220px'
                            }}>
                                <div style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <UserPieChart tutors={totalTutors} students={totalStudents}
                                    agencies = {totalAgencies} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Line Chart */}
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
                            Revenue
                        </h3>
                        <GrowthLineChart />
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;