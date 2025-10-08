
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, Modal, StyleSheet, ScrollView, RefreshControl } from "react-native";
import apiClient from "../../services/apiClient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { studentTimetableStyles as styles, HOUR_BLOCK_HEIGHT } from "../styles/studentTimetableStyles.js";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 8;
const END_HOUR = 21;

export default function StudentTimetable() {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [studentId, setStudentId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Get studentId from token on mount
    useEffect(() => {
        async function getStudentId() {
            const token = await AsyncStorage.getItem("accessToken");
            if (token) {
                const payload = jwtDecode(token);
                const id = payload.userId;
                setStudentId(id);
            } else {
                setStudentId(null);
            }
        }
        getStudentId();
    }, []);

    // Helper to normalize dayOfWeek from API to grid format
    const normalizeDay = (day) => {
        const map = {
            monday: "MON",
            tuesday: "TUE",
            wednesday: "WED",
            thursday: "THU",
            friday: "FRI",
            saturday: "SAT",
            sunday: "SUN"
        };
        if (!day) return day;
        const lower = day.toLowerCase();
        return map[lower] || day.toUpperCase();
    };

    // Helper to convert "HH:mm:ss" to minutes since midnight
    function timeToMinutes(timeStr) {
        const [h, m, s] = timeStr.split(":").map(Number);
        return h * 60 + m;
    }

    // Fetch lessons from API
    const fetchLessons = async () => {
        if (!studentId) return;
        setLoading(true);
        setRefreshing(true);
        try {
            const res = await apiClient.get(`/lessons/students/${studentId}?ongoing=true`);
            // Debug log response
            console.log("Fetched lessons:", res.data);
            // Normalize dayOfWeek for each lesson
            const lessonsNormalized = (res.data).map(lesson => ({
                ...lesson, dayOfWeek: normalizeDay(lesson.dayOfWeek)
            }));
            setLessons(lessonsNormalized);
        } catch (err) {
            console.log("Error fetching lessons:", err);
            setLessons([]);
        }
        setLoading(false);
        setRefreshing(false);
    };

    // Fetch lessons when studentId is set
    useEffect(() => {
        fetchLessons();
    }, [studentId]);

    // Build timetable grid: rows = days, columns = hours
    const renderGrid = () => {
        const cols = [];
        for (let hour = START_HOUR; hour < END_HOUR; hour++) {
            cols.push(
                <View key={hour} style={styles.colHeader}>
                    <Text style={styles.timeLabel}>{`${hour}:00`}</Text>
                </View>
            );
        }

        return DAYS.map((day, dayIdx) => {
            // For each day, render a row
            return (
                <View key={day} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day}</Text>
                    <View style={styles.dayRowGrid}>
                        {/* Render lesson blocks for this day, positioned and sized proportionally */}
                        {lessons.filter(l => l.dayOfWeek === day).map(lesson => {
                            const startMin = timeToMinutes(lesson.startTime);
                            const endMin = timeToMinutes(lesson.endTime);
                            const dayStartMin = START_HOUR * 60;
                            const dayEndMin = END_HOUR * 60;
                            // Clamp lesson to grid
                            const clampedStart = Math.max(startMin, dayStartMin);
                            const clampedEnd = Math.min(endMin, dayEndMin);
                            const left = ((clampedStart - dayStartMin) / ((END_HOUR - START_HOUR) * 60)) * 100;
                            const width = ((clampedEnd - clampedStart) / ((END_HOUR - START_HOUR) * 60)) * 100;
                            return (
                                <TouchableOpacity
                                    key={lesson.id}
                                    style={[styles.lessonBlock, {
                                        position: "absolute",
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        top: 6,
                                        bottom: 6,
                                        zIndex: 2,
                                    }]}
                                    onPress={() => setSelectedLesson(lesson)}
                                >
                                    <Text style={styles.lessonText}>{lesson.title}</Text>
                                    <Text style={styles.lessonTime}>{lesson.startTime} - {lesson.endTime}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        {/* Render hour grid lines */}
                        {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                            <View
                                key={i}
                                style={{
                                    position: "absolute",
                                    left: `${(i / (END_HOUR - START_HOUR)) * 100}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: 1,
                                    backgroundColor: "#E5E7EB",
                                    zIndex: 1,
                                }}
                            />
                        ))}
                    </View>
                </View>
            );
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Weekly Timetable</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#8B5CF6" />
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={fetchLessons}
                            colors={["#8B5CF6"]}
                        />
                    }
                >
                    <ScrollView horizontal style={{ minHeight: 350 }}>
                        <View>
                            {/* Header row for time slots */}
                            <View style={styles.timeHeaderRow}>
                                <Text style={styles.dayLabel}></Text>
                                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                                    <View key={i + START_HOUR} style={styles.colHeader}>
                                        <Text style={styles.timeLabel}>{`${i + START_HOUR}:00`}</Text>
                                    </View>
                                ))}
                            </View>
                            {/* Timetable grid: days as rows */}
                            {renderGrid()}
                        </View>
                    </ScrollView>
                </ScrollView>
            )}
            {/* Lesson details modal */}
            <Modal visible={!!selectedLesson} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedLesson && (
                            <>
                                <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                                <Text>Subject: {selectedLesson.subject.gradeLevel} {selectedLesson.subject.name}</Text>
                                <Text>Location: {selectedLesson.location.address}</Text>
                                <Text>Time: {selectedLesson.startTime} - {selectedLesson.endTime}</Text>
                                <Text>Day: {selectedLesson.dayOfWeek}</Text>
                                <Text>Tutor: {selectedLesson.tutor.firstName} {selectedLesson.tutor.lastName}</Text>
                                <Text>Agency: {selectedLesson.agency.name}</Text>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedLesson(null)}>
                                    <Ionicons name="close" size={24} color="#8B5CF6" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

