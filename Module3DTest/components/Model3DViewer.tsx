import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import * as FileSystem from 'expo-file-system/legacy';

interface Model3DViewerProps {
  modelUrl?: string;
  style?: any;
}

export default function Model3DViewer({ modelUrl, style }: Model3DViewerProps) {
  const rafRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const [loadStatus, setLoadStatus] = useState<string>('Initializing...');

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const loadOBJModel = async (objPath: string, scene: THREE.Scene) => {
    try {
      setLoadStatus('Loading model from: ' + objPath);
      console.log('Loading OBJ from:', objPath);

      // Read the OBJ file
      const objContent = await FileSystem.readAsStringAsync(objPath);
      console.log('OBJ content loaded, length:', objContent.length);

      // Parse OBJ manually (simple parser)
      const vertices: THREE.Vector3[] = [];
      const faces: number[][] = [];
      
      const lines = objContent.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        
        if (parts[0] === 'v') {
          // Vertex
          vertices.push(new THREE.Vector3(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          ));
        } else if (parts[0] === 'f') {
          // Face (supports both triangles and quads)
          const faceIndices = parts.slice(1).map(p => parseInt(p.split('/')[0]) - 1);
          faces.push(faceIndices);
        }
      }

      console.log('Parsed vertices:', vertices.length, 'faces:', faces.length);

      // Create geometry from parsed data
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      // Convert faces to triangles
      for (const face of faces) {
        if (face.length === 4) {
          // Quad - split into two triangles
          positions.push(
            vertices[face[0]].x, vertices[face[0]].y, vertices[face[0]].z,
            vertices[face[1]].x, vertices[face[1]].y, vertices[face[1]].z,
            vertices[face[2]].x, vertices[face[2]].y, vertices[face[2]].z,
            
            vertices[face[0]].x, vertices[face[0]].y, vertices[face[0]].z,
            vertices[face[2]].x, vertices[face[2]].y, vertices[face[2]].z,
            vertices[face[3]].x, vertices[face[3]].y, vertices[face[3]].z
          );
        } else if (face.length === 3) {
          // Triangle
          positions.push(
            vertices[face[0]].x, vertices[face[0]].y, vertices[face[0]].z,
            vertices[face[1]].x, vertices[face[1]].y, vertices[face[1]].z,
            vertices[face[2]].x, vertices[face[2]].y, vertices[face[2]].z
          );
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();

      // Create mesh with nice material
      const material = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        metalness: 0.4,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add wireframe
      const wireframeGeometry = new THREE.EdgesGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
      mesh.add(wireframe);

      // Remove old model if exists
      if (modelRef.current) {
        scene.remove(modelRef.current);
      }

      // Add new model
      const group = new THREE.Group();
      group.add(mesh);
      scene.add(group);
      modelRef.current = group;

      setLoadStatus('✅ Model loaded successfully!');
      console.log('Model loaded successfully!');
      
      return group;
    } catch (error) {
      console.error('Error loading OBJ:', error);
      setLoadStatus('❌ Error loading model: ' + error);
      return null;
    }
  };

  const onContextCreate = async (gl: any) => {
    // Setup renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x1a1a1a, 1);

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 4);
    camera.lookAt(0, 0, 0);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Load model if modelUrl exists
    if (modelUrl && modelUrl !== 'https://example.com/model.obj') {
      await loadOBJModel(modelUrl, scene);
    } else {
      setLoadStatus('No model loaded yet');
    }

    // Animation loop
    let rotation = 0;
    const render = () => {
      rafRef.current = requestAnimationFrame(render);

      rotation += 0.01;
      
      // Rotate the model if it exists
      if (modelRef.current) {
        modelRef.current.rotation.y = rotation;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
  };

  // React to modelUrl changes
  useEffect(() => {
    if (sceneRef.current && modelUrl && modelUrl !== 'https://example.com/model.obj') {
      console.log('Model URL changed:', modelUrl);
      loadOBJModel(modelUrl, sceneRef.current);
    }
  }, [modelUrl]);

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      {loadStatus && (
        <View style={styles.statusOverlay}>
          <Text style={styles.statusText}>{loadStatus}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  glView: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});

