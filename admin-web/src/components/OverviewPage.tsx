import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import {
    Flag as FlagIcon,
    Report as ReportIcon,
    People as PeopleIcon,
    Message as MessageIcon,
} from '@mui/icons-material';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                border: `1px solid ${color}40`,
            }}
        >
            <Box
                sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color,
                    color: 'white',
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="h4" fontWeight="bold">
                    {value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {title}
                </Typography>
            </Box>
        </Paper>
    );
}

export default function OverviewPage() {
    const [stats, setStats] = useState({
        flaggedContent: 0,
        reports: 0,
        totalUsers: 0,
        totalMessages: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const flaggedQuery = query(
                    collection(db, 'flagged_content'),
                    where('status', '==', 'pending')
                );
                const flaggedSnapshot = await getCountFromServer(flaggedQuery);

                const reportsQuery = query(collection(db, 'reports'));
                const reportsSnapshot = await getCountFromServer(reportsQuery);

                const usersQuery = query(collection(db, 'users'));
                const usersSnapshot = await getCountFromServer(usersQuery);

                setStats({
                    flaggedContent: flaggedSnapshot.data().count,
                    reports: reportsSnapshot.data().count,
                    totalUsers: usersSnapshot.data().count,
                    totalMessages: 0, // Would need to aggregate from all rooms
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats();
    }, []);

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
                Dashboard Overview
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Pending Flags"
                        value={stats.flaggedContent}
                        icon={<FlagIcon fontSize="large" />}
                        color="#f44336"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="User Reports"
                        value={stats.reports}
                        icon={<ReportIcon fontSize="large" />}
                        color="#ff9800"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={<PeopleIcon fontSize="large" />}
                        color="#4caf50"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Messages"
                        value={stats.totalMessages}
                        icon={<MessageIcon fontSize="large" />}
                        color="#2196f3"
                    />
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ mt: 4, p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Welcome to ChappAt Admin Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Use the sidebar to navigate between different sections:
                </Typography>
                <ul>
                    <li><strong>Flagged Content:</strong> Review AI-detected inappropriate images</li>
                    <li><strong>User Reports:</strong> Handle user-submitted reports</li>
                    <li><strong>Users:</strong> Manage user accounts</li>
                    <li><strong>Statistics:</strong> View detailed analytics</li>
                </ul>
            </Paper>
        </Box>
    );
}
