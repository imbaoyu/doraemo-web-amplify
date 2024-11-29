import React, { useState } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { FaFile } from 'react-icons/fa';
import type { UploadDataWithPathInput } from '@aws-amplify/storage';

interface PdfFile {
  name: string;
  url: string;
}

function FileWidget() {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const user = await getCurrentUser();
      const path = `user-documents/${user.userId}/${Date.now()}-${file.name}`;
      
      const uploadInput: UploadDataWithPathInput = {
        path,
        data: file,
        options: {
          contentType: file.type,
        }
      };
      
      await uploadData(uploadInput).result;
      setPdfs(prev => [...prev, { name: file.name, url: path }]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="pdf-widget">
      <h3>Documents</h3>
      <div className="upload-section">
        <label className="file-upload-label">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
          <FaFile className="media-icon" />
          <span>Upload Document</span>
        </label>
      </div>
      <div className="pdf-list">
        {pdfs.map((pdf, index) => (
          <div key={index} className="pdf-item">
            <span>{pdf.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileWidget;