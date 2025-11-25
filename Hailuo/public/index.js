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

// Convert file to base64
async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                // Resize image to reduce base64 size
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max dimensions to keep file size reasonable
                const maxWidth = 1024;
                const maxHeight = 1024;
                
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with reduced quality
                const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(resizedBase64);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

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
        statusDiv.textContent = 'Please upload at least 2 photos';
        statusDiv.style.color = '#ff4444';
        return;
    }
    
    createModelBtn.disabled = true;
    createModelBtn.textContent = 'Generating 360° Video...';
    statusDiv.textContent = 'Uploading images and generating video...';
    statusDiv.style.color = '#00aa44';
    
    try {
        // Upload first image
        statusDiv.textContent = 'Uploading first image...';
        const formData1 = new FormData();
        formData1.append('image', uploadedPhotos[0].file);
        
        const uploadResponse1 = await fetch('/upload', {
            method: 'POST',
            body: formData1
        });
        
        const uploadData1 = await uploadResponse1.json();
        
        if (!uploadData1.success) {
            throw new Error(uploadData1.error || 'Upload failed');
        }
        
        // Upload second image
        statusDiv.textContent = 'Uploading second image...';
        const formData2 = new FormData();
        formData2.append('image', uploadedPhotos[1].file);
        
        const uploadResponse2 = await fetch('/upload', {
            method: 'POST',
            body: formData2
        });
        
        const uploadData2 = await uploadResponse2.json();
        
        if (!uploadData2.success) {
            throw new Error(uploadData2.error || 'Upload failed');
        }
        
        console.log('Upload successful:', uploadData1, uploadData2);
        statusDiv.textContent = 'Images uploaded. Converting to base64...';
        
        // Convert images to base64 for API
        const base64Image1 = await imageToBase64(uploadedPhotos[0].file);
        
        statusDiv.textContent = 'Requesting 360° video generation...';
        
        // Generate video with Minimax API
        const videoPayload = {
            model: "video-01",
            prompt: "Generate a smooth 360-degree rotation view of the person's head, showing all angles continuously from front to back and around, creating a complete orbital camera movement around the subject",
            first_frame_image: base64Image1
        };
        
        console.log('Sending video generation request:', videoPayload);
        
        const videoResponse = await fetch('/generate-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(videoPayload)
        });
        
        if (!videoResponse.ok) {
            throw new Error(`Server error: ${videoResponse.status} ${videoResponse.statusText}`);
        }
        
        const videoData = await videoResponse.json();
        console.log('Video generation response:', videoData);
        
        if (videoData.base_resp && videoData.base_resp.status_code === 0 && videoData.task_id) {
            // Start polling for video status
            pollVideoStatus(videoData.task_id);
        } else {
            throw new Error(videoData.base_resp?.status_msg || 'Video generation failed');
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
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
        try {
            attempts++;
            statusDiv.textContent = `Generating video... (${attempts}/${maxAttempts})`;

            const response = await fetch('/query-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task_id: taskId })
            });

            const data = await response.json();
            console.log('Poll response:', data);

            // Check if video is ready (MiniMax API returns status field)
            if (data.status === 'Success' && data.file_id) {
                statusDiv.textContent = 'Video generated successfully!';
                statusDiv.style.color = '#00aa44';
                displayVideo(data.file_id);
                return;
            } else if (data.status === 'Failed') {
                statusDiv.textContent = 'Video generation failed';
                statusDiv.style.color = '#ff4444';
                return;
            } else if (data.status === 'Preparing' || data.status === 'Processing') {
                // Still processing, continue polling
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                } else {
                    statusDiv.textContent = 'Timeout. Task ID: ' + taskId;
                    statusDiv.style.color = '#ffaa00';
                }
            } else {
                // Unknown status, log it and continue polling
                console.log('Unknown status:', data.status);
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                } else {
                    statusDiv.textContent = 'Timeout. Task ID: ' + taskId;
                    statusDiv.style.color = '#ffaa00';
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
            statusDiv.textContent = 'Error: ' + error.message;
            statusDiv.style.color = '#ff4444';
        }
    };

    poll();
}
// Display generated video
async function displayVideo(fileId) {
    try {
        statusDiv.textContent = 'Retrieving video URL...';
        
        const response = await fetch('/get-video-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file_id: fileId })
        });
        
        const data = await response.json();
        console.log('Video URL response:', data);
        
        if (data.file && data.file.download_url) {
            const videoUrl = data.file.download_url;
            
            videoContainer.innerHTML = `
                <h3>Generated 360° Video</h3>
                <video controls autoplay loop style="max-width: 100%; border-radius: 8px; border: 2px solid #444;">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div style="margin-top: 10px;">
                    <a href="${videoUrl}" download style="color: #00aa44; text-decoration: none;">Download Video</a>
                </div>
            `;
            statusDiv.textContent = '✓ Video generated successfully!';
            statusDiv.style.color = '#00aa44';
            
            // Hide canvas, show video
            canvas.style.display = 'none';
        } else {
            throw new Error('No download URL in response');
        }
    } catch (error) {
        console.error('Error displaying video:', error);
        statusDiv.textContent = 'Error retrieving video: ' + error.message;
        statusDiv.style.color = '#ff4444';
    }
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