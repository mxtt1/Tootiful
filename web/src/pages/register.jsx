import React, { useState } from 'react';
import { Button, TextInput, Container, Card, Title, Alert, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setFieldErrors({});

        // Frontend validation
        const frontendErrors = {};

        // Phone number validation (now required)
        if (!formData.phone || formData.phone.trim() === '') {
            frontendErrors.phone = 'Phone number is required';
        } else if (formData.phone.length !== 8) {
            frontendErrors.phone = 'Phone number must be exactly 8 characters';
        } else if (!/^\d{8}$/.test(formData.phone)) {
            frontendErrors.phone = 'Phone number must contain only digits';
        }

        if (formData.password !== formData.confirmPassword) {
            frontendErrors.confirmPassword = 'Passwords do not match';
        }

        if (formData.password.length < 6) {
            frontendErrors.password = 'Password must be at least 6 characters long';
        }

        if (Object.keys(frontendErrors).length > 0) {
            setFieldErrors(frontendErrors);
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone // No longer optional
            };

            await apiClient.post('/agencies', payload);

            // Registration successful
            navigate(
            `/verify-email-pending?email=${encodeURIComponent(formData.email)}&jr=1`
            );
        } catch (err) {
            console.error('Registration error:', err);

            // Handle different types of errors from backend
            if (err.response && err.response.data) {
                const backendError = err.response.data;

                // Check if it's a validation error with specific field errors
                if (backendError.errors && Array.isArray(backendError.errors)) {
                    const newFieldErrors = {};
                    backendError.errors.forEach(error => {
                        if (error.path) {
                            newFieldErrors[error.path] = error.message;
                        }
                    });
                    setFieldErrors(newFieldErrors);
                } else if (backendError.error) {
                    // Handle specific backend error messages
                    const errorMessage = backendError.error.toLowerCase();

                    if (errorMessage.includes('email already exists') || (errorMessage.includes('email') && errorMessage.includes('exists'))) {
                        setFieldErrors({ email: 'This email is already registered' });
                    } else if (errorMessage.includes('name already exists') || errorMessage.includes('agency with this name')) {
                        setFieldErrors({ name: 'This agency name is already taken' });
                    } else if (errorMessage.includes('phone already exists') || (errorMessage.includes('phone') && errorMessage.includes('exists')) || errorMessage.includes('phone number already')) {
                        setFieldErrors({ phone: 'This phone number is already registered' });
                    } else if (errorMessage.includes('password') && errorMessage.includes('6')) {
                        setFieldErrors({ password: 'Password must be at least 6 characters long' });
                    } else if (errorMessage.includes('phone') && errorMessage.includes('8')) {
                        setFieldErrors({ phone: 'Phone number must be exactly 8 characters' });
                    } else {
                        setError(backendError.error);
                    }
                } else {
                    setError(backendError.message || 'Registration failed');
                }
            } else if (err.message) {
                // Handle network errors or other issues
                const errorMessage = err.message.toLowerCase();

                if (errorMessage.includes('email already exists')) {
                    setFieldErrors({ email: 'This email is already registered' });
                } else if (errorMessage.includes('name already exists') || errorMessage.includes('agency with this name')) {
                    setFieldErrors({ name: 'This agency name is already taken' });
                } else if (errorMessage.includes('phone already exists') || errorMessage.includes('phone number already')) {
                    setFieldErrors({ phone: 'This phone number is already registered' });
                } else if (errorMessage.includes('password') && errorMessage.includes('6')) {
                    setFieldErrors({ password: 'Password must be at least 6 characters long' });
                } else if (errorMessage.includes('phone') && errorMessage.includes('8')) {
                    setFieldErrors({ phone: 'Phone number must be exactly 8 characters' });
                } else {
                    setError(err.message);
                }
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear field error when user starts typing
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    return (
        <Container size="sm" py="xl">
            <Card shadow="md" padding="xl" radius="md" withBorder>
                <Title order={2} align="center" mb="md">Register Your Agency</Title>

                <Text align="center" color="dimmed" mb="xl">
                    Join our platform as a tutoring agency
                </Text>

                {error && (
                    <Alert color="red" mb="md">
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextInput
                        label="Agency Name"
                        placeholder="Enter your agency name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        error={fieldErrors.name}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Email Address"
                        placeholder="Enter agency email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        error={fieldErrors.email}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Password"
                        placeholder="Enter password (min. 6 characters)"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        error={fieldErrors.password}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        error={fieldErrors.confirmPassword}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Phone Number"
                        placeholder="Enter 8-digit phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        error={fieldErrors.phone}
                        required // Now required
                        mb="xl"
                        maxLength={8}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        loading={loading}
                        disabled={!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone}
                    >
                        Register Agency
                    </Button>
                </form>

                <Button
                    variant="subtle"
                    fullWidth
                    mt="md"
                    onClick={() => navigate('/login')}
                >
                    Already have an account? Log in
                </Button>
            </Card>
        </Container>
    );
}