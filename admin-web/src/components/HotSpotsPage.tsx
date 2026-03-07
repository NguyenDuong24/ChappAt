import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tooltip,
  Avatar,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Rating,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  LocationOn as LocationIcon,
  Event as EventIcon,
  Place as PlaceIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  NewReleases as NewIcon,
  TrendingUp as PopularIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  getHotspots,
  createHotspot,
  updateHotspot,
  deleteHotspot,
  getErrorMessage,
  HotspotItem as HotSpot
} from '../api/adminApi';
import { useTranslation } from 'react-i18next';

// Types - Updated to match actual Firestore data structure
interface HotSpot {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'place';
  category: string;

  // Location
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    city: string;
    district?: string;
  };

  // Event info (nested)
  eventInfo?: {
    startDate: string;
    endDate: string;
    organizer: string;
    price?: number;
    maxParticipants?: number;
    currentParticipants: number;
  };

  // Top-level event fields (alternative structure)
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  endsAt?: string;
  price?: number;
  maxParticipants?: number;
  participants?: number;

  // Media
  images: string[];
  thumbnail: string;
  imageUrl?: string;

  // Stats
  stats: {
    interested: number;
    joined: number;
    checkedIn: number;
    rating: number;
    reviewCount: number;
  };
  rating?: number;

  // Tags
  tags: string[];

  // Flags
  isActive: boolean;
  isFeatured: boolean;
  isNew?: boolean;
  isPopular?: boolean;

  // Timestamps
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
}

interface HotSpotFormData {
  title: string;
  description: string;
  type: 'event' | 'place';
  category: string;
  // Location
  address: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  // Media
  thumbnail: string;
  imageUrl: string;
  images: string[];
  // Tags
  tags: string;
  // Flags
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPopular: boolean;
  // Event specific
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  organizer: string;
  price: string;
  maxParticipants: string;
  currentParticipants: string;
}

const CATEGORIES = [
  'music',
  'food',
  'sports',
  'art',
  'nightlife',
  'culture',
  'outdoor',
  'shopping',
  'wellness',
  'tech',
  'education',
  'community',
  'dating',
  'party',
  'networking',
  'travel',
  'photography',
  'gaming',
  'fitness',
  'other',
];

const HO_CHI_MINH_DISTRICTS = [
  'Quận 1',
  'Quận 2',
  'Quận 3',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 7',
  'Quận 8',
  'Quận 9',
  'Quận 10',
  'Quận 11',
  'Quận 12',
  'Quận Bình Tân',
  'Quận Bình Thạnh',
  'Quận Gò Vấp',
  'Quận Phú Nhuận',
  'Quận Tân Bình',
  'Quận Tân Phú',
  'Quận Thủ Đức',
  'Huyện Bình Chánh',
  'Huyện Cần Giờ',
  'Huyện Củ Chi',
  'Huyện Hóc Môn',
  'Huyện Nhà Bè',
];

const initialFormData: HotSpotFormData = {
  title: '',
  description: '',
  type: 'event',
  category: 'other',
  address: '',
  city: 'HCM',
  district: '',
  latitude: '',
  longitude: '',
  thumbnail: '',
  imageUrl: '',
  images: [],
  tags: '',
  isActive: true,
  isFeatured: false,
  isNew: true,
  isPopular: false,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  organizer: 'system',
  price: '',
  maxParticipants: '',
  currentParticipants: '0',
};

export default function HotSpotsPage() {
  const { t, i18n } = useTranslation();
  const [hotSpots, setHotSpots] = useState<HotSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'event' | 'place'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterFeatured, setFilterFeatured] = useState<'all' | 'featured' | 'normal'>('all');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedHotSpot, setSelectedHotSpot] = useState<HotSpot | null>(null);
  const [formData, setFormData] = useState<HotSpotFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    events: 0,
    places: 0,
    featured: 0,
  });

  // Fetch hot spots
  const fetchHotSpots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHotspots();
      setHotSpots(data as any);

      // Calculate stats
      setStats({
        total: data.length,
        active: data.filter(h => h.isActive).length,
        inactive: data.filter(h => !h.isActive).length,
        events: data.filter(h => h.type === 'event').length,
        places: data.filter(h => h.type === 'place').length,
        featured: data.filter(h => h.isFeatured).length,
      });
    } catch (error) {
      console.error('Error fetching hot spots:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotSpots();
  }, [fetchHotSpots]);

  // Filter and search
  const filteredHotSpots = hotSpots.filter(hotSpot => {
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        hotSpot.title.toLowerCase().includes(query) ||
        hotSpot.description.toLowerCase().includes(query) ||
        hotSpot.location?.city?.toLowerCase().includes(query) ||
        hotSpot.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && hotSpot.type !== filterType) return false;

    // Category filter
    if (filterCategory !== 'all' && hotSpot.category !== filterCategory) return false;

    // Status filter
    if (filterStatus === 'active' && !hotSpot.isActive) return false;
    if (filterStatus === 'inactive' && hotSpot.isActive) return false;

    // Featured filter
    if (filterFeatured === 'featured' && !hotSpot.isFeatured) return false;
    if (filterFeatured === 'normal' && hotSpot.isFeatured) return false;

    return true;
  });

  // Handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (hotSpot: HotSpot) => {
    setFormData({
      title: hotSpot.title,
      description: hotSpot.description,
      type: hotSpot.type,
      category: hotSpot.category,
      address: hotSpot.location?.address || '',
      city: hotSpot.location?.city || '',
      district: hotSpot.location?.district || '',
      latitude: hotSpot.location?.coordinates?.latitude?.toString() || '',
      longitude: hotSpot.location?.coordinates?.longitude?.toString() || '',
      thumbnail: hotSpot.thumbnail || '',
      imageUrl: hotSpot.imageUrl || '',
      images: hotSpot.images || [],
      tags: hotSpot.tags?.join(', ') || '',
      isActive: hotSpot.isActive,
      isFeatured: hotSpot.isFeatured,
      isNew: hotSpot.isNew || false,
      isPopular: hotSpot.isPopular || false,
      startDate: hotSpot.eventInfo?.startDate || '',
      endDate: hotSpot.eventInfo?.endDate || '',
      startTime: hotSpot.startTime || '',
      endTime: hotSpot.endTime || '',
      organizer: hotSpot.eventInfo?.organizer || '',
      price: hotSpot.eventInfo?.price?.toString() || '',
      maxParticipants: hotSpot.eventInfo?.maxParticipants?.toString() || '',
      currentParticipants: hotSpot.eventInfo?.currentParticipants?.toString() || '0',
    });
    setSelectedHotSpot(hotSpot);
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleOpenView = (hotSpot: HotSpot) => {
    setSelectedHotSpot(hotSpot);
    setOpenViewDialog(true);
  };

  const handleOpenDelete = (hotSpot: HotSpot) => {
    setSelectedHotSpot(hotSpot);
    setOpenDeleteDialog(true);
  };

  const handleFormChange = (field: keyof HotSpotFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const hotSpotData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        location: {
          address: formData.address,
          city: formData.city,
          district: formData.district,
          coordinates: {
            latitude: parseFloat(formData.latitude) || 0,
            longitude: parseFloat(formData.longitude) || 0,
          },
        },
        thumbnail: formData.thumbnail,
        imageUrl: formData.imageUrl,
        images: formData.images.filter(url => url.trim() !== ''),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        isNew: formData.isNew,
        isPopular: formData.isPopular,
      };

      // Add event info if type is event
      if (formData.type === 'event') {
        hotSpotData.eventInfo = {
          startDate: formData.startDate,
          endDate: formData.endDate,
          organizer: formData.organizer,
          price: formData.price ? parseFloat(formData.price) : 0,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : 0,
          currentParticipants: isEditing ? (selectedHotSpot?.eventInfo?.currentParticipants || 0) : 0,
        };
      }

      if (isEditing && selectedHotSpot) {
        // Update existing
        await updateHotspot(selectedHotSpot.id, hotSpotData);
        showSnackbar(t('common.success'), 'success');
      } else {
        // Create new
        await createHotspot(hotSpotData);
        showSnackbar(t('common.success'), 'success');
      }

      setOpenDialog(false);
      fetchHotSpots();
    } catch (error) {
      console.error('Error saving hot spot:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedHotSpot) return;

    try {
      await deleteHotspot(selectedHotSpot.id);
      showSnackbar(t('common.success'), 'success');
      setOpenDeleteDialog(false);
      fetchHotSpots();
    } catch (error) {
      console.error('Error deleting hot spot:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleToggleActive = async (hotSpot: HotSpot) => {
    try {
      await updateHotspot(hotSpot.id, {
        isActive: !hotSpot.isActive,
      });
      showSnackbar(t('common.success'), 'success');
      fetchHotSpots();
    } catch (error) {
      console.error('Error toggling active status:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleToggleFeatured = async (hotSpot: HotSpot) => {
    try {
      await updateHotspot(hotSpot.id, {
        isFeatured: !hotSpot.isFeatured,
      });
      showSnackbar(t('common.success'), 'success');
      fetchHotSpots();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const formatDateString = (date: any) => {
    if (!date) return 'N/A';
    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    if (date.toDate) {
      return date.toDate().toLocaleDateString(locale);
    }
    return new Date(date).toLocaleDateString(locale);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      music: '#E91E63',
      food: '#FF9800',
      sports: '#4CAF50',
      art: '#9C27B0',
      nightlife: '#673AB7',
      culture: '#3F51B5',
      outdoor: '#00BCD4',
      shopping: '#F44336',
      wellness: '#8BC34A',
      tech: '#2196F3',
      education: '#795548',
      community: '#607D8B',
      dating: '#E91E63',
      party: '#FF5722',
      other: '#9E9E9E',
    };
    return colors[category] || '#9E9E9E';
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: t('hotspots.stats.total'), value: stats.total, icon: <PlaceIcon />, color: '#2196F3', bg: 'rgba(33, 150, 243, 0.1)' },
          { label: t('hotspots.stats.active'), value: stats.active, icon: <CheckCircleIcon />, color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' },
          { label: t('hotspots.stats.inactive'), value: stats.inactive, icon: <CancelIcon />, color: '#F44336', bg: 'rgba(244, 67, 54, 0.1)' },
          { label: t('hotspots.stats.events'), value: stats.events, icon: <EventIcon />, color: '#9C27B0', bg: 'rgba(156, 39, 176, 0.1)' },
          { label: t('hotspots.stats.places'), value: stats.places, icon: <LocationIcon />, color: '#00BCD4', bg: 'rgba(0, 188, 212, 0.1)' },
          { label: t('hotspots.stats.featured'), value: stats.featured, icon: <StarIcon />, color: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)' },
        ].map((stat, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Card sx={{
              height: '100%',
              borderRadius: 3,
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: stat.bg,
                    color: stat.color,
                    display: 'flex'
                  }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Paper sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            {t('hotspots.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchHotSpots}
            >
              {t('hotspots.actions.refresh')}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              {t('hotspots.actions.create')}
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('hotspots.filters.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('hotspots.filters.type')}</InputLabel>
              <Select
                value={filterType}
                label={t('hotspots.filters.type')}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
                <MenuItem value="event">{t('hotspots.stats.events')}</MenuItem>
                <MenuItem value="place">{t('hotspots.stats.places')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('hotspots.filters.category')}</InputLabel>
              <Select
                value={filterCategory}
                label={t('hotspots.filters.category')}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>{t(`hotspots.categories.${cat}`)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('hotspots.filters.status')}</InputLabel>
              <Select
                value={filterStatus}
                label={t('hotspots.filters.status')}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
                <MenuItem value="active">{t('hotspots.stats.active')}</MenuItem>
                <MenuItem value="inactive">{t('hotspots.stats.inactive')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('hotspots.filters.featured')}</InputLabel>
              <Select
                value={filterFeatured}
                label={t('hotspots.filters.featured')}
                onChange={(e) => setFilterFeatured(e.target.value as any)}
              >
                <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
                <MenuItem value="featured">{t('hotspots.stats.featured')}</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('hotspots.table.thumbnail')}</TableCell>
                <TableCell>{t('hotspots.table.title')}</TableCell>
                <TableCell>{t('hotspots.table.type')}</TableCell>
                <TableCell>{t('hotspots.table.category')}</TableCell>
                <TableCell>{t('hotspots.table.location')}</TableCell>
                <TableCell align="center">{t('hotspots.table.stats')}</TableCell>
                <TableCell align="center">{t('hotspots.table.rating')}</TableCell>
                <TableCell align="center">{t('hotspots.table.status')}</TableCell>
                <TableCell align="center">{t('hotspots.table.featured')}</TableCell>
                <TableCell>{t('hotspots.table.created')}</TableCell>
                <TableCell align="center">{t('hotspots.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredHotSpots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No HotSpots found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHotSpots
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((hotSpot) => (
                    <TableRow key={hotSpot.id} hover>
                      <TableCell>
                        <Avatar
                          src={hotSpot.thumbnail}
                          variant="rounded"
                          sx={{ width: 50, height: 50 }}
                        >
                          <ImageIcon />
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                          {hotSpot.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                          {hotSpot.description?.substring(0, 50)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={hotSpot.type === 'event' ? <EventIcon /> : <PlaceIcon />}
                          label={hotSpot.type === 'event' ? t('hotspots.stats.events') : t('hotspots.stats.places')}
                          size="small"
                          color={hotSpot.type === 'event' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t(`hotspots.categories.${hotSpot.category}`)}
                          size="small"
                          sx={{
                            backgroundColor: getCategoryColor(hotSpot.category),
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {hotSpot.location?.city || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`Interested: ${hotSpot.stats?.interested || 0} | Joined: ${hotSpot.stats?.joined || 0} | Checked In: ${hotSpot.stats?.checkedIn || 0}`}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <PeopleIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {hotSpot.stats?.joined || 0}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Rating value={hotSpot.stats?.rating || 0} precision={0.1} size="small" readOnly />
                          <Typography variant="caption">({hotSpot.stats?.reviewCount || 0})</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          size="small"
                          checked={hotSpot.isActive}
                          onChange={() => handleToggleActive(hotSpot)}
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleToggleFeatured(hotSpot)}
                          color={hotSpot.isFeatured ? 'warning' : 'default'}
                        >
                          {hotSpot.isFeatured ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDateString(hotSpot.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title={t('hotspots.actions.view')}>
                            <IconButton size="small" color="primary" onClick={() => handleOpenView(hotSpot)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('hotspots.actions.edit')}>
                            <IconButton size="small" color="info" onClick={() => handleOpenEdit(hotSpot)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('hotspots.actions.delete')}>
                            <IconButton size="small" color="error" onClick={() => handleOpenDelete(hotSpot)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredHotSpots.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? t('hotspots.dialog.editTitle') : t('hotspots.dialog.createTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('hotspots.dialog.basicInfo')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label={t('hotspots.form.title')}
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label={t('hotspots.form.description')}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                multiline
                rows={3}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>{t('hotspots.form.type')}</InputLabel>
                <Select
                  value={formData.type}
                  label={t('hotspots.form.type')}
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  <MenuItem value="event">{t('hotspots.stats.events')}</MenuItem>
                  <MenuItem value="place">{t('hotspots.stats.places')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>{t('hotspots.form.category')}</InputLabel>
                <Select
                  value={formData.category}
                  label={t('hotspots.form.category')}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>{t(`hotspots.categories.${cat}`)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Location Info */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('hotspots.dialog.locationInfo')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('hotspots.form.address')}
                value={formData.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label={t('hotspots.form.city')}
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('hotspots.form.district')}</InputLabel>
                    <Select
                      value={formData.district}
                      label={t('hotspots.form.district')}
                      onChange={(e) => handleFormChange('district', e.target.value)}
                    >
                      {HO_CHI_MINH_DISTRICTS.map(d => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label={t('hotspots.form.latitude')}
                    value={formData.latitude}
                    onChange={(e) => handleFormChange('latitude', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label={t('hotspots.form.longitude')}
                    value={formData.longitude}
                    onChange={(e) => handleFormChange('longitude', e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Media & Tags */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('hotspots.dialog.mediaInfo')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('hotspots.form.thumbnail')}
                value={formData.thumbnail}
                onChange={(e) => handleFormChange('thumbnail', e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label={t('hotspots.form.imageUrl')}
                value={formData.imageUrl}
                onChange={(e) => handleFormChange('imageUrl', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('hotspots.form.tags')}
                value={formData.tags}
                onChange={(e) => handleFormChange('tags', e.target.value)}
                size="small"
                placeholder="music, party, dance..."
              />
            </Grid>

            {/* Event Specific Info */}
            {formData.type === 'event' && (
              <>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {t('hotspots.dialog.eventInfo')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('hotspots.form.startDate')}
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label={t('hotspots.form.endDate')}
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('hotspots.form.organizer')}
                    value={formData.organizer}
                    onChange={(e) => handleFormChange('organizer', e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label={t('hotspots.form.price')}
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('hotspots.form.maxParticipants')}
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => handleFormChange('maxParticipants', e.target.value)}
                    size="small"
                  />
                </Grid>
              </>
            )}

            {/* Flags */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('hotspots.dialog.flags')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={3}>
                <FormControlLabel
                  control={<Switch checked={formData.isActive} onChange={(e) => handleFormChange('isActive', e.target.checked)} color="success" />}
                  label={t('hotspots.form.isActive')}
                />
                <FormControlLabel
                  control={<Switch checked={formData.isFeatured} onChange={(e) => handleFormChange('isFeatured', e.target.checked)} color="warning" />}
                  label={t('hotspots.form.isFeatured')}
                />
                <FormControlLabel
                  control={<Switch checked={formData.isNew} onChange={(e) => handleFormChange('isNew', e.target.checked)} color="info" />}
                  label={t('hotspots.form.isNew')}
                />
                <FormControlLabel
                  control={<Switch checked={formData.isPopular} onChange={(e) => handleFormChange('isPopular', e.target.checked)} color="error" />}
                  label={t('hotspots.form.isPopular')}
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>{t('hotspots.actions.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formData.title}>
            {t('hotspots.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">{t('hotspots.dialog.detailsTitle')}</Typography>
            <IconButton onClick={() => setOpenViewDialog(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedHotSpot && (
            <Box>
              <CardMedia
                component="img"
                height="200"
                image={selectedHotSpot.imageUrl || selectedHotSpot.thumbnail}
                alt={selectedHotSpot.title}
                sx={{ borderRadius: 2, mb: 2 }}
              />
              <Typography variant="h5" fontWeight="bold" gutterBottom>{selectedHotSpot.title}</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={t(`hotspots.categories.${selectedHotSpot.category}`)} size="small" sx={{ bgcolor: getCategoryColor(selectedHotSpot.category), color: 'white' }} />
                <Chip label={selectedHotSpot.type === 'event' ? t('hotspots.stats.events') : t('hotspots.stats.places')} size="small" variant="outlined" />
                {selectedHotSpot.isFeatured && <Chip label={t('hotspots.stats.featured')} size="small" color="warning" icon={<StarIcon />} />}
              </Stack>

              <Typography variant="body1" paragraph>{selectedHotSpot.description}</Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon color="action" />
                    <Typography variant="body2">{selectedHotSpot.location?.address}, {selectedHotSpot.location?.city}</Typography>
                  </Box>
                </Grid>
                {selectedHotSpot.type === 'event' && selectedHotSpot.eventInfo && (
                  <>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon color="action" />
                        <Typography variant="body2">{selectedHotSpot.eventInfo.startDate}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon color="action" />
                        <Typography variant="body2">{selectedHotSpot.eventInfo.currentParticipants} / {selectedHotSpot.eventInfo.maxParticipants}</Typography>
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Grid container spacing={2} textAlign="center">
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold">{selectedHotSpot.stats?.interested || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('hotspots.stats.interested')}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold">{selectedHotSpot.stats?.joined || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('hotspots.stats.joined')}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" fontWeight="bold">{selectedHotSpot.stats?.checkedIn || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('hotspots.stats.checkedIn')}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>{t('hotspots.dialog.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>{t('hotspots.dialog.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('hotspots.dialog.deleteConfirm')}</Typography>
          {selectedHotSpot && (
            <Typography variant="body2" color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
              {selectedHotSpot.title}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>{t('hotspots.dialog.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('hotspots.actions.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
