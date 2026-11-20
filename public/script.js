console.log("SocialConnect frontend loaded successfully!");
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");

// Signup API
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        authMessage.textContent = data.message;
        authMessage.style.color = response.ok ? "green" : "red";

        if (response.ok) {
            signupForm.reset();
        }

    } catch (error) {
        authMessage.textContent = "Something went wrong!";
        authMessage.style.color = "red";
    }
});

// Login API
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        authMessage.textContent = data.message;
        authMessage.style.color = response.ok ? "green" : "red";

        if (response.ok) {
            loginForm.reset();

            // Hide Welcome and Login/Signup
            document.querySelector(".welcome").style.display = "none";
            document.querySelector(".auth-container").style.display = "none";

            // Show Dashboard Sections
            document.querySelector(".create-post").style.display = "block";
            document.querySelector(".posts-section").style.display = "block";
            document.querySelector(".discover-users").style.display = "block";

            // Refresh Posts and Users
            loadPosts();
            loadUsers();
        }

    } catch (error) {
        authMessage.textContent = "Something went wrong!";
        authMessage.style.color = "red";
    }
});

// Create Post Form
const postForm = document.getElementById("postForm");
const postContent = document.getElementById("postContent");
const postsContainer = document.getElementById("postsContainer");

// Publish Post with Image
postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const content = postContent.value.trim();
    const imageInput = document.getElementById("postImage");
    const image = imageInput.files[0];

    if (!content && !image) {
        alert("Write something or select an image!");
        return;
    }

    // Check image size (5 MB maximum)
    if (image && image.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5 MB!");
        return;
    }

    const formData = new FormData();
    formData.append("content", content);

    if (image) {
        formData.append("image", image);
    }

    try {
        const response = await fetch("/api/posts", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(data.message);

        postForm.reset();
        loadPosts();

    } catch (error) {
        console.error("Create post error:", error);
        alert("Something went wrong!");
    }
});

// Load All Posts
async function loadPosts() {
    try {
        const response = await fetch("/api/posts");
        const data = await response.json();

        postsContainer.replaceChildren();

        if (!data.posts || data.posts.length === 0) {
            postsContainer.textContent = "No posts available yet.";
            return;
        }

        data.posts.forEach((post) => {
            const card = document.createElement("div");
            card.className = "post-card";

            const author = document.createElement("h3");
            author.textContent = post.user?.name || "Unknown User";

            const content = document.createElement("p");
            content.textContent = post.content;
            // Display Post Image
            let postImage = null;

            if (post.image) {
                postImage = document.createElement("img");
                postImage.src = post.image;
                postImage.alt = "Post Image";

                postImage.style.width = "100%";
                postImage.style.maxHeight = "400px";
                postImage.style.objectFit = "contain";
                postImage.style.borderRadius = "10px";
                postImage.style.marginTop = "10px";
            }

            const date = document.createElement("span");
            date.className = "post-date";
            date.textContent = new Date(post.createdAt).toLocaleString();


            const likeButton = document.createElement("button");

            const likeCount = post.likes ? post.likes.length : 0;

            const currentUserId = data.currentUserId;

            const isLiked = post.likes.some(
                (user) => user._id === currentUserId
            );

            likeButton.textContent = isLiked
                ? `❤️ Liked (${likeCount})`
                : `🤍 Like (${likeCount})`;
            likeButton.className = "like-button";

            likeButton.addEventListener("click", async () => {
                try {
                    const response = await fetch(`/api/posts/${post._id}/like`, {
                        method: "POST"
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        alert(data.message);
                        return;
                    }

                    loadPosts();

                } catch (error) {
                    console.error("Like error:", error);
                }
            });

            // Comments Section
            const commentsContainer = document.createElement("div");
            commentsContainer.className = "comments-container";

            const commentsHeading = document.createElement("h4");
            commentsHeading.textContent = "Comments";

            const commentsList = document.createElement("div");
            commentsList.className = "comments-list";

            // Comment Form
            const commentForm = document.createElement("form");
            const commentInput = document.createElement("input");

            commentInput.type = "text";
            commentInput.placeholder = "Write a comment...";
            commentInput.required = true;

            const commentButton = document.createElement("button");
            commentButton.type = "submit";
            commentButton.textContent = "Comment";

            commentForm.append(commentInput, commentButton);

            commentForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const content = commentInput.value.trim();

                if (!content) return;

                try {
                    const response = await fetch(`/api/posts/${post._id}/comments`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ content })
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        alert(result.message);
                        return;
                    }

                    commentForm.reset();
                    loadComments(post._id, commentsList);

                } catch (error) {
                    console.error("Comment error:", error);
                }
            });

            commentsContainer.append(
                commentsHeading,
                commentsList,
                commentForm
            );

            card.append(author, content);

            if (postImage) {
                card.appendChild(postImage);
            }

            card.append(date, likeButton, commentsContainer);

            loadComments(post._id, commentsList);
            postsContainer.appendChild(card);

        });

    } catch (error) {
        console.error("Load posts error:", error);
        postsContainer.textContent = "Unable to load posts.";
    }
}

// Load posts when page opens
loadPosts();
// Load Comments Function
async function loadComments(postId, commentsList) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        const data = await response.json();

        commentsList.replaceChildren();

        if (!data.comments || data.comments.length === 0) {
            commentsList.textContent = "No comments yet.";
            return;
        }

        data.comments.forEach((comment) => {
            const commentBox = document.createElement("p");

            commentBox.textContent =
                `${comment.user?.name || "Unknown User"}: ${comment.content}`;

            commentsList.appendChild(commentBox);
        });

    } catch (error) {
        console.error("Load comments error:", error);
    }
}
// My Profile Button
const profileButton = document.getElementById("profileButton");
const profileSection = document.getElementById("profileSection");
const backToHome = document.getElementById("backToHome");

profileButton.addEventListener("click", loadProfile);

async function loadProfile() {
    try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        document.getElementById("profileName").textContent =
            data.user.name;

        document.getElementById("profileEmail").textContent =
            "Email: " + data.user.email;

        document.getElementById("profileJoinDate").textContent =
            "Joined: " + new Date(data.user.createdAt).toLocaleDateString();

        // Load Followers and Following
        const userId = data.user._id;

        const [followersResponse, followingResponse] = await Promise.all([
            fetch(`/api/users/${userId}/followers`),
            fetch(`/api/users/${userId}/following`)
        ]);

        const followersData = await followersResponse.json();
        const followingData = await followingResponse.json();

        if (followersResponse.ok && followingResponse.ok) {
            document.getElementById("followersCount").textContent =
                followersData.count;

            document.getElementById("followingCount").textContent =
                followingData.count;

            const followersList = document.getElementById("followersList");
            const followingList = document.getElementById("followingList");

            followersList.replaceChildren();
            followingList.replaceChildren();

            const followersHeading = document.createElement("h4");
            followersHeading.textContent = "Followers";

            followersList.appendChild(followersHeading);

            followersData.followers.forEach((user) => {
                const p = document.createElement("p");
                p.textContent = user.name;
                followersList.appendChild(p);
            });

            const followingHeading = document.createElement("h4");
            followingHeading.textContent = "Following";

            followingList.appendChild(followingHeading);

            followingData.following.forEach((user) => {
                const p = document.createElement("p");
                p.textContent = user.name;
                followingList.appendChild(p);
            });
        }

        const myPostsContainer =
            document.getElementById("myPostsContainer");

        myPostsContainer.replaceChildren();

        if (data.posts.length === 0) {
            myPostsContainer.textContent = "You haven't created any posts yet.";
        }

        data.posts.forEach((post) => {
            const postCard = document.createElement("div");
            postCard.className = "post-card";

            const postContent = document.createElement("p");
            postContent.textContent = post.content;

            const postDate = document.createElement("span");
            postDate.className = "post-date";
            postDate.textContent =
                new Date(post.createdAt).toLocaleString();

            postCard.append(postContent, postDate);
            myPostsContainer.appendChild(postCard);
        });

        document.querySelector(".welcome").style.display = "none";
        document.querySelector(".auth-container").style.display = "none";
        document.querySelector(".create-post").style.display = "none";
        document.querySelector(".posts-section").style.display = "none";

        profileSection.style.display = "block";

    } catch (error) {
        console.error("Profile error:", error);
        alert("Unable to load profile.");
    }
}

// Load Other User Profile
async function loadOtherProfile(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/profile`);
        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        // Display User Details
        document.getElementById("otherProfileName").textContent =
            data.user.name;

        document.getElementById("otherProfileJoinDate").textContent =
            "Joined: " +
            new Date(data.user.createdAt).toLocaleDateString();

        // Display Followers and Following
        document.getElementById("otherFollowersCount").textContent =
            data.followersCount;

        document.getElementById("otherFollowingCount").textContent =
            data.followingCount;

        // Other Profile Follow Button
        const otherFollowButton =
            document.getElementById("otherFollowButton");

        otherFollowButton.textContent =
            data.isFollowing ? "Unfollow" : "Follow";

        otherFollowButton.classList.toggle(
            "unfollow",
            data.isFollowing
        );

        otherFollowButton.onclick = async () => {
            const method = data.isFollowing ? "DELETE" : "POST";

            const response = await fetch(
                `/api/users/${userId}/follow`,
                { method }
            );

            const result = await response.json();

            if (!response.ok) {
                alert(result.message);
                return;
            }

            loadOtherProfile(userId);
        };

        // Load Other User Followers and Following
        const [followersResponse, followingResponse] = await Promise.all([
            fetch(`/api/users/${userId}/followers`),
            fetch(`/api/users/${userId}/following`)
        ]);

        const followersData = await followersResponse.json();
        const followingData = await followingResponse.json();

        // Display Followers List
        const otherFollowersList =
            document.getElementById("otherFollowersList");

        otherFollowersList.innerHTML = "<h4>Followers</h4>";

        followersData.followers.forEach((user) => {
            const name = document.createElement("p");
            name.textContent = user.name;
            otherFollowersList.appendChild(name);
        });

        if (followersData.followers.length === 0) {
            otherFollowersList.innerHTML += "<p>No followers yet.</p>";
        }

        // Display Following List
        const otherFollowingList =
            document.getElementById("otherFollowingList");

        otherFollowingList.innerHTML = "<h4>Following</h4>";

        followingData.following.forEach((user) => {
            const name = document.createElement("p");
            name.textContent = user.name;
            otherFollowingList.appendChild(name);
        });

        if (followingData.following.length === 0) {
            otherFollowingList.innerHTML += "<p>Not following anyone.</p>";
        }

        // Display User Posts
        const postsContainer =
            document.getElementById("otherPostsContainer");

        postsContainer.replaceChildren();

        if (data.posts.length === 0) {
            postsContainer.textContent = "No posts yet.";
        }

        data.posts.forEach((post) => {
            const postCard = document.createElement("div");
            postCard.className = "post-card";

            const postContent = document.createElement("p");
            postContent.textContent = post.content;

            const postDate = document.createElement("span");
            postDate.className = "post-date";
            postDate.textContent =
                new Date(post.createdAt).toLocaleString();

            postCard.append(postContent, postDate);
            postsContainer.appendChild(postCard);
        });

        // Hide Other Sections
        document.querySelector(".welcome").style.display = "none";
        document.querySelector(".auth-container").style.display = "none";
        document.querySelector(".create-post").style.display = "none";
        document.querySelector(".posts-section").style.display = "none";

        document.getElementById("profileSection").style.display = "none";

        // Show Other User Profile
        document.getElementById("otherProfileSection").style.display =
            "block";

    } catch (error) {
        console.error("Other profile error:", error);
        alert("Unable to load user profile.");
    }
}

// Back to Home
backToHome.addEventListener("click", async () => {
    profileSection.style.display = "none";

    document.getElementById("otherProfileSection").style.display = "none";

    await updateAuthUI();
});

// Back from Other User Profile
document.getElementById("backFromOtherProfile").addEventListener("click", async () => {
    document.getElementById("otherProfileSection").style.display = "none";

    await updateAuthUI();
});

// Edit Profile Elements
const editProfileButton = document.getElementById("editProfileButton");
const editProfileForm = document.getElementById("editProfileForm");
const cancelEditProfile = document.getElementById("cancelEditProfile");

const editName = document.getElementById("editName");
const editEmail = document.getElementById("editEmail");
const profileMessage = document.getElementById("profileMessage");

// Open Edit Profile Form
editProfileButton.addEventListener("click", () => {
    editName.value = document.getElementById("profileName").textContent;

    editEmail.value = document.getElementById("profileEmail")
        .textContent.replace("Email: ", "");

    editProfileForm.style.display = "block";
    profileMessage.textContent = "";
});

// Cancel Editing
cancelEditProfile.addEventListener("click", () => {
    editProfileForm.style.display = "none";
});

// Update Profile
editProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = editName.value.trim();
    const email = editEmail.value.trim();

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email })
        });

        const data = await response.json();

        if (!response.ok) {
            profileMessage.textContent = data.message;
            profileMessage.style.color = "red";
            return;
        }

        // Update Profile Details
        document.getElementById("profileName").textContent =
            data.user.name;

        document.getElementById("profileEmail").textContent =
            "Email: " + data.user.email;

        profileMessage.textContent = data.message;
        profileMessage.style.color = "green";

        editProfileForm.style.display = "none";

    } catch (error) {
        console.error("Update profile error:", error);

        profileMessage.textContent = "Something went wrong!";
        profileMessage.style.color = "red";
    }
});

// Store all users
let allUsers = [];

// Load Discover Users
async function loadUsers() {
    const usersContainer = document.getElementById("usersContainer");

    try {
        const response = await fetch("/api/users");
        const data = await response.json();

        if (!response.ok) {
            usersContainer.textContent = data.message;
            return;
        }

        allUsers = data.users;
        displayUsers(allUsers);

    } catch (error) {
        console.error("Load users error:", error);
        usersContainer.textContent = "Unable to load users.";
    }
}

// Display Users
function displayUsers(users) {
    const usersContainer = document.getElementById("usersContainer");

    usersContainer.replaceChildren();

    if (users.length === 0) {
        usersContainer.textContent = "No users found.";
        return;
    }

    users.forEach((user) => {
        const userCard = document.createElement("div");
        userCard.className = "user-card";

        const userName = document.createElement("h3");
        userName.textContent = user.name;

        userName.style.cursor = "pointer";

        userName.addEventListener("click", () => {
            loadOtherProfile(user._id);
        });

        const followButton = document.createElement("button");
        followButton.className = "follow-button";

        followButton.textContent = user.isFollowing
            ? "Following"
            : "Follow";

        if (user.isFollowing) {
            followButton.classList.add("unfollow");
        }

        followButton.addEventListener("click", async () => {
            await toggleFollow(user._id, user.isFollowing);
        });

        userCard.append(userName, followButton);
        usersContainer.appendChild(userCard);
    });
}

// Search Users
document.getElementById("searchUsers").addEventListener("input", (event) => {
    const searchText = event.target.value.toLowerCase().trim();

    const filteredUsers = allUsers.filter((user) =>
        user.name.toLowerCase().includes(searchText)
    );

    displayUsers(filteredUsers);
});

// Follow / Unfollow
async function toggleFollow(userId, isFollowing) {
    try {
        const response = await fetch(`/api/users/${userId}/follow`, {
            method: isFollowing ? "DELETE" : "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(data.message);
        await loadUsers();

    } catch (error) {
        console.error("Follow error:", error);
        alert("Something went wrong!");
    }
}

// Load users when page opens
loadUsers();

// Check Login Status on Page Load
async function updateAuthUI() {
    try {
        const response = await fetch("/api/check-login");
        const data = await response.json();

        const authContainer = document.querySelector(".auth-container");
        const welcome = document.querySelector(".welcome");
        const loginSignupLinks = document.querySelectorAll(
            ".topbar-actions .nav-icon-link"
        );

        if (data.loggedIn) {
            authContainer.style.display = "none";
            welcome.style.display = "none";

            document.querySelector(".create-post").style.display = "block";
            document.querySelector(".posts-section").style.display = "block";
            document.querySelector(".discover-users").style.display = "block";
            document.getElementById("logoutButton").style.display = "inline-block";

        } else {
            authContainer.style.display = "flex";
            welcome.style.display = "block";
            document.getElementById("logoutButton").style.display = "none";

            loginSignupLinks.forEach(link => {
                link.style.display = "flex";
            });
        }
    } catch (error) {
        console.error("Login status error:", error);
    }
}

updateAuthUI();

// Logout Functionality
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async () => {
    try {
        const response = await fetch("/api/logout", {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert("Logged out successfully!");
        window.location.href = "index.html";

    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to logout!");
    }
});
