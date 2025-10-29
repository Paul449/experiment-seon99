class BrowserFace3DBuilder {
  constructor(options = {}) {
    this.zScale = options.zScale || 1.2;
    this.landmarks = options.landmarks || null;
    this.imageFile = options.imageFile || null;
    this.imageBitmap = null;
  }

  /**
   * Generate synthetic landmarks for testing when no landmarks provided
   */
  generateSyntheticLandmarks(width, height) {
    console.log('⚠️  Generating synthetic landmarks for testing...');
    console.log('💡 For best results, use landmark data from MediaPipe processing');
    
    const landmarks = [];
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const faceWidth = width * 0.3;
    const faceHeight = width * 0.4;
    
    // Generate 468 synthetic landmarks in face pattern
    for (let i = 0; i < 468; i++) {
      const angle = (i / 468) * Math.PI * 2;
      const radius = faceWidth * (0.3 + 0.7 * Math.random());
      
      const x = centerX + Math.cos(angle) * radius * (0.8 + 0.4 * Math.sin(angle * 3));
      const y = centerY + Math.sin(angle) * radius * faceHeight / faceWidth;
      const z = Math.random() * 10 - 5;
      
      landmarks.push([
        Math.max(0, Math.min(width, x)),
        Math.max(0, Math.min(height, y)),
        z
      ]);
    }
    
    return landmarks;
  }

  /**
   * Load image and prepare landmarks
   */
  async estimateLandmarks() {
    if (!this.imageFile) {
      throw new Error('No image file provided');
    }

    // Create image bitmap for processing
    this.imageBitmap = await createImageBitmap(this.imageFile);
    const width = this.imageBitmap.width;
    const height = this.imageBitmap.height;

    // If landmarks were provided (from MediaPipe processing), use them
    if (this.landmarks) {
      console.log('✅ Using pre-computed landmarks from MediaPipe processing');
      
      // Convert normalized landmarks to pixel coordinates
      const points = this.landmarks.map(lm => [
        lm.x * width,
        lm.y * height,
        lm.z || 0
      ]);
      
      const originalPoints = this.landmarks.map(lm => [lm.x * width, lm.y * height]);
      
      return { points, originalPoints, width, height };
    }
    
    // Fallback: Generate synthetic landmarks for testing
    console.log('📝 No pre-computed landmarks provided, generating synthetic landmarks...');
    const points = this.generateSyntheticLandmarks(width, height);
    const originalPoints = points.map(([x, y]) => [x, y]);
    
    console.log(`✅ Generated ${points.length} synthetic landmarks`);
    
    return { points, originalPoints, width, height };
  }

  /**
   * Normalize and center landmarks
   */
  normalizeAndCenter(points, width, height) {
    const maxDim = Math.max(width, height);
    return points.map(([x, y, z]) => {
      const nx = (x - width / 2) / maxDim;
      const ny = (y - height / 2) / maxDim;
      const nz = (z || 0) / maxDim;
      return [nx, -ny, -nz * this.zScale]; // Y up; bring nose forward with -Z
    });
  }

  /**
   * Generate UV coordinates for texture mapping
   */
  generateUVCoordinates(points, originalPoints, width, height) {
    return originalPoints.map(([x, y]) => {
      const u = x / width;
      const v = 1 - (y / height); // Flipped for texture
      return [u, v];
    });
  }

  /**
   * Triangulate points using Delaunator (browser version)
   */
  async triangulate(points3d) {
    const coords2d = points3d.map(([x, y]) => [x, y]);
    
    // Use dynamic import for Delaunator
    const DelaunatorModule = await import('https://cdn.skypack.dev/delaunator@5.0.1');
    const Delaunator = DelaunatorModule.default;
    
    const delaunay = Delaunator.from(coords2d);
    return Array.from(delaunay.triangles);
  }

  /**
   * Generate OBJ file content
   */
  toOBJ(vertices, triangles, uvCoords) {
    let obj = '';
    
    // Header
    obj += `# Browser-Generated 3D Face Model\n`;
    obj += `mtllib face.mtl\n\n`;
    
    // Vertices
    for (const [x, y, z] of vertices) {
      obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }
    obj += '\n';
    
    // UV coordinates
    for (const [u, v] of uvCoords) {
      obj += `vt ${u.toFixed(6)} ${v.toFixed(6)}\n`;
    }
    obj += '\n';
    
    // Material
    obj += `usemtl face_material\n`;
    
    // Faces
    for (let i = 0; i < triangles.length; i += 3) {
      const a = triangles[i] + 1;
      const b = triangles[i + 1] + 1;
      const c = triangles[i + 2] + 1;
      obj += `f ${a}/${a} ${b}/${b} ${c}/${c}\n`;
    }
    
    return obj;
  }

  /**
   * Generate MTL file content
   */
  createMTL() {
    let mtl = '';
    mtl += `# Browser-Generated Face Material\n`;
    mtl += `newmtl face_material\n`;
    mtl += `Ka 0.2 0.2 0.2\n`;
    mtl += `Kd 1.0 1.0 1.0\n`;
    mtl += `Ks 0.1 0.1 0.1\n`;
    mtl += `Ns 10.0\n`;
    mtl += `d 1.0\n`;
    mtl += `illum 2\n`;
    mtl += `map_Kd face_texture.jpg\n`;
    
    return mtl;
  }

  /**
   * Process image for texture (browser version)
   */
  async processImageTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = this.imageBitmap.width;
    canvas.height = this.imageBitmap.height;
    
    // Draw image
    ctx.drawImage(this.imageBitmap, 0, 0);
    
    // Optional: Enhance skin texture
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Slight skin tone enhancement
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.05);     // Red
      data[i + 1] = Math.min(255, data[i + 1] * 1.02); // Green  
      data[i + 2] = Math.min(255, data[i + 2] * 0.98);  // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob for download
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }

  /**
   * Build 3D model and return downloadable files
   */
  async build() {
    try {
      console.log('🎭 Building 3D face model in browser...');
      
      const { points, originalPoints, width, height } = await this.estimateLandmarks();
      console.log('🔍 Generating 3D mesh...');
      
      const verts = this.normalizeAndCenter(points, width, height);
      const uvCoords = this.generateUVCoordinates(points, originalPoints, width, height);
      const tris = await this.triangulate(verts);
      
      console.log('🎨 Processing texture...');
      const textureBlob = await this.processImageTexture();
      
      console.log('📄 Creating model files...');
      const objContent = this.toOBJ(verts, tris, uvCoords);
      const mtlContent = this.createMTL();
      
      // Create downloadable blobs
      const objBlob = new Blob([objContent], { type: 'text/plain' });
      const mtlBlob = new Blob([mtlContent], { type: 'text/plain' });
      
      console.log('✅ 3D face model created successfully!');
      
      return {
        obj: objBlob,
        mtl: mtlBlob,
        texture: textureBlob,
        objContent,
        mtlContent
      };
      
    } catch (err) {
      console.error('❌ Error building 3D model:', err);
      throw err;
    }
  }

  /**
   * Download generated files
   */
  downloadFiles(result) {
    // Download OBJ file
    const objUrl = URL.createObjectURL(result.obj);
    const objLink = document.createElement('a');
    objLink.href = objUrl;
    objLink.download = 'face.obj';
    objLink.click();
    
    // Download MTL file
    const mtlUrl = URL.createObjectURL(result.mtl);
    const mtlLink = document.createElement('a');
    mtlLink.href = mtlUrl;
    mtlLink.download = 'face.mtl';
    mtlLink.click();
    
    // Download texture
    const textureUrl = URL.createObjectURL(result.texture);
    const textureLink = document.createElement('a');
    textureLink.href = textureUrl;
    textureLink.download = 'face_texture.jpg';
    textureLink.click();
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(objUrl);
      URL.revokeObjectURL(mtlUrl);
      URL.revokeObjectURL(textureUrl);
    }, 1000);
  }
}

// Export for browser use
window.BrowserFace3DBuilder = BrowserFace3DBuilder;

