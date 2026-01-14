import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { getAdSettings, updateAdSettings, AdSettings, getErrorMessage } from '../api/adminApi';

export default function AdSettingsPage() {
    const [settings, setSettings] = useState<AdSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAdSettings();
            setSettings(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await updateAdSettings(settings);
            setSuccess('Settings saved successfully!');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!settings) return null;

    return (
        <Box p={3} maxWidth="800px" mx="auto">
            <Typography variant="h4" fontWeight="bold" mb={3}>
                📺 Ad Configuration
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {success}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Box mb={3}>
                        <Typography variant="h6" gutterBottom>
                            General Settings
                        </Typography>
                        <Typography variant="body2" color="textSecondary" mb={2}>
                            Configure how users are rewarded for watching ads.
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Box display="flex" flexDirection="column" gap={3}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enabled}
                                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="subtitle1">Enable Ad Rewards</Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Turn this off to disable ad rewards globally.
                                    </Typography>
                                </Box>
                            }
                        />

                        <TextField
                            label="Reward Amount (Banh Mi)"
                            type="number"
                            value={settings.rewardAmount}
                            onChange={(e) => setSettings({ ...settings, rewardAmount: Number(e.target.value) })}
                            helperText="How many Banh Mi (🥖) a user gets per ad view."
                            fullWidth
                            disabled={!settings.enabled}
                        />

                        <TextField
                            label="Daily Limit (Views per user)"
                            type="number"
                            value={settings.dailyLimit}
                            onChange={(e) => setSettings({ ...settings, dailyLimit: Number(e.target.value) })}
                            helperText="Maximum number of ads a user can watch for rewards per day."
                            fullWidth
                            disabled={!settings.enabled}
                        />

                        <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                onClick={handleSave}
                                disabled={saving}
                                size="large"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
