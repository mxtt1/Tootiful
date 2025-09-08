import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, Modal, TouchableWithoutFeedback } from "react-native";
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
//import DateTimePicker from '@react-native-community/datetimepicker';

const Form = ({
  formData,
  onInputChange,
  onSave,
  showGradeLevel = true,
  showGender = true,
}) => {
  {/* State for gender picker modal */}
  const [genderOpen, setGenderOpen] = useState(false);
  const [genderValue, setGenderValue] = useState(formData.gender || null);
  const [genderItems, setGenderItems] = useState([
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ]);

  {/* State for grade level picker modal */}
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeValue, setGradeValue] = useState(formData.gradeLevel || null);
  const [gradeItems, setGradeItems] = useState([
    { label: 'Primary 1', value: 'Primary 1' },
    { label: 'Primary 2', value: 'Primary 2' },
    { label: 'Primary 3', value: 'Primary 3' },
    { label: 'Primary 4', value: 'Primary 4' },
    { label: 'Primary 5', value: 'Primary 5' },
    { label: 'Primary 6', value: 'Primary 6' },
    { label: 'Secondary 1', value: 'Secondary 1' },
    { label: 'Secondary 2', value: 'Secondary 2' },
    { label: 'Secondary 3', value: 'Secondary 3' },
    { label: 'Secondary 4', value: 'Secondary 4' },
    { label: 'JC 1', value: 'JC 1' },
    { label: 'JC 2', value: 'JC 2' },
  ]);

  const [image, setImage] = useState(formData.image || null);
  {/* Function to handle image selection */}
  const pickImage = async () => {
  // Ask for permission first
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Permission to access gallery is required!');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1], 
    quality: 1,
  });

  if (!result.canceled) {
    setImage(result.assets[0].uri);
    onInputChange('image', result.assets[0].uri); // save to formData
  }
};
  
  /*
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  // if dateOfBirth exists, convert to Date object, else use current date
  const [date, setDate] = useState(formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date());

  const onDateChange = (event, selectedDate) => {
    // For ios, manually close the picker after selection
    setShowDatePickerModal(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onInputChange('dateOfBirth', formattedDate);
    }
  };

  const showDatePicker = () => {
    setShowDatePickerModal(true);
  }
*/
  return (
    <View style={styles.formContainer}>

      {/* Profile Image */}
      <View style={styles.imageBg}>
        <TouchableOpacity onPress={pickImage} style={styles.editIconContainer}>
        {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <Ionicons name="camera-outline" size={24} color="#6155F5" />
      )}
      </TouchableOpacity>
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
        {/*
        <TouchableOpacity onPress={showDatePicker} style={ styles.calendarIcon}>
        <Ionicons name="calendar-outline" size={20} style={styles.calendarIcon}
        />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.input, styles.inputWithIcon, styles.dateInput]} onPress={showDatePicker}>
        */}
        <Ionicons name="calendar-outline" size={20} style={styles.styleIcon}/>
        <TextInput 
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Date of Birth"
          value={formData.dateOfBirth}
          onChangeText={(text) => onInputChange('dateOfBirth', text)}
          keyboardType="birth-date"
        />

        {/*
        {showDatePickerModal && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
          */}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} style={styles.styleIcon}/>
        <TextInput 
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => onInputChange('email', text)}
          keyboardType="email-address"
        />
      </View>

      {/* Phone Number */}
      <View style={[styles.inputContainer]}>
        <Ionicons name="call-outline" size={20} style={styles.styleIcon}/>
        <TextInput 
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Phone Number"
          value={formData.phone}
          onChangeText={(text) => onInputChange('phone', text)}
          keyboardType="phone-pad"
        />
      </View>

      {/* Gender - Conditionally rendered */}
      {showGender && (
        <DropDownPicker
          open={genderOpen}
          dropDownDirection="TOP"
          value={genderValue}
          items={genderItems}
          setOpen={setGenderOpen}
          setValue={(value) => {
            setGenderValue(value());
            onInputChange("gender", value());
          }}
          setItems={setGenderItems}
          placeholder="Select Gender"
          style={styles.input} 
          dropDownContainerStyle={styles.dropdown}
        />
      )}

      {/* Grade Level - Conditionally rendered */}
      {showGradeLevel && (
        <DropDownPicker
          open={gradeOpen}
          value={gradeValue}
          items={gradeItems}
          setOpen={setGradeOpen}
          setValue={(value) => {
            setGradeValue(value());
            onInputChange("gradeLevel", value());
          }}
          setItems={setGradeItems}
          placeholder="Select Grade Level"
          style={styles.input} 
          dropDownContainerStyle={styles.dropdown}
        />
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
    alignSelf: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerWrapper: {
    overflow: 'hidden',
  },
  image: {
    width: 84,
    height: 84,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#202244",
    borderRadius: 42,
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
    position: 'relative',
  },
  input: {
    height: 50,
    paddingLeft: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#374151',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,  
    borderWidth: 0,
  },
  styleIcon: {
    position: 'absolute',
    left: 10,
    top: 15,
    zIndex: 1,
    color:"#6B7280"
  },
  calendarIconContainer: {
    position: 'absolute',
    left: 10,
    top: 4,
    zIndex: 2,
    padding: 5,
    color:"#6B7280"
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  pickerContainer: {
    justifyContent: 'center',
    position: 'relative',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#374151',
    backgroundColor: 'transparent',
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
  chevronIcon: {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: [{ translateY: -10 }], 
  zIndex: 1,
},

});

export default Form;