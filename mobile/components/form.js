import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Image,
  Alert,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const Form = ({
  formData,
  onInputChange,
  onSave,
  errors,
  showGradeLevel = true,
  showGender = true,
}) => {

  /* State for gender picker modal */
  const [genderOpen, setGenderOpen] = useState(false);
  const [genderValue, setGenderValue] = useState(formData.gender || null);
  const [genderItems, setGenderItems] = useState([
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
  ]);


  /* State for grade level picker modal */
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeValue, setGradeValue] = useState(formData.gradeLevel || null);
  const [gradeItems, setGradeItems] = useState([
    { label: "Primary 1", value: "Primary 1" },
    { label: "Primary 2", value: "Primary 2" },
    { label: "Primary 3", value: "Primary 3" },
    { label: "Primary 4", value: "Primary 4" },
    { label: "Primary 5", value: "Primary 5" },
    { label: "Primary 6", value: "Primary 6" },
    { label: "Secondary 1", value: "Secondary 1" },
    { label: "Secondary 2", value: "Secondary 2" },
    { label: "Secondary 3", value: "Secondary 3" },
    { label: "Secondary 4", value: "Secondary 4" },
    { label: "JC 1", value: "JC 1" },
    { label: "JC 2", value: "JC 2" },
  ]);

  /* State for date picker */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date());

  /* Format date of birth as DD-MM-YYYY string before passing to onInputChange*/
  const pickDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateValue(selectedDate);
      // Format date as DD-MM-YYYY string
      const iso = selectedDate.toISOString().split('T')[0];
      onInputChange('dateOfBirth', iso);
    }
  }

  /* State for profile image */
  const [image, setImage] = useState(formData.image || null);

  /* Function to handle image selection */

  const pickImage = async () => {
    // Ask for permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Permission to access gallery is required!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      onInputChange("image", result.assets[0].uri); // save to formData
    }
  };

  return (
    <View style={styles.formContainer}>
      {/* Profile Image */}
      <View style={styles.imageBg}>
        <TouchableOpacity onPress={pickImage} style={styles.editIconContainer}>
          {image ? (
            <Image source={{ uri: image + '?t=' + Date.now() }} style={styles.image} />
          ) : (
            <Ionicons name="camera-outline" size={24} color="#6155F5" />
          )}
        </TouchableOpacity>
      </View>

      {/* First Name */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.firstName && styles.inputError]}
          placeholder="First Name"
          value={formData.firstName}
          onChangeText={(text) => onInputChange("firstName", text)}
        />
        {errors.firstName && (
          <Text style={styles.errorText}>{errors.firstName}</Text>
        )}
      </View>

      {/* Last Name */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.lastName && styles.inputError]}
          placeholder="Last Name"
          value={formData.lastName}
          onChangeText={(text) => onInputChange("lastName", text)}
        />
        {errors.lastName && (
          <Text style={styles.errorText}>{errors.lastName}</Text>
        )}
      </View>

      {/* Date of Birth */}
      <View style={styles.inputContainer}>
        <Ionicons name="calendar-outline" size={20} style={styles.styleIcon} />
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.input, styles.inputWithIcon, errors.dateOfBirth && styles.inputError,
          { justifyContent: 'center', alignItems: 'flex-start' }
          ]}
          activeOpacity={0.7}>
          <Text style={{ color: '#374151', fontSize: 14 }}>
            {formData.dateOfBirth ? formData.dateOfBirth : 'Select Date of Birth'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            onChange={pickDate}
            maximumDate={new Date()}
          />
        )}
        {errors.dateOfBirth && (
          <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} style={styles.styleIcon} />
        <TextInput
          style={[styles.input, styles.inputWithIcon, errors.email && styles.inputError]}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => onInputChange("email", text)}
          keyboardType="email-address"
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
      </View>

      {/* Phone Number */}
      <View style={[styles.inputContainer]}>
        <Ionicons name="call-outline" size={20} style={styles.styleIcon} />
        <TextInput
          style={[styles.input, styles.inputWithIcon, errors.phone && styles.inputError]}
          placeholder="Phone Number"
          value={formData.phone}
          onChangeText={(text) => onInputChange("phone", text)}
          keyboardType="phone-pad"
        />
        {errors.phone && (
          <Text style={styles.errorText}>{errors.phone}</Text>
        )}
      </View>

      {/* Gender - Conditionally rendered */}
      {showGender && (
        <View style={[styles.pickerContainer, { zIndex: genderOpen ? 1000 : 1, marginBottom: 10 }]}>
          <DropDownPicker
            open={genderOpen}
            value={genderValue}
            items={genderItems}
            setOpen={setGenderOpen}
            setValue={setGenderValue}
            dropDownDirection="TOP"
            onChangeValue={(v) => onInputChange("gender", v)}
            setItems={setGenderItems}
            placeholder="Select Gender"
            style={styles.picker}
            dropDownContainerStyle={styles.dropdown}
          />
        </View>
      )}

      {/* Grade Level - Conditionally rendered */}
      {showGradeLevel && (
        <View style={[styles.pickerContainer, { zIndex: gradeOpen ? 2000 : 1 }]}>
          <DropDownPicker
            open={gradeOpen}
            value={gradeValue}
            items={gradeItems}
            setValue={setGradeValue}
            setItems={setGradeItems}
            setOpen={setGradeOpen}
            dropDownDirection="TOP"
            onChangeValue={(g) => onInputChange("gradeLevel", g)}
            placeholder="Select Grade Level"
            style={styles.picker}
            dropDownContainerStyle={styles.dropdown}
          />
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 20,
  },
  imageBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#6155F5",
    alignSelf: "center",
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerWrapper: {
    overflow: "hidden",
  },
  image: {
    width: 84,
    height: 84,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#202244",
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    color: "#202244",
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    marginBottom: 20,
    position: "relative",
  },
  input: {
    height: 50,
    paddingLeft: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#374151",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 0,
  },
  styleIcon: {
    position: "absolute",
    left: 10,
    top: 15,
    zIndex: 1,
    color: "#6B7280",
  },
  calendarIconContainer: {
    position: "absolute",
    left: 10,
    top: 4,
    zIndex: 2,
    padding: 5,
    color: "#6B7280",
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  pickerContainer: {
    justifyContent: "center",
    position: "relative",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#374151",
    backgroundColor: "#fff", // Ensure background color matches
    borderWidth: 0, // No border
    borderRadius: 12, // Rounded corners
    shadowColor: "#000", // Add shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    backgroundColor: "#6155F5",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  chevronIcon: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  dropdown: {
    borderWidth: 0,
    borderRadius: 12,
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: "#fff",
  },
  dropdownTextInput: {
    height: 40,
    paddingLeft: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#374151",
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default Form;
