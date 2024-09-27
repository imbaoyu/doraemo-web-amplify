import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 30 minutes in milliseconds

const withAutoLogout = (WrappedComponent: React.ComponentType) => {
  return (props: any) => {
    const [lastActivity, setLastActivity] = useState(Date.now());
    const navigate = useNavigate();

    const resetTimer = () => {
      setLastActivity(Date.now());
    };

    const handleLogout = async () => {
      try {
        await signOut();
        navigate('/');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };

    useEffect(() => {
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(event => document.addEventListener(event, resetTimer));

      const checkInactivity = setInterval(() => {
        if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
          handleLogout();
        }
      }, 60000); // Check every minute

      return () => {
        events.forEach(event => document.removeEventListener(event, resetTimer));
        clearInterval(checkInactivity);
      };
    }, [lastActivity]);

    return <WrappedComponent {...props} />;
  };
};

export default withAutoLogout;