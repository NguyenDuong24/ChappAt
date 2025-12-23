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
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

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

  // Tab state
  const [tabValue, setTabValue] = useState(0);

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
      const hotSpotsRef = collection(db, 'hotSpots');
      const snapshot = await getDocs(hotSpotsRef);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as HotSpot[];

      setHotSpots(data);

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
      showSnackbar('Error fetching hot spots', 'error');
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
        images: formData.images,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        isNew: formData.isNew,
        isPopular: formData.isPopular,
        updatedAt: Timestamp.now(),
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
        const docRef = doc(db, 'hotSpots', selectedHotSpot.id);
        await updateDoc(docRef, hotSpotData);
        showSnackbar('HotSpot updated successfully', 'success');
      } else {
        // Create new
        hotSpotData.createdAt = Timestamp.now();
        hotSpotData.createdBy = 'admin';
        hotSpotData.stats = {
          interested: 0,
          joined: 0,
          checkedIn: 0,
          rating: 0,
          reviewCount: 0,
        };
        await addDoc(collection(db, 'hotSpots'), hotSpotData);
        showSnackbar('HotSpot created successfully', 'success');
      }

      setOpenDialog(false);
      fetchHotSpots();
    } catch (error) {
      console.error('Error saving hot spot:', error);
      showSnackbar('Error saving hot spot', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedHotSpot) return;

    try {
      await deleteDoc(doc(db, 'hotSpots', selectedHotSpot.id));
      showSnackbar('HotSpot deleted successfully', 'success');
      setOpenDeleteDialog(false);
      fetchHotSpots();
    } catch (error) {
      console.error('Error deleting hot spot:', error);
      showSnackbar('Error deleting hot spot', 'error');
    }
  };

  const handleToggleActive = async (hotSpot: HotSpot) => {
    try {
      const docRef = doc(db, 'hotSpots', hotSpot.id);
      await updateDoc(docRef, {
        isActive: !hotSpot.isActive,
        updatedAt: Timestamp.now(),
      });
      showSnackbar(`HotSpot ${hotSpot.isActive ? 'deactivated' : 'activated'} successfully`, 'success');
      fetchHotSpots();
    } catch (error) {
      console.error('Error toggling active status:', error);
      showSnackbar('Error updating status', 'error');
    }
  };

  const handleToggleFeatured = async (hotSpot: HotSpot) => {
    try {
      const docRef = doc(db, 'hotSpots', hotSpot.id);
      await updateDoc(docRef, {
        isFeatured: !hotSpot.isFeatured,
        updatedAt: Timestamp.now(),
      });
      showSnackbar(`HotSpot ${hotSpot.isFeatured ? 'unfeatured' : 'featured'} successfully`, 'success');
      fetchHotSpots();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      showSnackbar('Error updating featured status', 'error');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString('vi-VN');
    }
    return new Date(date).toLocaleDateString('vi-VN');
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
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total HotSpots</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
              <Typography variant="body2" color="text.secondary">Active</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">{stats.inactive}</Typography>
              <Typography variant="body2" color="text.secondary">Inactive</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main">{stats.events}</Typography>
              <Typography variant="body2" color="text.secondary">Events</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="secondary.main">{stats.places}</Typography>
              <Typography variant="body2" color="text.secondary">Places</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">{stats.featured}</Typography>
              <Typography variant="body2" color="text.secondary">Featured</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            HotSpots Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchHotSpots}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Create HotSpot
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by title, description, city..."
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
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="event">Events</MenuItem>
                <MenuItem value="place">Places</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                label="Category"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Featured</InputLabel>
              <Select
                value={filterFeatured}
                label="Featured"
                onChange={(e) => setFilterFeatured(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="featured">Featured</MenuItem>
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
                <TableCell>Thumbnail</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="center">Stats</TableCell>
                <TableCell align="center">Rating</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Featured</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
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
                          label={hotSpot.type}
                          size="small"
                          color={hotSpot.type === 'event' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={hotSpot.category}
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
                          {formatDate(hotSpot.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => handleOpenView(hotSpot)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEdit(hotSpot)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleOpenDelete(hotSpot)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
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
          {isEditing ? 'Edit HotSpot' : 'Create New HotSpot'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  <MenuItem value="event">Event</MenuItem>
                  <MenuItem value="place">Place</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">Location</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => handleFormChange('city', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>District</InputLabel>
                <Select
                  value={formData.district}
                  label="District"
                  onChange={(e) => handleFormChange('district', e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select District</em>
                  </MenuItem>
                  {HO_CHI_MINH_DISTRICTS.map(district => (
                    <MenuItem key={district} value={district}>
                      {district}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={formData.latitude}
                onChange={(e) => handleFormChange('latitude', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={formData.longitude}
                onChange={(e) => handleFormChange('longitude', e.target.value)}
              />
            </Grid>

            {formData.type === 'event' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="caption" color="text.secondary">Event Details</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Organizer"
                    value={formData.organizer}
                    onChange={(e) => handleFormChange('organizer', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Price (VND)"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Max Participants"
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => handleFormChange('maxParticipants', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">Media & Tags</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thumbnail URL"
                value={formData.thumbnail}
                onChange={(e) => handleFormChange('thumbnail', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Image URL"
                value={formData.imageUrl}
                onChange={(e) => handleFormChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) => handleFormChange('tags', e.target.value)}
                placeholder="music, concert, live"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">Settings</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isFeatured}
                    onChange={(e) => handleFormChange('isFeatured', e.target.checked)}
                  />
                }
                label="Featured"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isNew}
                    onChange={(e) => handleFormChange('isNew', e.target.checked)}
                  />
                }
                label="New"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPopular}
                    onChange={(e) => handleFormChange('isPopular', e.target.checked)}
                  />
                }
                label="Popular"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          HotSpot Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedHotSpot && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                {selectedHotSpot.thumbnail ? (
                  <CardMedia
                    component="img"
                    image={selectedHotSpot.thumbnail}
                    alt={selectedHotSpot.title}
                    sx={{ borderRadius: 2, height: 200, objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      borderRadius: 2,
                      backgroundColor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="h5" gutterBottom>{selectedHotSpot.title}</Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    icon={selectedHotSpot.type === 'event' ? <EventIcon /> : <PlaceIcon />}
                    label={selectedHotSpot.type}
                    color={selectedHotSpot.type === 'event' ? 'primary' : 'secondary'}
                  />
                  <Chip
                    label={selectedHotSpot.category}
                    sx={{ backgroundColor: getCategoryColor(selectedHotSpot.category), color: 'white' }}
                  />
                  {selectedHotSpot.isActive && <Chip label="Active" color="success" size="small" />}
                  {selectedHotSpot.isFeatured && <Chip icon={<StarIcon />} label="Featured" color="warning" size="small" />}
                  {selectedHotSpot.isNew && <Chip label="New" color="info" size="small" icon={<NewIcon />} />}
                  {selectedHotSpot.isPopular && <Chip label="Popular" color="secondary" size="small" icon={<PopularIcon />} />}
                </Stack>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedHotSpot.description}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Location</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <LocationIcon color="action" />
                  <Box>
                    <Typography variant="body2">{selectedHotSpot.location?.address}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedHotSpot.location?.district}, {selectedHotSpot.location?.city}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Lat: {selectedHotSpot.location?.coordinates?.latitude}, Long: {selectedHotSpot.location?.coordinates?.longitude}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Statistics</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="h6">{selectedHotSpot.stats?.interested || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Interested</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6">{selectedHotSpot.stats?.joined || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Joined</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6">{selectedHotSpot.stats?.checkedIn || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Checked In</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Rating value={selectedHotSpot.stats?.rating || 0} precision={0.1} readOnly />
                  <Typography variant="body2">({selectedHotSpot.stats?.reviewCount || 0} reviews)</Typography>
                </Box>
              </Grid>

              {selectedHotSpot.type === 'event' && selectedHotSpot.eventInfo && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>Event Details</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">Organizer</Typography>
                    <Typography variant="body2">{selectedHotSpot.eventInfo.organizer || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">Price</Typography>
                    <Typography variant="body2">
                      {selectedHotSpot.eventInfo.price ? `${selectedHotSpot.eventInfo.price.toLocaleString()} VND` : 'Free'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">Start Date</Typography>
                    <Typography variant="body2">{selectedHotSpot.eventInfo.startDate || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">End Date</Typography>
                    <Typography variant="body2">{selectedHotSpot.eventInfo.endDate || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Participants</Typography>
                    <Typography variant="body2">
                      {selectedHotSpot.eventInfo.currentParticipants || 0} / {selectedHotSpot.eventInfo.maxParticipants || '∞'}
                    </Typography>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>Tags</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedHotSpot.tags?.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Created: {formatDate(selectedHotSpot.createdAt)} | Updated: {formatDate(selectedHotSpot.updatedAt)} | ID: {selectedHotSpot.id}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              setOpenViewDialog(false);
              handleOpenEdit(selectedHotSpot!);
            }}
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete HotSpot</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedHotSpot?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
