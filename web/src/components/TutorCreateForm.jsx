import React, { useState } from "react";
import { Modal, TextInput, Button, Group, Stack, Card, Title } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { notifications } from "@mantine/notifications";
import apiClient from "../api/apiClient";

export default function TutorCreateForm({ opened, onClose, onCreated, agencyId }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: null,
  });
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dobError, setDobError] = useState("");
  const validatePhone = (phone) => {
    if (!phone) return "Phone number is required";
    // Add more phone validation if needed
    return "";
  };

  const validateDob = (dob) => {
    if (!dob) return "Date of birth is required";
    return "";
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  /*
  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain a number";
    if (!/[!@#$%^&*]/.test(password)) return "Password must contain a special character";
    return "";
  };
  */

  const handleSave = async () => {
    const emailErr = validateEmail(form.email);
    setEmailError(emailErr);
    const phoneErr = validatePhone(form.phone);
    setPhoneError(phoneErr);
    const dobErr = validateDob(form.dateOfBirth);
    setDobError(dobErr);
    if (emailErr || phoneErr || dobErr) return;
    setSaving(true);
    try {
      const tutorData = {
        ...form,
        dateOfBirth: form.dateOfBirth ? form.dateOfBirth.toISOString().split("T")[0] : null,
        agencyId,
      };
      await apiClient.post("/tutors", tutorData);
      notifications.show({ title: "Success", message: "Tutor created successfully", color: "green" });
      onCreated && onCreated();
      onClose();
      setForm({ firstName: "", lastName: "", email: "", phone: "", dateOfBirth: null });
    } catch (err) {
      notifications.show({ title: "Error", message: err.message || "Failed to create tutor", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} size="md" centered>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack spacing="lg">
          <Title order={3} color="blue.7" mb="xs">Create Tutor</Title>
          <Group grow>
            <TextInput
              label="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <TextInput
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </Group>
          <TextInput
            label="Email"
            value={form.email}
            onChange={e => {
              const value = e.target.value;
              setForm({ ...form, email: value });
              setEmailError(validateEmail(value));
            }}
            error={emailError}
            required
          />
          <TextInput
            label="Phone Number"
            value={form.phone}
            onChange={e => {
              const value = e.target.value;
              setForm({ ...form, phone: value });
              setPhoneError(validatePhone(value));
            }}
            error={phoneError}
            required
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--tutiful-gray-700)', fontWeight: 500 }}>Date of Birth</label>
            <DatePicker
              selected={form.dateOfBirth}
              onChange={date => {
                setForm({ ...form, dateOfBirth: date });
                setDobError(validateDob(date));
              }}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select date"
              className="form-input"
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              isClearable={false}
            />
            {dobError && <div style={{ color: 'var(--tutiful-error)', fontSize: '0.9em', marginTop: 4 }}>{dobError}</div>}
          </div>
          
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={saving} styles={{ root: { color: 'var(--tutiful-gray-700)' } }}>Cancel</Button>
            <Button leftSection={<IconEdit size={16} />} styles={{ root: { backgroundColor: 'var(--tutiful-primary)', color: 'white' }, rootHovered: { backgroundColor: 'var(--tutiful-primary-dark)' } }} onClick={handleSave} loading={saving} disabled={!form.firstName || !form.lastName || !form.email || !form.phone || !form.dateOfBirth || emailError !== "" || phoneError !== "" || dobError !== ""}>Create Tutor</Button>
          </Group>
        </Stack>
      </Card>
    </Modal>
  );
}
