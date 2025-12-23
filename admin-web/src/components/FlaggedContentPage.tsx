import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Button,
    Chip,
    Grid,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Stack,
    Paper,
    Table,
    TableBody,
    TableRow,
    TableCell,
    Divider,
} from '@mui/material';
import {
    Close as CloseIcon,
    ZoomIn as ZoomInIcon,
    Flag as FlagIcon,
    CheckCircle as CheckCircleIcon,
    Delete as DeleteIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';

interface FlaggedItem {
    id: string;
    imageUrl?: string;
    text?: string;
    reason: string;
    confidence?: number;
    userId?: string;
    userName?: string;
    userEmail?: string;
    createdAt: any;
    status: 'pending' | 'reviewed' | 'safe' | 'removed';
    type: 'image' | 'text';
    metadata?: any;
}

export default function FlaggedContentPage() {
    const [items, setItems] = useState<FlaggedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'safe' | 'removed'>('pending');

    useEffect(() => {
        let q;
        if (filter === 'all') {
            q = query(
                collection(db, 'flagged_content'),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'flagged_content'),
                where('status', '==', filter),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as FlaggedItem[];
            setItems(fetchedItems);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching flagged content:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter]);

    const handleAction = async (id: string, action: 'safe' | 'removed') => {
        try {
            const docRef = doc(db, 'flagged_content', id);
            await updateDoc(docRef, {
                status: action,
                reviewedAt: new Date(),
            });
            setOpenDialog(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('Error updating flagged content:', error);
            alert('Failed to update content status');
        }
    };

    const handleOpenDetail = (item: FlaggedItem) => {
        setSelectedItem(item);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedItem(null);
    };

    const getConfidenceColor = (confidence?: number) => {
        if (!confidence) return 'default';
        if (confidence > 0.8) return 'error';
        if (confidence > 0.5) return 'warning';
        return 'success';
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
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Flagged Content
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Content flagged by AI or users ({items.length} items)
                    </Typography>
                </Box>

                {/* Filter Buttons */}
                <Stack direction="row" spacing={1}>
                    <Button
                        variant={filter === 'pending' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setFilter('pending')}
                    >
                        Pending
                    </Button>
                    <Button
                        variant={filter === 'safe' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setFilter('safe')}
                    >
                        Safe
                    </Button>
                    <Button
                        variant={filter === 'removed' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setFilter('removed')}
                    >
                        Removed
                    </Button>
                    <Button
                        variant={filter === 'all' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setFilter('all')}
                    >
                        All
                    </Button>
                </Stack>
            </Box>

            {items.length === 0 ? (
                <Alert severity="info">No flagged content found</Alert>
            ) : (
                <Grid container spacing={3}>
                    {items.map((item) => (
                        <Grid item xs={12} md={6} lg={4} key={item.id}>
                            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {/* Image Preview if available */}
                                {item.imageUrl && (
                                    <Box sx={{ position: 'relative' }}>
                                        <CardMedia
                                            component="img"
                                            height="200"
                                            image={item.imageUrl}
                                            alt="Flagged content"
                                            sx={{
                                                objectFit: 'cover',
                                                cursor: 'pointer',
                                                filter: item.status === 'pending' ? 'blur(10px)' : 'none',
                                                transition: 'filter 0.3s',
                                                '&:hover': {
                                                    filter: 'none'
                                                }
                                            }}
                                            onClick={() => handleOpenDetail(item)}
                                        />
                                        <IconButton
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                color: 'white',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                }
                                            }}
                                            onClick={() => handleOpenDetail(item)}
                                        >
                                            <ZoomInIcon />
                                        </IconButton>
                                        {item.status === 'pending' && (
                                            <Chip
                                                label="NSFW Potential"
                                                color="error"
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 8,
                                                    left: 8,
                                                }}
                                            />
                                        )}
                                    </Box>
                                )}

                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Stack spacing={1.5}>
                                        {/* Reason & Status */}
                                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                            <Chip
                                                label={item.reason || 'Flagged'}
                                                color="error"
                                                icon={<FlagIcon />}
                                                size="small"
                                            />
                                            <Chip
                                                label={item.status.toUpperCase()}
                                                color={
                                                    item.status === 'safe' ? 'success' :
                                                        item.status === 'removed' ? 'error' :
                                                            'warning'
                                                }
                                                size="small"
                                            />
                                        </Box>

                                        {/* Confidence Score if available */}
                                        {item.confidence && (
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="caption" fontWeight="bold">AI Confidence:</Typography>
                                                <Chip
                                                    label={`${(item.confidence * 100).toFixed(1)}%`}
                                                    color={getConfidenceColor(item.confidence)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>
                                        )}

                                        {/* Date */}
                                        <Typography variant="caption" color="text.secondary">
                                            {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'PPpp') : 'N/A'}
                                        </Typography>

                                        <Divider />

                                        {/* User Info */}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                <strong>Posted by:</strong>
                                            </Typography>
                                            <Typography variant="body2">
                                                {item.userName || item.userEmail || 'Unknown User'}
                                            </Typography>
                                            {item.userId && (
                                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', display: 'block' }}>
                                                    ID: {item.userId.slice(0, 12)}...
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => handleOpenDetail(item)}
                                    >
                                        Review Content
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Detail Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="lg"
                fullWidth
            >
                {selectedItem && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">Content Review</Typography>
                                <IconButton onClick={handleCloseDialog}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Image Section (if available) */}
                                {selectedItem.imageUrl && (
                                    <Grid item xs={12} md={6}>
                                        <Paper elevation={0} sx={{ backgroundColor: '#000', p: 2, display: 'flex', justifyContent: 'center' }}>
                                            <img
                                                src={selectedItem.imageUrl}
                                                alt="Flagged content"
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    maxHeight: '500px',
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        </Paper>
                                    </Grid>
                                )}

                                {/* Details Section */}
                                <Grid item xs={12} md={selectedItem.imageUrl ? 6 : 12}>
                                    <Stack spacing={2}>
                                        {/* Warning Alert */}
                                        <Alert severity="warning" icon={<WarningIcon />}>
                                            <Typography variant="subtitle2">Potential Policy Violation</Typography>
                                            <Typography variant="body2">
                                                This content was flagged as <strong>{selectedItem.reason}</strong>
                                                {selectedItem.confidence && ` with ${(selectedItem.confidence * 100).toFixed(1)}% confidence`}.
                                            </Typography>
                                        </Alert>

                                        {/* Metadata */}
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                Metadata
                                            </Typography>
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><strong>Type:</strong></TableCell>
                                                        <TableCell>{selectedItem.type || 'Unknown'}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><strong>Status:</strong></TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={selectedItem.status.toUpperCase()}
                                                                color={
                                                                    selectedItem.status === 'safe' ? 'success' :
                                                                        selectedItem.status === 'removed' ? 'error' :
                                                                            'warning'
                                                                }
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><strong>Created:</strong></TableCell>
                                                        <TableCell>
                                                            {selectedItem.createdAt?.toDate
                                                                ? format(selectedItem.createdAt.toDate(), 'PPpp')
                                                                : 'N/A'}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </Paper>

                                        {/* User Information */}
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                User Information
                                            </Typography>
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><strong>Name:</strong></TableCell>
                                                        <TableCell>{selectedItem.userName || 'Unknown'}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><strong>Email:</strong></TableCell>
                                                        <TableCell>{selectedItem.userEmail || 'N/A'}</TableCell>
                                                    </TableRow>
                                                    {selectedItem.userId && (
                                                        <TableRow>
                                                            <TableCell><strong>User ID:</strong></TableCell>
                                                            <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                                                {selectedItem.userId}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </Paper>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, gap: 1 }}>
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleAction(selectedItem.id, 'safe')}
                                disabled={selectedItem.status === 'safe'}
                            >
                                Mark as Safe
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleAction(selectedItem.id, 'removed')}
                                disabled={selectedItem.status === 'removed'}
                            >
                                Remove Content
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
