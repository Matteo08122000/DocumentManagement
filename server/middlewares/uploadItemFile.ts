import multer from "multer";
import path from "path";
import fs from "fs";

// Upload file singolo legato ad un elemento documento
const uploadItems = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(process.cwd(), "uploads", "items");
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const name = file.originalname.split("/").pop() || file.originalname;
      cb(null, `${Date.now()}-${name}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

export default uploadItems;
