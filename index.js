
let frontHeadInput, sideHeadInput, processButton, frontPreview, sidePreview;

// Check if we're running in a browser environment (not Node.js)
if (typeof document !== 'undefined') {
    // Get references to the file input elements from the HTML
    frontHeadInput = document.getElementById('frontHeadInput');
    sideHeadInput = document.getElementById('sideHeadInput');
    processButton = document.getElementById('processButton');
    frontPreview = document.getElementById('frontHeadPreview');
    sidePreview = document.getElementById('sideHeadPreview');
    
    // Add event listeners to show previews immediately when files are selected
    frontHeadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            showSimplePreview(file, frontPreview, 'Front View');
        }
    });
    
    sideHeadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            showSimplePreview(file, sidePreview, 'Side View');
        }
    });
}

// Image requirements configuration
const IMAGE_REQUIREMENTS = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    minWidth: 300,
    minHeight: 300,
    maxWidth: 4000,
    maxHeight: 3000,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp']
};

// ============================================================================
// MEDIAPIPE FACELANDMARKER INTEGRATION (using tasks-vision bundle)
// ============================================================================

let faceLandmarker = null;
let faceLandmarkerInitialized = false;

/**
 * Wait for MediaPipe vision bundle to load
 * @returns {Promise<void>}
 */
function waitForVisionBundle() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 100;
        let attempts = 0;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            // Check multiple possible locations for the vision tasks
            const visionAvailable = 
                (typeof window.FaceLandmarker !== 'undefined') ||
                (typeof window.vision !== 'undefined' && window.vision.FaceLandmarker) ||
                (typeof tasks !== 'undefined' && tasks.vision && tasks.vision.FaceLandmarker);
            
            if (visionAvailable) {
                clearInterval(checkInterval);
                console.log('✅ MediaPipe vision bundle detected');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('MediaPipe vision bundle failed to load after 20 seconds'));
            }
        }, 200);
    });
}

/**
 * Initialize MediaPipe FaceLandmarker using the tasks-vision bundle
 * @returns {Promise<void>}
 */
async function initializeFaceLandmarker() {
    if (faceLandmarkerInitialized){
        return faceLandmarker;
    }
    
    console.log('Initializing MediaPipe FaceLandmarker...');
    
    try {
        // Wait for vision bundle to be available
        await waitForVisionBundle();
        
        // Try to find FaceLandmarker and FilesetResolver in different locations
        let FaceLandmarker, FilesetResolver;
        
        if (window.FaceLandmarker && window.FilesetResolver) {
            FaceLandmarker = window.FaceLandmarker;
            FilesetResolver = window.FilesetResolver;
            console.log('Using global window scope');
        } else if (window.vision) {
            FaceLandmarker = window.vision.FaceLandmarker;
            FilesetResolver = window.vision.FilesetResolver;
            console.log('Using window.vision scope');
        } else if (typeof tasks !== 'undefined' && tasks.vision) {
            FaceLandmarker = tasks.vision.FaceLandmarker;
            FilesetResolver = tasks.vision.FilesetResolver;
            console.log('Using tasks.vision scope');
        } else {
            throw new Error('FaceLandmarker not found in expected locations');
        }
        
        if (!FaceLandmarker || !FilesetResolver) {
            throw new Error('FaceLandmarker or FilesetResolver is undefined');
        }
        
        // Initialize the file resolver for WASM files
        console.log('Loading WASM files...');
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        console.log('Creating FaceLandmarker instance...');
        // Create FaceLandmarker instance
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
            },
            numFaces: 1,
            runningMode: "IMAGE",
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true
        });
        
        faceLandmarkerInitialized = true;
        console.log('✅ MediaPipe FaceLandmarker initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize FaceLandmarker:', error);
        console.log('Error details:', {
            message: error.message,
            stack: error.stack,
            windowKeys: Object.keys(window).filter(k => k.includes('Face') || k.includes('vision') || k.includes('tasks'))
        });
        throw new Error('MediaPipe initialization failed: ' + error.message);
    }
}

/**
 * Detect facial landmarks from an image file using MediaPipe FaceLandmarker
 * @param {File} imageFile - The image file to process
 * @returns {Promise<{landmarks: Array, width: number, height: number}>}
 */
function detectLandmarks(imageFile, viewType='front') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const img = new Image();
            
            img.onload = async () => {
                try {
                          // Detect landmarks
                    const results = faceLandmarker.detect(img);
                    //detect side face landmarks
                    if(viewType === 'side'){
                        // Detect landmarks
                        results = faceLandmarker.detect(img);
                    }
            
                    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                        // Get the first face's landmarks
                        const rawLandmarks = results.faceLandmarks[0];
                        
                        // Normalize landmarks to standard format
                        const landmarks = rawLandmarks.map(lm => ({
                            x: lm.x,  // Normalized x coordinate (0-1)
                            y: lm.y,  // Normalized y coordinate (0-1)
                            z: lm.z || 0  // Depth estimate
                        }));
                        
                        resolve({ 
                            landmarks, 
                            width: img.width, 
                            height: img.height,
                            transformationMatrix: results.facialTransformationMatrixes ? 
                                results.facialTransformationMatrixes[0] : null
                        });
                    } else {
                        reject(new Error('No face detected in image. Please ensure the face is clearly visible and well-lit.'));
                    }
                } catch (error) {
                    reject(new Error('Failed to detect landmarks: ' + error.message));
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(imageFile);
    });
}

/**
 * Calculate pose angles (yaw, pitch, roll) from facial landmarks
 * @param {Array} landmarks - Array of facial landmarks
 * @returns {{yaw: number, pitch: number, roll: number}}
 */
function calculatePose(landmarks) {
    // Key landmark indices for MediaPipe 478-point model
    const noseTip = landmarks[4];      // Nose tip
    const leftEye = landmarks[33];     // Left eye inner corner
    const rightEye = landmarks[263];   // Right eye inner corner
    const leftMouth = landmarks[61];   // Left mouth corner
    const rightMouth = landmarks[291]; // Right mouth corner
    const chin = landmarks[152];       // Chin point
    
    // Calculate eye center
    const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2,
        z: (leftEye.z + rightEye.z) / 2
    };
    
    // Calculate yaw (horizontal rotation)
    // Positive = face turned right, Negative = face turned left
    const yaw = Math.atan2(noseTip.x - eyeCenter.x, Math.abs(noseTip.z - eyeCenter.z) + 0.01) * (180 / Math.PI);
    
    // Calculate mouth center
    const mouthCenter = {
        x: (leftMouth.x + rightMouth.x) / 2,
        y: (leftMouth.y + rightMouth.y) / 2,
        z: (leftMouth.z + rightMouth.z) / 2
    };
    
    // Calculate pitch (vertical rotation)
    // Positive = face looking up, Negative = face looking down
    const pitch = Math.atan2(eyeCenter.y - chin.y, Math.abs(eyeCenter.z - chin.z) + 0.01) * (180 / Math.PI);
    
    // Calculate roll (tilt)
    // Positive = head tilted clockwise, Negative = head tilted counterclockwise
    const eyeDx = rightEye.x - leftEye.x;
    const eyeDy = rightEye.y - leftEye.y;
    const roll = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);
    
    return { yaw, pitch, roll };
}

/**
 * Align side landmarks to front view using rotation matrices
 * @param {Array} frontLandmarks - Front view landmarks
 * @param {Array} sideLandmarks - Side view landmarks
 * @param {Object} frontPose - Front view pose angles
 * @param {Object} sidePose - Side view pose angles
 * @returns {Array} Aligned side landmarks
 */
function alignLandmarks(frontLandmarks, sideLandmarks, frontPose, sidePose) {
    // Calculate rotation differences
    const yawDiff = sidePose.yaw - frontPose.yaw;
    const pitchDiff = sidePose.pitch - frontPose.pitch;
    const rollDiff = sidePose.roll - frontPose.roll;
    
    // Convert to radians
    const yawRad = yawDiff * (Math.PI / 180);
    const pitchRad = pitchDiff * (Math.PI / 180);
    const rollRad = rollDiff * (Math.PI / 180);
    
    console.log(`Rotation corrections - Yaw: ${yawDiff.toFixed(1)}°, Pitch: ${pitchDiff.toFixed(1)}°, Roll: ${rollDiff.toFixed(1)}°`);
    
    // Apply rotation to each landmark
    const alignedLandmarks = sideLandmarks.map(lm => {
        // Center the point around origin
        let x = lm.x - 0.5;
        let y = lm.y - 0.5;
        let z = lm.z;
        
        // Apply yaw rotation (around Y axis)
        let newX = x * Math.cos(yawRad) + z * Math.sin(yawRad);
        let newZ = -x * Math.sin(yawRad) + z * Math.cos(yawRad);
        x = newX;
        z = newZ;
        
        // Apply pitch rotation (around X axis)
        let newY = y * Math.cos(pitchRad) - z * Math.sin(pitchRad);
        newZ = y * Math.sin(pitchRad) + z * Math.cos(pitchRad);
        y = newY;
        z = newZ;
        
        // Apply roll rotation (around Z axis)
        newX = x * Math.cos(rollRad) - y * Math.sin(rollRad);
        newY = x * Math.sin(rollRad) + y * Math.cos(rollRad);
        
        // Return to normalized coordinates
        return {
            x: newX + 0.5,
            y: newY + 0.5,
            z: z
        };
    });
    
    return alignedLandmarks;
}

/**
 * Draw landmarks on a preview canvas
 * @param {HTMLElement} container - Container element for the canvas
 * @param {Array} landmarks - Array of landmarks to draw
 * @param {File} imageFile - Original image file
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} label - Label for the image
 */
function drawLandmarksOnPreview(container, landmarks, imageFile, width, height, label) {
    // Clear container
    container.innerHTML = '';
    
    // Create label
    const labelElement = document.createElement('p');
    labelElement.textContent = `${label} - ${landmarks.length} landmarks detected`;
    labelElement.style.textAlign = 'center';
    labelElement.style.margin = '10px 0 5px 0';
    labelElement.style.fontWeight = 'bold';
    labelElement.style.color = '#28a745';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const maxDisplaySize = 250;
    const scale = Math.min(maxDisplaySize / width, maxDisplaySize / height);
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.border = '2px solid #28a745';
    canvas.style.borderRadius = '8px';
    
    const ctx = canvas.getContext('2d');
    
    // Load and draw image
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Draw image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Draw all landmarks in green
            ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
            landmarks.forEach(lm => {
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1, 0, 2 * Math.PI);
                ctx.fill();
            });
            
            // Draw key landmarks in red (nose, eyes, mouth, chin)
            ctx.fillStyle = 'rgba(255, 0, 0, 1)';
            const keyIndices = [4, 33, 263, 61, 291, 152];
            keyIndices.forEach(idx => {
                if (landmarks[idx]) {
                    ctx.beginPath();
                    ctx.arc(
                        landmarks[idx].x * canvas.width, 
                        landmarks[idx].y * canvas.height, 
                        3, 0, 2 * Math.PI
                    );
                    ctx.fill();
                }
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
    
    // Add elements to container
    container.appendChild(labelElement);
    container.appendChild(canvas);
    container.style.backgroundColor = 'transparent';
    container.style.padding = '15px';
    container.style.textAlign = 'center';
}

// ============================================================================
// ORIGINAL FUNCTIONS
// ============================================================================

/**
 * Validates image dimensions by loading the image
 * @param {File} imageFile - The image file to validate
 * @returns {Promise<{width: number, height: number}>}
 */
function validateImageResolution(imageFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        
        img.onload = function() {
            URL.revokeObjectURL(url);
            
            if (this.width < IMAGE_REQUIREMENTS.minWidth || this.height < IMAGE_REQUIREMENTS.minHeight) {
                reject(`Image resolution too low. Minimum required: ${IMAGE_REQUIREMENTS.minWidth}x${IMAGE_REQUIREMENTS.minHeight}px. Current: ${this.width}x${this.height}px`);
                return;
            }
            
            if (this.width > IMAGE_REQUIREMENTS.maxWidth || this.height > IMAGE_REQUIREMENTS.maxHeight) {
                reject(`Image resolution too high. Maximum allowed: ${IMAGE_REQUIREMENTS.maxWidth}x${IMAGE_REQUIREMENTS.maxHeight}px. Current: ${this.width}x${this.height}px`);
                return;
            }
            
            resolve({
                width: this.width,
                height: this.height
            });
        };
        
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject('Failed to load image for resolution validation');
        };
        
        img.src = url;
    });
}

/**
 * Shows a simple image preview immediately when file is selected
 * @param {File} imageFile - The image file to display
 * @param {HTMLElement} container - The DOM element to display the image in
 * @param {string} label - Label for the image
 */
function showSimplePreview(imageFile, container, label) {
    container.innerHTML = '';
    
    const img = document.createElement('img');
    const url = URL.createObjectURL(imageFile);
    
    img.src = url;
    img.alt = label;
    img.style.maxWidth = '250px';
    img.style.maxHeight = '250px';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.border = '2px solid #ddd';
    img.style.borderRadius = '8px';
    img.style.objectFit = 'contain';
    
    const labelElement = document.createElement('p');
    labelElement.textContent = label;
    labelElement.style.textAlign = 'center';
    labelElement.style.margin = '10px 0 5px 0';
    labelElement.style.fontWeight = 'bold';
    labelElement.style.color = '#333';
    
    img.onload = function() {
        URL.revokeObjectURL(url);
    };
    
    container.appendChild(labelElement);
    container.appendChild(img);
    
    container.style.backgroundColor = 'transparent';
    container.style.padding = '15px';
    container.style.textAlign = 'center';
}

/**
 * Function to process user-uploaded head images with comprehensive validation
 * Enhanced with facial landmark detection and alignment using MediaPipe
 * @param {File} frontHead - Front view image file
 * @param {File} sideHead - Side view image file
 * @returns {Promise<Object>} Landmark data object
 */
async function getUserInfo(frontHead, sideHead) {
    try {
        // Check if both files are provided
        if (!frontHead || !sideHead) {
            throw new Error('Both front and side head images are required.');
        }

        // Validate file formats
        if (!IMAGE_REQUIREMENTS.allowedFormats.includes(frontHead.type)) {
            throw new Error(`Invalid front head image format. Supported formats: ${IMAGE_REQUIREMENTS.allowedFormats.join(', ')}`);
        }
        
        if (!IMAGE_REQUIREMENTS.allowedFormats.includes(sideHead.type)) {
            throw new Error(`Invalid side head image format. Supported formats: ${IMAGE_REQUIREMENTS.allowedFormats.join(', ')}`);
        }

        // Validate file sizes
        if (frontHead.size > IMAGE_REQUIREMENTS.maxFileSize) {
            throw new Error(`Front head image is too large. Maximum allowed: ${IMAGE_REQUIREMENTS.maxFileSize / (1024 * 1024)}MB. Current: ${(frontHead.size / (1024 * 1024)).toFixed(2)}MB`);
        }
        
        if (sideHead.size > IMAGE_REQUIREMENTS.maxFileSize) {
            throw new Error(`Side head image is too large. Maximum allowed: ${IMAGE_REQUIREMENTS.maxFileSize / (1024 * 1024)}MB. Current: ${(sideHead.size / (1024 * 1024)).toFixed(2)}MB`);
        }

        // Validate image resolutions
        console.log('📏 Validating image resolutions...');
        
        const frontDimensions = await validateImageResolution(frontHead);
        console.log(`✅ Front image resolution: ${frontDimensions.width}x${frontDimensions.height}px`);
        
        const sideDimensions = await validateImageResolution(sideHead);
        console.log(`✅ Side image resolution: ${sideDimensions.width}x${sideDimensions.height}px`);

        console.log('✅ All image validations passed!');
        
        // ========================================================================
        // Facial Landmark Detection and Alignment
        // ========================================================================
        
        // Initialize FaceLandmarker if not already initialized
        if (!faceLandmarkerInitialized) {
            console.log('⏳ Initializing MediaPipe FaceLandmarker (first time only)...');
            await initializeFaceLandmarker();
        }
        
        console.log('\n🔍 Starting facial landmark detection...');
        
        // Detect landmarks in front image
        console.log('📸 Processing front view...');
        const frontResult = await detectLandmarks(frontHead);
        console.log(`✅ Front view: ${frontResult.landmarks.length} landmarks detected`);
        
        // Detect landmarks in side image
        console.log('📸 Processing side view...');
        const sideResult = await detectLandmarks(sideHead);
        console.log(`✅ Side view: ${sideResult.landmarks.length} landmarks detected`);
        
        // Calculate pose for both images
        const frontPose = calculatePose(frontResult.landmarks);
        const sidePose = calculatePose(sideResult.landmarks);
        
        console.log('\n📐 Pose Analysis:');
        console.log(`   Front - Yaw: ${frontPose.yaw.toFixed(1)}°, Pitch: ${frontPose.pitch.toFixed(1)}°, Roll: ${frontPose.roll.toFixed(1)}°`);
        console.log(`   Side  - Yaw: ${sidePose.yaw.toFixed(1)}°, Pitch: ${sidePose.pitch.toFixed(1)}°, Roll: ${sidePose.roll.toFixed(1)}°`);
        
        // Align side landmarks to front view
        console.log('\n🔄 Aligning side view to front view coordinate system...');
        const alignedSideLandmarks = alignLandmarks(
            frontResult.landmarks,
            sideResult.landmarks,
            frontPose,
            sidePose
        );
        console.log('✅ Landmark alignment complete');
        
        // Update previews with landmarks
        if (frontPreview && sidePreview) {
            console.log('\n🎨 Updating visual previews with detected landmarks...');
            drawLandmarksOnPreview(
                frontPreview, 
                frontResult.landmarks, 
                frontHead, 
                frontResult.width, 
                frontResult.height,
                'Front View'
            );
            
            drawLandmarksOnPreview(
                sidePreview, 
                sideResult.landmarks, 
                sideHead, 
                sideResult.width, 
                sideResult.height,
                'Side View'
            );
        }
        
        // Prepare final output
        const landmarkData = {
            frontLandmarks: frontResult.landmarks,
            sideLandmarks: sideResult.landmarks,
            alignedSideLandmarks: alignedSideLandmarks,
            frontPose: frontPose,
            sidePose: sidePose,
            frontDimensions: { width: frontResult.width, height: frontResult.height },
            sideDimensions: { width: sideResult.width, height: sideResult.height },
            timestamp: new Date().toISOString()
        };
        
        console.log('\n✅ Processing complete! Landmark data ready for 3D modeling.');
        console.log('📊 Summary:', {
            frontLandmarks: landmarkData.frontLandmarks.length,
            sideLandmarks: landmarkData.sideLandmarks.length,
            alignedLandmarks: landmarkData.alignedSideLandmarks.length
        });
        console.log('\n💡 Access data via: window.landmarkData');
        
        // Return the processed data for further use
        return landmarkData;
        
    } catch (error) {
        console.error('❌ Processing failed:', error.message);
        throw error;
    }
}

// Add event listener for the process button
if (typeof document !== 'undefined' && processButton) {
    processButton.addEventListener('click', async (event) => {
        event.preventDefault();
        
        const frontHeadFile = frontHeadInput.files[0];
        const sideHeadFile = sideHeadInput.files[0];
        
        // Disable button during processing
        processButton.disabled = true;
        const originalText = processButton.textContent;
        const originalBg = processButton.style.backgroundColor;
        const originalColor = processButton.style.color;
        processButton.textContent = 'Processing...';
        processButton.style.backgroundColor = '#ffc107';
        processButton.style.color = '#000';
        
        try {
            // Process the uploaded images
            const landmarkData = await getUserInfo(frontHeadFile, sideHeadFile);
            
            // Success feedback
            processButton.textContent = '✓ Processing Complete!';
            processButton.style.backgroundColor = '#28a745';
            processButton.style.color = 'white';
            
            // Store landmark data globally for access by other functions
            window.landmarkData = landmarkData;
            
            console.log('\n🎉 Success! You can now proceed to 3D head model generation.');
            
        } catch (error) {
            // Error feedback
            processButton.textContent = '✗ Processing Failed';
            processButton.style.backgroundColor = '#dc3545';
            processButton.style.color = 'white';
            
            console.error('\n💥 Error details:', error);
            
            // Reset button after 3 seconds
            setTimeout(() => {
                processButton.textContent = originalText;
                processButton.style.backgroundColor = originalBg;
                processButton.style.color = originalColor;
                processButton.disabled = false;
            }, 3000);
        }
    });
}





