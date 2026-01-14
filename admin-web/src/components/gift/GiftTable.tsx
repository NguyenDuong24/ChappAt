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
import { GiftItem } from '../../api/adminApi';

interface GiftTableProps {
    gifts: GiftItem[];
    onEdit: (gift: GiftItem) => void;
    onDelete: (id: string) => void;
}

export default function GiftTable({ gifts, onEdit, onDelete }: GiftTableProps) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (gifts.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                    No gifts found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Try adjusting your filters or create a new gift.
                </Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Icon</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {gifts.map((gift) => (
                        <TableRow key={gift.id} hover>
                            <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {gift.id}
                                    </Typography>
                                    <Tooltip title="Copy ID">
                                        <IconButton size="small" onClick={() => copyToClipboard(gift.id)}>
                                            <ContentCopy fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Typography variant="h5">{gift.icon}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography fontWeight="medium">{gift.name}</Typography>
                            </TableCell>
                            <TableCell>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography fontWeight="bold">
                                        {gift.price.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {gift.currencyType === 'coins' ? '💎' : '🥖'}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={gift.active ? 'Active' : 'Inactive'}
                                    color={gift.active ? 'success' : 'default'}
                                    size="small"
                                    variant={gift.active ? 'filled' : 'outlined'}
                                />
                            </TableCell>
                            <TableCell align="right">
                                <Tooltip title="Edit">
                                    <IconButton onClick={() => onEdit(gift)} color="primary">
                                        <Edit />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton onClick={() => onDelete(gift.id)} color="error">
                                        <Delete />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
