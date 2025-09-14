import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { myProfileStyles as styles } from "../styles/myProfileStyles";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { jwtDecode } from "jwt-decode";

// Mock user data - this will be replaced with real authentication later
const MOCK_STUDENT = {
  id: 1,
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "12345678",
  gradeLevel: "Secondary 3",
  userType: "student",
};

const MOCK_TUTOR = {
  id: 1,
  firstName: "Alice",
  lastName: "Smith",
  email: "alice.smith@example.com",
  phone: "87654321",
  hourlyRate: "45.50",
  userType: "tutor",
  subjects: [
    { name: "Mathematics", experienceLevel: "advanced" },
    { name: "Physics", experienceLevel: "intermediate" },
  ],
};

export default function ProfileScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current user data
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Refresh data when user returns to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔄 Student profile screen focused - refreshing data");
      fetchCurrentUser();
    }, [])
  );

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Checking authentication...");

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        console.log("❌ User not authenticated, showing demo data");
        // If not authenticated, show demo data
        setCurrentUser(MOCK_STUDENT);
        setUserType("student");
        setLoading(false);
        return;
      }

      console.log("✅ User is authenticated!");

      // Try to decode the JWT to get user info
      const token = authService.getCurrentToken();
      console.log("🎫 Token:", token ? "exists" : "missing");

      if (token) {
        // Decode JWT payload (this is safe for client-side as it's not sensitive data)
        try {
          const payload = jwtDecode(token);
          console.log("📋 Token payload:", payload);

          // Get user ID and type from token
          const userId = payload.userId;
          const userTypeFromToken = payload.userType;

          console.log(`👤 User ID: ${userId}, Type: ${userTypeFromToken}`);

          // Only fetch student data (tutors should use the tutor profile page)
          let userData;
          if (userTypeFromToken === "student") {
            console.log("📚 Fetching student data...");
            userData = await apiClient.get(`/students/${userId}`);
            setUserType("student");
          } else {
            throw new Error(
              "This page is for students only. Tutors should use the tutor profile."
            );
          }

          console.log("📄 API Response:", userData);

          if (userData) {
            const finalUser = {
              ...userData,
              userType: userTypeFromToken,
            };
            console.log("✅ Setting user data:", finalUser);
            setCurrentUser(finalUser);
          } else {
            throw new Error("Failed to fetch user data");
          }
        } catch (tokenError) {
          console.error("❌ Token decode error:", tokenError);
          throw new Error("Invalid token");
        }
      } else {
        throw new Error("No token available");
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      setError(error.message);
      // Fallback to demo data on error
      console.log("🔄 Falling back to demo data");
      setCurrentUser(MOCK_STUDENT);
      setUserType("student");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentUser();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    Alert.alert(
      "Edit Profile",
      "Edit functionality will be implemented by your groupmate!"
    );
  };

  const handleLogout = () => {
    console.log("🚪 Logout button clicked!");

    // Use Alert for mobile compatibility
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: handleActualLogout },
    ]);
  };

  const handleActualLogout = async () => {
    try {
      await authService.logout();
      console.log("✅ Auth service logout complete");
      // Reset to demo data after logout
      setCurrentUser(MOCK_STUDENT);
      setUserType("student");
      // Navigate back to login page
      console.log("🔄 Navigating to login page");
      router.replace("/login");
    } catch (error) {
      console.error("❌ Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ marginTop: 16, fontSize: 16, color: "#6B7280" }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state with fallback to demo data
  if (error) {
    console.warn("Profile error, using demo data:", error);
  }

  // Safety check for currentUser
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            No user data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            {currentUser.image ? (
              <Image
                source={{ uri: currentUser.image }}
                style={styles.profileImagePlaceholder}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </Text>
              </View>
            )}
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.userName}>
            {currentUser.firstName} {currentUser.lastName}
          </Text>
          <Text style={styles.userRole}>Student</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.profileInfo}>
          {userType === "student" && (
            <View style={styles.infoItem}>
              <Ionicons name="school-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{currentUser.gradeLevel}</Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.phone}</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="book-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>My courses</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="card-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Payment</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <Ionicons name="settings-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
