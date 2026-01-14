import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    IconButton
} from '@mui/material';
import { Search, Add, Refresh } from '@mui/icons-material';
import { GiftItem, getGifts, createGift, updateGift, deleteGift, getErrorMessage } from '../api/adminApi';
import GiftTable from '../components/gift/GiftTable';
import GiftDialog from '../components/gift/GiftDialog';

export default function GiftPage() {
    const [gifts, setGifts] = useState<GiftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);

    const loadGifts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getGifts();
            setGifts(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGifts();
    }, []);

    // Filter logic
    const filteredGifts = gifts.filter(gift => {
        const matchesSearch = gift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            gift.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = filterStatus === 'all'
            ? true
            : filterStatus === 'active' ? gift.active : !gift.active;

        const matchesCurrency = filterCurrency === 'all'
            ? true
            : gift.currencyType === filterCurrency;

        return matchesSearch && matchesStatus && matchesCurrency;
    });

    const handleCreate = () => {
        setSelectedGift(null);
        setDialogOpen(true);
    };

    const handleEdit = (gift: GiftItem) => {
        setSelectedGift(gift);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this gift? This cannot be undone.')) {
            try {
                await deleteGift(id);
                await loadGifts();
            } catch (err) {
                alert(getErrorMessage(err));
            }
        }
    };

    const handleSave = async (gift: GiftItem) => {
        if (selectedGift) {
            await updateGift(gift.id, gift);
        } else {
            await createGift(gift);
        }
        await loadGifts();
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        🎁 Gift Management
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Manage gift catalog, prices, and availability
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <IconButton onClick={loadGifts} disabled={loading}>
                        <Refresh />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreate}
                    >
                        Add Gift
                    </Button>
                </Box>
            </Box>

            {error && (
                <Box mb={3}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            )}

            <Paper sx={{ p: 2, mb: 3 }}>
                <Box display="flex" gap={2} flexWrap="wrap">
                    <TextField
                        placeholder="Search gifts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flexGrow: 1, minWidth: '200px' }}
                        size="small"
                    />

                    <FormControl size="small" sx={{ minWidth: '150px' }}>
                        <InputLabel>Currency</InputLabel>
                        <Select
                            value={filterCurrency}
                            label="Currency"
                            onChange={(e) => setFilterCurrency(e.target.value)}
                        >
                            <MenuItem value="all">All Currencies</MenuItem>
                            <MenuItem value="coins">Coins (💎)</MenuItem>
                            <MenuItem value="banhMi">Bánh Mì (🥖)</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: '150px' }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Status"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {loading ? (
                <Box display="flex" justifyContent="center" p={5}>
                    <CircularProgress />
                </Box>
            ) : (
                <GiftTable
                    gifts={filteredGifts}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <GiftDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                gift={selectedGift}
            />
        </Box>
    );
}
