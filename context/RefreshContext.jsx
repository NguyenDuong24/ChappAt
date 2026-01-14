import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const RefreshContext = createContext({
    registerRefreshHandler: (tabName, handler) => { },
    triggerRefresh: (tabName) => { },
});

export const RefreshProvider = ({ children }) => {
    const [refreshHandlers, setRefreshHandlers] = useState({});

    const registerRefreshHandler = useCallback((tabName, handler) => {
        setRefreshHandlers(prev => {
            if (prev[tabName] === handler) return prev;
            return { ...prev, [tabName]: handler };
        });
    }, []);

    const triggerRefresh = useCallback((tabName) => {
        if (refreshHandlers[tabName]) {
            refreshHandlers[tabName]();
        }
    }, [refreshHandlers]);

    const value = useMemo(() => ({
        registerRefreshHandler,
        triggerRefresh
    }), [registerRefreshHandler, triggerRefresh]);

    return (
        <RefreshContext.Provider value={value}>
            {children}
        </RefreshContext.Provider>
    );
};

export const useRefresh = () => useContext(RefreshContext);

export default RefreshContext;
