// Client-side JavaScript for 360° Head Video Generation

const fileInput = document.getElementById('fileInput');
const photoPreview = document.getElementById('photoPreview');
const createModelBtn = document.getElementById('createModelBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');
const videoContainer = document.getElementById('videoContainer');

let uploadedPhotos = [];
let videoUrl = null;

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
    
    // Update canvas preview
    previewImages();
}

// Remove photo
function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    displayPhotoPreview();
    
    if (uploadedPhotos.length === 0) {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Upload 2 photos of your head from different angles', canvas.width / 2, canvas.height / 2);
    }
}

// Generate 360° Video
createModelBtn.addEventListener('click', async () => {
    if (uploadedPhotos.length < 2) {
        alert('Please upload at least 2 photos for 360° video generation!');
        return;
    }
    
    createModelBtn.disabled = true;
    createModelBtn.textContent = 'Generating 360° Video...';
    statusDiv.textContent = 'Uploading images and generating video...';
    statusDiv.style.color = '#00aa44';
    
    try {
        // Upload first image
        const formData1 = new FormData();
        formData1.append('image', uploadedPhotos[0].file);
        
        const uploadResponse1 = await fetch('/upload', {
            method: 'POST',
            body: formData1
        });
        const uploadData1 = await uploadResponse1.json();
        
        if (!uploadData1.success) {
            throw new Error('Failed to upload first image');
        }
        
        // Upload second image
        const formData2 = new FormData();
        formData2.append('image', uploadedPhotos[1].file);
        
        const uploadResponse2 = await fetch('/upload', {
            method: 'POST',
            body: formData2
        });
        const uploadData2 = await uploadResponse2.json();
        
        if (!uploadData2.success) {
            throw new Error('Failed to upload second image');
        }
        
        statusDiv.textContent = 'Images uploaded. Requesting 360° video generation...';
        
        // Generate video with Minimax API
        const videoPayload = {
            model: "video-01",
            prompt: "Generate a smooth 360-degree rotation view of the person's head, showing all angles continuously from front to back and around, creating a complete orbital camera movement around the subject",
            first_frame_image: `http://localhost:3000${uploadData1.path}`,
            last_frame_image: `http://localhost:3000${uploadData2.path}`
        };
        
        const videoResponse = await fetch('/generate-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(videoPayload)
        });
        
        const videoData = await videoResponse.json();
        
        if (videoData.error) {
            throw new Error(videoData.error);
        }
        
        // Poll for video completion
        if (videoData.task_id) {
            statusDiv.textContent = 'Video generation started. Task ID: ' + videoData.task_id;
            pollVideoStatus(videoData.task_id);
        } else if (videoData.video_url) {
            displayVideo(videoData.video_url);
        } else {
            console.log('API Response:', videoData);
            statusDiv.textContent = 'Video request submitted. Check console for details.';
            statusDiv.style.color = '#ffaa00';
        }
        
    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.style.color = '#ff4444';
    } finally {
        createModelBtn.disabled = false;
        createModelBtn.textContent = 'Generate 360° Video';
    }
});

// Poll for video completion (if API returns task_id)
async function pollVideoStatus(taskId) {
    // Note: You'll need to implement a status endpoint in your server
    // This is a placeholder for the polling logic
    statusDiv.textContent = 'Polling for video status... (Task ID: ' + taskId + ')';
    
    // For now, just log the task ID
    console.log('Video generation task ID:', taskId);
    statusDiv.textContent = 'Video generation in progress. Task ID: ' + taskId + '. Check Minimax dashboard for status.';
    statusDiv.style.color = '#ffaa00';
}

// Display generated video
function displayVideo(url) {
    videoUrl = url;
    videoContainer.innerHTML = `
        <h3>Generated 360° Video</h3>
        <video controls autoplay loop style="max-width: 100%; border-radius: 8px; border: 2px solid #444;">
            <source src="${url}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div style="margin-top: 10px;">
            <a href="${url}" download style="color: #00aa44; text-decoration: none;">Download Video</a>
        </div>
    `;
    statusDiv.textContent = '✓ Video generated successfully!';
    statusDiv.style.color = '#00aa44';
    
    // Hide canvas, show video
    canvas.style.display = 'none';
}

// Show preview of uploaded images on canvas
function previewImages() {
    if (uploadedPhotos.length === 0) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (uploadedPhotos.length === 1) {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        };
        img.src = uploadedPhotos[0].dataUrl;
    } else {
        // Show both images side by side
        const img1 = new Image();
        const img2 = new Image();
        
        img1.onload = () => {
            const scale = Math.min(canvas.width / 2 / img1.width, canvas.height / img1.height);
            const x = canvas.width / 4 - (img1.width / 2) * scale;
            const y = (canvas.height / 2) - (img1.height / 2) * scale;
            ctx.drawImage(img1, x, y, img1.width * scale, img1.height * scale);
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('First Frame', canvas.width / 4, canvas.height - 20);
        };
        img1.src = uploadedPhotos[0].dataUrl;
        
        img2.onload = () => {
            const scale = Math.min(canvas.width / 2 / img2.width, canvas.height / img2.height);
            const x = 3 * canvas.width / 4 - (img2.width / 2) * scale;
            const y = (canvas.height / 2) - (img2.height / 2) * scale;
            ctx.drawImage(img2, x, y, img2.width * scale, img2.height * scale);
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Last Frame', 3 * canvas.width / 4, canvas.height - 20);
        };
        img2.src = uploadedPhotos[1].dataUrl;
    }
}

// Initial canvas setup
ctx.fillStyle = '#333';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('Upload 2 photos of your head from different angles', canvas.width / 2, canvas.height / 2);
