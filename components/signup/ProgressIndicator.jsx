import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Progress Indicator cho Sign Up flow
 * @param {number} currentStep - Bước hiện tại (1-indexed)
 * @param {number} totalSteps - Tổng số bước
 * @param {string} signupType - 'email' | 'google'
 */
const ProgressIndicator = ({ currentStep, totalSteps, signupType = 'email' }) => {
    // Email flow: 6 steps, Google flow: 4 steps
    const steps = signupType === 'google' ? 4 : totalSteps || 6;
    const progress = (currentStep / steps) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.stepText}>
                    Bước {currentStep}/{steps}
                </Text>
                <Text style={styles.percentText}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBar}>
                <LinearGradient
                    colors={['#ff1493', '#9370db']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${progress}%` }]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    percentText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '500',
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});

export default ProgressIndicator;
