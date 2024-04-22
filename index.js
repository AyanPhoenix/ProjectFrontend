const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors"); 

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

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profilePicture: String,
  skills: String,
  expertise: String
});

const Profile = mongoose.model('Profile', profileSchema);


app.use(express.json());
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
    User.create(userData)
      .then((user) => {
        console.log(userData.username, "added");
        return res.status(201).json({ userId: user._id, message: `${userData.username} added` });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      });
  }
});

app.post('/store-profile', (req, res) => {
  const profileData = req.body;

  const newProfile = new Profile({
      userId:profileData.userId,
      profilePicture: profileData.profilePicture,
      skills: profileData.skills,
      expertise: profileData.expertise
  });

  newProfile.save()
  .then(() => {
      res.status(200).json({ message: 'Profile data stored successfully' });
  })
  .catch(err => {
      res.status(500).json({ message: 'Failed to store profile data', error: err });
  });
});



app.post("/login", async (req, res) => {
  try {
    const username=req.body.username;
    const password=req.body.password;
    const email=req.body.email;
    const user = await User.findOne({ username: username });
    if (user) {
      if(user.password===password){
        return res.status(200).json({userId: user._id, message: "Login successful" });
      }
      else{
        return res.status(401).json({ message: "Invalid password!!!" });
      }     
    }
    else{
    return res.status(401).json({ message: "Invalid login credentials!!!" });
    }
  } catch (err) {
    console.error(err);
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