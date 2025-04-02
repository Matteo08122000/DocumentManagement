import React from "react";

interface FileIconProps {
  fileType?: string | null; // può arrivare null o undefined
}

const FileIcon: React.FC<FileIconProps> = ({ fileType }) => {
  let iconName = "insert_drive_file";
  let colorClass = "text-gray-600";

  const type = fileType?.toLowerCase() || "";

  if (
    type.includes("excel") ||
    type.includes("spreadsheetml") ||
    type.includes("xls") ||
    type.includes("sheet")
  ) {
    iconName = "description";
    colorClass = "text-green-600";
  } else if (
    type.includes("word") ||
    type.includes("document") || // <- fix per mimetype word
    type.includes("doc")
  ) {
    iconName = "article";
    colorClass = "text-blue-600";
  } else if (type.includes("pdf")) {
    iconName = "picture_as_pdf";
    colorClass = "text-red-600";
  }

  return (
    <span className={`material-icons-round ${colorClass} mr-1`}>
      {iconName}
    </span>
  );
};

export default FileIcon;
