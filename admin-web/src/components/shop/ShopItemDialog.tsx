import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    MenuItem,
    FormControlLabel,
    Switch,
    Alert,
    Typography
} from '@mui/material';
import { ShopItem } from '../../api/adminApi';

interface ShopItemDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (item: Partial<ShopItem>) => Promise<void>;
    item: ShopItem | null;
}

const CATEGORIES = [
    { value: 'subscription', label: 'Subscription (VIP)' },
    { value: 'consumable', label: 'Consumable (Boost, Super Like)' },
    { value: 'cosmetic', label: 'Cosmetic (Badge)' },
    { value: 'avatar_frame', label: 'Avatar Frame' },
    { value: 'feature', label: 'Feature Unlock' },
    { value: 'other', label: 'Other' }
];

import AvatarFrame from '../common/AvatarFrame';

const FRAME_TYPES = [
    { value: 'dragon', label: 'Dragon (Kim Long)' },
    { value: 'phoenix', label: 'Phoenix (Hỏa Phượng)' },
    { value: 'devil', label: 'Devil (Ác Quỷ)' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'galaxy', label: 'Galaxy (Thiên Hà)' },
    { value: 'money', label: 'Money (Yêu Tiền)' },
    { value: 'ocean', label: 'Ocean (Biển)' },
    { value: 'ufo', label: 'UFO' },
    { value: 'elegant', label: 'Elegant (Lịch Lãm)' },
    { value: 'japan', label: 'Japan (Nhật Bản)' },
    { value: 'gamer', label: 'Gamer' },
];

export default function ShopItemDialog({ open, onClose, onSave, item }: ShopItemDialogProps) {
    const [formData, setFormData] = useState<Partial<ShopItem>>({
        id: '',
        name: '',
        price: 0,
        currencyType: 'coins',
        emoji: '',
        description: '',
        category: 'other',
        active: true,
        frameType: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                id: '',
                name: '',
                price: 0,
                currencyType: 'coins',
                emoji: '',
                description: '',
                category: 'other',
                active: true,
                frameType: ''
            });
        }
        setError(null);
    }, [item, open]);

    const handleSave = async () => {
        if (!formData.id || !formData.name || formData.price === undefined) {
            setError('Please fill in all required fields (ID, Name, Price)');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {item ? 'Edit Shop Item' : 'Add New Shop Item'}
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}

                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    {/* Preview Section */}
                    {(formData.category === 'avatar_frame' || formData.frameType) && (
                        <Box display="flex" justifyContent="center" p={2} bgcolor="#f8f9fa" borderRadius={2}>
                            <AvatarFrame
                                avatarUrl="https://via.placeholder.com/150"
                                frameType={formData.frameType}
                                size={120}
                            />
                        </Box>
                    )}

                    <TextField
                        label="Item ID"
                        value={formData.id}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        disabled={!!item}
                        helperText={!item ? "Unique identifier (e.g., vip_1m). Cannot be changed later." : ""}
                        fullWidth
                        required
                    />

                    <Box display="flex" gap={2}>
                        <TextField
                            label="Emoji"
                            value={formData.emoji}
                            onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                            sx={{ width: '100px' }}
                            placeholder="🎁"
                        />
                        <TextField
                            label="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />
                    </Box>

                    <Box display="flex" gap={2}>
                        <TextField
                            label="Price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            fullWidth
                            required
                        />
                        <TextField
                            select
                            label="Currency"
                            value={formData.currencyType}
                            onChange={(e) => setFormData({ ...formData, currencyType: e.target.value as any })}
                            fullWidth
                        >
                            <MenuItem value="coins">Coins (💎)</MenuItem>
                            <MenuItem value="banhMi">Banh Mi (🥖)</MenuItem>
                        </TextField>
                    </Box>

                    <TextField
                        select
                        label="Category"
                        value={formData.category || 'other'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        fullWidth
                    >
                        {CATEGORIES.map((cat) => (
                            <MenuItem key={cat.value} value={cat.value}>
                                {cat.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {formData.category === 'avatar_frame' && (
                        <TextField
                            select
                            label="Frame Type"
                            value={formData.frameType || ''}
                            onChange={(e) => setFormData({ ...formData, frameType: e.target.value })}
                            fullWidth
                            helperText="Select the visual style for this frame"
                        >
                            <MenuItem value="">None</MenuItem>
                            {FRAME_TYPES.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    <TextField
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        multiline
                        rows={3}
                        fullWidth
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                color="success"
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body1">Active Status</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Inactive items will be hidden from the app.
                                </Typography>
                            </Box>
                        }
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Item'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
