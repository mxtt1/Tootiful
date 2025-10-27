import { StyleSheet } from 'react-native';

export const HOUR_BLOCK_HEIGHT = 80;

export const studentTimetableStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
    },
    header: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#8B5CF6",
        margin: 20,
        textAlign: "center"
    },
    timeHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F3F4F6"
    },
    colHeader: {
        width: 70,
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: 1,
        borderColor: "#E5E7EB"
    },
    timeLabel: {
        width: 60,
        textAlign: "center",
        color: "#6B7280",
        fontSize: 14,
    },
    dayRow: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: HOUR_BLOCK_HEIGHT,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        position: "relative"
    },
    dayLabel: {
        width: 60,
        textAlign: "right",
        color: "#8B5CF6",
        fontWeight: "bold",
        fontSize: 16,
        marginRight: 10
    },
    dayRowGrid: {
        flex: 1,
        height: HOUR_BLOCK_HEIGHT,
        position: "relative",
        backgroundColor: "#F9FAFB"
    },
    lessonBlock: {
        backgroundColor: "#8B5CF6",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 6,
        position: "absolute",
        top: 6,
        bottom: 6,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2,
    },
    lessonText: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 14,
        textAlign: "center"
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        width: "85%",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB"
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
        flex: 1,
        marginRight: 10
    },
    modalBody: {
        padding: 20,
        gap: 16
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center"
    },
    infoText: {
        fontSize: 15,
        color: "#374151",
        marginLeft: 12,
        flex: 1
    },
    closeBtn: {
        padding: 4
    },
    section: {
        marginTop: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1F2937",
        marginHorizontal: 20,
        marginBottom: 16,
    },
    classList: {
        paddingHorizontal: 16,
        gap: 16,
    },
    classCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    classCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    classIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    classInfo: {
        flex: 1,
    },
    classTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 4,
    },
    classSubject: {
        fontSize: 14,
        color: "#6B7280",
    },
    classDetails: {
        gap: 10,
        marginBottom: 16,
    },
    classDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    classDetailText: {
        fontSize: 14,
        color: "#374151",
        flex: 1,
    },
    tutorLink: {
        color: "#8B5CF6",
        textDecorationLine: "underline",
        fontWeight: "500",
    },
    unenrollButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEE2E2",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FCA5A5",
        gap: 8,
    },
    unenrollButtonDisabled: {
        opacity: 0.5,
    },
    unenrollButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#EF4444",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
    confirmModalContent: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        width: "85%",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        padding: 24,
    },
    confirmModalHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    confirmModalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
        marginTop: 12,
        textAlign: "center",
    },
    confirmModalBody: {
        marginBottom: 24,
    },
    confirmModalText: {
        fontSize: 16,
        color: "#374151",
        textAlign: "center",
        marginBottom: 16,
        lineHeight: 24,
    },
    confirmModalBold: {
        fontWeight: "600",
        color: "#1F2937",
    },
    confirmModalWarning: {
        fontSize: 14,
        color: "#EF4444",
        textAlign: "center",
        backgroundColor: "#FEE2E2",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FCA5A5",
    },
    confirmModalFooter: {
        flexDirection: "row",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    confirmButton: {
        flex: 1,
        backgroundColor: "#EF4444",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
