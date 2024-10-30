import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext'; // Import useAuth to access user data
import { getStorage, ref, getDownloadURL } from 'firebase/storage'; 
const LogoStateContext = createContext();

export const LogoStateProvider = ({ children }) => {
    const { user } = useAuth(); // Get user from auth context
    const [logo, setLogo] = useState(null); // State to hold the logo URL

    const storage = getStorage();
    
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // Replace 'Logos/logo.png' with your actual image path in Firebase Storage
        const url = await getDownloadURL(ref(storage, 'Logos/logo.png'));
        setLogo(url); // Set the logo URL to state
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    fetchLogo(); // Call the function to fetch the logo
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
