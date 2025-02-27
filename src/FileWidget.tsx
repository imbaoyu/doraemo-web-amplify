import React, { useState, useEffect, useRef } from 'react';
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

// Status priority: higher values take precedence
const STATUS_PRIORITY = {
  'unknown': 0,
  'uploaded': 1,
  'error': 2,
  'processed': 3
};

function FileWidget({ user }: FileWidgetProps) {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Use a ref for statusMap to avoid dependencies in useEffect
  const statusMapRef = useRef<Record<string, string>>({});

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

  // Helper function to get the best status based on priority
  const getBestStatus = (currentStatus?: string, newStatus?: string): string => {
    // If either status is undefined, return the other one or default to 'unknown'
    if (!currentStatus) return newStatus || 'unknown';
    if (!newStatus) return currentStatus;
    
    // Return the status with higher priority
    return STATUS_PRIORITY[newStatus as keyof typeof STATUS_PRIORITY] >= 
           STATUS_PRIORITY[currentStatus as keyof typeof STATUS_PRIORITY] 
           ? newStatus : currentStatus;
  };

  // Load existing files and their status
  const loadExistingFiles = async () => {
    if (!user?.userId) return;
    
    try {
      const prefix = `user-documents/${user.userId}/`;
      const result = await list({ path: prefix });
      
      if (!result.items.length) {
        setPdfs([]);
        return;
      }

      // Create a map of current PDFs by key for quick lookup
      const currentPdfsMap = pdfs.reduce((map, pdf) => {
        map[pdf.key] = pdf;
        return map;
      }, {} as Record<string, PdfFile>);

      // Process all files from storage
      const updatedFiles: PdfFile[] = [];
      
      for (const item of result.items) {
        const key = item.path;
        const name = item.path.split('/').pop() || '';
        const currentFile = currentPdfsMap[key];
        
        // Start with existing status or 'unknown'
        let status = currentFile?.status || statusMapRef.current[key];
        
        // Only query for status if we don't have a final status yet
        if (status !== 'processed' && status !== 'error') {
          try {
            const fetchedStatus = await getDocumentStatus(key);
            if (fetchedStatus) {
              // Use the status with highest priority
              status = getBestStatus(status, fetchedStatus);
              
              // Update our status map for future reference
              statusMapRef.current[key] = status;
              
              // Log status change only when there's an actual change
              if (status !== currentFile?.status) {
                console.log(`Status updated for ${name}: ${currentFile?.status || 'unknown'} -> ${status}`);
              }
            }
          } catch (error) {
            console.error('Error fetching status for file:', name, error);
          }
        }
        
        updatedFiles.push({
          name,
          key,
          status
        });
      }
      
      // Update state with all files at once to prevent multiple re-renders
      setPdfs(updatedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Load existing files when user is available
  useEffect(() => {
    if (user && user.userId) {
      loadExistingFiles();
    }
  }, [user?.userId]); // Depend on user.userId specifically

  // Set up polling for status updates
  useEffect(() => {
    if (!user?.userId || pdfs.length === 0) return;
    
    // Poll for status updates every 5 seconds
    const intervalId = setInterval(() => {
      loadExistingFiles();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [user?.userId, pdfs.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.userId) return;
    
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
      statusMapRef.current[path] = 'uploaded';
      
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
      delete statusMapRef.current[key];
      
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