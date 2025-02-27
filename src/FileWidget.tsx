import React, { useState, useEffect } from 'react';
import { uploadData, list, remove } from 'aws-amplify/storage';
import { FaTrash, FaSpinner, FaSync, FaCloudUploadAlt, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
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

  // Helper function to get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'processed':
        return <FaCheck className="status-icon success" />;
      case 'error':
        return <FaExclamationTriangle className="status-icon error" />;
      case 'uploaded':
        return <FaSpinner className="status-icon spinner" />;
      default:
        return null;
    }
  };

  // Helper function to get status text
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'processed':
        return 'Ingested';
      case 'error':
        return 'Error';
      case 'uploaded':
        return 'Processing';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="pdf-widget">
      <div className="pdf-widget-header">
        <h3>Knowledge Base</h3>
        <button 
          className="refresh-button" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          aria-label="Refresh document list"
        >
          <FaSync className={isRefreshing ? 'spinner' : ''} />
        </button>
      </div>
      
      <div className="upload-container">
        <label className="file-upload-btn">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf"
            style={{ display: 'none' }}
          />
          <FaCloudUploadAlt className="upload-icon" />
          <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
          {isUploading && <FaSpinner className="spinner upload-spinner" />}
        </label>
        <p className="upload-hint">Add documents to enhance your chat experience</p>
      </div>
      
      <div className="document-list">
        <h4 className="document-list-header">Your Documents</h4>
        {pdfs.length === 0 ? (
          <div className="empty-state">
            <p>No documents uploaded yet</p>
            <p className="empty-hint">Upload PDFs to use them in chat</p>
          </div>
        ) : (
          <div className="document-items">
            {pdfs.map((pdf, index) => (
              <div key={index} className="document-item">
                <div className="document-info">
                  <div className="document-icon-container">
                    <FontAwesomeIcon icon={faFilePdf} className="document-icon" />
                  </div>
                  <div className="document-details">
                    <div className="document-name" title={pdf.name}>
                      {pdf.name}
                      <div className="document-name-tooltip">
                        {pdf.name}
                      </div>
                    </div>
                    <div className={`document-status ${pdf.status || 'unknown'}`}>
                      {getStatusIcon(pdf.status)}
                      <span>{getStatusText(pdf.status)}</span>
                      {pdf.status === 'uploaded' && <span className="animated-dots">...</span>}
                    </div>
                  </div>
                </div>
                <button 
                  className="document-delete-btn"
                  onClick={() => handleDelete(pdf.key)}
                  aria-label="Delete file"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FileWidget;