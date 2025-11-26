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
    Report as ReportIcon,
    CheckCircle as CheckCircleIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';

interface Report {
    id: string;
    reason: string;
    description: string;
    reporterId?: string;
    reporterName?: string;
    reportedUserId?: string;
    reportedUserName?: string;
    reportedMessageText?: string;
    reportedMessageImageUrl?: string;
    reportedMessageType?: string;
    context: string;
    roomId?: string;
    createdAt: any;
    status?: string;
    resolvedAt?: any;
    resolvedBy?: string;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

    useEffect(() => {
        let q;
        if (filter === 'all') {
            q = query(
                collection(db, 'reports'),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'reports'),
                where('status', '==', filter),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Report[];
            setReports(items);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching reports:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter]);

    const handleResolve = async (id: string, action: 'resolved' | 'dismissed') => {
        try {
            const docRef = doc(db, 'reports', id);
            await updateDoc(docRef, {
                status: action,
                resolvedAt: new Date(),
            });
            setOpenDialog(false);
            setSelectedReport(null);
        } catch (error) {
            console.error('Error updating report:', error);
            alert('Failed to update report');
        }
    };

    const handleOpenDetail = (report: Report) => {
        setSelectedReport(report);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedReport(null);
    };

    const getReasonColor = (reason: string) => {
        const lowerReason = reason?.toLowerCase() || '';
        if (lowerReason.includes('spam') || lowerReason.includes('harassment')) return 'error';
        if (lowerReason.includes('inappropriate')) return 'warning';
        return 'default';
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
                        User Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Reports submitted by users ({reports.length} total)
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
                        variant={filter === 'resolved' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setFilter('resolved')}
                    >
                        Resolved
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

            {reports.length === 0 ? (
                <Alert severity="info">No reports found</Alert>
            ) : (
                <Grid container spacing={3}>
                    {reports.map((report) => (
                        <Grid item xs={12} md={6} lg={4} key={report.id}>
                            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {/* Image Preview if available */}
                                {report.reportedMessageImageUrl && (
                                    <Box sx={{ position: 'relative' }}>
                                        <CardMedia
                                            component="img"
                                            height="200"
                                            image={report.reportedMessageImageUrl}
                                            alt="Reported content"
                                            sx={{
                                                objectFit: 'cover',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => handleOpenDetail(report)}
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
                                            onClick={() => handleOpenDetail(report)}
                                        >
                                            <ZoomInIcon />
                                        </IconButton>
                                    </Box>
                                )}

                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Stack spacing={1.5}>
                                        {/* Reason & Status */}
                                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                            <Chip
                                                label={report.reason || 'General Report'}
                                                color={getReasonColor(report.reason)}
                                                icon={<ReportIcon />}
                                                size="small"
                                            />
                                            {report.status && (
                                                <Chip
                                                    label={report.status}
                                                    color={report.status === 'resolved' ? 'success' : report.status === 'dismissed' ? 'default' : 'warning'}
                                                    size="small"
                                                />
                                            )}
                                        </Box>

                                        {/* Date */}
                                        <Typography variant="caption" color="text.secondary">
                                            {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'PPpp') : 'N/A'}
                                        </Typography>

                                        <Divider />

                                        {/* Reporter Info */}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                <strong>Reported by:</strong>
                                            </Typography>
                                            <Typography variant="body2">
                                                {report.reporterName || 'Unknown User'}
                                            </Typography>
                                            {report.reporterId && (
                                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', display: 'block' }}>
                                                    ID: {report.reporterId.slice(0, 12)}...
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Reported User Info */}
                                        {report.reportedUserName && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    <strong>Reported user:</strong>
                                                </Typography>
                                                <Typography variant="body2" color="error">
                                                    {report.reportedUserName}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Description */}
                                        <Typography variant="body2" color="text.secondary" sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}>
                                            {report.description || 'No description provided'}
                                        </Typography>

                                        {/* Message Preview */}
                                        {report.reportedMessageText && (
                                            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                                                <Typography variant="caption" display="block" fontWeight="bold">
                                                    Reported Message:
                                                </Typography>
                                                <Typography variant="caption" sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}>
                                                    "{report.reportedMessageText}"
                                                </Typography>
                                            </Alert>
                                        )}

                                        {/* Context Chips */}
                                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                                            <Chip label={report.context} size="small" variant="outlined" />
                                            {report.reportedMessageType && (
                                                <Chip label={report.reportedMessageType} size="small" variant="outlined" />
                                            )}
                                        </Box>
                                    </Stack>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => handleOpenDetail(report)}
                                    >
                                        View Details
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
                {selectedReport && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">Report Details</Typography>
                                <IconButton onClick={handleCloseDialog}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Image Section (if available) */}
                                {selectedReport.reportedMessageImageUrl && (
                                    <Grid item xs={12} md={6}>
                                        <Paper elevation={0} sx={{ backgroundColor: '#000', p: 2 }}>
                                            <img
                                                src={selectedReport.reportedMessageImageUrl}
                                                alt="Reported content"
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
                                <Grid item xs={12} md={selectedReport.reportedMessageImageUrl ? 6 : 12}>
                                    <Stack spacing={2}>
                                        {/* Reason */}
                                        <Alert severity="error" icon={<ReportIcon />}>
                                            <Typography variant="subtitle2">Report Reason</Typography>
                                            <Typography variant="body2">{selectedReport.reason || 'No reason provided'}</Typography>
                                        </Alert>

                                        {/* Description */}
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                Description
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {selectedReport.description || 'No description provided'}
                                            </Typography>
                                        </Paper>

                                        {/* Reporter Information */}
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                Reporter Information
                                            </Typography>
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><strong>Name:</strong></TableCell>
                                                        <TableCell>{selectedReport.reporterName || 'Unknown'}</TableCell>
                                                    </TableRow>
                                                    {selectedReport.reporterId && (
                                                        <TableRow>
                                                            <TableCell><strong>User ID:</strong></TableCell>
                                                            <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                                                {selectedReport.reporterId}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </Paper>

                                        {/* Reported User Information */}
                                        {selectedReport.reportedUserName && (
                                            <Paper variant="outlined" sx={{ p: 2 }}>
                                                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                    Reported User
                                                </Typography>
                                                <Table size="small">
                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell><strong>Name:</strong></TableCell>
                                                            <TableCell>{selectedReport.reportedUserName}</TableCell>
                                                        </TableRow>
                                                        {selectedReport.reportedUserId && (
                                                            <TableRow>
                                                                <TableCell><strong>User ID:</strong></TableCell>
                                                                <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                                                    {selectedReport.reportedUserId}
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </Paper>
                                        )}

                                        {/* Reported Message */}
                                        {selectedReport.reportedMessageText && (
                                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff3e0' }}>
                                                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                    Reported Message
                                                </Typography>
                                                <Typography variant="body2">
                                                    "{selectedReport.reportedMessageText}"
                                                </Typography>
                                            </Paper>
                                        )}

                                        {/* Additional Info */}
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                                Additional Information
                                            </Typography>
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><strong>Context:</strong></TableCell>
                                                        <TableCell>{selectedReport.context}</TableCell>
                                                    </TableRow>
                                                    {selectedReport.reportedMessageType && (
                                                        <TableRow>
                                                            <TableCell><strong>Message Type:</strong></TableCell>
                                                            <TableCell>{selectedReport.reportedMessageType}</TableCell>
                                                        </TableRow>
                                                    )}
                                                    {selectedReport.roomId && (
                                                        <TableRow>
                                                            <TableCell><strong>Room ID:</strong></TableCell>
                                                            <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                                                {selectedReport.roomId}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    <TableRow>
                                                        <TableCell><strong>Created:</strong></TableCell>
                                                        <TableCell>
                                                            {selectedReport.createdAt?.toDate
                                                                ? format(selectedReport.createdAt.toDate(), 'PPpp')
                                                                : 'N/A'}
                                                        </TableCell>
                                                    </TableRow>
                                                    {selectedReport.status && (
                                                        <TableRow>
                                                            <TableCell><strong>Status:</strong></TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={selectedReport.status}
                                                                    color={
                                                                        selectedReport.status === 'resolved' ? 'success' :
                                                                            selectedReport.status === 'dismissed' ? 'default' : 'warning'
                                                                    }
                                                                    size="small"
                                                                />
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
                                color="inherit"
                                startIcon={<BlockIcon />}
                                onClick={() => handleResolve(selectedReport.id, 'dismissed')}
                                disabled={selectedReport.status === 'dismissed'}
                            >
                                Dismiss
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleResolve(selectedReport.id, 'resolved')}
                                disabled={selectedReport.status === 'resolved'}
                            >
                                Mark as Resolved
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
