import "./App.css";
import { useEffect, useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import { Authenticator } from "@aws-amplify/ui-react";
import { getCurrentUser, fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "../amplify/data/resource";
import Banner from './Banner';

const client = generateClient<Schema>();

function Feeds() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feeds, setFeeds] = useState<Array<Schema["Feed"]["type"]>>([]);
  const [newFeedContent, setNewFeedContent] = useState("");

  async function checkAuthState() {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  }

  async function fetchAttributes() {
    try {
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
    } catch (error) {
      console.error('Error fetching user attributes:', error);
    }
  }

  useEffect(() => {
    checkAuthState();
  }, []);


  useEffect(() => {
    if (currentUser) {
      setFeeds([]); // Reset todos when user changes
      const subscription = client.models.Todo.observeQuery().subscribe({
        next: (data) => setFeeds([...data.items]),
      });

      return () => subscription.unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    if(currentUser) {
      fetchAttributes();
    }
  }, [currentUser]);

  const createFeed = useCallback(() => {
    if (newFeedContent.trim()) {
      client.models.Feed.create({ 
        title: "New Feed", 
        content: newFeedContent, 
        author: currentUser.attributes.email,
        url: "https://example.com"
      });
      setNewFeedContent("");
    }
  }, [newFeedContent]);

  const deleteFeed = useCallback((id: string) => {
    client.models.Feed.delete({ id });
  }, []);


  return (
    <Authenticator socialProviders={['google']}>
      {({ signOut, user }) => {
        if (user && !currentUser) {
          setCurrentUser(user);
          console.log("is logged in");
        }
        
        return (
          <main>
            <Banner 
              isAuthenticated={isAuthenticated} 
              onSignOut={() => {
                signOut?.();
                setCurrentUser(null);
              }} 
            />
            <div className="todo-input-container">
              <input
                className="todo-input"
                type="text"
                value={newFeedContent}
                onChange={(e) => setNewFeedContent(e.target.value)}
                placeholder="Enter new todo"
              />
              <button onClick={createFeed}>Add Todo</button>
            </div>
            <div className="todo-grid">
              {feeds.map((feed) => (
                <div key={feed.id} className="feed-tile">
                  <button className="delete-button" onClick={() => deleteFeed(feed.id)}>×</button>
                  <div className="feed-content">
                    <span className="feed-text">
                      {feed.content}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </main>
        );
      }}
    </Authenticator>
  );
}

export default Feeds;
