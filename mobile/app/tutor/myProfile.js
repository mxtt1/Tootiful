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
import React from "react";
import { myProfileStyles as styles } from "../styles/myProfileStyles";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { jwtDecode } from "jwt-decode";

export default function TutorProfileScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current tutor data on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Refresh data when user returns to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔄 Tutor profile screen focused - refreshing data");
      fetchCurrentUser();
    }, [])
  );

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Checking tutor authentication...");

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        console.log("❌ Tutor not authenticated");
        throw new Error("Please log in to view your profile");
      }

      console.log("✅ Tutor is authenticated!");

      // Try to decode the JWT to get user info
      const token = authService.getCurrentToken();
      console.log("🎫 Token:", token ? "exists" : "missing");

      if (token) {
        // Decode JWT payload
        try {
          const payload = jwtDecode(token);
          console.log("📋 Token payload:", payload);

          // Get user ID and type from token
          const userId = payload.userId;
          const userTypeFromToken = payload.userType;

          console.log(`👤 User ID: ${userId}, Type: ${userTypeFromToken}`);

          // Only fetch if it's a tutor
          if (userTypeFromToken === "tutor") {
            console.log("👨‍🏫 Fetching tutor data...");
            // Use API client instead of direct fetch
            const userData = await apiClient.get(`/tutors/${userId}`);

            console.log("📄 API Response:", userData);

            if (userData) {
              const finalUser = {
                ...userData,
                userType: userTypeFromToken,
              };
              console.log("✅ Setting tutor data:", finalUser);
              setCurrentUser(finalUser);
            } else {
              throw new Error("Failed to fetch tutor data");
            }
          } else {
            throw new Error("Not a tutor account");
          }
        } catch (tokenError) {
          console.error("❌ Token decode error:", tokenError);
          throw new Error("Invalid token");
        }
      } else {
        throw new Error("No token available");
      }
    } catch (error) {
      console.error("❌ Error fetching tutor data:", error);
      setError(error.message || "Failed to load profile data");
      // Don't fallback to mock data - let user know they need to authenticate
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
    console.log("🚪 Tutor logout button clicked!");

    // Use Alert for mobile compatibility
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: handleActualLogout },
    ]);
  };

  const handleActualLogout = async () => {
    try {
      await authService.logout();
      console.log("✅ Tutor auth service logout complete");
      // Clear user data and redirect to login
      setCurrentUser(null);
      console.log("🔄 Tutor navigating to login page");
      router.replace("/login");
    } catch (error) {
      console.error("❌ Tutor logout error:", error);
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
                source={{ uri: currentUser.image + "?t=" + Date.now() }}
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
            {/* Verified badge for tutors */}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.userName}>
            {currentUser.firstName} {currentUser.lastName}
          </Text>
          <Text style={styles.userRole}>Tutor</Text>

          {/* Stats for tutors */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {currentUser.subjects && currentUser.subjects.length > 0
                  ? `$${Math.min(
                      ...currentUser.subjects.map(
                        (s) => s.TutorSubject?.hourlyRate || 45
                      )
                    )}-$${Math.max(
                      ...currentUser.subjects.map(
                        (s) => s.TutorSubject?.hourlyRate || 45
                      )
                    )}`
                  : "$45"}
              </Text>
              <Text style={styles.statLabel}>Hourly Rate</Text>
            </View>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.profileInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.phone}</Text>
          </View>
        </View>

        {/* Subjects for tutors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjects</Text>
          {currentUser.subjects && currentUser.subjects.length > 0 ? (
            currentUser.subjects.map((subject, index) => (
              <View key={index} style={styles.subjectItem}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectLevel}>
                    {subject.experienceLevel ||
                      subject.TutorSubject?.experienceLevel ||
                      "intermediate"}
                  </Text>
                </View>
                <Text style={styles.subjectRate}>
                  ${subject.TutorSubject?.hourlyRate || 45}/hr
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.subjectItem}>
              <Text style={styles.subjectName}>No subjects assigned</Text>
              <Text style={styles.subjectLevel}>Contact admin</Text>
            </View>
          )}
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="people-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>My students</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

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
