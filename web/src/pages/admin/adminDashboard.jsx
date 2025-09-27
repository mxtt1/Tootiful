import React, { useState, useEffect } from 'react';
import ApiClient from '../../api/apiClient';
import UserPieChart from '../../components/userChart';
import GrowthChart from '../../components/growthChart';
import TransactionTable from '../../components/transactionTable';
import { notifications } from "@mantine/notifications";
import { FaMoneyBillAlt, FaChartLine, FaUsers, FaBook, FaGraduationCap } from 'react-icons/fa';  

const AdminDashboard = () => {
    const [totalTutors, setTotalTutors] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalAgencies, setTotalAgencies] = useState(10);
    const [totalSubscriptions, setTotalSubscriptions] = useState(5);
    const [totalRevenue, setTotalRevenue] = useState(116);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        fetchAllTutors();
        fetchAllStudents(); 
    }, []);

    const fetchAllTutors = async () => {
        try {
            console.log("Fetching all tutors from backend...");
            const allTutors = await ApiClient.get('/tutors');
            console.log('Tutors received: ', allTutors);

            setTotalTutors(allTutors.data.length || 0);
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

            setTotalStudents(allStudents.data.length || 0);
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
            <div style={{ padding: '2rem', textAlign: 'center'}}>
                <div>Loading dashboard data...</div>
            </div>
        );
    };

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
                    borderBottom: activeTab === 'general' ? '#' : '2px solid transparent',
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
                    borderBottom: activeTab === 'transactions' ? '#' : '2px solid transparent',
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
                    
                    {/* Tab Navigation */}
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
                                        flex: 1 // Added flex property
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
                                        flex: 1 
                                    }}>
                                        {/* TOTAL SUBSCRIPTIONS */}
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
                                                {totalSubscriptions}
                                            </p>
                                        </div>
                                        
                                        {/* TOTAL REVENUE */}
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
                                                ${totalRevenue}
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
                                            <UserPieChart tutors={totalTutors} students={totalStudents} agencies={totalAgencies} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Area Chart */}
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
                                }}>Subscription Growth
                                </h3>
                                <GrowthChart />
                            </div>
                        </div>
                    )}
                    
                    {/* Transactions Tab Content */}
                    {activeTab === 'transactions' && (
                        <div>
                            {/* Transaction Table */}
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
                                    Transaction Table
                                </h3>
                                <TransactionTable />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;