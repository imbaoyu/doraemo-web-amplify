import { useEffect, useState } from 'react';
import Banner from './Banner';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';

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

  return (
    <>
      <Banner isAuthenticated={isAuthenticated} onSignOut={handleSignOut} />
      <div style={{ padding: '20px' }}>
        <main>
          {isAuthenticated ? (
            <>
              <h2>Welcome Back, {userEmail}!</h2>
              <p>Explore the amazing deals we have for you.</p>
              <a href="/deals">Go to Deals Page</a>
            </>
          ) : (
            <>
              <h2>Your Amazing App Description</h2>
              <p>This is where you can describe your app's features and benefits.</p>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default LandingPage;