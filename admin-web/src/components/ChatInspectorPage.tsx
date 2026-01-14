import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    CircularProgress,
    IconButton,
    Chip,
    Card,
    CardContent,
    Stack,
    Alert,
    Grid,
    Badge,
} from '@mui/material';
import {
    Search as SearchIcon,
    Send as SendIcon,
    Image as ImageIcon,
    Refresh as RefreshIcon,
    ChatBubble as ChatBubbleIcon,
    Person as PersonIcon,
    Group as GroupIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import AvatarFrame from './common/AvatarFrame';

interface Message {
    id: string;
    text?: string;
    userId?: string;
    uid?: string;
    createdAt: any;
    imageUrl?: string;
    senderName?: string;
    profileUrl?: string;
    user?: {
        displayName?: string;
        photoURL?: string;
    };
}

interface RoomInfo {
    id: string;
    name?: string;
    type?: string;
    members?: string[];
    participants?: string[];
    createdAt?: any;
    description?: string;
    roomId?: string;
    lastMessage?: any;
}

export default function ChatInspectorPage() {
    const [roomId, setRoomId] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
    const [error, setError] = useState('');
    const [searchMessage, setSearchMessage] = useState('');
    const [collectionType, setCollectionType] = useState<'rooms' | 'groups' | null>(null);
    const [userCache, setUserCache] = useState<Record<string, any>>({});

    // Fetch user info and cache it
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

    const handleSearch = async () => {
        if (!roomId.trim()) return;

        setLoading(true);
        setError('');
        setMessages([]);
        setRoomInfo(null);
        setCollectionType(null);

        try {
            // Try 'rooms' collection first (private chats)
            let roomDoc = await getDoc(doc(db, 'rooms', roomId));
            let roomType: 'rooms' | 'groups' = 'rooms';

            if (!roomDoc.exists()) {
                // Try 'groups' collection
                roomDoc = await getDoc(doc(db, 'groups', roomId));
                roomType = 'groups';
            }

            if (roomDoc.exists()) {
                const data = roomDoc.data();
                setRoomInfo({ id: roomDoc.id, ...data } as RoomInfo);
                setCollectionType(roomType);

                // Fetch messages from the found collection
                const messagesRef = collection(db, roomType, roomId, 'messages');
                const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(100));

                const unsubscribe = onSnapshot(q, async (snapshot) => {
                    const msgs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Message[];

                    // Fetch user info for each unique userId
                    const uniqueUserIds = [...new Set(msgs.map(m => m.uid || m.userId).filter(Boolean))];
                    await Promise.all(uniqueUserIds.map(id => fetchUserInfo(id as string)));

                    // Sort ascending (oldest first, newest last)
                    msgs.sort((a, b) => {
                        const aTime = a.createdAt?.seconds || 0;
                        const bTime = b.createdAt?.seconds || 0;
                        return aTime - bTime;
                    });

                    setMessages(msgs);
                    setLoading(false);
                }, (err) => {
                    console.error("Error fetching messages:", err);
                    setError('Failed to load messages. Check permissions.');
                    setLoading(false);
                });

                return () => unsubscribe();
            } else {
                setError('Room not found. Please check the ID.');
                setLoading(false);
            }

        } catch (err) {
            console.error("Error searching room:", err);
            setError('An error occurred while searching.');
            setLoading(false);
        }
    };

    const filteredMessages = messages.filter(msg => {
        const searchLower = searchMessage.toLowerCase();
        return (
            msg.text?.toLowerCase().includes(searchLower) ||
            msg.senderName?.toLowerCase().includes(searchLower) ||
            msg.uid?.includes(searchMessage) ||
            msg.userId?.includes(searchMessage)
        );
    });

    const renderMessage = (msg: Message) => {
        const userId = msg.uid || msg.userId;
        const user = userId ? userCache[userId] : null;
        const displayName = msg.senderName || user?.displayName || user?.username || 'Unknown';
        const avatarUrl = msg.profileUrl || user?.profileUrl || user?.photoURL || '';

        return (
            <ListItem
                key={msg.id}
                alignItems="flex-start"
                sx={{
                    mb: 2,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    backgroundColor: '#fff',
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                    p: 2,
                }}
            >
                <Box display="flex" alignItems="center" width="100%" mb={1}>
                    <AvatarFrame
                        avatarUrl={avatarUrl}
                        frameType={user?.activeFrame}
                        size={40}
                        username={displayName}
                    />
                    <Box flex={1} ml={1.5}>
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                            {displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'PPp') : 'Unknown time'}
                        </Typography>
                    </Box>
                    {userId && (
                        <Chip
                            label={`ID: ${userId.slice(0, 8)}...`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                        />
                    )}
                </Box>

                {msg.text && (
                    <Typography
                        variant="body1"
                        sx={{
                            whiteSpace: 'pre-wrap',
                            ml: 6,
                            backgroundColor: '#f5f5f5',
                            p: 1.5,
                            borderRadius: 2,
                            width: 'fit-content',
                            maxWidth: '80%',
                        }}
                    >
                        {msg.text}
                    </Typography>
                )}

                {msg.imageUrl && (
                    <Box mt={1} ml={6}>
                        <img
                            src={msg.imageUrl}
                            alt="Attachment"
                            style={{
                                maxWidth: '300px',
                                maxHeight: 300,
                                borderRadius: 8,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                    </Box>
                )}

                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, ml: 6, fontSize: '0.7rem' }}>
                    Message ID: {msg.id}
                </Typography>
            </ListItem>
        );
    };

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Chat Inspector
            </Typography>

            {/* Search Bar */}
            <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    fullWidth
                    label="Enter Room ID / Group ID"
                    variant="outlined"
                    value={roomId}
                    onChange={(e: any) => setRoomId(e.target.value)}
                    onKeyPress={(e: any) => e.key === 'Enter' && handleSearch()}
                    placeholder="Paste Room ID or Group ID here..."
                />
                <Button
                    variant="contained"
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                    onClick={handleSearch}
                    disabled={loading || !roomId}
                    sx={{ minWidth: 120 }}
                >
                    Inspect
                </Button>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}

            <Box sx={{ display: 'flex', gap: 3, flex: 1, overflow: 'hidden' }}>
                {/* Room Info Sidebar */}
                <Paper elevation={3} sx={{ width: 300, p: 2, overflowY: 'auto' }}>
                    <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                        {collectionType === 'rooms' ? <PersonIcon /> : <GroupIcon />}
                        Room Details
                    </Typography>
                    {roomInfo ? (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Collection Type</Typography>
                                <Chip
                                    label={collectionType === 'rooms' ? 'Private Chat (rooms)' : 'Group Chat (groups)'}
                                    color={collectionType === 'rooms' ? 'primary' : 'secondary'}
                                    size="small"
                                    sx={{ mt: 0.5 }}
                                />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Room ID</Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace',
                                        backgroundColor: '#f5f5f5',
                                        p: 1,
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    {roomInfo.id}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Name</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {roomInfo.name || 'Unnamed Chat'}
                                </Typography>
                            </Box>
                            {collectionType === 'groups' && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Members</Typography>
                                    <Badge badgeContent={roomInfo.members?.length || 0} color="primary">
                                        <GroupIcon color="action" />
                                    </Badge>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        {roomInfo.members?.length || 0} participants
                                    </Typography>
                                </Box>
                            )}
                            {collectionType === 'rooms' && roomInfo.participants && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Participants</Typography>
                                    <Stack spacing={1} sx={{ mt: 1 }}>
                                        {roomInfo.participants.map((pid: string, idx: number) => {
                                            const pUser = userCache[pid];
                                            return (
                                                <Box key={idx} display="flex" alignItems="center" gap={1}>
                                                    <AvatarFrame
                                                        avatarUrl={pUser?.profileUrl || ''}
                                                        frameType={pUser?.activeFrame}
                                                        size={24}
                                                        username={pUser?.displayName || pUser?.username}
                                                    />
                                                    <Typography variant="caption">
                                                        {pUser?.displayName || pUser?.username || pid.slice(0, 8)}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            )}
                            {roomInfo.description && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Description</Typography>
                                    <Typography variant="body2">{roomInfo.description}</Typography>
                                </Box>
                            )}
                            {roomInfo.lastMessage && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Last Message</Typography>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                        {roomInfo.lastMessage.text || '📷 Image'}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                            Enter a Room ID or Group ID to see details.
                        </Typography>
                    )}
                </Paper>

                {/* Messages Area */}
                <Paper elevation={3} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Message Search Header */}
                    <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ChatBubbleIcon color="primary" />
                        <Typography variant="h6">Messages ({messages.length})</Typography>
                        <TextField
                            size="small"
                            placeholder="Filter messages..."
                            value={searchMessage}
                            onChange={(e: any) => setSearchMessage(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} />
                            }}
                            sx={{ flex: 1 }}
                        />
                    </Box>

                    {/* Messages List */}
                    <List sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#fafafa' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <CircularProgress />
                                <Typography sx={{ mt: 2 }}>Loading messages...</Typography>
                            </Box>
                        ) : filteredMessages.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                                <ChatBubbleIcon fontSize="large" />
                                <Typography>No messages found</Typography>
                            </Box>
                        ) : (
                            filteredMessages.map(renderMessage)
                        )}
                    </List>
                </Paper>
            </Box>
        </Box>
    );
}
