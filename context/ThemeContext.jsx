import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';  // Đảm bảo đã cài AsyncStorage

// Tạo context cho Theme
export const ThemeContext = createContext();

// Component Provider để bọc ứng dụng và cung cấp trạng thái theme
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // 'light' là chủ đề mặc định

  useEffect(() => {
    // Kiểm tra và lấy theme từ AsyncStorage khi ứng dụng khởi động
    const loadThemeFromStorage = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setTheme(savedTheme); // Nếu có theme lưu trữ, dùng theme đó
        }
      } catch (error) {
        console.error("Error loading theme from AsyncStorage", error);
      }
    };
    loadThemeFromStorage();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      // Lưu theme mới vào AsyncStorage
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error("Error saving theme to AsyncStorage", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook để dễ sử dụng ThemeContext
export const useTheme = () => useContext(ThemeContext);
