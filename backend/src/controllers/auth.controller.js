import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";
const profilepics = [
  "https://i.pinimg.com/control1/1200x/2c/36/44/2c364466678be55dfacfe65c673844c1.jpg",
  "https://i.pinimg.com/control1/736x/e0/51/9e/e0519efc2ab6f5d7f6e83f0f8416f97d.jpg",
  "https://i.pinimg.com/736x/87/5b/4f/875b4fb82c44a038466807b0dcf884cc.jpg",
  "https://i.pinimg.com/736x/c8/83/77/c88377f325ece6cab00bc0e0482667fc.jpg",
  "https://i.pinimg.com/control1/736x/25/7d/1d/257d1d2e68d3ba8fe97668124d31ccbb.jpg",
  "https://i.pinimg.com/control1/736x/65/a2/9e/65a29e469fd6cb31c4558adccd8df3b7.jpg",
  "https://i.pinimg.com/control1/1200x/f8/b0/aa/f8b0aa8db7bde24901e484174611392d.jpg",
];
export const signupController = async (req, res) => {
  const { fullname, username, password } = req.body;

  try {
    if (!fullname || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be atleast 6 chars" });
    }
    const user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const num = Math.floor(Math.random() * 7);

    const newUser = new User({
      fullname,
      username,
      password: hashedPassword,
      profilePic: profilepics[num],
    });

    if (newUser) {
      await newUser.save();

      generateToken(newUser._id, res);
      return res.status(201).json({ message: "User created" });
    } else {
      return res(400).json({ message: "Error creating user" });
    }
  } catch (error) {
    console.error("Error in signup controller ", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const loginController = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be atleast 6 chars" });
    }
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "invalid credentials" });
    }
    const correctPass = await bcrypt.compare(password, user.password);
    if (!correctPass) {
      return res.status(400).json({ message: "invalid credentials" });
    }
    generateToken(user._id, res);
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("error in login controller", error);
    return res.status(500).json({ message: "server error" });
  }
};

export const logoutController = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logout successfull" });
  } catch (error) {
    console.error("error in logout controller", error);
    return res.status(500).json({ message: "server error" });
  }
};

export const changeprofileController = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const userId = req.user._id;

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true },
    );

    res.status(200).json({ message: "profile Ubdated" });
  } catch (error) {
    console.error("error in change profile controller", error);
    return res.status(500).json({ message: "server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("error in check auth controller", error);
    return res.status(500).json({ message: "server error" });
  }
};
