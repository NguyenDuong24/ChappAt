import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { DEFAULT_FILTER, loadFilterPreferences, saveFilterPreferences } from '@/utils/filterStorage';

const StateCommonContext = createContext();

export const StateCommonProvider = ({ children }) => {
    const [stateCommon, setStateCommon] = useState({
        filter: { ...DEFAULT_FILTER },
    });

    // Bootstrap from storage on mount
    useEffect(() => {
        (async () => {
            try {
                const saved = await loadFilterPreferences();
                setStateCommon(prev => ({ ...prev, filter: { ...saved } }));
            } catch {}
        })();
    }, []);

    // Memoize setStateCommon function to prevent re-renders
    const updateStateCommon = useCallback((newState) => {
        setStateCommon(prevState => {
            const next = { ...prevState, ...newState };
            // Persist filter if provided
            if (newState && Object.prototype.hasOwnProperty.call(newState, 'filter')) {
                try { saveFilterPreferences(next.filter); } catch {}
            }
            return next;
        });
    }, []);

    const value = useMemo(() => ({
        stateCommon,
        setStateCommon: updateStateCommon
    }), [stateCommon, updateStateCommon]);

    return (
        <StateCommonContext.Provider value={value}>
            {children}
        </StateCommonContext.Provider>
    );
};

export const useStateCommon = () => {
    const context = useContext(StateCommonContext);
    if (!context) {
        throw new Error('useStateCommon must be used within a StateCommonProvider');
    }
    return context;
};
