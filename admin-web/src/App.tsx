import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import './styles.css';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <h2>Loading...</h2>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
                <Route path="/dashboard/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
        </Router>
    );
}

export default App;
