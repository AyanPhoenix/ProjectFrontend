// Registration form submission
document.getElementById('registration-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Handle registration logic here

    // Show profile completion section
    document.getElementById('registration').style.display = 'none';
    document.getElementById('profile-completion').style.display = 'block';
});

// Profile completion form submission
document.getElementById('profile-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Handle profile completion logic here

    // Show portfolio section
    document.getElementById('profile-completion').style.display = 'none';
    document.getElementById('portfolio').style.display = 'block';
});
