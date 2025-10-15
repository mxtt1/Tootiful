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
    lessonTime: {
        color: "#E0E7FF",
        fontSize: 11,
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
    }
});