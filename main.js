document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch(`http://localhost:3000/profile`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    const userProfile = await response.json();

    document.getElementById("profile-username").textContent =
      userProfile.userId.username;
    document.getElementById("profile-email").textContent = userProfile.userId.email;
    document.getElementById("profile-skills").textContent = userProfile.skills;
    document.getElementById("profile-expertise").textContent =
      userProfile.expertise;
    document.getElementById("profile-picture").src = userProfile.profilePicture;

    const productImagesContainer = document.getElementById("product-images");
    userProfile.productImages.forEach((image) => {
      const imgElement = document.createElement("img");
      imgElement.src = image.image;
      imgElement.alt = "Product Image";
      productImagesContainer.appendChild(imgElement);
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
});
