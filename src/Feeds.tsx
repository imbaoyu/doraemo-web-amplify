import "./App.css";
import { useEffect, useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import { Authenticator } from "@aws-amplify/ui-react";
import { getCurrentUser, fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { uploadData, getUrl } from 'aws-amplify/storage';
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "../amplify/data/resource";
import Banner from './Banner';
import Menu from './Menu';

const client = generateClient<Schema>();

const MAX_CHARACTERS = 400;

function Feeds() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feeds, setFeeds] = useState<Array<Schema["Feed"]["type"]>>([]);
  const [newFeedContent, setNewFeedContent] = useState("");
  const [images, setImages] = useState<File[]>([]);

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
    const subscription = client.models.Feed.observeQuery().subscribe({
      next: (data) => setFeeds([...data.items].reverse()),
    });

    return () => subscription.unsubscribe();
  }, []); // Remove dependency on currentUser

  useEffect(() => {
    if(currentUser) {
      fetchAttributes();
    }
  }, [currentUser]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await uploadData({
          key: `feeds/${Date.now()}-${file.name}`,
          data: file,
          options: { accessLevel: 'private' }
        }).result;
        setImages([...images, file]);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  const createFeed = useCallback(async (user: any) => {
    if (newFeedContent.trim()) {
      const lines = newFeedContent.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();

      const uploadedImageUrls = await Promise.all(images.map(async (file) => {
        const key = `feeds/${Date.now()}-${file.name}`;
        await uploadData({
          key,
          data: file,
          options: { accessLevel: 'private' }
        }).result;
        const { url } = await getUrl({ key });
        return url.toString(); // Convert URL to string
      }));
      
      client.models.Feed.create({ 
        title: title || "Untitled", 
        content: content || title,
        author: user?.attributes?.email || "Anonymous",
        images: uploadedImageUrls,
      });
      setNewFeedContent("");
      setImages([]);
    }
  }, [newFeedContent, images]);

  const deleteFeed = useCallback((id: string) => {
    client.models.Feed.delete({ id });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    if (input.length <= MAX_CHARACTERS) {
      setNewFeedContent(input);
    }
  };

  return (
    <Authenticator socialProviders={['google']}>
      {({ signOut, user }) => (
        <div className="page-container">
          <Banner 
            isAuthenticated={isAuthenticated} 
            onSignOut={() => {
              signOut?.();
              setCurrentUser(null);
            }} 
          />
          <div className="content-wrapper">
            <Menu />
            <main className="content-container">
              <div className="feed-content">
                <div className="feed-input-container">
                  <textarea
                    className="feed-input"
                    value={newFeedContent}
                    onChange={handleInputChange}
                    placeholder="What's on your mind?"
                    rows={4}
                    maxLength={MAX_CHARACTERS}
                  />
                  <div className="input-footer">
                    <div className="character-count">
                      {newFeedContent.length}/{MAX_CHARACTERS}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <button className="post-button" onClick={() => createFeed(user)}>Post</button>
                  </div>
                  <div className="image-preview">
                    {images.map((image, index) => (
                      <img key={index} src={URL.createObjectURL(image)} alt={`Upload ${index + 1}`} />
                    ))}
                  </div>
                </div>
                <ul className="feed-list">
                  {feeds.map((feed) => (
                    <li key={feed.id} className="feed-item">
                      <button className="delete-button" onClick={() => deleteFeed(feed.id)}>×</button>
                      <h3 className="feed-title">{feed.title}</h3>
                      <p className="feed-author">{feed.author}</p>
                      <p className="feed-content">{feed.content}</p>
                      {feed.images && feed.images.map((image, index) => (
                        image && <img key={index} src={image} alt={`Feed image ${index + 1}`} />
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            </main>
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default Feeds;
