/**
 * 3D Haircut Application
 * This script handles user image uploads for front and side head views
 * and will process them for 3D haircut visualization using Three.js
 */
// Initialize DOM element variables
// These will hold references to the file input elements in the HTML
let frontHeadInput, sideHeadInput, processButton, frontPreview, sidePreview;

// Check if we're running in a browser environment (not Node.js)
// This prevents "document is not defined" errors when testing with Node.js
if (typeof document !== 'undefined') {
    // Get references to the file input elements from the HTML
    frontHeadInput = document.getElementById('frontHeadInput'); // Front view head image input
    sideHeadInput = document.getElementById('sideHeadInput');   // Side view head image input
    processButton = document.getElementById('processButton');   // Process button for triggering image analysis
    frontPreview = document.getElementById('frontHeadPreview'); // Front image preview container
    sidePreview = document.getElementById('sideHeadPreview');   // Side image preview container
    
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
    // File size limits (in bytes)
    maxFileSize: 5 * 1024 * 1024, // 5MB max file size
    // Resolution requirements
    minWidth: 300,     // Minimum width for good quality processing
    minHeight: 300,    // Minimum height for good quality processing
    maxWidth: 4000,    // Maximum width to prevent excessive processing
    maxHeight: 3000,   // Maximum height to prevent excessive processing
    // Supported formats
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp']
};

/**
 * Validates image dimensions by loading the image
 * @param {File} imageFile - The image file to validate
 * @returns {Promise<{width: number, height: number}>} Promise that resolves with image dimensions
 */
function validateImageResolution(imageFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        
        img.onload = function() {
            // Clean up the object URL to free memory
            URL.revokeObjectURL(url);
            
            // Check if dimensions meet requirements
            if (this.width < IMAGE_REQUIREMENTS.minWidth || this.height < IMAGE_REQUIREMENTS.minHeight) {
                reject(`Image resolution too low. Minimum required: ${IMAGE_REQUIREMENTS.minWidth}x${IMAGE_REQUIREMENTS.minHeight}px. Current: ${this.width}x${this.height}px`);
                return;
            }
            
            if (this.width > IMAGE_REQUIREMENTS.maxWidth || this.height > IMAGE_REQUIREMENTS.maxHeight) {
                reject(`Image resolution too high. Maximum allowed: ${IMAGE_REQUIREMENTS.maxWidth}x${IMAGE_REQUIREMENTS.maxHeight}px. Current: ${this.width}x${this.height}px`);
                return;
            }
            
            // Resolution is acceptable
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
 * @param {string} label - Label for the image (e.g., "Front View")
 */
function showSimplePreview(imageFile, container, label) {
    // Clear any existing content
    container.innerHTML = '';
    
    // Create image element
    const img = document.createElement('img');
    const url = URL.createObjectURL(imageFile);
    
    // Set image properties for simple preview
    img.src = url;
    img.alt = label;
    img.style.maxWidth = '250px';
    img.style.maxHeight = '250px';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.border = '2px solid #ddd';
    img.style.borderRadius = '8px';
    img.style.objectFit = 'contain';
    
    // Create simple label
    const labelElement = document.createElement('p');
    labelElement.textContent = label;
    labelElement.style.textAlign = 'center';
    labelElement.style.margin = '10px 0 5px 0';
    labelElement.style.fontWeight = 'bold';
    labelElement.style.color = '#333';
    
    // Clean up URL when image loads
    img.onload = function() {
        URL.revokeObjectURL(url);
    };
    
    // Add elements to container
    container.appendChild(labelElement);
    container.appendChild(img);
    
    // Remove the colored background and set clean styling
    container.style.backgroundColor = 'transparent';
    container.style.padding = '15px';
    container.style.textAlign = 'center';
}

/**
 * Function to process user-uploaded head images with comprehensive validation
 * @param {File} frontHead - The front view image file of the user's head
 * @param {File} sideHead - The side view image file of the user's head
 * 
 * TODO: Implement image processing logic
 * - ✅ Validate image formats and sizes
 * - ✅ Validate image resolution/dimensions
 * - Extract facial features and head dimensions
 * - Generate 3D head model using Three.js
 * - Apply haircut styles based on head shape
 */
async function getUserInfo(frontHead, sideHead) {
    try {
        // Check if both files are provided
        if (!frontHead || !sideHead) {
            console.error('Both front and side head images are required.');
            return;
        }

        // Validate file formats
        if (!IMAGE_REQUIREMENTS.allowedFormats.includes(frontHead.type)) {
            console.error(`Invalid front head image format. Supported formats: ${IMAGE_REQUIREMENTS.allowedFormats.join(', ')}`);
            return;
        }
        
        if (!IMAGE_REQUIREMENTS.allowedFormats.includes(sideHead.type)) {
            console.error(`Invalid side head image format. Supported formats: ${IMAGE_REQUIREMENTS.allowedFormats.join(', ')}`);
            return;
        }

        // Validate file sizes
        if (frontHead.size > IMAGE_REQUIREMENTS.maxFileSize) {
            console.error(`Front head image is too large. Maximum allowed: ${IMAGE_REQUIREMENTS.maxFileSize / (1024 * 1024)}MB. Current: ${(frontHead.size / (1024 * 1024)).toFixed(2)}MB`);
            return;
        }
        
        if (sideHead.size > IMAGE_REQUIREMENTS.maxFileSize) {
            console.error(`Side head image is too large. Maximum allowed: ${IMAGE_REQUIREMENTS.maxFileSize / (1024 * 1024)}MB. Current: ${(sideHead.size / (1024 * 1024)).toFixed(2)}MB`);
            return;
        }

        // Validate image resolutions for processing
        console.log('Validating image resolutions...');
        
        const frontDimensions = await validateImageResolution(frontHead);
        console.log(`Front image resolution: ${frontDimensions.width}x${frontDimensions.height}px ✅`);
        
        const sideDimensions = await validateImageResolution(sideHead);
        console.log(`Side image resolution: ${sideDimensions.width}x${sideDimensions.height}px ✅`);

        // All validations passed - ready for processing
        console.log('✅ All image validations passed! Ready for 3D processing...');
        
        // TODO: Continue with 3D processing...
        
    } catch (error) {
        console.error('❌ Image validation failed:', error);
    }
}

// Add event listener for the process button (only in browser environment)
if (typeof document !== 'undefined' && processButton) {
    /**
     * Event listener for the process button click
     * Handles user interaction to start image processing
     */
    processButton.addEventListener('click', (event) => {
        // Prevent default button behavior (like form submission)
        event.preventDefault();
        
        // Get the selected files from the file inputs
        const frontHeadFile = frontHeadInput.files[0];  // First selected file from front input
        const sideHeadFile = sideHeadInput.files[0];    // First selected file from side input
        
        // Process the uploaded images
        getUserInfo(frontHeadFile, sideHeadFile);
    });
}


//Process user-uploaded images while  extracting facial features

function processUploadedImages() {


}


