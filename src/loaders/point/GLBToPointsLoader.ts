// 废弃文件
import * as THREE from 'three';
import { GLTFLoader } from '../gltf';
import { PointCloudMaterial } from '../../materials/PointCloudMaterial';

export class GLBToPointsLoader extends THREE.Loader {
  public density: number = 100;
  public maxPoints: number = 50000; // 限制最大点数
  public minPoints: number = 1000;  // 保证最小点数

  public setDensity(density: number) {
    this.density = density;
    return this;
  }

  public setMaxPoints(max: number) {
    this.maxPoints = max;
    return this;
  }

  public override load(
    url: string,
    onLoad: (points: THREE.Points) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: Error | ErrorEvent) => void,
  ) {
    const loader = new THREE.FileLoader(this.manager);
    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    const fileLoaderOnError = onError ? (error: unknown) => onError(error instanceof Error ? error : new Error(String(error))) : undefined;

    loader.load(url, (buffer) => {
      try {
        this.parse(buffer, '', onLoad, onError);
      } catch (e: any) {
        if (onError) onError(e);
        else throw e;
      }
    }, onProgress, fileLoaderOnError);
  }

  public parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (points: THREE.Points) => void,
    onError?: (event: Error | ErrorEvent) => void,
  ): void {
    const gltfLoader = new GLTFLoader();
    gltfLoader.manager = this.manager;

    const gltfOnError = (error: Error) => {
      if (onError) onError(error);
    };

    gltfLoader.parse(data, path, (gltf) => {
      const points = this.convertSceneToPoints(gltf.scene);
      console.log(`Converted GLB to points: ${points.geometry.attributes.position.count} points`);
      
      onLoad(points);
    }, gltfOnError);
  }

  private convertSceneToPoints(scene: THREE.Group): THREE.Points {

    scene.updateWorldMatrix(true, true);
    let points: THREE.Points;

    scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Points) {
        points = object;
      }
    }); 
    
    const material = new PointCloudMaterial({ 
      color1: new THREE.Color(0x00ffff), 
      color2: new THREE.Color(0xffffff), 
      pointSize: 1, 
      opacity: 0.8 
    });

    points.material = material;
    
    points.name = 'Sampled_Point_Cloud';
    return points;
  }

  private downsample(points: THREE.Vector3[], targetCount: number): THREE.Vector3[] {
    if (points.length <= targetCount) return points;
    
    const step = points.length / targetCount;
    const result: THREE.Vector3[] = [];
    
    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      result.push(points[index]);
    }
    
    return result;
  }

  private sampleTriangle(triangle: THREE.Triangle, target: THREE.Vector3[]) {
    const area = triangle.getArea();
    const numPointsToSample = Math.ceil(area * this.density);

    for (let j = 0; j < numPointsToSample; j++) {
      const point = new THREE.Vector3();
      this.samplePointInTriangle(triangle, point);
      target.push(point);
    }
  }

  private samplePointInTriangle(triangle: THREE.Triangle, target: THREE.Vector3): THREE.Vector3 {
    let u = Math.random();
    let v = Math.random();

    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }

    const a = triangle.a;
    const b = triangle.b;
    const c = triangle.c;

    target.copy(a)
      .addScaledVector(b.clone().sub(a), u)
      .addScaledVector(c.clone().sub(a), v);

    return target;
  }
}