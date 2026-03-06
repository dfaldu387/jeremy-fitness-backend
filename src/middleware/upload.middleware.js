const multer = require('multer');
const path = require('path');
const fs = require('fs');

const profileUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profile_pictures');

if (!fs.existsSync(profileUploadDir)) {
    fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${req.user.id}-${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const foodUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'food_images');

if (!fs.existsSync(foodUploadDir)) {
    fs.mkdirSync(foodUploadDir, { recursive: true });
}

const foodStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, foodUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${req.user.id}-${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
};

const upload = multer({
    storage: profileStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB
});

const foodImageUpload = multer({
    storage: foodStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB
});

module.exports = { upload, foodImageUpload };
