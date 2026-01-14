import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    IconButton,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getWalletStats, getErrorMessage, WalletStats } from '../api/adminApi';

export default function WalletOverviewPage() {
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getWalletStats();
            setStats(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        // Auto-refresh disabled to save quota
        // const interval = setInterval(loadStats, 30000);
        // return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!stats) return null;

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    💰 Wallet Overview
                </Typography>
                <IconButton onClick={loadStats} disabled={loading}>
                    <Refresh />
                </IconButton>
            </Box>

            <Grid container spacing={3}>
                {/* Total Coins */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Coins (💎)
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">
                                {stats.totalCoins.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Total BanhMi */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Bánh Mì (🥖)
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="secondary">
                                {stats.totalBanhMi.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Total Users */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Active Users
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.userCount.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Transaction Stats */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Daily Transactions
                            </Typography>
                            <Typography variant="h3" fontWeight="bold" color="success.main">
                                {stats.transactions.daily.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Last 24 hours
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Weekly Transactions
                            </Typography>
                            <Typography variant="h3" fontWeight="bold" color="info.main">
                                {stats.transactions.weekly.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Last 7 days
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Chart Placeholder */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Transaction Trends (Coming Soon)
                            </Typography>
                            <Box height={300} display="flex" alignItems="center" justifyContent="center">
                                <Typography color="textSecondary">
                                    Chart will display transaction volume over time
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                    Last updated: {new Date(stats.timestamp).toLocaleString('vi-VN')}
                </Typography>
            </Box>
        </Box>
    );
}
