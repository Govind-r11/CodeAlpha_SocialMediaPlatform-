const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");

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

            setTimeout(() => {
                window.location.href = "index.html";
            }, 700);
        }

    } catch (error) {
        console.error("Login error:", error);
        authMessage.textContent = "Something went wrong!";
        authMessage.style.color = "red";
    }
});
