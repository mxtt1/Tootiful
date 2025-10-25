import { StyleSheet } from "react-native";

export const tutorProfileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: "#FEF3C7",
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  errorBannerText: {
    color: "#92400E",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40, // To balance the back button
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: "#8B5CF6",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 20,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#8B5CF6",
  },
  profileInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subjectAndAge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  primarySubject: {
    fontSize: 16,
    color: "#E5E7EB",
    marginRight: 16,
  },
  age: {
    fontSize: 16,
    color: "#E5E7EB",
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phoneNumber: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
  },
  educationText: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
  },
  subjectItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  subjectMainInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  subjectGrade: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  subjectDetails: {
    alignItems: "flex-end",
  },
  subjectLevel: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "500",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  subjectRate: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  noSubjects: {
    fontSize: 16,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingLeft: {
    flex: 1,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  hourlyRate: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#8B5CF6",
  },
});
