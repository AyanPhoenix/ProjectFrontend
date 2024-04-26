let products = [];

document.getElementById('profile-picture-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const profilePictureUrl = await uploadImage(file);
    document.getElementById('profile-picture').src = profilePictureUrl;
});

document.getElementById('product-image-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const productImageUrl = await uploadImage(file);
    const product = {
        image: productImageUrl,
        caption: document.getElementById('product-caption-input').value
    };
    products.push(product);
    displayProducts();
});

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
    }
};

const addProduct = () => {
    const productImageUrl = document.getElementById('product-image-input').value;
    const productCaption = document.getElementById('product-caption-input').value;
    const product = {
        image: productImageUrl,
        caption: productCaption
    };
    products.push(product);
    displayProducts();
};

const displayProducts = () => {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
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
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'userId') {
            return value;
        }
    }
    return null;
};


const saveProfile = async () => {
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePictureFile = profilePictureInput.files[0];
    const profilePicture = document.getElementById('profile-picture').src;
    const skills = document.getElementById('skills-input').value;
    const expertise = document.getElementById('expertise-input').value;
    const userId = getUserId(); 

    if (profilePictureFile) {
        const profilePictureUrl = await uploadImage(profilePictureFile);
        document.getElementById('profile-picture').src = profilePictureUrl;
    }

    const formData = new FormData();
    formData.append('userId', userId); 
    formData.append('profilePicture', profilePictureFile);
    formData.append('productImages', JSON.stringify(products)); 
    formData.append('skills', skills);
    formData.append('expertise', expertise);

    try {
        fetch('http://localhost:3000/store-profile', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Profile saved successfully');
            } else {
                alert('Error saving profile');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error saving profile');
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving profile');
    }
}

