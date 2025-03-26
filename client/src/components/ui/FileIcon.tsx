import React from 'react';

interface FileIconProps {
  fileType: string;
}

const FileIcon: React.FC<FileIconProps> = ({ fileType }) => {
  let iconName = '';
  let colorClass = '';
  
  switch (fileType.toLowerCase()) {
    case 'excel':
      iconName = 'description';
      colorClass = 'text-green-600';
      break;
    case 'word':
      iconName = 'article';
      colorClass = 'text-blue-600';
      break;
    case 'pdf':
      iconName = 'picture_as_pdf';
      colorClass = 'text-red-600';
      break;
    default:
      iconName = 'insert_drive_file';
      colorClass = 'text-gray-600';
  }
  
  return (
    <span className={`material-icons-round ${colorClass} mr-1`}>
      {iconName}
    </span>
  );
};

export default FileIcon;
