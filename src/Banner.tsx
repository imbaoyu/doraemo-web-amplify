import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';

interface BannerProps {
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

function Banner({ isAuthenticated, onSignOut }: BannerProps) {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAttributes().then(attributes => {
        setUserEmail(attributes.email);
      }).catch(error => {
        console.error('Error fetching user attributes:', error);
      });
    }
  }, [isAuthenticated]);

  const handleSignIn = () => {
    navigate('/deals');
  };

  const handleSignUp = () => {
    navigate('/deals');
  };

  return (
    <div className="top-banner">
      <h1>My Social Hub</h1>
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