import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from '../loaders/gltf/GLTF-loader';
import { FBXLoader } from '../loaders/fbx/FBX-loader';
import { GLBToPointsLoader } from '../loaders/point/GLBToPointsLoader';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

type ModelDataType = GLTF | THREE.Group | THREE.Points;

type ModelLoaderResult = {
  data: ModelDataType | null;
  loading: boolean;
  error: Error | null;
};

type LoaderOptions = {
  loadAsPoints?: boolean;
  pointDensity?: number;
};

export const useLoader = (url: string, options: LoaderOptions = {}): ModelLoaderResult => {
  const { loadAsPoints = false, pointDensity = 100 } = options;
  const [data, setData] = useState<ModelDataType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const loadModel = async () => {
      try {
        setLoading(true);
        const extension = url.split('.').pop()?.toLowerCase();
        let model;

        if (loadAsPoints && (extension === 'gltf' || extension === 'glb')) {
          const loader = new GLBToPointsLoader();
          loader.setDensity(pointDensity);
          model = await new Promise<THREE.Points>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
        } else if (extension === 'gltf' || extension === 'glb') {
          const loader = new GLTFLoader();
          model = await new Promise<THREE.Group>((resolve, reject) => {
            loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
          });
        } else if (extension === 'fbx') {
          const loader = new FBXLoader();
          model = await new Promise<THREE.Group>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
        } else {
          throw new Error(`Unsupported file format: ${extension}`);
        }
        
        setData(model);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, [url, loadAsPoints]);

  return { data, loading, error };
};
