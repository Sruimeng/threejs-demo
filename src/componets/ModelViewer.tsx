import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { useLoader } from '../hooks/loader';
import * as THREE from 'three';

interface ModelViewerProps {
  url: string;
  loadAsPoints?: boolean;
  pointDensity?: number;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({ url, loadAsPoints = false, pointDensity = 100 }) => {
  const { data, loading, error } = useLoader(url, { loadAsPoints, pointDensity });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading model: {error.message}</div>;
  if (!data) return <div>No model loaded</div>;

  let objectToRender: THREE.Object3D;

  if (data instanceof THREE.Points) {
    objectToRender = data;
  } else if ('scene' in data) { // GLTF object
    objectToRender = data.scene;
  } else { // THREE.Group from FBX
    objectToRender = data;
  }

  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 45 }} style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#101010']} />
      <Stage environment="city" intensity={0.6} castShadow={false}>
        <primitive object={objectToRender} />
      </Stage>
      <OrbitControls makeDefault />
    </Canvas>
  );
};
