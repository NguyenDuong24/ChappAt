import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Typography,
    Box,
    Tooltip
} from '@mui/material';
import { Edit, Delete, ContentCopy } from '@mui/icons-material';
import { ShopItem } from '../../api/adminApi';

import AvatarFrame from '../common/AvatarFrame';

interface ShopTableProps {
    items: ShopItem[];
    onEdit: (item: ShopItem) => void;
    onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    subscription: 'warning',
    consumable: 'info',
    cosmetic: 'secondary',
    avatar_frame: 'secondary',
    feature: 'primary',
    other: 'default'
};

export default function ShopTable({ items, onEdit, onDelete }: ShopTableProps) {
    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        // Could add a toast here
    };

    return (
        <TableContainer component={Paper} elevation={2}>
            <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Preview</TableCell>
                        <TableCell>Info</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((item) => (
                        <TableRow
                            key={item.id}
                            sx={{ '&:hover': { bgcolor: '#fafafa' } }}
                        >
                            <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {item.id}
                                    </Typography>
                                    <Tooltip title="Copy ID">
                                        <IconButton size="small" onClick={() => handleCopyId(item.id)}>
                                            <ContentCopy fontSize="small" style={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box display="flex" alignItems="center" justifyContent="center" width={60} height={60}>
                                    {item.category === 'avatar_frame' || item.frameType ? (
                                        <AvatarFrame
                                            avatarUrl="https://via.placeholder.com/150"
                                            frameType={item.frameType}
                                            size={40}
                                        />
                                    ) : (
                                        <Typography fontSize="2rem">{item.emoji || '🎁'}</Typography>
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        {item.name}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', maxWidth: 300 }}>
                                        {item.description}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={item.category || 'other'}
                                    size="small"
                                    color={CATEGORY_COLORS[item.category || 'other'] || 'default'}
                                    variant="outlined"
                                    sx={{ textTransform: 'capitalize' }}
                                />
                            </TableCell>
                            <TableCell>
                                <Typography fontWeight="bold" color={item.currencyType === 'coins' ? 'primary' : 'secondary'}>
                                    {item.price.toLocaleString()} {item.currencyType === 'coins' ? '💎' : '🥖'}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={item.active ? 'Active' : 'Inactive'}
                                    color={item.active ? 'success' : 'default'}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell align="right">
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => onEdit(item)} color="primary">
                                        <Edit />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => onDelete(item.id)} color="error">
                                        <Delete />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                <Typography variant="h6" color="textSecondary">
                                    No items found
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Try adjusting your filters or create a new item.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
