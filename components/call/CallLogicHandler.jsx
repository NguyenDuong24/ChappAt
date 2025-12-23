import React, { useCallback, useRef } from 'react';
import { useAuth } from '../../context/authContext';
import { useSound } from '../../hooks/useSound';
import { useCallNavigation } from '../../hooks/useNewCallNavigation';
import { useFirebaseCallListener } from '../../hooks/useFirebaseCallListener';
import { CALL_STATUS } from '../../services/firebaseCallService';
import callTimeoutService from '../../services/callTimeoutService.js';

const CallLogicHandler = () => {
    const { user } = useAuth();
    const { playIncomingCallSound, stopCallSounds } = useSound();

    // Call navigation hooks
    const {
        navigateToListenCallScreen,
        navigateToIncomingCallScreen,
        navigateToCallScreen,
        navigateBack,
        currentScreen
    } = useCallNavigation();

    // Track processed calls to prevent re-navigation after call ends
    const processedCallsRef = useRef(new Set());

    // Xác định user role dựa trên callerId và receiverId
    const getUserRole = useCallback((callData) => {
        if (!user?.uid || !callData) return null;

        if (callData.callerId === user.uid) {
            return 'caller'; // Tôi là người GỌI
        } else if (callData.receiverId === user.uid) {
            return 'receiver'; // Tôi là người NHẬN
        }

        return null;
    }, [user?.uid]);

    // Handle incoming call và call status changes
    const handleCallUpdate = useCallback(async (callData) => {
        if (!callData || !user?.uid) {
            return;
        }

        const userRole = getUserRole(callData);

        // Check if this call has already been processed and ended
        const callKey = `${callData.id}`;
        const isCallScreen = currentScreen === 'CallScreen';
        const isIncomingScreen = currentScreen === 'IncomingCallScreen';
        const isListenScreen = currentScreen === 'ListenCallAcceptedScreen';
        const isOnCallRelatedScreen = isCallScreen || isIncomingScreen || isListenScreen;

        // Mark ended/cancelled/declined calls as processed
        if ([CALL_STATUS.DECLINED, CALL_STATUS.CANCELLED, CALL_STATUS.ENDED].includes(callData.status)) {
            processedCallsRef.current.add(callKey);
            // Clean up old entries to prevent memory leak
            if (processedCallsRef.current.size > 20) {
                const arr = Array.from(processedCallsRef.current);
                processedCallsRef.current = new Set(arr.slice(-10));
            }
        }

        // Skip RINGING calls that have already been processed (ended)
        if (callData.status === CALL_STATUS.RINGING && processedCallsRef.current.has(callKey)) {
            console.log('⏭️ Skipping already processed call:', callKey);
            return;
        }

        // Xử lý theo role và status
        if (userRole === 'receiver') {
            // TÔI LÀ NGƯỜI NHẬN CUỘC GỌI
            switch (callData.status) {
                case CALL_STATUS.RINGING:
                    if (!isIncomingScreen && !isCallScreen) {
                        // Có cuộc gọi đến → hiển thị IncomingCallScreen để accept/decline
                        navigateToIncomingCallScreen(callData);

                        // DỪNG TIMEOUT vì user đã thấy notification và vào màn hình
                        callTimeoutService.stopCallTimeout(callData.id);

                        // Chỉ phát âm thanh nếu app đang foreground
                        try {
                            await playIncomingCallSound();
                            console.log('🔔 Playing incoming call sound');
                        } catch (error) {
                            console.error('❌ Error playing call sound:', error);
                        }
                    }
                    break;

                case CALL_STATUS.ACCEPTED:
                    if (!isCallScreen) {
                        // DỪNG TIMEOUT ngay khi ACCEPTED
                        callTimeoutService.stopCallTimeout(callData.id);
                        console.log('⏰ Stopped timeout for accepted call (receiver):', callData.id);

                        // Tôi đã accept call → vào CallScreen
                        navigateToCallScreen(callData);
                    }
                    break;

                case CALL_STATUS.DECLINED:
                case CALL_STATUS.CANCELLED:
                case CALL_STATUS.ENDED:
                    if (isOnCallRelatedScreen) {
                        // Call kết thúc → navigate back và dừng âm thanh
                        navigateBack();

                        // Dừng âm thanh cuộc gọi nếu đang phát
                        try {
                            await stopCallSounds();
                            console.log('🔇 Stopped call sounds for ended call');
                        } catch (error) {
                            console.error('❌ Error stopping call sounds:', error);
                        }
                    }
                    break;
            }
        } else if (userRole === 'caller') {
            // TÔI LÀ NGƯỜI GỌI
            switch (callData.status) {
                case CALL_STATUS.RINGING:
                    if (!isListenScreen && !isCallScreen) {
                        // Tôi đã gọi và đang chờ → hiển thị ListenCallAcceptedScreen
                        navigateToListenCallScreen(callData);

                        // DỪNG TIMEOUT vì caller đã thấy trạng thái chờ
                        callTimeoutService.stopCallTimeout(callData.id);
                    }
                    break;

                case CALL_STATUS.ACCEPTED:
                    if (!isCallScreen) {
                        // DỪNG TIMEOUT ngay khi ACCEPTED
                        callTimeoutService.stopCallTimeout(callData.id);
                        console.log('⏰ Stopped timeout for accepted call (caller):', callData.id);

                        // Người kia accept → cả 2 vào CallScreen
                        navigateToCallScreen(callData);
                    }
                    break;

                case CALL_STATUS.DECLINED:
                case CALL_STATUS.CANCELLED:
                case CALL_STATUS.ENDED:
                    if (isOnCallRelatedScreen) {
                        // Call bị từ chối hoặc kết thúc → navigate back và dừng âm thanh
                        navigateBack();

                        // Dừng âm thanh cuộc gọi nếu đang phát
                        try {
                            await stopCallSounds();
                            console.log('🔇 Stopped call sounds for ended call (caller)');
                        } catch (error) {
                            console.error('❌ Error stopping call sounds:', error);
                        }
                    }
                    break;
            }
        } else {
        }
    }, [getUserRole, navigateToIncomingCallScreen, navigateToListenCallScreen, navigateToCallScreen, navigateBack, user?.uid, playIncomingCallSound, stopCallSounds, currentScreen]);

    // Setup Firebase call listener với unified handler
    useFirebaseCallListener(handleCallUpdate, handleCallUpdate);

    return null;
};

export default CallLogicHandler;
