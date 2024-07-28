let products = [];





const addProduct= async() => {
const file = document.getElementById('product-image-input').files[0];
const productCaption = document.getElementById('product-caption-input').value;
if (file) {
    const productImageUrl = await uploadImage(file);
    const product = {
        image: productImageUrl,
        caption: productCaption
    };
    products.push(product);
    displayProducts();
}
}

