import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Avatar,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import { Search as SearchIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';

interface User {
    id: string;
    username?: string;
    displayName?: string;
    email?: string;
    profileUrl?: string;
    createdAt?: any;
    status?: string;
    coins?: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];
            setUsers(items);
            setFilteredUsers(items);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user =>
                user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, users]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Users Management
            </Typography>

            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search by username, display name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
                <Chip label={`${filteredUsers.length} users`} color="primary" />
            </Box>

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Coins</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Joined</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar src={user.profileUrl} alt={user.username}>
                                            {user.username?.[0]?.toUpperCase() || user.displayName?.[0]?.toUpperCase()}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body1" fontWeight="500">
                                                {user.username || user.displayName || 'Unknown'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ID: {user.id.slice(0, 8)}...
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email || 'N/A'}</TableCell>
                                <TableCell>
                                    <Chip label={`🪙 ${user.coins || 0}`} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.status || 'active'}
                                        size="small"
                                        color={user.status === 'banned' ? 'error' : 'success'}
                                    />
                                </TableCell>
                                <TableCell>
                                    {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'PP') : 'N/A'}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" color="error" title="Ban User">
                                        <BlockIcon />
                                    </IconButton>
                                    <IconButton size="small" color="success" title="Approve User">
                                        <CheckCircleIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
