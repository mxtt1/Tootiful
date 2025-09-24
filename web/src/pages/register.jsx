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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone || undefined // Only include if provided
            };

            await apiClient.post('/agencies', payload);

            // Registration successful
            navigate('/login', {
                state: {
                    message: 'Agency registration successful! Please log in to continue.'
                }
            });
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Email Address"
                        placeholder="Enter agency email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Password"
                        placeholder="Enter password (min. 6 characters)"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        required
                        mb="md"
                    />

                    <TextInput
                        label="Phone Number (Optional)"
                        placeholder="Enter contact phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        mb="xl"
                    />

                    <Button
                        type="submit"
                        fullWidth
                        loading={loading}
                        disabled={!formData.name || !formData.email || !formData.password || !formData.confirmPassword}
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