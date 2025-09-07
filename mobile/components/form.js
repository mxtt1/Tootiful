import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

const Form = ({
  formData,
  onInputChange,
  onSave,
  title = "Edit Profile",
  showGradeLevel = true,
  showGender = true,
  saveButtonText = "Save"
}) => {
  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>{title}</Text>

      {/* Profile Image */}
      <View style={styles.imageBg}>
        <View style={styles.image}>
          <Text style={styles.iconText}>+</Text>
        </View> 
      </View>

      {/* First Name */}
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="First Name"
          value={formData.firstName}
          onChangeText={(text) => onInputChange('firstName', text)}
        />
      </View>

      {/* Last Name */}
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Last Name"
          value={formData.lastName}
          onChangeText={(text) => onInputChange('lastName', text)}
        />
      </View>

      {/* Date of Birth */}
      <View style={styles.inputContainer}>
        <Ionicons name="calendar" size={20} style={styles.calendarIcon} />
        <TextInput 
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Date of Birth"
          value={formData.dateOfBirth}
          onChangeText={(text) => onInputChange('dateOfBirth', text)}
        />
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => onInputChange('email', text)}
          keyboardType="email-address"
        />
      </View>

      {/* Phone Number */}
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Phone Number"
          value={formData.phone}
          onChangeText={(text) => onInputChange('phone', text)}
          keyboardType="phone-pad"
        />
      </View>

      {/* Gender - Conditionally rendered */}
      {showGender && (
        <View style={styles.inputContainer}>
          <View style={[styles.pickerContainer, styles.input]}>
            <Picker
              selectedValue={formData.gender}
              onValueChange={(value) => onInputChange('gender', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
            </Picker>
          </View>
        </View>
      )}

      {/* Grade Level - Conditionally rendered */}
      {showGradeLevel && (
        <View style={styles.inputContainer}>
          <View style={[styles.pickerContainer, styles.input]}>
            <Picker
              selectedValue={formData.gradeLevel}
              onValueChange={(value) => onInputChange('gradeLevel', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Grade Level" value="" />
              <Picker.Item label="Primary" value="Primary" />
              <Picker.Item label="Secondary" value="Secondary" />
              <Picker.Item label="JC" value="JC" />
              <Picker.Item label="International" value="International" />
            </Picker>
          </View>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>{saveButtonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: "#6155F5",
    textAlign: 'center',
    marginVertical: 20,
  },
  imageBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#6155F5",
    alignSelf: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 32,
    height: 32,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#202244",
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: "#202244",
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    paddingLeft: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,  
  },
  calendarIcon: {
    position: 'absolute',
    left: 10,
    top: 15,
    zIndex: 1
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  pickerContainer: {
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    backgroundColor: '#6155F5',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Form;