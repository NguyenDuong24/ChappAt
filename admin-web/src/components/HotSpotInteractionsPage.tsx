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
  FilterList as FilterIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import {
  getHotspotInteractions,
  getHotspotInvitations,
  getEventPasses,
  deleteHotspotInteraction,
  deleteHotspotInvitation,
  deleteEventPass,
  updateInvitationStatus,
  verifyEventPass,
  getErrorMessage,
} from '../api/adminApi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AvatarFrame from './common/AvatarFrame';
import { useTranslation } from 'react-i18next';

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
  userName?: string;
  userAvatar?: string;
  userFrame?: string;
  hotSpotTitle?: string;
  hotSpotThumbnail?: string;
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
  hotSpotThumbnail?: string;
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
  verificationData?: {
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
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, any>>({});

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

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [interactionsData, invitationsData, passesData] = await Promise.all([
        getHotspotInteractions(),
        getHotspotInvitations(),
        getEventPasses()
      ]);

      const userIds = new Set<string>();
      interactionsData.forEach(i => i.userId && userIds.add(i.userId));
      invitationsData.forEach(i => i.fromUserId && userIds.add(i.fromUserId));
      passesData.forEach(i => i.userId && userIds.add(i.userId));

      const newUsers: Record<string, any> = { ...userCache };
      let hasNewUsers = false;

      await Promise.all([...userIds].map(async (id) => {
        if (!newUsers[id]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', id));
            if (userDoc.exists()) {
              newUsers[id] = { id, ...userDoc.data() };
              hasNewUsers = true;
            }
          } catch (err) {
            console.error(`Error fetching user ${id}:`, err);
          }
        }
      }));

      if (hasNewUsers) {
        setUserCache(newUsers);
      }

      const enrichedInteractions = interactionsData.map(item => ({
        ...item,
        userFrame: newUsers[item.userId]?.activeFrame,
        userName: newUsers[item.userId]?.displayName || newUsers[item.userId]?.username || item.userName
      }));

      const enrichedInvitations = invitationsData.map(item => ({
        ...item,
        fromUserFrame: newUsers[item.fromUserId]?.activeFrame,
        fromUserName: newUsers[item.fromUserId]?.displayName || newUsers[item.fromUserId]?.username || item.fromUserName
      }));

      const enrichedPasses = passesData.map(item => ({
        ...item,
        userFrame: newUsers[item.userId]?.activeFrame,
        userName: newUsers[item.userId]?.displayName || newUsers[item.userId]?.username || item.userName
      }));

      setInteractions(enrichedInteractions as any);
      setInvitations(enrichedInvitations as any);
      setEventPasses(enrichedPasses as any);

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
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [userCache]);

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    if (date.toDate) {
      return date.toDate().toLocaleString(locale);
    }
    return new Date(date).toLocaleString(locale);
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
      if (tabValue === 0) {
        await deleteHotspotInteraction(selectedItem.id);
      } else if (tabValue === 1) {
        await deleteHotspotInvitation(selectedItem.id);
      } else if (tabValue === 2) {
        await deleteEventPass(selectedItem.id);
      }
      showSnackbar(t('common.success'), 'success');
      setOpenDeleteDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleUpdateInvitationStatus = async (invitation: HotSpotInvitation, newStatus: string) => {
    try {
      await updateInvitationStatus(invitation.id, newStatus);
      showSnackbar(t('common.success'), 'success');
      fetchData();
    } catch (error) {
      console.error('Error updating invitation:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleVerifyPass = async (pass: EventPass) => {
    try {
      await verifyEventPass(pass.id, !pass.isVerified);
      showSnackbar(t('common.success'), 'success');
      fetchData();
    } catch (error) {
      console.error('Error verifying pass:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const filteredInteractions = interactions.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.userId?.toLowerCase().includes(query) ||
        item.hotSpotId?.toLowerCase().includes(query) ||
        item.userName?.toLowerCase().includes(query) ||
        item.hotSpotTitle?.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredInvitations = invitations.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.fromUserId?.toLowerCase().includes(query) ||
        item.toUserId?.toLowerCase().includes(query) ||
        item.hotSpotTitle?.toLowerCase().includes(query) ||
        item.fromUserName?.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredPasses = eventPasses.filter(item => {
    if (filterBadge !== 'all' && item.badgeType !== filterBadge) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.userId?.toLowerCase().includes(query) ||
        item.hotSpotTitle?.toLowerCase().includes(query) ||
        item.userName?.toLowerCase().includes(query);
    }
    return true;
  });

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'interested': return <FavoriteIcon color="error" />;
      case 'joined': return <GroupIcon color="primary" />;
      case 'checked_in': return <LocationIcon color="success" />;
      default: return <FavoriteIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'participant': return 'primary';
      case 'checked_in': return 'success';
      case 'organizer': return 'secondary';
      case 'vip': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: t('hotspots.stats.totalInteractions'), value: stats.totalInteractions, icon: <TrendingIcon />, color: '#2196F3', bg: 'rgba(33, 150, 243, 0.1)' },
          { label: t('hotspots.stats.interested'), value: stats.interested, icon: <FavoriteIcon />, color: '#E91E63', bg: 'rgba(233, 30, 99, 0.1)' },
          { label: t('hotspots.stats.joined'), value: stats.joined, icon: <GroupIcon />, color: '#9C27B0', bg: 'rgba(156, 39, 176, 0.1)' },
          { label: t('hotspots.stats.checkedIn'), value: stats.checkedIn, icon: <LocationIcon />, color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' },
          { label: t('hotspots.stats.pendingInvitations'), value: stats.pendingInvitations, icon: <MailIcon />, color: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)' },
          { label: t('hotspots.stats.totalPasses'), value: stats.totalPasses, icon: <BadgeIcon />, color: '#607D8B', bg: 'rgba(96, 125, 139, 0.1)' },
          { label: t('hotspots.stats.verifiedPasses'), value: stats.verifiedPasses, icon: <CheckCircleIcon />, color: '#009688', bg: 'rgba(0, 150, 136, 0.1)' },
        ].map((stat, index) => (
          <Grid item xs={6} sm={4} md={1.7} key={index}>
            <Card sx={{
              height: '100%',
              borderRadius: 3,
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: 2, backgroundColor: stat.bg, color: stat.color, display: 'flex' }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">{t('hotspots.activity')}</Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>{t('hotspots.actions.refresh')}</Button>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(e, v) => { setTabValue(v); setPage(0); }}
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 'bold', minWidth: 150, fontSize: '0.9rem' }
          }}
        >
          <Tab icon={<TrendingIcon />} iconPosition="start" label={`${t('hotspots.tabs.interactions')} (${interactions.length})`} />
          <Tab icon={<MailIcon />} iconPosition="start" label={`${t('hotspots.tabs.invitations')} (${invitations.length})`} />
          <Tab icon={<BadgeIcon />} iconPosition="start" label={`${t('hotspots.tabs.passes')} (${eventPasses.length})`} />
        </Tabs>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('hotspots.filters.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
          </Grid>
          {tabValue === 0 && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('hotspots.filters.type')}</InputLabel>
                <Select value={filterType} label={t('hotspots.filters.type')} onChange={(e) => setFilterType(e.target.value as any)}>
                  <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
                  <MenuItem value="interested">{t('hotspots.stats.interested')}</MenuItem>
                  <MenuItem value="joined">{t('hotspots.stats.joined')}</MenuItem>
                  <MenuItem value="checked_in">{t('hotspots.stats.checkedIn')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          {tabValue === 1 && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('hotspots.filters.status')}</InputLabel>
                <Select value={filterStatus} label={t('hotspots.filters.status')} onChange={(e) => setFilterStatus(e.target.value as any)}>
                  <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
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
                <InputLabel>{t('hotspots.filters.badgeType')}</InputLabel>
                <Select value={filterBadge} label={t('hotspots.filters.badgeType')} onChange={(e) => setFilterBadge(e.target.value as any)}>
                  <MenuItem value="all">{t('hotspots.filters.all')}</MenuItem>
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

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('hotspots.table.user')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('hotspots.table.hotspot')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{tabValue === 1 ? t('hotspots.table.status') : t('hotspots.table.type')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('hotspots.table.time')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{tabValue === 2 ? t('hotspots.table.verification') : t('hotspots.table.details')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('hotspots.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tabValue === 0 ? filteredInteractions : tabValue === 1 ? filteredInvitations : filteredPasses)
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item: any) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AvatarFrame
                          avatarUrl={item.userAvatar || item.fromUserAvatar || ''}
                          frameType={item.userFrame || item.fromUserFrame}
                          size={32}
                          username={item.userName || item.fromUserName}
                        />
                        <Box ml={1}>
                          <Typography variant="body2" fontWeight="medium">{item.userName || item.fromUserName || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">{(item.userId || item.fromUserId)?.substring(0, 8)}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar src={item.hotSpotThumbnail} variant="rounded" sx={{ width: 32, height: 32 }} />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{item.hotSpotTitle || 'N/A'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {tabValue === 1 ? (
                        <Chip label={item.status} size="small" color={getStatusColor(item.status) as any} />
                      ) : (
                        <Chip
                          icon={tabValue === 0 ? getInteractionIcon(item.type) : <BadgeIcon />}
                          label={(item.type || item.badgeType)?.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                          color={tabValue === 2 ? getBadgeColor(item.badgeType) as any : 'default'}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(item.timestamp || item.createdAt || item.earnedAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      {tabValue === 2 ? (
                        <Chip
                          icon={item.isVerified ? <CheckCircleIcon /> : <CancelIcon />}
                          label={item.isVerified ? t('hotspots.actions.verify') : t('hotspots.actions.unverify')}
                          size="small"
                          color={item.isVerified ? 'success' : 'default'}
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 100, display: 'block' }}>
                          {item.message || (item.checkInLocation ? 'Has Location' : 'N/A')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title={t('hotspots.actions.view')}>
                          <IconButton size="small" color="primary" onClick={() => { setSelectedItem(item); setOpenViewDialog(true); }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {tabValue === 1 && item.status === 'pending' && (
                          <>
                            <Tooltip title={t('hotspots.actions.accept')}>
                              <IconButton size="small" color="success" onClick={() => handleUpdateInvitationStatus(item, 'accepted')}><CheckIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title={t('hotspots.actions.decline')}>
                              <IconButton size="small" color="error" onClick={() => handleUpdateInvitationStatus(item, 'declined')}><CloseIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </>
                        )}
                        {tabValue === 2 && (
                          <Tooltip title={item.isVerified ? t('hotspots.actions.unverify') : t('hotspots.actions.verify')}>
                            <IconButton size="small" color={item.isVerified ? 'warning' : 'success'} onClick={() => handleVerifyPass(item)}>
                              {item.isVerified ? <CancelIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t('hotspots.actions.delete')}>
                          <IconButton size="small" color="error" onClick={() => { setSelectedItem(item); setOpenDeleteDialog(true); }}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={tabValue === 0 ? filteredInteractions.length : tabValue === 1 ? filteredInvitations.length : filteredPasses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">{t('hotspots.dialog.detailsTitle')}</Typography>
            <IconButton onClick={() => setOpenViewDialog(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Box sx={{ py: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('hotspots.table.user')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <AvatarFrame
                      avatarUrl={selectedItem.userAvatar || selectedItem.fromUserAvatar || ''}
                      frameType={selectedItem.userFrame || selectedItem.fromUserFrame}
                      size={50}
                      username={selectedItem.userName || selectedItem.fromUserName}
                    />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{selectedItem.userName || selectedItem.fromUserName || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">ID: {selectedItem.userId || selectedItem.fromUserId}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('hotspots.table.hotspot')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Avatar src={selectedItem.hotSpotThumbnail} variant="rounded" sx={{ width: 60, height: 60 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{selectedItem.hotSpotTitle || 'N/A'}</Typography>
                      <Typography variant="caption" color="text.secondary">ID: {selectedItem.hotSpotId}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">{t('hotspots.table.type')}</Typography>
                  <Typography variant="body1" fontWeight="medium">{(selectedItem.type || selectedItem.badgeType || 'Invitation').replace('_', ' ')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">{t('hotspots.table.time')}</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatDate(selectedItem.timestamp || selectedItem.createdAt || selectedItem.earnedAt)}</Typography>
                </Grid>
                {selectedItem.message && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Message</Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}><Typography variant="body2">{selectedItem.message}</Typography></Paper>
                  </Grid>
                )}
                {selectedItem.checkInLocation && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Check-in Location</Typography>
                    <Typography variant="body2">Lat: {selectedItem.checkInLocation.latitude}, Lng: {selectedItem.checkInLocation.longitude}</Typography>
                  </Grid>
                )}
                {selectedItem.verificationData?.photosSubmitted && selectedItem.verificationData.photosSubmitted.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Verification Photos</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {selectedItem.verificationData.photosSubmitted.map((photo: string, i: number) => (
                        <Avatar key={i} src={photo} variant="rounded" sx={{ width: 100, height: 100, cursor: 'pointer' }} onClick={() => window.open(photo, '_blank')} />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenViewDialog(false)}>{t('hotspots.dialog.close')}</Button></DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>{t('hotspots.dialog.deleteTitle')}</DialogTitle>
        <DialogContent><Typography>{t('hotspots.dialog.deleteConfirm')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>{t('hotspots.dialog.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">{t('hotspots.actions.delete')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
