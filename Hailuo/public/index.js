// Client-side JavaScript for 3D Model Display

const fileInput = document.getElementById('fileInput');
const photoPreview = document.getElementById('photoPreview');
const createModelBtn = document.getElementById('createModelBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

let uploadedPhotos = [];
let animationId = null;
let rotation = 0;

// Handle file input
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const photoData = {
                    file: file,
                    dataUrl: event.target.result
                };
                uploadedPhotos.push(photoData);
                displayPhotoPreview();
            };
            
            reader.readAsDataURL(file);
        }
    });
});

// Display photo previews
function displayPhotoPreview() {
    photoPreview.innerHTML = '';
    
    uploadedPhotos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        const img = document.createElement('img');
        img.src = photo.dataUrl;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => removePhoto(index);
        
        photoItem.appendChild(img);
        photoItem.appendChild(removeBtn);
        photoPreview.appendChild(photoItem);
    });
}

// Remove photo
function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    displayPhotoPreview();
}

// Create 3D Model (placeholder - draws first image on canvas)
createModelBtn.addEventListener('click', async () => {
    if (uploadedPhotos.length === 0) {
        alert('Please upload at least one photo first!');
        return;
    }
    
    // Simple example: display first photo on canvas
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Center and scale the image
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };
    img.src = uploadedPhotos[0].dataUrl;
    
    console.log(`Loaded ${uploadedPhotos.length} photo(s) for 3D model creation`);
});

// Animation functions
function animate() {
    rotation += 0.02;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Rotate canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // Draw a simple shape (placeholder for 3D model)
    if (uploadedPhotos.length > 0) {
        const img = new Image();
        img.src = uploadedPhotos[0].dataUrl;
        
        const scale = Math.min(canvas.width / 2 / img.width, canvas.height / 2 / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.globalAlpha = 0.8;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
        // Draw a simple rectangle if no photos
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 - 100, 200, 200);
    }
    
    ctx.restore();
    
    animationId = requestAnimationFrame(animate);
}

// Control buttons
startBtn.addEventListener('click', () => {
    if (!animationId) {
        animate();
    }
});

stopBtn.addEventListener('click', () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
});

resetBtn.addEventListener('click', () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    rotation = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Initial canvas setup
ctx.fillStyle = '#333';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('Upload photos and click "Create 3D Model"', canvas.width / 2, canvas.height / 2);
