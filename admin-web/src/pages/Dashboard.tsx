import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Flag as FlagIcon,
    Report as ReportIcon,
    People as PeopleIcon,
    BarChart as BarChartIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Chat as ChatIcon,
    LocalFireDepartment as HotSpotsIcon,
    Favorite as ActivityIcon,
    AccountBalance as WalletIcon,
    Store as StoreIcon,
    CardGiftcard,
    Face as FaceIcon
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

import OverviewPage from '../components/OverviewPage';
import FlaggedContentPage from '../components/FlaggedContentPage';
import ReportsPage from '../components/ReportsPage';
import UsersPage from '../components/UsersPage';
import ChatInspectorPage from '../components/ChatInspectorPage';
import HotSpotsPage from '../components/HotSpotsPage';
import HotSpotInteractionsPage from '../components/HotSpotInteractionsPage';
import WalletOverviewPage from '../components/WalletOverviewPage';
import AdSettingsPage from './AdSettingsPage';
import ShopPage from './ShopPage';
import GiftPage from './GiftPage';
import IconManagementPage from './IconManagementPage';

const drawerWidth = 240;

const menuItems = [
    { text: 'Overview', icon: <DashboardIcon />, path: '/dashboard' },
    { text: '💰 Wallet', icon: <WalletIcon />, path: '/dashboard/wallet' },
    { text: '🛍️ Shop', icon: <StoreIcon />, path: '/dashboard/shop' },
    { text: '🎁 Gifts', icon: <CardGiftcard />, path: '/dashboard/gifts' },
    { text: '👤 Icons', icon: <FaceIcon />, path: '/dashboard/icons' },
    { text: '📺 Ad Settings', icon: <SettingsIcon />, path: '/dashboard/ads' },
    { text: 'HotSpots', icon: <HotSpotsIcon />, path: '/dashboard/hotspots' },
    { text: 'HotSpot Activity', icon: <ActivityIcon />, path: '/dashboard/hotspots-activity' },
    { text: 'Flagged Content', icon: <FlagIcon />, path: '/dashboard/flagged' },
    { text: 'User Reports', icon: <ReportIcon />, path: '/dashboard/reports' },
    { text: 'Users', icon: <PeopleIcon />, path: '/dashboard/users' },
    { text: 'Chat Inspector', icon: <ChatIcon />, path: '/dashboard/chat-inspector' },
    { text: 'Statistics', icon: <BarChartIcon />, path: '/dashboard/stats' },
];

export default function Dashboard() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const drawer = (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Admin Panel
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </ListItem>
            </List>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        ChappAt Admin Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        {auth.currentUser?.email}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    minHeight: '100vh',
                    backgroundColor: '#f5f5f5',
                }}
            >
                <Toolbar />
                <Routes>
                    <Route path="/" element={<OverviewPage />} />
                    <Route path="/wallet" element={<WalletOverviewPage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/gifts" element={<GiftPage />} />
                    <Route path="/icons" element={<IconManagementPage />} />
                    <Route path="/ads" element={<AdSettingsPage />} />
                    <Route path="/flagged" element={<FlaggedContentPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/chat-inspector" element={<ChatInspectorPage />} />
                    <Route path="/stats" element={<div>Statistics Page (Coming Soon)</div>} />
                    <Route path="/hotspots" element={<HotSpotsPage />} />
                    <Route path="/hotspots-activity" element={<HotSpotInteractionsPage />} />
                </Routes>
            </Box>
        </Box>
    );
}
