import React, { useState } from 'react';

interface PdfFile {
  name: string;
  url: string;
}

function PdfWidget() {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      // TODO: Implement actual file upload to S3
      // For now, just simulate adding to the list
      setPdfs(prev => [...prev, { name: file.name, url: '#' }]);
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
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
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

export default PdfWidget;