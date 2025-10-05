import React, { useState } from 'react';
import { Button, TextInput, Container, Card, Title, Alert, Text, FileInput } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import supabase from '../services/supabaseClient';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        image: null
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

        // Phone number validation
        if (!formData.phone || formData.phone.trim() === '') {
            frontendErrors.phone = 'Phone number is required';
        } else if (formData.phone.length !== 8) {
            frontendErrors.phone = 'Phone number must be exactly 8 characters';
        } else if (!/^\d{8}$/.test(formData.phone)) {
            frontendErrors.phone = 'Phone number must contain only digits';
        }

        // Password validation
        if (formData.password !== formData.confirmPassword) {
            frontendErrors.confirmPassword = 'Passwords do not match';
        }

        if (formData.password.length < 6) {
            frontendErrors.password = 'Password must be at least 6 characters long';
        }

        // MANDATORY IMAGE VALIDATION
        if (!formData.image) {
            frontendErrors.image = 'Profile image is required';
        } else {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(formData.image.type)) {
                frontendErrors.image = 'Only JPEG, PNG, and WebP images are allowed';
            }
            if (formData.image.size > 5 * 1024 * 1024) { // 5MB
                frontendErrors.image = 'Image size must be less than 5MB';
            }
        }

        if (Object.keys(frontendErrors).length > 0) {
            setFieldErrors(frontendErrors);
            setLoading(false);
            return;
        }

        try {
            let imageUrl = '';

            // Upload image to Supabase Storage first
            if (formData.image) {
                try {
                    // Get file extension
                    const fileExt = formData.image.name.split('.').pop();

                    // Set content type
                    let contentType = 'image/png'; // default
                    if (fileExt === 'jpg' || fileExt === 'jpeg') {
                        contentType = 'image/jpeg';
                    } else if (fileExt === 'png') {
                        contentType = 'image/png';
                    } else if (fileExt === 'webp') {
                        contentType = 'image/webp';
                    }

                    // Create unique filename
                    const fileName = `agency_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                    // Convert File to ArrayBuffer for Supabase
                    const arrayBuffer = await formData.image.arrayBuffer();

                    // Upload to Supabase Storage
                    const { data, error } = await supabase.storage
                        .from('agencyCert') // Make sure this bucket exists in Supabase
                        .upload(fileName, arrayBuffer, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: contentType,
                        });

                    console.log('Supabase upload response:', data, error);

                    if (error) {
                        throw new Error('Image upload failed: ' + error.message);
                    }

                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from('agencyCert')
                        .getPublicUrl(fileName);

                    imageUrl = urlData.publicUrl;
                    console.log('Image public URL:', imageUrl);

                } catch (uploadError) {
                    console.error('Image upload error:', uploadError);
                    setFieldErrors({ image: 'Failed to upload image. Please try again.' });
                    setLoading(false);
                    return;
                }
            }

            // Send registration data with image URL to backend
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                image: imageUrl // Send Supabase URL, not file
            };

            console.log('Sending registration payload:', payload);

            await apiClient.post('/agencies', payload);

            // Registration successful
            navigate('/login', {
                state: {
                    message: 'Agency registration successful! Please log in to continue.'
                }
            });

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
                    } else if (errorMessage.includes('image') || errorMessage.includes('required')) {
                        setFieldErrors({ image: 'Profile image is required' });
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
                        required
                        mb="md"
                        maxLength={8}
                    />

                    <FileInput
                        label="Profile Image"
                        placeholder="Upload agency profile image"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        value={formData.image}
                        onChange={(file) => handleInputChange('image', file)}
                        error={fieldErrors.image}
                        leftSection={<IconPhoto size={14} />}
                        required
                        mb="xl"
                    />

                    <Button
                        type="submit"
                        fullWidth
                        loading={loading}
                        disabled={!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone || !formData.image}
                    >
                        {loading ? 'Uploading Image & Creating Agency...' : 'Register Agency'}
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