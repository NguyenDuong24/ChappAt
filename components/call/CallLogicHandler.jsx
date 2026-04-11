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

    const {
        navigateToListenCallScreen,
        navigateToIncomingCallScreen,
        navigateToCallScreen,
        navigateBack,
        currentScreen
    } = useCallNavigation();

    // Track processed calls to prevent re-navigation after call ends
    const processedCallsRef = useRef(new Set());

    const getUserRole = useCallback((callData) => {
        if (!user?.uid || !callData) return null;

        if (callData.callerId === user.uid) {
            return 'caller';
        }

        if (callData.receiverId === user.uid) {
            return 'receiver';
        }

        return null;
    }, [user?.uid]);

    const handleCallUpdate = useCallback(async (callData) => {
        if (!callData || !user?.uid) {
            return;
        }

        const userRole = getUserRole(callData);

        const callKey = `${callData.id}`;
        const isCallScreen = currentScreen === 'CallScreen';
        const isIncomingScreen = currentScreen === 'IncomingCallScreen';
        const isListenScreen = currentScreen === 'ListenCallAcceptedScreen';
        const isOnCallRelatedScreen = isCallScreen || isIncomingScreen || isListenScreen;

        if ([CALL_STATUS.DECLINED, CALL_STATUS.CANCELLED, CALL_STATUS.ENDED].includes(callData.status)) {
            processedCallsRef.current.add(callKey);
            if (processedCallsRef.current.size > 20) {
                const arr = Array.from(processedCallsRef.current);
                processedCallsRef.current = new Set(arr.slice(-10));
            }
        }

        if (callData.status === CALL_STATUS.RINGING && processedCallsRef.current.has(callKey)) {
            console.log('Skipping already processed call:', callKey);
            return;
        }

        if (userRole === 'receiver') {
            switch (callData.status) {
                case CALL_STATUS.RINGING:
                    if (!isIncomingScreen && !isCallScreen) {
                        navigateToIncomingCallScreen(callData);

                        try {
                            await playIncomingCallSound();
                            console.log('Playing incoming call sound');
                        } catch (error) {
                            console.error('Error playing call sound:', error);
                        }
                    }
                    break;

                case CALL_STATUS.ACCEPTED:
                    // Always stop local timeout as soon as call is accepted.
                    callTimeoutService.stopCallTimeout(callData.id);
                    console.log('Stopped timeout for accepted call (receiver):', callData.id);

                    if (!isCallScreen) {
                        navigateToCallScreen(callData);
                    }
                    break;

                case CALL_STATUS.DECLINED:
                case CALL_STATUS.CANCELLED:
                case CALL_STATUS.ENDED:
                    callTimeoutService.stopCallTimeout(callData.id);
                    if (isOnCallRelatedScreen) {
                        navigateBack();

                        try {
                            await stopCallSounds();
                            console.log('Stopped call sounds for ended call');
                        } catch (error) {
                            console.error('Error stopping call sounds:', error);
                        }
                    }
                    break;
            }
        } else if (userRole === 'caller') {
            switch (callData.status) {
                case CALL_STATUS.RINGING:
                    if (!isListenScreen && !isCallScreen) {
                        navigateToListenCallScreen(callData);
                    }
                    break;

                case CALL_STATUS.ACCEPTED:
                    // Always stop local timeout as soon as call is accepted.
                    callTimeoutService.stopCallTimeout(callData.id);
                    console.log('Stopped timeout for accepted call (caller):', callData.id);

                    if (!isCallScreen) {
                        navigateToCallScreen(callData);
                    }
                    break;

                case CALL_STATUS.DECLINED:
                case CALL_STATUS.CANCELLED:
                case CALL_STATUS.ENDED:
                    callTimeoutService.stopCallTimeout(callData.id);
                    if (isOnCallRelatedScreen) {
                        navigateBack();

                        try {
                            await stopCallSounds();
                            console.log('Stopped call sounds for ended call (caller)');
                        } catch (error) {
                            console.error('Error stopping call sounds:', error);
                        }
                    }
                    break;
            }
        }
    }, [
        getUserRole,
        navigateToIncomingCallScreen,
        navigateToListenCallScreen,
        navigateToCallScreen,
        navigateBack,
        user?.uid,
        playIncomingCallSound,
        stopCallSounds,
        currentScreen
    ]);

    useFirebaseCallListener(handleCallUpdate, handleCallUpdate);

    return null;
};

export default CallLogicHandler;
