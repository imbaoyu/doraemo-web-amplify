import { useEffect, useState } from 'react';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';

import Banner from './Banner';

const LandingPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        setIsAuthenticated(true);
        const attributes = await fetchUserAttributes();
        setUserEmail(attributes.email);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuthState();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUserEmail(undefined);
      navigate('/');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleChatClick = () => {
    navigate('/chat');
  };

  return (
    <>
      <Banner onSignOut={handleSignOut} />
      <div style={{ padding: '20px' }}>
        <main>
          {isAuthenticated ? (
            <>
              <h2>Welcome Back, {userEmail}!</h2>
              <p>Start a conversation with your AI assistant powered by your documents.</p>
              <button onClick={handleChatClick} className="primary-button">Go to Chat</button>
            </>
          ) : (
            <>
              <h2>Your AI Document Assistant</h2>
              <p>Chat with an AI that understands your documents and helps you work with them effectively.</p>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default LandingPage;