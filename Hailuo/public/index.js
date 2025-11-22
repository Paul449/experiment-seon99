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
    if (uploadedPhotos.length < 3) {
        statusDiv.textContent = 'Please upload 3 photos (front, side, back)';
        statusDiv.style.color = '#ff4444';
        return;
    }
    
    createModelBtn.disabled = true;
    createModelBtn.textContent = 'Generating Videos...';
    statusDiv.textContent = 'Preparing images...';
    statusDiv.style.color = '#00aa44';
    
    try {
        // Convert all 3 images to base64
        statusDiv.textContent = 'Converting images to base64...';
        const base64Image1 = await imageToBase64(uploadedPhotos[0].file); // Front
        const base64Image2 = await imageToBase64(uploadedPhotos[1].file); // Side
        const base64Image3 = await imageToBase64(uploadedPhotos[2].file); // Back
        
        // Generate first video: Front to Side
        statusDiv.textContent = 'Requesting first video (Front → Side)...';
        const videoPayload1 = {
            first_frame_image: base64Image1,
            end_frame_image: base64Image2
        };
        
        const videoResponse1 = await fetch('/generate-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(videoPayload1)
        });
        
        if (!videoResponse1.ok) {
            throw new Error(`Server error: ${videoResponse1.status} ${videoResponse1.statusText}`);
        }
        
        const videoData1 = await videoResponse1.json();
        console.log('First video generation response:', videoData1);
        
        if (!videoData1.request_id) {
            throw new Error(videoData1.error || 'First video generation failed');
        }
        
        // Generate second video: Side to Back
        statusDiv.textContent = 'Requesting second video (Side → Back)...';
        const videoPayload2 = {
            first_frame_image: base64Image2,
            end_frame_image: base64Image3
        };
        
        const videoResponse2 = await fetch('/generate-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(videoPayload2)
        });
        
        if (!videoResponse2.ok) {
            throw new Error(`Server error: ${videoResponse2.status} ${videoResponse2.statusText}`);
        }
        
        const videoData2 = await videoResponse2.json();
        console.log('Second video generation response:', videoData2);
        
        if (!videoData2.request_id) {
            throw new Error(videoData2.error || 'Second video generation failed');
        }
        
        // Poll both videos
        statusDiv.textContent = 'Generating both videos...';
        await Promise.all([
            pollVideoStatus(videoData1.request_id, 1, 'Front → Side'),
            pollVideoStatus(videoData2.request_id, 2, 'Side → Back')
        ]);
        
    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.style.color = '#ff4444';
    } finally {
        createModelBtn.disabled = false;
        createModelBtn.textContent = 'Generate 360° Video';
    }
});


// Poll for video completion (if API returns request_id)
async function pollVideoStatus(requestId, videoNumber, label) {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
        try {
            attempts++;
            console.log(`Checking video ${videoNumber} status... (${attempts}/${maxAttempts})`);

            const response = await fetch('/query-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ request_id: requestId })
            });

            const data = await response.json();
            console.log(`Poll response for video ${videoNumber}:`, data);

            if (data.status === 'completed' && data.video?.url) {
                // Download video to server first
                await downloadAndDisplayVideo(data.video.url, requestId, videoNumber, label);
                return;
            } else if (data.status === 'failed') {
                console.error(`Video ${videoNumber} generation failed`);
                return;
            } else {
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                } else {
                    console.log(`Timeout for video ${videoNumber}. Request ID: ${requestId}`);
                }
            }
        } catch (error) {
            console.error(`Polling error for video ${videoNumber}:`, error);
        }
    };

    poll();
}

// Download video and display it
let completedVideos = [];

async function downloadAndDisplayVideo(videoUrl, requestId, videoNumber, label) {
    try {
        console.log(`Downloading video ${videoNumber}...`);
        
        const response = await fetch(`/download-video?video_url=${encodeURIComponent(videoUrl)}&request_id=${requestId}`);
        const result = await response.json();
        
        if (result.success) {
            completedVideos.push({ filename: result.filename, number: videoNumber, label });
            
            // Update status
            statusDiv.textContent = `Video ${videoNumber}/2 completed (${label})`;
            statusDiv.style.color = '#00aa44';
            
            // If both videos are done, display them
            if (completedVideos.length === 2) {
                displayVideos();
            }
        } else {
            throw new Error(result.error || 'Download failed');
        }
    } catch (error) {
        console.error('Download error:', error);
        statusDiv.textContent = 'Error downloading video: ' + error.message;
        statusDiv.style.color = '#ff4444';
    }
}

// Display both generated videos
function displayVideos() {
    // Sort by video number
    completedVideos.sort((a, b) => a.number - b.number);
    
    videoContainer.innerHTML = `
        <h3>Generated 360° Videos</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            ${completedVideos.map(video => `
                <div>
                    <h4 style="margin-bottom: 10px;">${video.label}</h4>
                    <video controls autoplay loop style="width: 100%; border-radius: 8px; border: 2px solid #444;">
                        <source src="/outputVideos/${video.filename}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div style="margin-top: 10px; text-align: center;">
                        <a href="/outputVideos/${video.filename}" download style="color: #00aa44; text-decoration: none;">📥 Download</a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    statusDiv.textContent = '✓ Both videos generated successfully!';
    statusDiv.style.color = '#00aa44';
    
    // Hide canvas, show videos
    canvas.style.display = 'none';
    
    // Reset for next generation
    completedVideos = [];
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
    } else if (uploadedPhotos.length === 2) {
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
            ctx.fillText('Front', canvas.width / 4, canvas.height - 20);
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
            ctx.fillText('Side', 3 * canvas.width / 4, canvas.height - 20);
        };
        img2.src = uploadedPhotos[1].dataUrl;
    } else if (uploadedPhotos.length >= 3) {
        // Show all three images
        const images = [new Image(), new Image(), new Image()];
        const labels = ['Front', 'Side', 'Back'];
        
        images.forEach((img, index) => {
            img.onload = () => {
                const scale = Math.min(canvas.width / 3 / img.width, canvas.height / img.height);
                const x = (index * canvas.width / 3) + (canvas.width / 6) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                ctx.fillStyle = '#fff';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(labels[index], (index * canvas.width / 3) + (canvas.width / 6), canvas.height - 20);
            };
            img.src = uploadedPhotos[index].dataUrl;
        });
    }
}

// Initial canvas setup
ctx.fillStyle = '#333';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('Upload 3 photos: Front, Side, and Back views', canvas.width / 2, canvas.height / 2);