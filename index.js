const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors"); 
const jwt=require('jsonwebtoken');
const multer=require('multer');
const path = require('path'); 
const fs = require('fs');
const cookieparser=require('cookie-parser');
require('dotenv').config();

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); 
  }
});

const upload = multer({ storage: storage });

const app = express();
const port = 3000;
          

mongoose
  .connect("mongodb://localhost:27017/UserDB")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });


  const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    tokens:[{
      token:{
        type:String,
        required:true,
      }
    }]
  }, { collection: 'users' });
  
const User = mongoose.model("User", userSchema);

const generateAuthToken = async(userId) => {
  try {
    const token = jwt.sign({ _id: userId }, process.env.SECRET_KEY);
    return token;
  } catch (error) {
    throw error;
  }
};

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profilePicture: String,
  productImages: [{
    image: String,
    caption: String
  }],
  skills: String,
  expertise: String
}, { collection: 'profiles' });

const Profile = mongoose.model('Profile', profileSchema);


app.use(express.json());
app.use(cors());
app.use(cookieparser());

app.post("/register", async(req, res) => {
  const userData = req.body;
  const existingUser = await User.findOne({ username: userData.username });
  const existingemail = await User.findOne({ email: userData.email });
  
  if (existingUser) {
    return res.status(401).json({ message: "User already exists" });
  } else if (existingemail) {
    return res.status(400).json({ message: "Email ID already exists" });
  } else {
    try {
      const user = await User.create(userData);
      const token = generateAuthToken(user._id);
      console.log("Token:", token);
      res.cookie("jwt",token ,{
        expires:new Date(Date.now()+30000),
        httpOnly:true,
      });

      return res.status(201).json({ token: generateAuthToken(user._id), userId: user._id, message: `${userData.username} added` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `http://localhost:3000/uploads/${file.filename}`;

    res.status(200).json({ imageUrl: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid login credentials!!!" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY);

    console.log("Received token:", token);

    if (!token) {
      return res.status(401).json({ message: "Token is required" });
    }

    const decodedToken = jwt.verify(token, 'thisisthesecuritytokengeneratedbyme');

    console.log("Decoded token:", decodedToken);

    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.cookie('jwt', token, {
      httpOnly: true,

    });

    return res.status(200).json({ userId: user._id, message: "Login successful" });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/email_check", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    } else {
      return res.status(200).json({ message: "User found" });
    }
  } catch (err) {
    console.log("Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post('/store-profile', upload.single('profilePicture'), async (req, res) => {
  try {
      const token = req.cookies.token; 
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
      
      if (!decodedToken) {
          return res.status(401).json({ success: false, message: "Invalid token" });
      }

      const userId = decodedToken._id;
      const profilePicture = req.file ? req.file.path : null;
      const productImages = req.body.productImages ? JSON.parse(req.body.productImages) : [];
      const skills = req.body.skills;
      const expertise = req.body.expertise;

      const profileData = {
          userId: userId,
          profilePicture: profilePicture,
          productImages: productImages,
          skills: skills,
          expertise: expertise
      };

      await Profile.create(profileData);

      res.status(200).json({ success: true, message: 'Profile data stored successfully' });
  } catch (err) {
      console.error('Error saving profile:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post("/modify", async (req, res) => {
  try {
    const { email, newpassword, conpassword } = req.body;

    if (!email || !newpassword || !conpassword) {
      return res.status(401).json({ message: "Missing required fields" });
    }

    if (newpassword !== conpassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newpassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});