import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import { getStorage, ref, getDownloadURL } from 'firebase/storage'; 
const LogoStateContext = createContext();

export const LogoStateProvider = ({ children }) => {
    const { user } = useAuth(); 
    const [logo, setLogo] = useState(null);

    const storage = getStorage();
    
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const url = await getDownloadURL(ref(storage, 'Logos/logo.png'));
        setLogo(url);
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    fetchLogo();
  }, []);
    return (
        <LogoStateContext.Provider value={logo}>
            {children}
        </LogoStateContext.Provider>
    );
};

export const useLogoState = () => {
    return useContext(LogoStateContext);
};
