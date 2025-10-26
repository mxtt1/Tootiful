import { StyleSheet } from "react-native";

export const lessonsStyles = StyleSheet.create({
  // Match your existing safeArea and container patterns
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Loading (consistent with your myProfile loading)
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },

  // Header
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  // Search
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#374151",
  },

  // Filters
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  filterChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: "#8B5CF6", // primary purple
  },
  filterText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },

  // Lessons List
  lessonsList: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Lesson Card
  lessonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 10,
  },
  priceContainer: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  price: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Lesson Info
  lessonInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },

  // Detail Sections
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 4,
  },
  tutorLink: {
    color: "#8B5CF6",
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginTop: 4,
  },
  agencyText: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "500",
    marginTop: 2,
  },

  // Modal Footer
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  enrollButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  enrollButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  unenrollButton: {
    backgroundColor: "#EF4444",
  },
  enrollButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  fullText: {
    textAlign: "center",
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },

  // Dropdown Filters
  dropdownsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dropdownContainer: {
    width: "48%",
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownButtonActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#8B5CF6",
  },
  dropdownButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  dropdownButtonTextActive: {
    color: "#8B5CF6",
    fontWeight: "600",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  dropdownItemTextActive: {
    color: "#8B5CF6",
    fontWeight: "600",
  },
});
