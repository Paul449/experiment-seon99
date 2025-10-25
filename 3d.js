// buildFace3D.js
// 2D face image (images/face.jpeg) -> 3D OBJ mesh using TFJS (WASM) + face-landmarks-detection detector API
// Run: node buildFace3D.js

const fs = require('fs');
const path = require('path');

// --- TensorFlow.js (WASM backend; Node 22 friendly) ---
const tf = require('@tensorflow/tfjs');
const wasm = require('@tensorflow/tfjs-backend-wasm');
const { setWasmPaths } = wasm;
require('@tensorflow/tfjs-backend-wasm');
setWasmPaths('node_modules/@tensorflow/tfjs-backend-wasm/dist/');

const faceLandmarksDetection = require('@tensorflow-models/face-landmarks-detection');
const { loadImage, createCanvas } = require('canvas');
let Delaunator = require('delaunator');
Delaunator = Delaunator?.default || Delaunator?.Delaunator || Delaunator;

const IMAGE_PATH = path.join(__dirname, 'images/face.jpeg');
const OUTPUT_OBJ = path.join(__dirname, 'face.obj');
const OUTPUT_MTL = path.join(__dirname, 'face.mtl');
const TEXTURE_IMAGE = path.join(__dirname, 'face_texture.jpg');

async function initTF() {
  await tf.setBackend('wasm');
  await tf.ready();
  console.log('TF backend:', tf.getBackend());
}

async function estimateLandmarks(imagePath) {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  console.log('Loading FaceMesh detector...');
  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detector = await faceLandmarksDetection.createDetector(model, {
    runtime: 'tfjs',         // use TFJS (works with WASM backend)
    refineLandmarks: false,  // set true if you want iris landmarks too
    maxFaces: 1,
  });

  console.log('Detecting landmarks...');
  const faces = await detector.estimateFaces(canvas);
  if (!faces.length) throw new Error('❌ No face detected. Use a clear, frontal, well-lit image.');

  // New API returns keypoints: [{x,y,z,name?}, ...] (468 or 478 with refineLandmarks)
  const kp = faces[0].keypoints;
  if (!kp?.length) throw new Error('❌ No landmarks found on prediction.');

  const points = kp.map(p => [p.x, p.y, p.z ?? 0]);
  console.log(`✅ Detected ${points.length} landmarks`);
  
  // Store original 2D points for UV mapping
  const originalPoints = kp.map(p => [p.x, p.y]);
  
  return { points, originalPoints, width: img.width, height: img.height };
}

function normalizeAndCenter(points, width, height, zScale = 1.2) {
  const maxDim = Math.max(width, height);
  return points.map(([x, y, z]) => {
    const nx = (x - width / 2) / maxDim;
    const ny = (y - height / 2) / maxDim;
    const nz = (z || 0) / maxDim;
    return [nx, -ny, -nz * zScale]; // Y up; bring nose forward with -Z
  });
}

function generateUVCoordinates(points, originalPoints, width, height) {
  // Generate UV texture coordinates for each vertex
  return originalPoints.map(([x, y]) => {
    const u = x / width;      // Horizontal texture coordinate (0-1)
    const v = 1 - (y / height); // Vertical texture coordinate (0-1), flipped for texture
    return [u, v];
  });
}

function triangulate(points3d) {
  const coords2d = points3d.map(([x, y]) => [x, y]);
  const delaunay = Delaunator.from(coords2d);
  return Array.from(delaunay.triangles);
}

function toOBJ(vertices, triangles, uvCoords) {
  let obj = '';
  
  // Header with material file reference
  obj += `# Realistic 3D Face Model\n`;
  obj += `mtllib face.mtl\n\n`;
  
  // Vertices
  for (const [x, y, z] of vertices) {
    obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
  }
  obj += '\n';
  
  // UV texture coordinates
  for (const [u, v] of uvCoords) {
    obj += `vt ${u.toFixed(6)} ${v.toFixed(6)}\n`;
  }
  obj += '\n';
  
  // Use material for realistic appearance
  obj += `usemtl face_material\n`;
  
  // Faces with texture coordinates
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] + 1;
    const b = triangles[i + 1] + 1;
    const c = triangles[i + 2] + 1;
    // Format: f vertex/texture vertex/texture vertex/texture
    obj += `f ${a}/${a} ${b}/${b} ${c}/${c}\n`;
  }
  
  return obj;
}

function createMTL() {
  // Material file for realistic face appearance
  let mtl = '';
  mtl += `# Realistic Face Material\n`;
  mtl += `newmtl face_material\n`;
  mtl += `Ka 0.2 0.2 0.2\n`;        // Ambient color
  mtl += `Kd 1.0 1.0 1.0\n`;        // Diffuse color (white, texture provides color)
  mtl += `Ks 0.1 0.1 0.1\n`;        // Specular color (slight shine)
  mtl += `Ns 10.0\n`;               // Shininess (low for skin)
  mtl += `d 1.0\n`;                 // Opacity
  mtl += `illum 2\n`;               // Illumination model
  mtl += `map_Kd face_texture.jpg\n`; // Diffuse texture map
  
  return mtl;
}

async function processImageTexture(imagePath, outputPath) {
  // Copy and optimize the face image for texture use
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Optional: Enhance skin texture
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;
  
  // Slight skin tone enhancement
  for (let i = 0; i < data.length; i += 4) {
    // Warm up skin tones slightly
    data[i] = Math.min(255, data[i] * 1.05);     // Red
    data[i + 1] = Math.min(255, data[i + 1] * 1.02); // Green
    data[i + 2] = Math.min(255, data[i + 2] * 0.98);  // Blue
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Save as texture
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`📸 Texture image saved: ${outputPath}`);
}

(async () => {
  try {
    console.log('🎭 Building realistic 3D face with texture...');
    await initTF();
    
    const { points, originalPoints, width, height } = await estimateLandmarks(IMAGE_PATH);
    console.log('🔍 Generating 3D mesh with UV coordinates...');
    
    const verts = normalizeAndCenter(points, width, height, /* zScale */ 1.2);
    const uvCoords = generateUVCoordinates(points, originalPoints, width, height);
    const tris = triangulate(verts);
    
    console.log('🎨 Processing face texture...');
    await processImageTexture(IMAGE_PATH, TEXTURE_IMAGE);
    
    console.log('📄 Creating material files...');
    const obj = toOBJ(verts, tris, uvCoords);
    const mtl = createMTL();
    
    fs.writeFileSync(OUTPUT_OBJ, obj, 'utf8');
    fs.writeFileSync(OUTPUT_MTL, mtl, 'utf8');
    
    console.log(`✅ Realistic 3D face model created:`);
    console.log(`   📄 Model: ${OUTPUT_OBJ}`);
    console.log(`   🎨 Material: ${OUTPUT_MTL}`);
    console.log(`   📸 Texture: ${TEXTURE_IMAGE}`);
    console.log('');
    console.log('🎯 Your face now has:');
    console.log('   ✅ Real skin texture from your photo');
    console.log('   ✅ Eyes, nose, mouth details');
    console.log('   ✅ Proper lighting and materials');
    console.log('');
    console.log('� View at: http://localhost:3000');
    console.log('�💡 Import into Blender: File → Import → Wavefront (.obj)');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
