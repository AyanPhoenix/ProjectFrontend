const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors"); 
const jwt=require('jsonwebtoken');
const fileupload=require('express-fileupload');
const cloudinary=require('cloudinary').v2;
          
cloudinary.config({ 
  cloud_name: 'dqqq2yixd', 
  api_key: '118828381467524', 
  api_secret: 'Dv7-q6IfNcKYTGbtdwxROh4NTsk' 
});

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
}, { collection: 'users' });
const User = mongoose.model("User", userSchema);

const generateAuthToken = (userId) => {
  try {
    const token = jwt.sign({ _id: userId }, 'thisisthesecuritytokengeneratedbyme');
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
  skills: String,
  expertise: String
}, { collection: 'profiles' });

const Profile = mongoose.model('Profile', profileSchema);

app.use(express.json());
app.use(fileupload({
  useTempFiles:true,
}));
app.use(cors());

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

      return res.status(201).json({ userId: user._id, message: `${userData.username} added` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

app.get("/get-userId", (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decodedToken = jwt.verify(token.split(" ")[1], 'thisisthesecuritytokengeneratedbyme');
    const userId = decodedToken._id;

    return res.status(200).json({ userId: userId });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }

    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// app.post('/store-profile', fileupload.single('profilePicture'), async (req, res) => {
//   try {
//     const profileData = req.body;
//     const profileImage = req.file;

//     if (!profileData.userId) {
//       return res.status(400).json({ message: "userId is required" });
//     }

//     if (!profileImage) {
//       return res.status(400).json({ message: "Profile picture is required" });
//     }

//     const result = await cloudinary.uploader.upload(profileImage.tempFilePath, {
//       folder: 'profile-pictures',
//       width: 250,
//       height: 250,
//       crop: 'fill'
//     });

//     const updatedProfile = {
//       profilePicture: result.secure_url,
//       skills: profileData.skills,
//       expertise: profileData.expertise
//     };

//     await Profile.findOneAndUpdate({ userId: profileData.userId }, updatedProfile);

//     res.status(200).json({ message: 'Profile data stored successfully', profile: updatedProfile });

//   } catch (err) {
//     console.error("Error storing profile data:", err);
//     res.status(500).json({ message: 'Failed to store profile data', error: err });
//   }
// });

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid login credentials!!!" });
    }

    const token = generateAuthToken(user._id);

    console.log("Received token:", token);

    if (!token) {
      return res.status(401).json({ message: "Token is required" });
    }

    const decodedToken = jwt.verify(token, 'thisisthesecuritytokengeneratedbyme');

    console.log("Decoded token:", decodedToken);

    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid token" });
    }

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