import React from 'react';
import { Container, Group, Button, Text, Box, Image } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/tooty.png';

export default function Navbar() {
    const navigate = useNavigate();

    return (
        <Box
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'rgba(230, 230, 250, 1)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
        >
            <Container size="xl" py="md">
                <Group justify="space-between" align="center">
                    {/* Logo */}
                    <Group align="center" spacing="xs">
                        <Image
                            src={logo}
                            alt="Tutiful Logo"
                            style={{
                                height: '60px',   // increased from 40px
                                width: 'auto',
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate('/')} // optional: navigate home on click
                        />
                    </Group>

                    {/* Navigation */}
                    <Group spacing="lg" align="center">
                        <Text
                            component="a"
                            href="#"
                            style={{
                                color: '#333',
                                textDecoration: 'none',
                                fontSize: '16px',
                                fontWeight: 500
                            }}
                            onClick={() => navigate('/')} // optional: navigate home on click
                        >
                            Home

                        </Text>
                        <Text
                            onClick={() => navigate('/aboutUs')}
                            style={{
                                color: '#333',
                                textDecoration: 'none',
                                fontSize: '16px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            About Us
                        </Text>
                        <Button
                            variant="subtle"
                            onClick={() => navigate('/login')}
                            style={{
                                color: '#667eea',
                                fontSize: '16px'
                            }}
                        >
                            Log in
                        </Button>
                        <Button
                            onClick={() => navigate('/register')}
                            style={{
                                backgroundColor: '#667eea',
                                color: 'white',
                                borderRadius: '8px',
                                padding: '8px 24px',
                                fontSize: '16px'
                            }}
                        >
                            Register
                        </Button>
                    </Group>
                </Group>
            </Container>
        </Box>
    );
}