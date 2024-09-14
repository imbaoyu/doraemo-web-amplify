import { signInWithRedirect, fetchUserAttributes } from 'aws-amplify/auth';
import { useState, useEffect } from 'react';

interface BannerProps {
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

function Banner({ isAuthenticated, onSignOut }: BannerProps) {
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAttributes().then(attributes => {
        setUserEmail(attributes.email);
      }).catch(error => {
        console.error('Error fetching user attributes:', error);
      });
    }
  }, [isAuthenticated]);

  const handleSignIn = async () => {
    try {
      await signInWithRedirect();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignUp = async () => {
    try {
      await signInWithRedirect();
    } catch (error) {
      console.error('Error redirecting to sign up:', error);
    }
  };

  return (
    <div className="top-banner">
      <h1>Amazing Deals</h1>
      <div className="user-controls">
        {isAuthenticated ? (
          <>
            <span className="user-info">{userEmail || 'User'}</span>
            <button className="signout-button" onClick={onSignOut}>Sign Out</button>
          </>
        ) : (
          <>
            <button className="login-button" onClick={handleSignIn}>Login</button>
            <button className="signup-button" onClick={handleSignUp}>Sign Up</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Banner;