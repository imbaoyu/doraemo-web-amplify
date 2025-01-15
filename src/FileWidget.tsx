import React, { useState, useEffect } from 'react';
import { uploadData, list, remove } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { FaTrash, FaSpinner } from 'react-icons/fa';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

interface PdfFile {
  name: string;
  key: string;
  status?: string;
}

function FileWidget() {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load existing files and their status
  const loadExistingFiles = async () => {
    try {
      const user = await getCurrentUser();
      const prefix = `user-documents/${user.userId}/`;
      const result = (await list({ path: prefix })).items;
      
      const files = await Promise.all(result.map(async item => {
        const doc = await client.models.UserDocument.get({ id: item.path });
        return {
          name: item.path.split('/').pop() || '',
          key: item.path,
          status: doc.data?.status
        };
      }));
      
      setPdfs(files);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Load existing files on component mount
  useEffect(() => {
    loadExistingFiles();
  }, []);

  useEffect(() => {
    // Set up subscription for status updates
    const sub = client.models.UserDocument.observeQuery()
      .subscribe({
        next: ({ items }) => {
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
      sub.unsubscribe();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const user = await getCurrentUser();
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