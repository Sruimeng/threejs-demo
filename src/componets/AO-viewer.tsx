import * as React from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { useLoader } from '../hooks/loader';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { AOPass } from '../effects/ao-pass';

// 扩展 fiber 以支持后处理
extend({ EffectComposer, RenderPass });

// 声明类型
declare global {
  namespace JSX {
    interface IntrinsicElements {
      effectComposer: any;
      renderPass: any;
    }
  }
}

// AO 参数接口
export interface AOParams {
  output: number;
  intensity: number;
  radius: number;
  bias: number;
  scale: number;
  samples: number;
  thickness: number;
  distanceFallOff: number;
  enabled: boolean;
}

// AO 后处理组件
const AOEffects: React.FC<{ aoParams: AOParams }> = ({ aoParams }) => {
  const { scene, camera, gl, size } = useThree();
  const composerRef = React.useRef<EffectComposer>();
  const aoPassRef = React.useRef<AOPass>();

  React.useEffect(() => {
    if (!composerRef.current) return;

    const composer = composerRef.current;
    
    // 清除现有的通道
    composer.passes = [];

    // 添加基础渲染通道
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 添加自定义 AO 通道
    if (aoParams.enabled) {
      if (!aoPassRef.current) {
        aoPassRef.current = new AOPass(
          scene, 
          camera as THREE.PerspectiveCamera, 
          size.width, 
          size.height,
          {}, // parameters
          {}, // aoParameters
          {}  // pdParameters
        );
      }
      
      const aoPass = aoPassRef.current;
      
      // 应用参数
      aoPass.output = aoParams.output;
      aoPass.intensity = aoParams.intensity;
      
      // 更新 AO 材质参数
      aoPass.updateAoMaterial({
        radius: aoParams.radius,
        bias: aoParams.bias,
        scale: aoParams.scale,
        samples: aoParams.samples,
        thickness: aoParams.thickness,
        distanceFallOff: aoParams.distanceFallOff
      });

      composer.addPass(aoPass);
    }

    composer.setSize(size.width, size.height);
  }, [scene, camera, size, aoParams]);

  useFrame(() => {
    if (composerRef.current && aoParams.enabled) {
      composerRef.current.render();
    }
  }, 1);

  return (
    <effectComposer ref={composerRef} args={[gl]}>
      <renderPass args={[scene, camera]} />
    </effectComposer>
  );
};

// 模型组件
const Model: React.FC<{ url: string }> = ({ url }) => {
  const { data, loading, error } = useLoader(url, { loadAsPoints: false });

  if (loading || error || !data) return null;

  let objectToRender: THREE.Object3D;
  if (data instanceof THREE.Object3D) {
    objectToRender = data;
  } else if (data && typeof data === 'object' && 'scene' in data) {
    objectToRender = (data as any).scene;
  } else if (data instanceof THREE.Group) {
    objectToRender = data;
  } else {
    return null;
  }

  // 确保模型支持阴影
  React.useEffect(() => {
    objectToRender.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }, [objectToRender]);

  return <primitive object={objectToRender} />;
};

// 场景设置组件
const SceneSetup: React.FC = () => {
  const { scene } = useThree();

  React.useEffect(() => {
    // 设置背景
    scene.background = new THREE.Color(0x1a1a1a);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // 添加主光源
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 添加补光
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-10, -10, -5);
    scene.add(fillLight);

    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);
      scene.remove(fillLight);
    };
  }, [scene]);

  return null;
};

// 主 AO 查看器组件
interface AOViewerProps {
  url: string;
  aoParams: AOParams;
}

export const AOViewer: React.FC<AOViewerProps> = ({ url, aoParams }) => {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [5, 5, 5], fov: 75 }}
      shadows
      gl={{ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance"
      }}
    >
      <SceneSetup />
      
      {/* 使用 Stage 简化光照和环境设置 */}
      <Stage 
        environment="city" 
        intensity={0.6} 
        castShadow={true}
        adjustCamera={1.2}
      >
        <Model url={url} />
      </Stage>

      {/* AO 后处理效果 */}
      <AOEffects aoParams={aoParams} />

      {/* 轨道控制器 */}
      <OrbitControls 
        makeDefault 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        dampingFactor={0.05}
        enableDamping={true}
      />
    </Canvas>
  );
};

// 默认导出
export default AOViewer;