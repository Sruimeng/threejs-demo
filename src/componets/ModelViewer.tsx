import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { useLoader } from '../hooks/loader';
import * as THREE from 'three';

// 创建一个单独的组件来处理点云动画
const AnimatedPoints = ({ model }: { model: THREE.Object3D }) => {
  const ref = React.useRef<THREE.Points>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const model = ref.current;
      model.rotation.y = clock.getElapsedTime() * 0.1;
      const material = model.material;
      if (material) {
        material.update(clock.getElapsedTime());
      }
    }
  });

  return <primitive ref={ref} object={model} />;
};

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

  // 确定要渲染的内容
  let objectToRender: THREE.Object3D;
  if (data instanceof THREE.Object3D) {
    objectToRender = data;
  } else if ('scene' in data) { // GLTF 对象
    objectToRender = data.scene;
  } else if (data instanceof THREE.Group) { // FBX 或其他组
    objectToRender = data;
  } else {
    console.error('Unsupported model format:', data);
    return <div>Unsupported model format</div>;
  }

  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#101010']} />

      <Stage environment="city" intensity={0.6} castShadow={true}>
        <AnimatedPoints model={objectToRender} />
      </Stage>
      <OrbitControls makeDefault />
    </Canvas>
  );
};
