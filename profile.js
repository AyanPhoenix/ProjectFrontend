let products = [];

document
  .getElementById("profile-picture-input")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];
    const profilePictureUrl = await uploadImage(file);
    document.getElementById("profile-picture").src = profilePictureUrl;
  });

const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    console.log(data);
    return data.imageUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Error uploading image");
    return null;
  }
};

const addProduct = async () => {
  const productPictureFile = document.getElementById("product-image-input")
    .files[0];

  const productCaption = document.getElementById("product-caption-input").value;

  if (productPictureFile) {
    const productPictureUrl = await uploadImage(productPictureFile);

    const product = {
      image: productPictureUrl,
      caption: productCaption,
    };
    products.push(product);
    console.log(products);
    displayProducts();
  }
  //   console.log("Sub");
};

const displayProducts = () => {
  const productList = document.getElementById("product-list");
  productList.innerHTML = "";
  products.forEach((product, index) => {
    productList.innerHTML += `
            <div>
                <img src="${product.image}" alt="${product.caption}" width="100">
                <span>${product.caption}</span>
                <button onclick="removeProduct(${index})">Remove</button>
            </div>
        `;
  });
};

const removeProduct = (index) => {
  products.splice(index, 1);
  displayProducts();
};
const getUserId = () => {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "userId") {
      return value;
    }
  }
  return null;
};

const saveProfile = async () => {
  const profilePictureInput = document.getElementById("profile-picture-input");
  const profilePictureFile = profilePictureInput.files[0];
  let profilePicture = document.getElementById("profile-picture").src;
  const skills = document.getElementById("skills-input").value;
  const expertise = document.getElementById("expertise-input").value;
  const userId = getUserId();

  //   if (profilePictureFile) {
  //     const profilePictureUrl = await uploadImage(profilePictureFile);
  //     profilePicture = profilePictureUrl;
  //   }

  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("profilePicture", profilePictureFile);
  formData.append("productImages", JSON.stringify(products));
  formData.append("skills", skills);
  formData.append("expertise", expertise);

  try {
    fetch("http://localhost:3000/store-profile", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Profile saved successfully");
          location.href = "profile_page.html";
        } else {
          alert("Error saving profile");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error saving profile");
      });
  } catch (error) {
    console.error("Error:", error);
    alert("Error saving profile");
  }
};
