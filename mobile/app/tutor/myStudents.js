import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { myProfileStyles as styles } from "../styles/myProfileStyles";

// Mock data for students
const MOCK_STUDENTS = [
  {
    id: 1,
    firstName: "Might",
    lastName: "Guy",
    email: "might.guy@example.com",
    subject: "Mathematics",
    nextSession: "Tomorrow 2:00 PM",
    progress: "Good",
  },
  {
    id: 2,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    subject: "Physics",
    nextSession: "Friday 10:00 AM",
    progress: "Excellent",
  },
];

export default function MyStudentsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.userName}>My Students</Text>
          <Text style={styles.userRole}>Manage your tutoring sessions</Text>
        </View>

        {/* Students List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Current Students ({MOCK_STUDENTS.length})
          </Text>

          {MOCK_STUDENTS.map((student) => (
            <TouchableOpacity key={student.id} style={styles.menuItem}>
              <View style={styles.profileImageContainer}>
                <View
                  style={[
                    styles.profileImagePlaceholder,
                    { width: 40, height: 40 },
                  ]}
                >
                  <Text style={[styles.profileImageText, { fontSize: 16 }]}>
                    {student.firstName[0]}
                    {student.lastName[0]}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuText}>
                  {student.firstName} {student.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {student.subject} • {student.progress}
                </Text>
                <Text style={{ fontSize: 12, color: "#8B5CF6", marginTop: 2 }}>
                  Next: {student.nextSession}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="add-circle-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Add new student</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calendar-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Schedule session</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Session reports</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
