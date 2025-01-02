import React, { useState, useEffect } from 'react';
import { uploadData, list, remove } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { FaTrash, FaSpinner } from 'react-icons/fa';
import type { UploadDataWithPathInput } from '@aws-amplify/storage';

interface PdfFile {
  name: string;
  key: string;
}

function FileWidget() {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load existing files on component mount
  useEffect(() => {
    loadExistingFiles();
  }, []);

  const loadExistingFiles = async () => {
    try {
      const user = await getCurrentUser();
      const prefix = `user-documents/${user.userId}/`;
      const result = (await list({ path: prefix })).items;
      
      const files = result.map(item => ({
        name: item.path.split('/').pop() || '',
        key: item.path
      }));
      
      setPdfs(files);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const user = await getCurrentUser();
      const path = `user-documents/${user.userId}/${file.name}`;
      
      const uploadInput: UploadDataWithPathInput = {
        path,
        data: file,
        options: {
          contentType: file.type,
        }
      };
      
      console.log('Starting upload...', file.name);
      await uploadData(uploadInput).result;
      console.log('Upload complete!', path);
      
      // Refresh the file list after upload
      await loadExistingFiles();
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
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
          disabled={isUploading}
          key={isUploading ? 'uploading' : 'not-uploading'}
        />
        {isUploading && <FaSpinner className="spinner" />}
      </div>
      <div className="pdf-list">
        {pdfs.map((pdf, index) => (
          <div key={index} className="pdf-item">
            <span>{pdf.name}</span>
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