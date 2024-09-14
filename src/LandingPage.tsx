import React from 'react';
import Banner from './Banner';

const LandingPage = () => (
  <>
    <Banner />
    <div style={{ padding: '20px' }}>
      <main>
        <h2>Your Amazing App Description</h2>
        <p>This is where you can describe your app's features and benefits.</p>
      </main>
    </div>
  </>
);

export default LandingPage;