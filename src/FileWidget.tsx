import React, { useState, useEffect } from 'react';
import { uploadData, list, remove } from 'aws-amplify/storage';
import { FaTrash, FaSpinner, FaSync } from 'react-icons/fa';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';

const client = generateClient<Schema>();

interface PdfFile {
  name: string;
  key: string;
  status?: string;
}

interface FileWidgetProps {
  user: {
    userId: string;
    username: string;
  };
}

// Define a type for our document response
interface DocumentResponse {
  getUserDocument?: {
    status?: string;
  };
}

function FileWidget({ user }: FileWidgetProps) {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  // Function to get document status using a custom query
  const getDocumentStatus = async (documentId: string): Promise<string | undefined> => {
    try {
      // Use a custom query to get just the status
      const customQuery = /* GraphQL */ `
        query GetUserDocumentStatus($id: ID!) {
          getUserDocument(id: $id) {
            status
          }
        }
      `;
      
      // Use the lower-level API to execute the query
      const response = await client.graphql({
        query: customQuery,
        variables: {
          id: documentId
        }
      });
      
      console.log('Custom query response:', response);
      
      // Try to extract the status - cast to our expected type
      const typedResponse = response as { data?: DocumentResponse };
      if (typedResponse.data?.getUserDocument?.status) {
        return typedResponse.data.getUserDocument.status;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching document status:', error);
      return undefined;
    }
  };

  // Load existing files and their status
  const loadExistingFiles = async () => {
    console.log('Loading files for user:', user);
    try {
      const prefix = `user-documents/${user.userId}/`;
      console.log('Listing files with prefix:', prefix);
      const result = await list({ path: prefix });
      console.log('List result:', result);
      
      if (!result.items.length) {
        console.log('No files found in storage');
        setPdfs([]);
        return;
      }

      // First, get all files from S3
      const filesFromStorage = result.items.map(item => {
        const key = item.path;
        return {
          name: item.path.split('/').pop() || '',
          key: key,
          // Use status from our statusMap if available
          status: statusMap[key]
        };
      });
      
      // Set initial state with files from storage
      setPdfs(filesFromStorage);
      
      // Then try to get status for each file individually
      for (const file of filesFromStorage) {
        try {
          // Skip files that already have a processed status
          if (file.status === 'processed' || file.status === 'error') {
            continue;
          }
          
          // Try to get the document status
          const status = await getDocumentStatus(file.key);
          
          if (status && status !== statusMap[file.key]) {
            console.log(`Status updated for ${file.name}: ${statusMap[file.key] || 'unknown'} -> ${status}`);
            
            // Update our status map
            setStatusMap(prev => ({
              ...prev,
              [file.key]: status
            }));
            
            // Update the file in our state
            setPdfs(prev => 
              prev.map(p => 
                p.key === file.key ? { ...p, status } : p
              )
            );
          }
        } catch (error) {
          console.error('Error fetching status for file:', file.name, error);
        }
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Load existing files when user is available
  useEffect(() => {
    console.log('FileWidget mounted with user:', user);
    if (user && user.userId) {
      loadExistingFiles();
    }
  }, [user.userId]); // Depend on user.userId specifically

  // Set up polling for status updates
  useEffect(() => {
    if (!user.userId || pdfs.length === 0) return;
    
    // Poll for status updates every 5 seconds
    const intervalId = setInterval(() => {
      console.log('Polling for status updates...');
      loadExistingFiles();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [user.userId, pdfs.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const path = `user-documents/${user.userId}/${file.name}`;
      
      const uploadInput = {
        path,
        data: file,
        options: {
          contentType: file.type,
        }
      };
      
      await uploadData(uploadInput).result;
      
      // Update status map with 'uploaded' status
      setStatusMap(prev => ({
        ...prev,
        [path]: 'uploaded'
      }));
      
      // Add the new file to the list immediately with 'uploaded' status
      setPdfs(prev => [...prev, {
        name: file.name,
        key: path,
        status: 'uploaded'
      }]);
      
      // Trigger a refresh after a short delay to get the updated status
      setTimeout(() => {
        loadExistingFiles();
      }, 2000);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await remove({ path: key });
      
      // Remove from status map
      setStatusMap(prev => {
        const newMap = { ...prev };
        delete newMap[key];
        return newMap;
      });
      
      // Remove from pdfs state
      setPdfs(prev => prev.filter(pdf => pdf.key !== key));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  // Add a manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadExistingFiles();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="pdf-widget">
      <div className="pdf-widget-header">
        <h3>Documents</h3>
        <button 
          className="refresh-button" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          aria-label="Refresh document list"
        >
          <FaSync className={isRefreshing ? 'spinner' : ''} />
        </button>
      </div>
      <div className="upload-section">
        <label className="file-upload-button">
          Choose File
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf"
            style={{ display: 'none' }}
          />
        </label>
        {isUploading && <FaSpinner className="spinner" />}
      </div>
      <div className="pdf-list">
        {pdfs.length === 0 ? (
          <p>No documents uploaded yet</p>
        ) : (
          pdfs.map((pdf, index) => (
            <div key={index} className="pdf-item">
              <div className="file-item">
                <div className="file-name">
                  <FontAwesomeIcon icon={faFilePdf} className="file-icon" />
                  {pdf.name}
                </div>
                {pdf.status === 'uploaded' && (
                  <span className="status">processing<span className="animated-dots">...</span></span>
                )}
                {pdf.status === 'processed' && (
                  <span className="status success">ingested</span>
                )}
                {pdf.status === 'error' && (
                  <span className="status error">error</span>
                )}
                {!pdf.status && (
                  <span className="status">unknown</span>
                )}
              </div>
              <button 
                className="delete-button"
                onClick={() => handleDelete(pdf.key)}
                aria-label="Delete file"
              >
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FileWidget;