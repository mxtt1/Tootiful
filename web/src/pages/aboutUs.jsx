import React from 'react';
import { Container, Title, Text, Box } from '@mantine/core';
import Navbar from '../components/Navbar'; // ✅ import the navbar

export default function AboutUs() {
    return (
        <>
            <Navbar /> {/* ✅ navbar on top */}

            <Box
                style={{
                    minHeight: '100vh',
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                }}
            >
                <Container size="md">
                    <Title
                        order={2}
                        style={{
                            fontSize: 'clamp(24px, 3vw, 36px)',
                            marginBottom: '20px',
                            textAlign: 'center',
                            color: '#2c2c54',
                        }}
                    >
                        About Us
                    </Title>
                    <Text
                        size="lg"
                        style={{
                            textAlign: 'center',
                            lineHeight: 1.6,
                            color: '#444',
                        }}
                    >
                        Tutiful is a tuition agency SaaS that streamlines tutor management by
                        simplifying payment workflows while also enhancing student learning
                        through our in-house AI model, which generates smart practice questions
                        to sharpen answering skills. We help agencies run smoothly, tutors get
                        paid on time, and students gain more value from every lesson.
                    </Text>
                </Container>
            </Box>
        </>
    );
}