import { useEffect, useState } from 'react';
import Banner from './Banner';
import { fetchUserAttributes } from 'aws-amplify/auth';

const LandingPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        //const user = await getCurrentUser();
        setIsAuthenticated(true);
        const attributes = await fetchUserAttributes();
        setUserEmail(attributes.email);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuthState();
  }, []);

  return (
    <>
      <Banner isAuthenticated={isAuthenticated} />
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