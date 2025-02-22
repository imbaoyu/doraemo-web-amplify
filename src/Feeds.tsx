// Third-party imports
import { useEffect, useState, useCallback } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { FaImage } from 'react-icons/fa';

// Project imports
import type { Schema } from "../amplify/data/resource";

// Local imports
import "./App.css";
import Banner from './Banner';
import Menu from './Menu';

// CSS imports
import "@aws-amplify/ui-react/styles.css";

// Type imports
import type { FetchUserAttributesOutput } from 'aws-amplify/auth';
import type { UploadDataWithPathInput } from '@aws-amplify/storage';

import { remove } from 'aws-amplify/storage';

const client = generateClient<Schema>();

const MAX_CHARACTERS = 400;

type IdentifyObjectReturnType = Schema["IdentifyObject"]["returnType"];

function Feeds() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
    const [, setIsAuthenticated] = useState(false);
    const [feeds, setFeeds] = useState<Array<Schema["Feed"]["type"]>>([]);
    const [newFeedContent, setNewFeedContent] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [recognizedObjects, setRecognizedObjects] = useState<Record<string, string>>({});

    // get image signed url from s3 so it can be rendered in the browser
    async function getImageUrl(path: string) {
        try {
            const result = await getUrl({ path });
            return result.url;
        } catch (error) {
            console.error("Error getting image URL:", error);
            return null;
        }
    };

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

    // Function to recognize object from the uploaded image
    async function recognizeObject(path: string): Promise<IdentifyObjectReturnType | null> {
        // Identifying object in the uploaded image
        // disable rekognition for now
        console.log(path)
        return null
        /*
        const { data } = await client.queries.IdentifyObject({
            path, // File name
        });
        return data;
        */
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImages([...images, file]);
        }
    };

    const createFeed = useCallback(async (user: any) => {
        if (newFeedContent.trim()) {
            const lines = newFeedContent.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();

            const uploadedImagePaths = await Promise.all(images.map(async (file) => {
                const path = `doraemo-feed-images/${Date.now()}-${file.name}`;
                const uploadInput: UploadDataWithPathInput = {
                    path,
                    data: file,
                    options: {
                        contentType: file.type,
                    }
                };
                
                const uploadResult = await uploadData(uploadInput).result;
                return uploadResult?.path;
            }));
        
            await client.models.Feed.create({ 
                title: title || "Untitled", 
                content: content || title,
                author: user?.attributes?.email || "Anonymous",
                images: uploadedImagePaths,
            });
            setNewFeedContent("");
            setImages([]);
        }
    }, [newFeedContent, images]);

    const deleteFeed = useCallback(async (id: string) => {
        const feedToDelete = feeds.find(feed => feed.id === id);
        if (feedToDelete && feedToDelete.images) {
            await Promise.all(feedToDelete.images.map(async (imageUrl) => {
                if (imageUrl) {
                    try {
                        const path = new URL(imageUrl).pathname.slice(1); // Remove leading '/'
                        await remove({ path });
                    } catch (error) {
                        console.error(`Failed to delete image: ${imageUrl}`, error);
                        // Continue execution even if image deletion fails
                    }
                }
            }));
        }
        try {
            await client.models.Feed.delete({ id });
        } catch (error) {
            console.error(`Failed to delete feed with id: ${id}`, error);
            throw error; // Re-throw the error if feed deletion fails
        }
    }, [feeds]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = e.target.value;
        if (input.length <= MAX_CHARACTERS) {
            setNewFeedContent(input);
        }
    };

    useEffect(() => {
        checkAuthState();
    }, []);

    useEffect(() => {
        if(currentUser) {
            fetchAttributes();
        }
    }, [currentUser]);

    useEffect(() => {
        const subscription = client.models.Feed.observeQuery().subscribe({
            next: async (data) => {
                const newImageUrls: Record<string, string> = {};
                await Promise.all(data.items.flatMap(feed => 
                    (feed.images || []).map(async (image) => {
                        if (image && !imageUrls[image]) {
                            const url = await getImageUrl(image);
                            if (url) newImageUrls[image] = url.toString();
                        }
                    })
                ));
                setImageUrls(prev => ({ ...prev, ...newImageUrls }));
                setFeeds(data.items.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));
            },
        });

        return () => subscription.unsubscribe();
    }, []); // Empty dependency array

    useEffect(() => {
        feeds.forEach(feed => {
            if (feed.images && feed.images[0] && imageUrls[feed.images[0]]) {
                recognizeObject(feed.images[0]).then(result => {
                    setRecognizedObjects(prev => ({ ...prev, [feed.id]: result || '' }));
                });
            }
        });
    }, [feeds, imageUrls]);

    return (
        <Authenticator socialProviders={['google']}>
        {({ signOut, user }) => (
            <div className="page-container">
            <Banner 
                onSignOut={() => {
                signOut?.();
                setCurrentUser(null);
                }} 
            />
            <div className="content-wrapper">
                <Menu />
                <main className="content-container">
                <div className="feed-input-container">
                    <textarea
                        value={newFeedContent}
                        onChange={handleInputChange}
                        placeholder="What's on your mind?"
                        maxLength={MAX_CHARACTERS}
                        className="feed-input"
                    />
                    <div className="input-footer">
                        <div className="left-side">
                            <label className="file-upload-label">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                                <FaImage className="media-icon" />
                            </label>
                        </div>
                        <div className="right-side">
                            <div className="character-count">
                                {newFeedContent.length}/{MAX_CHARACTERS}
                            </div>
                            <button className="post-button" onClick={() => createFeed(user)}>Post</button>
                        </div>
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
                                image && <img key={index} src={imageUrls[image]} alt={`Feed image ${index + 1}`} />
                            ))}
                            <p className="feed-content">{recognizedObjects[feed.id]}</p>
                        </li>
                    ))}
                </ul>
                </main>
            </div>
            </div>
        )}
        </Authenticator>
    );
}

export default Feeds;

