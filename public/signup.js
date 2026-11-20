// Signup Form
const signupForm = document.getElementById("signupForm");
const authMessage = document.getElementById("authMessage");

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
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

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        }

    } catch (error) {
        console.error("Signup error:", error);

        authMessage.textContent = "Something went wrong!";
        authMessage.style.color = "red";
    }
});
