import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Box,
    Typography,
    Alert
} from '@mui/material';
import { GiftItem } from '../../api/adminApi';

interface GiftDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (gift: GiftItem) => Promise<void>;
    gift?: GiftItem | null;
}

export default function GiftDialog({ open, onClose, onSave, gift }: GiftDialogProps) {
    const [formData, setFormData] = useState<Partial<GiftItem>>({
        id: '',
        name: '',
        price: 10,
        currencyType: 'coins',
        icon: '',
        active: true
    });
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (gift) {
            setFormData(gift);
        } else {
            setFormData({
                id: '',
                name: '',
                price: 10,
                currencyType: 'coins',
                icon: '',
                active: true
            });
        }
        setError(null);
    }, [gift, open]);

    const handleChange = (field: keyof GiftItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.id || !formData.name || !formData.price || !formData.icon) {
            setError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSave(formData as GiftItem);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save gift');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{gift ? 'Edit Gift' : 'Add New Gift'}</DialogTitle>
            <DialogContent>
                {error && (
                    <Box mb={2}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}

                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    <TextField
                        label="Gift ID"
                        value={formData.id}
                        onChange={(e) => handleChange('id', e.target.value)}
                        disabled={!!gift} // ID cannot be changed after creation
                        fullWidth
                        required
                        helperText="Unique identifier (e.g., rose_bouquet)"
                    />

                    <TextField
                        label="Name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        fullWidth
                        required
                    />

                    <Box display="flex" gap={2}>
                        <TextField
                            label="Price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => handleChange('price', Number(e.target.value))}
                            fullWidth
                            required
                        />

                        <FormControl fullWidth>
                            <InputLabel>Currency</InputLabel>
                            <Select
                                value={formData.currencyType}
                                label="Currency"
                                onChange={(e) => handleChange('currencyType', e.target.value)}
                            >
                                <MenuItem value="coins">Coins (💎)</MenuItem>
                                <MenuItem value="banhMi">Bánh Mì (🥖)</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box display="flex" gap={2} alignItems="center">
                        <TextField
                            label="Icon (Emoji)"
                            value={formData.icon}
                            onChange={(e) => handleChange('icon', e.target.value)}
                            fullWidth
                            required
                            helperText="Paste an emoji here (e.g. 🌹)"
                        />
                        <Box
                            fontSize="2rem"
                            border="1px solid #ddd"
                            borderRadius={1}
                            p={1}
                            minWidth="60px"
                            textAlign="center"
                        >
                            {formData.icon || '?'}
                        </Box>
                    </Box>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.active}
                                onChange={(e) => handleChange('active', e.target.checked)}
                                color="primary"
                            />
                        }
                        label={formData.active ? "Active (Visible in App)" : "Inactive (Hidden)"}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
