const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log(file)
        const uploadPath = path.join(__dirname, '/public/upload/productsheet/');

        // Ensure the folder exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, '-'); // optional: replace spaces
        cb(null, `${timestamp}-${safeName}`);
    }
});

// const fileFilter = (req, file, cb) => {
//   const isCSV = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
//   if (isCSV) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only CSV files are allowed!'), false);
//   }
// };

const uploaderProduct = multer({ storage });

module.exports = uploaderProduct;
