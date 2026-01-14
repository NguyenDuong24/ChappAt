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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Stack,
    Alert,
    Card,
} from '@mui/material';
import {
    Search as SearchIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Visibility as VisibilityIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import AvatarFrame from './common/AvatarFrame';

interface User {
    id: string;
    username?: string;
    displayName?: string;
    email?: string;
    profileUrl?: string;
    createdAt?: any;
    status?: string;
    coins?: number;
    bio?: string;
    gender?: string;
    birthDate?: any;
    images?: string[];
    activeFrame?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [openProfileDialog, setOpenProfileDialog] = useState(false);
    const [confirmBanDialog, setConfirmBanDialog] = useState<{ open: boolean; userId: string | null; action: 'ban' | 'unban' }>({ open: false, userId: null, action: 'ban' });
    const [totalUsers, setTotalUsers] = useState(0);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);

    useEffect(() => {
        // Remove orderBy to fetch ALL users
        const q = query(collection(db, 'users'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('📊 [UsersPage] Fetched users:', snapshot.docs.length);

            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];

            // Sort client-side
            items.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
                return bTime - aTime;
            });

            setUsers(items);
            setFilteredUsers(items);
            setTotalUsers(items.length);
            setLoading(false);

            console.log('✅ [UsersPage] Users loaded:', items.length);
        }, (error) => {
            console.error('❌ [UsersPage] Error fetching users:', error);
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
                user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.id?.includes(searchQuery)
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, users]);

    const fetchUserPosts = async (userId: string) => {
        setLoadingPosts(true);
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where('userID', '==', userId));
            const snapshot = await getDocs(q);
            const posts = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by timestamp descending
            posts.sort((a: any, b: any) => {
                const aTime = a.timestamp?.seconds || a.createdAt?.seconds || 0;
                const bTime = b.timestamp?.seconds || b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
            setUserPosts(posts);
        } catch (error) {
            console.error('Error fetching user posts:', error);
            setUserPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleViewProfile = (user: User) => {
        setSelectedUser(user);
        setUserPosts([]);
        setOpenProfileDialog(true);
        fetchUserPosts(user.id);
    };

    const handleCloseProfile = () => {
        setOpenProfileDialog(false);
        setSelectedUser(null);
        setUserPosts([]);
    };

    const initiateBanAction = (userId: string, currentStatus?: string) => {
        const action = currentStatus === 'banned' ? 'unban' : 'ban';
        setConfirmBanDialog({ open: true, userId, action });
    };

    const confirmBanAction = async () => {
        if (!confirmBanDialog.userId) return;

        try {
            const userRef = doc(db, 'users', confirmBanDialog.userId);
            await updateDoc(userRef, {
                status: confirmBanDialog.action === 'ban' ? 'banned' : 'active',
                updatedAt: new Date()
            });
            setConfirmBanDialog({ open: false, userId: null, action: 'ban' });
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("Failed to update user status");
        }
    };

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
                    placeholder="Search by username, display name, email, or ID..."
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
                <Chip
                    label={`${filteredUsers.length} / ${totalUsers} users`}
                    color="primary"
                    sx={{ minWidth: 120 }}
                />
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
                                        <AvatarFrame
                                            avatarUrl={user.profileUrl || ''}
                                            frameType={user.activeFrame}
                                            size={44}
                                            username={user.username || user.displayName}
                                        />
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
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            title="View Profile"
                                            onClick={() => handleViewProfile(user)}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color={user.status === 'banned' ? 'success' : 'error'}
                                            title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
                                            onClick={() => initiateBanAction(user.id, user.status)}
                                        >
                                            {user.status === 'banned' ? <CheckCircleIcon /> : <BlockIcon />}
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* User Profile Dialog */}
            <Dialog
                open={openProfileDialog}
                onClose={handleCloseProfile}
                maxWidth="md"
                fullWidth
            >
                {selectedUser && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">User Profile</Typography>
                                <IconButton onClick={handleCloseProfile}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center" gap={2}>
                                    <AvatarFrame
                                        avatarUrl={selectedUser.profileUrl || ''}
                                        frameType={selectedUser.activeFrame}
                                        size={120}
                                        username={selectedUser.username || selectedUser.displayName}
                                    />
                                    <Typography variant="h5" fontWeight="bold">
                                        {selectedUser.displayName || selectedUser.username}
                                    </Typography>
                                    <Chip
                                        label={selectedUser.status || 'Active'}
                                        color={selectedUser.status === 'banned' ? 'error' : 'success'}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        ID: {selectedUser.id}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Stack spacing={2}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Basic Info</Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Email</Typography>
                                                    <Typography variant="body1">{selectedUser.email || 'N/A'}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Gender</Typography>
                                                    <Typography variant="body1">{selectedUser.gender || 'N/A'}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Coins</Typography>
                                                    <Typography variant="body1">{selectedUser.coins || 0}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Joined</Typography>
                                                    <Typography variant="body1">
                                                        {selectedUser.createdAt?.toDate ? format(selectedUser.createdAt.toDate(), 'PPpp') : 'N/A'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Paper>

                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Bio</Typography>
                                            <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                {selectedUser.bio || 'No bio provided.'}
                                            </Typography>
                                        </Paper>

                                        {selectedUser.images && selectedUser.images.length > 0 && (
                                            <Paper variant="outlined" sx={{ p: 2 }}>
                                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Gallery</Typography>
                                                <Grid container spacing={1}>
                                                    {selectedUser.images.map((img, idx) => (
                                                        <Grid item xs={4} key={idx}>
                                                            <Box
                                                                component="img"
                                                                src={img}
                                                                sx={{
                                                                    width: '100%',
                                                                    height: 100,
                                                                    objectFit: 'cover',
                                                                    borderRadius: 1,
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => window.open(img, '_blank')}
                                                            />
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Paper>
                                        )}

                                        {/* Posts Section */}
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                                                <Box component="span">📝</Box>
                                                Posts ({userPosts.length})
                                            </Typography>
                                            {loadingPosts ? (
                                                <Box display="flex" justifyContent="center" py={3}>
                                                    <CircularProgress size={24} />
                                                </Box>
                                            ) : userPosts.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                                    No posts yet.
                                                </Typography>
                                            ) : (
                                                <Stack spacing={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                                    {userPosts.map((post: any) => (
                                                        <Card key={post.id} variant="outlined" sx={{ p: 2 }}>
                                                            <Stack spacing={1}>
                                                                {post.content && (
                                                                    <Typography variant="body2">
                                                                        {post.content}
                                                                    </Typography>
                                                                )}
                                                                {post.images && post.images.length > 0 && (
                                                                    <Box>
                                                                        <Grid container spacing={1}>
                                                                            {post.images.slice(0, 3).map((img: string, idx: number) => (
                                                                                <Grid item xs={4} key={idx}>
                                                                                    <Box
                                                                                        component="img"
                                                                                        src={img}
                                                                                        alt={`Post image ${idx + 1}`}
                                                                                        sx={{
                                                                                            width: '100%',
                                                                                            height: 80,
                                                                                            objectFit: 'cover',
                                                                                            borderRadius: 1,
                                                                                            cursor: 'pointer'
                                                                                        }}
                                                                                        onClick={() => window.open(img, '_blank')}
                                                                                    />
                                                                                </Grid>
                                                                            ))}
                                                                        </Grid>
                                                                        {post.images.length > 3 && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                                +{post.images.length - 3} more images
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                )}
                                                                <Box display="flex" gap={2} alignItems="center">
                                                                    <Chip
                                                                        label={`❤️ ${post.likes?.length || 0}`}
                                                                        size="small"
                                                                        variant="outlined"
                                                                    />
                                                                    <Chip
                                                                        label={`💬 ${post.comments?.length || 0}`}
                                                                        size="small"
                                                                        variant="outlined"
                                                                    />
                                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                                        {post.timestamp?.toDate ? format(post.timestamp.toDate(), 'PPp') :
                                                                            post.createdAt?.toDate ? format(post.createdAt.toDate(), 'PPp') : 'No date'}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            )}
                                        </Paper>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseProfile}>Close</Button>
                            <Button
                                variant="contained"
                                color={selectedUser.status === 'banned' ? 'success' : 'error'}
                                onClick={() => initiateBanAction(selectedUser.id, selectedUser.status)}
                            >
                                {selectedUser.status === 'banned' ? 'Unban User' : 'Ban User'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Confirm Ban Dialog */}
            <Dialog open={confirmBanDialog.open} onClose={() => setConfirmBanDialog({ ...confirmBanDialog, open: false })}>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to <strong>{confirmBanDialog.action.toUpperCase()}</strong> this user?
                    </Typography>
                    {confirmBanDialog.action === 'ban' && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            This will prevent the user from logging in and accessing the app.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmBanDialog({ ...confirmBanDialog, open: false })}>Cancel</Button>
                    <Button onClick={confirmBanAction} color={confirmBanDialog.action === 'ban' ? 'error' : 'success'} variant="contained">
                        Confirm {confirmBanDialog.action === 'ban' ? 'Ban' : 'Unban'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
