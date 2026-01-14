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
  Alert,
  Snackbar,
  Tooltip,
  Avatar,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Favorite as FavoriteIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon,
  Event as EventIcon,
  Place as PlaceIcon,
  Badge as BadgeIcon,
  Mail as MailIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AvatarFrame from './common/AvatarFrame';

// Types
interface HotSpotInteraction {
  id: string;
  userId: string;
  hotSpotId: string;
  type: 'interested' | 'joined' | 'checked_in';
  timestamp: any;
  checkInLocation?: {
    latitude: number;
    longitude: number;
  };
  invitationData?: {
    message?: string;
    status: 'pending' | 'accepted' | 'declined';
  };
  // Additional data for display
  userName?: string;
  userAvatar?: string;
  userFrame?: string;
  hotSpotTitle?: string;
}

interface HotSpotInvitation {
  id: string;
  hotSpotId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  expiresAt: any;
  hotSpotTitle: string;
  fromUserName: string;
  fromUserAvatar?: string;
  fromUserFrame?: string;
}

interface EventPass {
  id: string;
  userId: string;
  hotSpotId: string;
  hotSpotTitle: string;
  hotSpotType: 'event' | 'place';
  hotSpotCategory: string;
  hotSpotThumbnail: string;
  badgeType: 'participant' | 'checked_in' | 'organizer' | 'vip';
  earnedAt: any;
  isVerified: boolean;
  verificationData: {
    checkInLocation?: {
      latitude: number;
      longitude: number;
    };
    photosSubmitted?: string[];
    verifiedBy?: string;
  };
  userName?: string;
  userAvatar?: string;
  userFrame?: string;
}

export default function HotSpotInteractionsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, any>>({});

  const fetchUserInfo = async (userId: string) => {
    if (userCache[userId]) return userCache[userId];
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { id: userId, ...userDoc.data() };
        setUserCache(prev => ({ ...prev, [userId]: userData }));
        return userData;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
    return null;
  };

  // Data states
  const [interactions, setInteractions] = useState<HotSpotInteraction[]>([]);
  const [invitations, setInvitations] = useState<HotSpotInvitation[]>([]);
  const [eventPasses, setEventPasses] = useState<EventPass[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'interested' | 'joined' | 'checked_in'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'expired'>('all');
  const [filterBadge, setFilterBadge] = useState<'all' | 'participant' | 'checked_in' | 'organizer' | 'vip'>('all');

  // Dialog states
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Stats
  const [stats, setStats] = useState({
    totalInteractions: 0,
    interested: 0,
    joined: 0,
    checkedIn: 0,
    pendingInvitations: 0,
    acceptedInvitations: 0,
    totalPasses: 0,
    verifiedPasses: 0,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch interactions
      const interactionsRef = collection(db, 'hotSpotInteractions');
      const interactionsSnap = await getDocs(interactionsRef);
      const interactionsData = interactionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as HotSpotInteraction[];

      // Enrich with user frames
      const uniqueUserIds = [...new Set(interactionsData.map(i => i.userId).filter(Boolean))];
      await Promise.all(uniqueUserIds.map(id => fetchUserInfo(id)));

      const enrichedInteractions = interactionsData.map(item => ({
        ...item,
        userFrame: userCache[item.userId]?.activeFrame
      }));
      setInteractions(enrichedInteractions);

      // Fetch invitations
      const invitationsRef = collection(db, 'hotSpotInvitations');
      const invitationsSnap = await getDocs(invitationsRef);
      const invitationsData = invitationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as HotSpotInvitation[];

      // Enrich with user frames
      const uniqueFromUserIds = [...new Set(invitationsData.map(i => i.fromUserId).filter(Boolean))];
      await Promise.all(uniqueFromUserIds.map(id => fetchUserInfo(id)));

      const enrichedInvitations = invitationsData.map(item => ({
        ...item,
        fromUserFrame: userCache[item.fromUserId]?.activeFrame
      }));
      setInvitations(enrichedInvitations);

      // Fetch event passes
      const passesRef = collection(db, 'eventPasses');
      const passesSnap = await getDocs(passesRef);
      const passesData = passesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EventPass[];

      // Enrich with user frames
      const uniquePassUserIds = [...new Set(passesData.map(i => i.userId).filter(Boolean))];
      await Promise.all(uniquePassUserIds.map(id => fetchUserInfo(id)));

      const enrichedPasses = passesData.map(item => ({
        ...item,
        userFrame: userCache[item.userId]?.activeFrame
      }));
      setEventPasses(enrichedPasses);

      // Calculate stats
      setStats({
        totalInteractions: interactionsData.length,
        interested: interactionsData.filter(i => i.type === 'interested').length,
        joined: interactionsData.filter(i => i.type === 'joined').length,
        checkedIn: interactionsData.filter(i => i.type === 'checked_in').length,
        pendingInvitations: invitationsData.filter(i => i.status === 'pending').length,
        acceptedInvitations: invitationsData.filter(i => i.status === 'accepted').length,
        totalPasses: passesData.length,
        verifiedPasses: passesData.filter(p => p.isVerified).length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleString('vi-VN');
    }
    return new Date(date).toLocaleString('vi-VN');
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      let collectionName = '';
      switch (tabValue) {
        case 0:
          collectionName = 'hotSpotInteractions';
          break;
        case 1:
          collectionName = 'hotSpotInvitations';
          break;
        case 2:
          collectionName = 'eventPasses';
          break;
      }

      await deleteDoc(doc(db, collectionName, selectedItem.id));
      showSnackbar('Deleted successfully', 'success');
      setOpenDeleteDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar('Error deleting', 'error');
    }
  };

  const handleUpdateInvitationStatus = async (invitation: HotSpotInvitation, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'hotSpotInvitations', invitation.id), {
        status: newStatus,
      });
      showSnackbar(`Invitation ${newStatus}`, 'success');
      fetchData();
    } catch (error) {
      console.error('Error updating invitation:', error);
      showSnackbar('Error updating invitation', 'error');
    }
  };

  const handleVerifyPass = async (pass: EventPass) => {
    try {
      await updateDoc(doc(db, 'eventPasses', pass.id), {
        isVerified: !pass.isVerified,
        'verificationData.verifiedBy': pass.isVerified ? null : 'admin',
      });
      showSnackbar(`Pass ${pass.isVerified ? 'unverified' : 'verified'}`, 'success');
      fetchData();
    } catch (error) {
      console.error('Error verifying pass:', error);
      showSnackbar('Error verifying pass', 'error');
    }
  };

  // Filter functions
  const filteredInteractions = interactions.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.userId?.toLowerCase().includes(query) &&
        !item.hotSpotId?.toLowerCase().includes(query) &&
        !item.userName?.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  const filteredInvitations = invitations.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.fromUserId?.toLowerCase().includes(query) &&
        !item.toUserId?.toLowerCase().includes(query) &&
        !item.hotSpotTitle?.toLowerCase().includes(query) &&
        !item.fromUserName?.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  const filteredPasses = eventPasses.filter(item => {
    if (filterBadge !== 'all' && item.badgeType !== filterBadge) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.userId?.toLowerCase().includes(query) &&
        !item.hotSpotTitle?.toLowerCase().includes(query) &&
        !item.userName?.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'interested':
        return <FavoriteIcon color="error" />;
      case 'joined':
        return <GroupIcon color="primary" />;
      case 'checked_in':
        return <LocationIcon color="success" />;
      default:
        return <FavoriteIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'success';
      case 'declined':
        return 'error';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'participant':
        return 'primary';
      case 'checked_in':
        return 'success';
      case 'organizer':
        return 'secondary';
      case 'vip':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="primary">{stats.totalInteractions}</Typography>
              <Typography variant="caption" color="text.secondary">Interactions</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="error.main">{stats.interested}</Typography>
              <Typography variant="caption" color="text.secondary">Interested</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="info.main">{stats.joined}</Typography>
              <Typography variant="caption" color="text.secondary">Joined</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="success.main">{stats.checkedIn}</Typography>
              <Typography variant="caption" color="text.secondary">Checked In</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="warning.main">{stats.pendingInvitations}</Typography>
              <Typography variant="caption" color="text.secondary">Pending Invites</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="secondary.main">{stats.totalPasses}</Typography>
              <Typography variant="caption" color="text.secondary">Event Passes</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" color="success.main">{stats.verifiedPasses}</Typography>
              <Typography variant="caption" color="text.secondary">Verified</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            HotSpot Activity
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(e, v) => { setTabValue(v); setPage(0); }} sx={{ mb: 2 }}>
          <Tab label={`Interactions (${interactions.length})`} />
          <Tab label={`Invitations (${invitations.length})`} />
          <Tab label={`Event Passes (${eventPasses.length})`} />
        </Tabs>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by user, hotspot..."
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
          {tabValue === 0 && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value as any)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="interested">Interested</MenuItem>
                  <MenuItem value="joined">Joined</MenuItem>
                  <MenuItem value="checked_in">Checked In</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          {tabValue === 1 && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="declined">Declined</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          {tabValue === 2 && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Badge Type</InputLabel>
                <Select
                  value={filterBadge}
                  label="Badge Type"
                  onChange={(e) => setFilterBadge(e.target.value as any)}
                >
                  <MenuItem value="all">All Badges</MenuItem>
                  <MenuItem value="participant">Participant</MenuItem>
                  <MenuItem value="checked_in">Checked In</MenuItem>
                  <MenuItem value="organizer">Organizer</MenuItem>
                  <MenuItem value="vip">VIP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Interactions Tab */}
        {tabValue === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>HotSpot</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInteractions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No interactions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInteractions
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AvatarFrame
                              avatarUrl={item.userAvatar || ''}
                              frameType={item.userFrame}
                              size={32}
                              username={item.userName}
                            />
                            <Box ml={1}>
                              <Typography variant="body2">{item.userName || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.userId?.substring(0, 10)}...
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {item.hotSpotTitle || item.hotSpotId?.substring(0, 10) + '...'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getInteractionIcon(item.type)}
                            label={item.type?.replace('_', ' ')}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
                        </TableCell>
                        <TableCell>
                          {item.checkInLocation ? (
                            <Tooltip title={`${item.checkInLocation.latitude}, ${item.checkInLocation.longitude}`}>
                              <Chip icon={<LocationIcon />} label="Has location" size="small" />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedItem(item);
                                setOpenDeleteDialog(true);
                              }}
                            >
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
        )}

        {/* Invitations Tab */}
        {tabValue === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>HotSpot</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No invitations found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvitations
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AvatarFrame
                              avatarUrl={item.fromUserAvatar || ''}
                              frameType={item.fromUserFrame}
                              size={32}
                              username={item.fromUserName}
                            />
                            <Typography variant="body2" ml={1}>{item.fromUserName || 'Unknown'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{item.toUserId?.substring(0, 10)}...</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                            {item.hotSpotTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={item.message}>
                            <Typography variant="caption" noWrap sx={{ maxWidth: 100, display: 'block' }}>
                              {item.message || 'No message'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.status}
                            size="small"
                            color={getStatusColor(item.status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(item.createdAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(item.expiresAt)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {item.status === 'pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleUpdateInvitationStatus(item, 'accepted')}
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Decline">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleUpdateInvitationStatus(item, 'declined')}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedItem(item);
                                setOpenDeleteDialog(true);
                              }}
                            >
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
        )}

        {/* Event Passes Tab */}
        {tabValue === 2 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>HotSpot</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Badge</TableCell>
                  <TableCell>Earned At</TableCell>
                  <TableCell align="center">Verified</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No event passes found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPasses
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AvatarFrame
                              avatarUrl={item.userAvatar || ''}
                              frameType={item.userFrame}
                              size={32}
                              username={item.userName}
                            />
                            <Box ml={1}>
                              <Typography variant="body2">{item.userName || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.userId?.substring(0, 10)}...
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar src={item.hotSpotThumbnail} variant="rounded" sx={{ width: 40, height: 40 }} />
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                              {item.hotSpotTitle}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={item.hotSpotType === 'event' ? <EventIcon /> : <PlaceIcon />}
                            label={item.hotSpotType}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{item.hotSpotCategory}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<BadgeIcon />}
                            label={item.badgeType?.replace('_', ' ')}
                            size="small"
                            color={getBadgeColor(item.badgeType) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(item.earnedAt)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={item.isVerified ? <CheckCircleIcon /> : <CancelIcon />}
                            label={item.isVerified ? 'Verified' : 'Not Verified'}
                            size="small"
                            color={item.isVerified ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={item.isVerified ? 'Unverify' : 'Verify'}>
                            <IconButton
                              size="small"
                              color={item.isVerified ? 'warning' : 'success'}
                              onClick={() => handleVerifyPass(item)}
                            >
                              {item.isVerified ? <CancelIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedItem(item);
                                setOpenDeleteDialog(true);
                              }}
                            >
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
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={
            tabValue === 0 ? filteredInteractions.length :
              tabValue === 1 ? filteredInvitations.length :
                filteredPasses.length
          }
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this item? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
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
