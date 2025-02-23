import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, signOut, signInWithRedirect } from 'aws-amplify/auth';
import { AuthError } from '@aws-amplify/auth';

interface BannerProps {
  onSignOut?: () => void;
}

function Banner({ onSignOut }: BannerProps) {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const attributes = await fetchUserAttributes();
      setUserEmail(attributes.email);
      setIsAuthenticated(true);
    } catch (error) {
      if (error instanceof AuthError) {
        console.log('User session expired.');
        setIsAuthenticated(false);
        setUserEmail(undefined);
      } else {
        console.error('Error fetching user attributes:', error);
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUserEmail(undefined);
      if (onSignOut) onSignOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSignIn = () => {
    signInWithRedirect({ provider: 'Google' });
  };

  const handleSignUp = () => {
    signInWithRedirect({ provider: 'Google' });
  };

  return (
    <div className="top-banner">
      <h1>Doraemo</h1>
      <div className="user-controls">
        {isAuthenticated ? (
          <>
            <span className="user-info">{userEmail || 'User'}</span>
            <button className="signout-button" onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <>
            <button className="auth-button login-button" onClick={handleSignIn}>Login</button>
            <button className="auth-button signup-button" onClick={handleSignUp}>Sign Up</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Banner;