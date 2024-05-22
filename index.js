const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const http = require('http');
const socketIO = require('socket.io');
const cookieparser = require("cookie-parser");
require("dotenv").config();

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIO(server);

mongoose
  .connect("mongodb://localhost:27017/UserDB")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    password: String,
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

const generateAuthToken = (userId) => {
  try {
    const token = jwt.sign({ _id: userId }, process.env.SECRET_KEY);
    return token;
  } catch (error) {
    throw error;
  }
};

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profilePicture: String,
    productImages: [
      {
        image: String,
        caption: String,
      },
    ],
    skills: String,
    expertise: String,
  },
  { collection: "profiles" }
);

const Profile = mongoose.model("Profile", profileSchema);

app.use(express.json());
app.use(cors());
app.use(cookieparser());

app.post("/register", async (req, res) => {
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
      res.cookie("jwt", token, {
        expires: new Date(Date.now() + 30000),
        httpOnly: true,
      });

      return res.status(201).json({
        token: generateAuthToken(user._id),
        userId: user._id,
        message: `${userData.username} added`,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: err, message: "Internal Server Error" });
    }
  }
});

app.post("/upload", upload.single("file"), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.status(200).json({ imageUrl: file.path });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: err, message: "Internal Server Error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid login credentials!!!" });
    }

    const token = jwt.sign({ _id: user._id }, 'thisisthesecuritytokengeneratedbyme');

    console.log("Received token:", token);

    if (!token) {
      return res.status(401).json({ message: "Token is required" });
    }

    const decodedToken = jwt.verify(token,"thisisthesecuritytokengeneratedbyme");

    console.log("Decoded token:", decodedToken);

    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid token" });
    }
   
    return res.status(200).json({ token: token, userId: user._id, message: "Login successful" });
  } catch (err) {
    console.error("Error:", err);
    return res .status(500).json({ error: err, message: "Internal server error" });
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
    res.status(500).json({ error: err, message: "Internal Server Error" });
  }
});

app.post( "/store-profile", upload.single("profilePicture"),async (req, res) => {
    try {
      const token = req.headers.authorization.slice(7);
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
      console.log(decodedToken);

      if (!decodedToken) {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }

      const userId = decodedToken._id;
      const profilePicture = req.file ? req.file.path : null;
      let productImages = req.body.productImages? JSON.parse(req.body.productImages): [];
      const skills = req.body.skills;
      const expertise = req.body.expertise;
      productImages = productImages.map(product => ({
        image: product.image,
        caption: product.caption
      }));

      console.log(`Product Images:${productImages}`);

      const profileData = {
        userId: userId,
        profilePicture: profilePicture,
        productImages: productImages,
        skills: skills,
        expertise: expertise,
      };

      await Profile.create(profileData);

      res.status(200).json({ success: true, message: "Profile data stored successfully" });
    } catch (err) {
      console.error("Error saving profile:", err);
      res.status(500).json({
        success: false,
        error: err,
        message: "Internal Server Error" + err,
      });
    }
  }
);
app.post("/store-product",upload.single("product-image-input") ,async (req, res) => {
  try {
    const token = req.headers.authorization.slice(7);
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    if (!decodedToken) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const userId = decodedToken._id;
    console.log(req.body);

    const productImages = req.body.productImages || [];
    const captions = req.body.captions || [];

    const products = productImages.map((image, index) => ({
      image,
      caption: captions[index] || ""
    }));
    console.log(products);

    const userinfo = await Profile.findOne({ userId });

    if (!userinfo) {
      console.log(`No user found`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    userinfo.productImages.push(...products);
    await userinfo.save();

    res.status(200).json({ success: true, message: "Product images stored successfully" });
  } catch (err) {
    console.error("Error storing product images:", err);
    res.status(500).json({
      success: false,
      error: err,
      message: "Internal Server Error",
    });
  }
});
app.get('/logout', function(req, res) {
  
  const token = req.headers.authorization.slice(7);
  if (!token) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  try {
    res.clearCookie('jwt'); 
    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
  
});

app.get('/search', async (req, res) => {
  try {
      const { caption } = req.query;
      const token = req.headers.authorization ? req.headers.authorization.slice(7) : null;
      
      if (!token) {
          console.log(`Token is missing`);
          return res.status(400).json({ error: true, message: "Token is missing" });
      }
      
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

      if (!caption) {
          return res.status(400).json({ error: true, message: "Caption is required for search" });
      }

      const profiles = await Profile.find({ "productImages.caption": { $regex: caption, $options: 'i' } }).populate('userId');

      if (!profiles || profiles.length === 0) {
          return res.status(404).json({ error: true, message: "No profiles found matching the caption" });
      }

      const filteredProfiles = profiles.filter(profile => profile.userId._id.toString() !== decodedToken._id);

      if (!filteredProfiles || filteredProfiles.length === 0) {
          return res.status(404).json({ error: true, message: "No profiles found matching the caption" });
      }

      const userIds = filteredProfiles.map(profile => profile.userId._id);

      const users = await User.find({ _id: { $in: userIds } });
      
      if (!users || users.length === 0) {
          return res.status(404).json({ error: true, message: "No users found matching the profiles" });
      }

      return res.status(200).json({ error: false, profiles: filteredProfiles, users });
      
  } catch (error) {
      console.error("Error searching profiles:", error);
      return res.status(500).json({ error: true, message: "Internal Server Error" });
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
    return res
      .status(500)
      .json({ error: err, message: "Internal Server Error" });
  }
});

app.get("/profile", async (req, res) => {
  try {
    const token =req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({ error: true, message: "You're not logged in." });
    }

    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log("profile id:",decodedToken);
    if (!decodedToken) {
      return res.status(401).json({ error: true, message: "Invalid token" });
    }

    const userId = decodedToken._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    const userProfile = await Profile.findOne({ userId: userId }).populate("userId");

    if (!userProfile) {
      return res.status(404).json({ error: true, message: "User profile not found." });
    }

    const combinedData = {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
      profile: {
        _id: userProfile._id,
        profilePicture: userProfile.profilePicture,
        productImages: userProfile.productImages,
        skills: userProfile.skills,
        expertise: userProfile.expertise,
      },
    };

    res.json(combinedData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

const messageSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
   },
  message: {
     type: String, 
     required: true
     },
  timestamp: { type: Date,
     default: Date.now
     }
});

const Message = mongoose.model('messages', messageSchema);


app.post('/sendMessage', async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if(!token){
      console.log(`Token not found`);
    }

    if(!recipientId){
      console.log(`receipientId is required`);
      return res.status(401)
    }
    if(!message){
      console.log(`No message received`);
      return res.status(401);
    }

    const decodedToken=jwt.verify(token , process.env.SECRET_KEY);
    if(!decodedToken){
      console.log(`Invalid token`);
    }
    const senderId = decodedToken._id;
    const newMessage = {
      senderId,
      recipientId,
      message,
      timestamp: Date.now()
    };

    const result = await Message.create(newMessage);

    console.log(`Message saved to database: ${message}`);

    res.status(200).json({ success: true, message: 'Message sent successfully', messageId: result.insertedId });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

app.get('/messages/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const messages = await Message.find({ recipientId: userId });
    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: true, message: "No messages found" });
    }

    const senderNames = [];
    for (const message of messages) {
      const sender = await User.findById(message.senderId);
      senderNames.push(sender.username);
    }

    return res.status(200).json({ error: false, messages, senderNames });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});