import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    MenuItem,
    Paper
} from '@mui/material';
import { Add, Refresh, Search, FilterList } from '@mui/icons-material';
import { getShopItems, createShopItem, updateShopItem, deleteShopItem, ShopItem, getErrorMessage } from '../api/adminApi';
import ShopTable from '../components/shop/ShopTable';
import ShopGrid from '../components/shop/ShopGrid';
import ShopItemDialog from '../components/shop/ShopItemDialog';
import { ViewList, ViewModule } from '@mui/icons-material';

export default function ShopPage() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Dialog State
    const [open, setOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getShopItems();
            setItems(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = (item?: ShopItem) => {
        setEditingItem(item || null);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingItem(null);
    };

    const handleSave = async (formData: Partial<ShopItem>) => {
        try {
            if (editingItem) {
                await updateShopItem(editingItem.id, formData);
            } else {
                await createShopItem(formData as ShopItem);
            }
            loadItems();
        } catch (err) {
            throw err; // Let dialog handle error display
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            await deleteShopItem(id);
            loadItems();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    // Filter Logic
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || (item.category || 'other') === categoryFilter;
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' ? item.active : !item.active);

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [items, searchQuery, categoryFilter, statusFilter]);

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        🛍️ Shop Management
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Manage products, prices, and categories
                    </Typography>
                </Box>
                <Box>
                    <IconButton onClick={loadItems} sx={{ mr: 1 }}>
                        <Refresh />
                    </IconButton>

                    <Box component="span" sx={{ bgcolor: 'background.paper', borderRadius: 1, mr: 2, display: 'inline-flex', border: 1, borderColor: 'divider' }}>
                        <IconButton
                            size="small"
                            color={viewMode === 'table' ? 'primary' : 'default'}
                            onClick={() => setViewMode('table')}
                        >
                            <ViewList />
                        </IconButton>
                        <IconButton
                            size="small"
                            color={viewMode === 'grid' ? 'primary' : 'default'}
                            onClick={() => setViewMode('grid')}
                        >
                            <ViewModule />
                        </IconButton>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpen()}
                        size="large"
                    >
                        Add Item
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Filters Bar */}
            <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
                <Box display="flex" gap={2} flexWrap="wrap">
                    <TextField
                        placeholder="Search items..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flexGrow: 1, minWidth: '200px' }}
                    />

                    <TextField
                        select
                        label="Category"
                        size="small"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        sx={{ minWidth: '150px' }}
                    >
                        <MenuItem value="all">All Categories</MenuItem>
                        <MenuItem value="subscription">Subscription</MenuItem>
                        <MenuItem value="consumable">Consumable</MenuItem>
                        <MenuItem value="cosmetic">Cosmetic</MenuItem>
                        <MenuItem value="avatar_frame">Avatar Frame</MenuItem>
                        <MenuItem value="feature">Feature</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Status"
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: '120px' }}
                    >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            {/* Content */}
            {loading ? (
                <Box display="flex" justifyContent="center" p={5}>
                    <CircularProgress />
                </Box>
            ) : viewMode === 'table' ? (
                <ShopTable
                    items={filteredItems}
                    onEdit={handleOpen}
                    onDelete={handleDelete}
                />
            ) : (
                <ShopGrid
                    items={filteredItems}
                    onEdit={handleOpen}
                    onDelete={handleDelete}
                />
            )}

            {/* Dialog */}
            <ShopItemDialog
                open={open}
                onClose={handleClose}
                onSave={handleSave}
                item={editingItem}
            />
        </Box>
    );
}
