const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const Post = require("./models/Post");
const Follow = require("./models/Follow");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Image Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "public/uploads/"));
    },
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"));
        }
    }
});

// Middleware
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public")));

// Home Route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// User Registration API
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        const existingUser = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "Registration successful!"
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Server error during registration."
        });
    }
});

// User Login API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        req.session.userId = user._id;

        res.json({
            message: "Login successful!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Server error during login."
        });
    }
});

// Check User Login
app.get("/api/check-login", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                loggedIn: false,
                message: "Please login first."
            });
        }

        const user = await User.findById(req.session.userId)
            .select("-password");

        if (!user) {
            req.session.destroy(() => { });

            return res.status(401).json({
                loggedIn: false,
                message: "User not found."
            });
        }

        res.json({
            loggedIn: true,
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error."
        });
    }
});

// User Logout API
app.post("/api/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful!"
        });
    });
});

// Create Post API with Image Upload
app.post(
    "/api/posts",
    (req, res, next) => {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }
        next();
    },
    upload.single("image"),
    async (req, res) => {
        try {
            const content = req.body.content || "";

            if (!content.trim() && !req.file) {
                return res.status(400).json({
                    message: "Write something or upload an image."
                });
            }

            const newPost = new Post({
                user: req.session.userId,
                content: content.trim() || "Image post",
                image: req.file
                    ? "/uploads/" + req.file.filename
                    : ""
            });

            await newPost.save();

            res.status(201).json({
                message: "Post created successfully!",
                post: newPost
            });

        } catch (error) {
            console.error("Create post error:", error.message);

            res.status(500).json({
                message: "Server error while creating post."
            });
        }
    }
);

// Get All Posts API
app.get("/api/posts", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("user", "name")
            .populate("likes", "_id")
            .sort({ createdAt: -1 });

        res.status(200).json({
            posts,
            currentUserId: req.session.userId || null
        });

    } catch (error) {
        console.error("Get posts error:", error.message);

        res.status(500).json({
            message: "Server error while fetching posts."
        });
    }
});

// Get My Profile API
app.get("/api/profile", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const user = await User.findById(req.session.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const posts = await Post.find({
            user: req.session.userId
        })
            .populate("user", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            user,
            posts
        });

    } catch (error) {
        console.error("Get profile error:", error.message);

        res.status(500).json({
            message: "Server error while fetching profile."
        });
    }
});

// Update Profile API
app.put("/api/profile", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const { name, email } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            !name.trim() ||
            !email.trim()
        ) {
            return res.status(400).json({
                message: "Name and email are required."
            });
        }

        const existingUser = await User.findOne({
            email: email.trim().toLowerCase(),
            _id: { $ne: req.session.userId }
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.session.userId,
            {
                name: name.trim(),
                email: email.trim().toLowerCase()
            },
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.status(200).json({
            message: "Profile updated successfully!",
            user: updatedUser
        });

    } catch (error) {
        console.error("Update profile error:", error.message);

        res.status(500).json({
            message: "Server error while updating profile."
        });
    }
});

// Follow User API
app.post("/api/users/:id/follow", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const followerId = req.session.userId;
        const followingId = req.params.id;

        if (followerId.toString() === followingId) {
            return res.status(400).json({
                message: "You cannot follow yourself."
            });
        }

        const userToFollow = await User.findById(followingId);

        if (!userToFollow) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const existingFollow = await Follow.findOne({
            follower: followerId,
            following: followingId
        });

        if (existingFollow) {
            return res.status(409).json({
                message: "You are already following this user."
            });
        }

        await Follow.create({
            follower: followerId,
            following: followingId
        });

        res.status(201).json({
            message: "User followed successfully!"
        });

    } catch (error) {
        console.error("Follow error:", error.message);

        res.status(500).json({
            message: "Server error while following user."
        });
    }
});

// Unfollow User API
app.delete("/api/users/:id/follow", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const followerId = req.session.userId;
        const followingId = req.params.id;

        if (followerId.toString() === followingId) {
            return res.status(400).json({
                message: "You cannot unfollow yourself."
            });
        }

        const deletedFollow = await Follow.findOneAndDelete({
            follower: followerId,
            following: followingId
        });

        if (!deletedFollow) {
            return res.status(404).json({
                message: "You are not following this user."
            });
        }

        res.status(200).json({
            message: "User unfollowed successfully!"
        });

    } catch (error) {
        console.error("Unfollow error:", error.message);

        res.status(500).json({
            message: "Server error while unfollowing user."
        });
    }
});

// Get Followers API
app.get("/api/users/:id/followers", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const followers = await Follow.find({
            following: req.params.id
        }).populate("follower", "name email");

        res.status(200).json({
            count: followers.length,
            followers: followers.map(item => item.follower)
        });

    } catch (error) {
        console.error("Followers error:", error.message);

        res.status(500).json({
            message: "Server error while fetching followers."
        });
    }
});

// Get Following API
app.get("/api/users/:id/following", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const following = await Follow.find({
            follower: req.params.id
        }).populate("following", "name email");

        res.status(200).json({
            count: following.length,
            following: following.map(item => item.following)
        });

    } catch (error) {
        console.error("Following error:", error.message);

        res.status(500).json({
            message: "Server error while fetching following."
        });
    }
});

// Get All Users API
app.get("/api/users", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const currentUserId = req.session.userId;

        const users = await User.find({
            _id: { $ne: currentUserId }
        }).select("name createdAt");

        const following = await Follow.find({
            follower: currentUserId
        }).select("following");

        const followingIds = following.map(item =>
            item.following.toString()
        );

        const usersWithFollowStatus = users.map(user => ({
            _id: user._id,
            name: user.name,
            createdAt: user.createdAt,
            isFollowing: followingIds.includes(user._id.toString())
        }));

        res.status(200).json({
            users: usersWithFollowStatus
        });

    } catch (error) {
        console.error("Get users error:", error.message);

        res.status(500).json({
            message: "Server error while fetching users."
        });
    }
});

// Get Single User Profile API
app.get("/api/users/:id/profile", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("name createdAt");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const posts = await Post.find({
            user: user._id
        })
            .populate("user", "name")
            .sort({ createdAt: -1 });

        const followersCount = await Follow.countDocuments({
            following: user._id
        });

        const followingCount = await Follow.countDocuments({
            follower: user._id
        });

        const isFollowing = req.session.userId
            ? await Follow.exists({
                follower: req.session.userId,
                following: user._id
            })
            : false;

        res.status(200).json({
            user,
            posts,
            followersCount,
            followingCount,
            isFollowing: Boolean(isFollowing)
        });

    } catch (error) {
        console.error("Get user profile error:", error.message);

        res.status(500).json({
            message: "Server error while fetching profile."
        });
    }
});

// Like / Unlike Post API
app.post("/api/posts/:id/like", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        const userId = req.session.userId;

        const alreadyLiked = post.likes.some(
            id => id.equals(userId)
        );

        if (alreadyLiked) {
            await Post.findByIdAndUpdate(req.params.id, {
                $pull: { likes: userId }
            });

            return res.json({
                message: "Post unliked successfully!",
                liked: false
            });
        }

        await Post.findByIdAndUpdate(req.params.id, {
            $addToSet: { likes: userId }
        });

        res.json({
            message: "Post liked successfully!",
            liked: true
        });

    } catch (error) {
        console.error("Like error:", error.message);

        res.status(500).json({
            message: "Server error while liking post."
        });
    }
});

// Create Comment API
app.post("/api/posts/:id/comments", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const { content } = req.body;

        if (typeof content !== "string" || !content.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty."
            });
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        post.comments.push({
            user: req.session.userId,
            content: content.trim()
        });

        await post.save();

        res.status(201).json({
            message: "Comment added successfully!"
        });

    } catch (error) {
        console.error("Create comment error:", error.message);

        res.status(500).json({
            message: "Server error while adding comment."
        });
    }
});

// Get Comments API
app.get("/api/posts/:id/comments", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("comments.user", "name");

        if (!post) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        res.status(200).json({
            comments: post.comments
        });

    } catch (error) {
        console.error("Get comments error:", error.message);

        res.status(500).json({
            message: "Server error while fetching comments."
        });
    }
});

// Multer Error Handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "Image size must be less than 5 MB."
            });
        }

        return res.status(400).json({
            message: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            message: error.message
        });
    }

    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error("MongoDB connection failed:", error.message);
    });
