import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    IconButton,
    Tooltip,
    useTheme
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { ShopItem } from '../../api/adminApi';
import AvatarFrame from '../common/AvatarFrame';

interface ShopGridProps {
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

export default function ShopGrid({ items, onEdit, onDelete }: ShopGridProps) {
    const theme = useTheme();

    return (
        <Grid container spacing={3}>
            {items.map((item) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                    <Card
                        elevation={3}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            borderRadius: 4,
                            overflow: 'visible',
                            mt: 2,
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6
                            }
                        }}
                    >
                        {/* Status Badge */}
                        <Box position="absolute" top={-10} right={10} zIndex={1}>
                            <Chip
                                label={item.active ? 'Active' : 'Inactive'}
                                color={item.active ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>

                        {/* Image/Preview Area */}
                        <Box
                            sx={{
                                height: 160,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8f9fa',
                                borderTopLeftRadius: 16,
                                borderTopRightRadius: 16,
                                position: 'relative'
                            }}
                        >
                            {item.category === 'avatar_frame' || item.frameType ? (
                                <AvatarFrame
                                    avatarUrl="https://via.placeholder.com/150" // Placeholder for preview
                                    frameType={item.frameType}
                                    size={100}
                                />
                            ) : (
                                <Typography fontSize="5rem">
                                    {item.emoji || '🎁'}
                                </Typography>
                            )}
                        </Box>

                        <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Typography variant="h6" fontWeight="bold" noWrap title={item.name}>
                                    {item.name}
                                </Typography>
                            </Box>

                            <Typography variant="body2" color="textSecondary" sx={{
                                mb: 2,
                                height: 40,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                            }}>
                                {item.description}
                            </Typography>

                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Chip
                                    label={item.category || 'other'}
                                    size="small"
                                    color={CATEGORY_COLORS[item.category || 'other'] || 'default'}
                                    variant="outlined"
                                    sx={{ textTransform: 'capitalize' }}
                                />
                                <Typography variant="caption" fontFamily="monospace" color="textSecondary">
                                    {item.id}
                                </Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
                                <Typography variant="h6" fontWeight="900" color={item.currencyType === 'coins' ? 'primary.main' : '#FFD700'}>
                                    {item.price.toLocaleString()} {item.currencyType === 'coins' ? '💎' : '🥖'}
                                </Typography>

                                <Box>
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => onEdit(item)} color="primary">
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton size="small" onClick={() => onDelete(item.id)} color="error">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
            {items.length === 0 && (
                <Grid item xs={12}>
                    <Box textAlign="center" py={5}>
                        <Typography variant="h6" color="textSecondary">
                            No items found
                        </Typography>
                    </Box>
                </Grid>
            )}
        </Grid>
    );
}
