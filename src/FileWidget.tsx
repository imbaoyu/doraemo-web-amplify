import React, { useState, useEffect } from 'react';
import { uploadData, list, remove } from 'aws-amplify/storage';
import { FaTrash, FaSpinner } from 'react-icons/fa';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';

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

function FileWidget({ user }: FileWidgetProps) {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
        return;
      }

      const files = await Promise.all(result.items.map(async item => {
        console.log('Processing file:', item);
        try {
          const doc = await client.models.UserDocument.get({ id: item.path });
          console.log('Document data:', doc);
          return {
            name: item.path.split('/').pop() || '',
            key: item.path,
            status: doc.data?.status
          } as PdfFile;
        } catch (error) {
          console.error('Error fetching document data for:', item.path, error);
          return null;
        }
      }));
      
      const validFiles = files.filter((file): file is PdfFile => file !== null);
      console.log('Valid files:', validFiles);
      setPdfs(validFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Load existing files when user is available
  useEffect(() => {
    console.log('FileWidget mounted with user:', user);
    loadExistingFiles();
  }, [user.userId]); // Depend on user.userId specifically

  useEffect(() => {
    console.log('Setting up UserDocument subscription');
    // Set up subscription for status updates
    const sub = client.models.UserDocument.observeQuery()
      .subscribe({
        next: ({ items }) => {
          console.log('Received UserDocument update:', items);
          setPdfs(prevPdfs => {
            return prevPdfs.map(pdf => {
              const updatedDoc = items.find(item => item.id === pdf.key);
              return updatedDoc ? { ...pdf, status: updatedDoc.status } : pdf;
            });
          });
        },
        error: (error) => console.error('Subscription error:', error)
      });

    // Cleanup subscription on component unmount
    return () => {
      console.log('Cleaning up UserDocument subscription');
      sub.unsubscribe();
    };
  }, []);

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
      
      // Add the new file to the list immediately with 'uploaded' status
      setPdfs(prev => [...prev, {
        name: file.name,
        key: path,
        status: 'uploaded'
      }]);
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
      setPdfs(prev => prev.filter(pdf => pdf.key !== key));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  return (
    <div className="pdf-widget">
      <h3>Documents</h3>
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
        {pdfs.map((pdf, index) => (
          <div key={index} className="pdf-item">
            <div className="pdf-item-content">
              <span className="filename">{pdf.name}</span>
              {pdf.status === 'uploaded' && <span className="status">processing<span className="animated-dots">...</span></span>}
            </div>
            <button 
              className="delete-button"
              onClick={() => handleDelete(pdf.key)}
              aria-label="Delete file"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileWidget;