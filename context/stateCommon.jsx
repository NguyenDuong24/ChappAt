import React, { createContext, useState, useContext } from 'react';

// Tạo context
const StateCommonContext = createContext();

// Tạo provider
export const StateCommonProvider = ({ children }) => {
    const [stateCommon, setStateCommon] = useState({
        filter: { gender: '', minAge: '', maxAge: '' },
    });

    return (
        <StateCommonContext.Provider value={{ stateCommon, setStateCommon }}>
            {children}
        </StateCommonContext.Provider>
    );
};

// Hook để sử dụng context
export const useStateCommon = () => {
    const context = useContext(StateCommonContext);
    if (!context) {
        throw new Error('useStateCommon must be used within a StateCommonProvider');
    }
    return context;
};
