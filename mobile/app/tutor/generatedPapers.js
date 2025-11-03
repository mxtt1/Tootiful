import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    TextInput,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import apiClient from "../../services/apiClient";
import * as Notifications from 'expo-notifications';
import { generatedPapersStyles as styles } from "../styles/generatedPapersStyles.js";
import { jwtDecode } from "jwt-decode";

export default function GeneratedPapersScreen() {
    const [userId, setUserId] = useState(null);
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({
        subjectId: "",
        topics: "",
    });
    const [subjects, setSubjects] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Get user ID from token
        const getUserId = async () => {
            const token = apiClient.accessToken;
            if (token) {
                try {
                    const payload = jwtDecode(token);
                    setUserId(payload.userId);
                } catch (error) {
                    console.error("Failed to decode token:", error);
                }
            }
        };

        getUserId();
    }, []);

    useEffect(() => {
        if (!userId) return;

        fetchPapers();
        fetchSubjects();

        // Set up notification handler
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            if (data?.type === 'paper_completed') {
                // Refresh papers list when notification is received
                fetchPapers();
            }
        });

        // Set up notification response handler (when user taps notification)
        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.type === 'paper_completed') {
                // Refresh papers list and potentially navigate to download
                fetchPapers();
            }
        });

        return () => {
            if (notificationListener) {
                notificationListener.remove();
            }
            if (responseListener) {
                responseListener.remove();
            }
        };
    }, [userId]);

    const fetchPapers = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const response = await apiClient.get(`/papers/tutor/${userId}`);
            const papersData = response?.data?.data || response?.data || [];
            setPapers(papersData);
        } catch (error) {
            console.error("Failed to fetch papers:", error);
            Alert.alert("Error", "Failed to load generated papers");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    // Refresh papers when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (userId) {
                fetchPapers();
            }
        }, [userId, fetchPapers])
    );

    const fetchSubjects = async () => {
        try {
            const response = await apiClient.get("/lessons/subjects");
            const subjectsData = response?.data || response || [];
            setSubjects(subjectsData);
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPapers();
    }, [fetchPapers]);

    const handleGeneratePaper = async () => {
        if (!formData.subjectId || !formData.topics) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        try {
            setSubmitting(true);

            // Get Expo push token (optional - won't work in Expo Go with SDK 53+)
            let expoPushToken = null;

            try {
                const { status } = await Notifications.getPermissionsAsync();

                if (status === 'granted') {
                    const tokenData = await Notifications.getExpoPushTokenAsync();
                    expoPushToken = tokenData.data;
                } else {
                    // Request permission if not granted
                    const { status: newStatus } = await Notifications.requestPermissionsAsync();
                    if (newStatus === 'granted') {
                        const tokenData = await Notifications.getExpoPushTokenAsync();
                        expoPushToken = tokenData.data;
                    }
                }
            } catch (notifError) {
                console.log("Push notifications not available (requires development build in SDK 53+)");
                // Continue without push token - user will need to manually refresh
            }

            // Call the AI backend directly using fetch
            const AI_BACKEND_URL = process.env.EXPO_PUBLIC_AI_BACKEND_URL || 'http://localhost:5000';

            const response = await fetch(`${AI_BACKEND_URL}/generate-paper`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subjectId: formData.subjectId,
                    topics: formData.topics,
                    expoPushToken,
                    tutorId: userId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit paper generation request');
            }

            const successMessage = expoPushToken
                ? "Paper generation request submitted! You will receive a notification when it's ready."
                : "Paper generation request submitted! Please check back later to see when it's ready. (Push notifications require a development build in SDK 53+)";

            Alert.alert("Success", successMessage);

            setModalVisible(false);
            setFormData({ subjectId: "", topics: "" });

            // Optionally refresh the list after a delay
            setTimeout(() => {
                fetchPapers();
            }, 1000);
        } catch (error) {
            console.error("Failed to generate paper:", error);
            Alert.alert("Error", "Failed to submit paper generation request");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async (downloadUrl) => {
        if (!downloadUrl) {
            Alert.alert("Error", "Download URL not available");
            return;
        }

        try {
            const supported = await Linking.canOpenURL(downloadUrl);
            if (supported) {
                await Linking.openURL(downloadUrl);
            } else {
                Alert.alert("Error", "Cannot open this URL");
            }
        } catch (error) {
            console.error("Failed to download paper:", error);
            Alert.alert("Error", "Failed to download paper");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "completed":
                return "#10B981";
            case "failed":
                return "#EF4444";
            default:
                return "#6B7280";
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderPaper = ({ item }) => (
        <View style={styles.paperCard}>
            <View style={styles.paperHeader}>
                <View style={styles.paperInfo}>
                    <Text style={styles.paperSubject}>
                        {item.subject} - {item.gradeLevel}
                    </Text>
                    <Text style={styles.paperTopic} numberOfLines={2}>
                        {item.topics}
                    </Text>
                    <Text style={styles.paperDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            {item.status === "completed" && item.downloadUrl && (
                <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(item.downloadUrl)}
                >
                    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Download Paper</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading papers...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Generated Papers</Text>
                <TouchableOpacity
                    style={styles.generateButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={papers}
                renderItem={renderPaper}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#8B5CF6"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No papers generated yet</Text>
                        <Text style={styles.emptySubtext}>
                            Tap the Generate button to create your first paper
                        </Text>
                    </View>
                }
            />

            {/* Generate Paper Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalOverlay}>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Generate New Paper</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Subject & Grade Level</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.subjectId}
                                    onValueChange={(itemValue) => setFormData({ ...formData, subjectId: itemValue })}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Select a subject..." value="" />
                                    {subjects.map((subject) => (
                                        <Picker.Item
                                            key={subject.id}
                                            label={`${subject.name} - ${subject.gradeLevel}`}
                                            value={subject.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Topics</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.topics}
                                onChangeText={(text) => setFormData({ ...formData, topics: text })}
                                placeholder="Enter the topics for the paper (comma-separated)"
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleGeneratePaper}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.submitButtonText}>Generate Paper</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </View>
    );
}
