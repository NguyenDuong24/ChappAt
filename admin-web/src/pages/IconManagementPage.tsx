import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardActions,
    IconButton,
    Button,
    CircularProgress,
    Paper,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    LinearProgress
} from '@mui/material';
import {
    Delete as DeleteIcon,
    CloudUpload as UploadIcon,
    Refresh as RefreshIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import { ref, listAll, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { storage } from '../firebaseConfig';

interface IconItem {
    name: string;
    url: string;
    fullPath: string;
}

export default function IconManagementPage() {
    const [icons, setIcons] = useState<IconItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const fetchIcons = async () => {
        setLoading(true);
        try {
            const iconsRef = ref(storage, 'Icons/');
            const result = await listAll(iconsRef);

            const iconData = await Promise.all(
                result.items.map(async (item) => {
                    const url = await getDownloadURL(item);
                    return {
                        name: item.name,
                        url,
                        fullPath: item.fullPath
                    };
                })
            );

            setIcons(iconData);
        } catch (error) {
            console.error('Error fetching icons:', error);
            showSnackbar('Failed to load icons', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIcons();
    }, []);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showSnackbar('Please upload an image file', 'error');
            return;
        }

        const storageRef = ref(storage, `Icons/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        setUploading(true);
        setUploadProgress(0);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error('Upload error:', error);
                setUploading(false);
                showSnackbar('Failed to upload icon', 'error');
            },
            async () => {
                setUploading(false);
                showSnackbar('Icon uploaded successfully', 'success');
                fetchIcons(); // Refresh list
            }
        );
    };

    const handleDeleteClick = (icon: IconItem) => {
        setSelectedIcon(icon);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedIcon) return;

        try {
            const iconRef = ref(storage, selectedIcon.fullPath);
            await deleteObject(iconRef);
            showSnackbar('Icon deleted successfully', 'success');
            setIcons(icons.filter(i => i.fullPath !== selectedIcon.fullPath));
        } catch (error) {
            console.error('Delete error:', error);
            showSnackbar('Failed to delete icon', 'error');
        } finally {
            setDeleteDialogOpen(false);
            setSelectedIcon(null);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Icon Management
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Manage profile icons available for users during signup.
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchIcons}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        component="label"
                        startIcon={<UploadIcon />}
                        disabled={uploading}
                    >
                        Upload Icon
                        <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                    </Button>
                </Box>
            </Box>

            {uploading && (
                <Box mb={4}>
                    <Typography variant="body2" mb={1}>Uploading: {Math.round(uploadProgress)}%</Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 10, borderRadius: 5 }} />
                </Box>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" py={10}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {icons.map((icon) => (
                        <Grid item xs={12} sm={6} md={4} lg={2} key={icon.fullPath}>
                            <Card
                                elevation={2}
                                sx={{
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'translateY(-4px)' }
                                }}
                            >
                                <Box sx={{ position: 'relative', pt: '100%', bgcolor: 'transparent' }}>
                                    <CardMedia
                                        component="img"
                                        image={icon.url}
                                        alt={icon.name}
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            p: 2
                                        }}
                                    />
                                </Box>
                                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                                    <Typography variant="caption" noWrap sx={{ maxWidth: '70%' }}>
                                        {icon.name}
                                    </Typography>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick(icon)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                    {icons.length === 0 && (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4, bgcolor: '#fafafa' }}>
                                <ImageIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="textSecondary">
                                    No icons found in Storage
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Upload some icons to get started.
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Icon?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{selectedIcon?.name}</strong>?
                        This action cannot be undone and may affect users who have selected this icon.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
