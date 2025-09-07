import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function EditProfile() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Link href="/tutor/myProfile" style={styles.backLink}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#6155F5"
            style={{ marginBottom: 20 }}
          />
        </Link>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <Link href="/tutor/personalDetails" asChild>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="people-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Personal Details</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Link>
        <Link href="/tutor/teachingInfo" asChild>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="book-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Teaching Info</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    padding: 20,
    backgroundColor: "#FFF",
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#6155F5",
  },
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 10,
    marginRight: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: "#374151",
  },
});
