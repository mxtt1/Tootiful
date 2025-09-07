import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { myProfileStyles as styles } from "../styles/myProfileStyles";

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
  // For demo purposes, we'll toggle between student and tutor
  const [userType, setUserType] = useState("student");
  const currentUser = userType === "student" ? MOCK_STUDENT : MOCK_TUTOR;

  const handleEditProfile = () => {
    Alert.alert(
      "Edit Profile",
      "Edit functionality will be implemented by your groupmate!"
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => console.log("Logout"),
      },
    ]);
  };

  const toggleUserType = () => {
    setUserType(userType === "student" ? "tutor" : "student");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>
                {currentUser.firstName[0]}
                {currentUser.lastName[0]}
              </Text>
            </View>
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
            {/* Verified badge for tutors */}
            {userType === "tutor" && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
      
          <Text style={styles.userName}>
            {currentUser.firstName} {currentUser.lastName}
          </Text>
          <Text style={styles.userRole}>
            {userType === "student" ? "Student" : "Tutor"}
          </Text>

          {/* Stats for tutors */}
          {userType === "tutor" && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Total Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>$45</Text>
                <Text style={styles.statLabel}>Wallet</Text>
              </View>
            </View>
          )}
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

        {/* Subjects for tutors */}
        {userType === "tutor" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subjects</Text>
            {currentUser.subjects.map((subject, index) => (
              <View key={index} style={styles.subjectItem}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectLevel}>
                  {subject.experienceLevel}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          {userType === "tutor" && (
            <>
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
            </>
          )}

          {userType === "student" && (
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="book-outline" size={24} color="#374151" />
              <Text style={styles.menuText}>My courses</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

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

        {/* Demo Toggle Button */}
        <TouchableOpacity style={styles.demoButton} onPress={toggleUserType}>
          <Text style={styles.demoButtonText}>
            Switch to {userType === "student" ? "Tutor" : "Student"} View (Demo)
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
