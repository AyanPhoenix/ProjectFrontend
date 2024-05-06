function fetchUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error("Token not found in localStorage");
        return;
    }

    fetch('http://localhost:3000/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                console.error("Unauthorized access. Redirecting to login page...");
            }
            throw new Error("Failed to fetch user profile");
        }
        return response.json();
    })
    .then(data => {
        const { user, profile } = data;
        if (!user || !profile) {
            console.error("User profile data is missing or incomplete");
            return;
        }
        const { _id, username, email } = user;
        const { profilePicture, productImages, skills, expertise } = profile;

        document.getElementById('profile-username').textContent = username || "Username not available";
        document.getElementById('profile-email').textContent = email || "Email not available";
        document.getElementById('profile-skills').textContent = skills || "Skills not available";
        document.getElementById('profile-expertise').textContent = expertise || "Expertise not available";
        document.getElementById('profile-picture').src = profilePicture || "";
        
        const productImagesContainer = document.getElementById('product-images');
        productImagesContainer.innerHTML = '';
        productImages.forEach(product => {
            const img = document.createElement('img');
            img.src = product.image || "";
            img.alt = product.caption || "";
            productImagesContainer.appendChild(img);
        });
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
    });
}
const getUserId = () => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'userId') {
            return value;
        }
    }
    return null;
};
let products=[];
const saveProfile = async () => {
    const userId = getUserId();

    const formData = new FormData();
    formData.append('userId', userId);

    products.forEach(product => {
        formData.append('productImages[]', product.image); 
        formData.append('captions[]', product.caption);
    });
    console.log([formData]);
    try {
        const response = await fetch('http://localhost:3000/store-product', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        if (data.success) {
            alert('Profile saved successfully');
            window.location.reload();
        } else {
            alert('Error saving profile');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving profile');
    }
};

const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.imageUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image');
        return null;
    }
};

const addProduct = async () => {
    const productPictureFile = document.getElementById("product-image-input").files[0];
    const productCaption = document.getElementById("product-caption-input").value;

    if (productPictureFile) {
        const productPictureUrl = await uploadImage(productPictureFile);
        const product = {
            image: productPictureUrl,
            caption: productCaption
        };
        products.push(product);
        displayProducts(product);
        console.log(products);
        await saveProfile();
    }
};
const displayProducts= () => {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    products.forEach((product, index) => {
        productList.innerHTML += `
            <div>
                <img src="${product.image}" alt="${product.caption}" width="100px">
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
window.addEventListener('load', fetchUserProfile);

