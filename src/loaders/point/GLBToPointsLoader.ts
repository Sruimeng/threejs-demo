import * as THREE from 'three';
import { GLTFLoader } from '../gltf';
import { PointCloudMaterial } from '../../materials/PointCloudMaterial';

export class GLBToPointsLoader extends THREE.Loader {
  public density: number = 100;
  public maxPoints: number = 500000; // 限制最大点数
  public minPoints: number = 100000;  // 保证最小点数

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
      onLoad(points);
    }, gltfOnError);
  }

  private convertSceneToPoints(scene: THREE.Group): THREE.Points {
    const sampledPoints: THREE.Vector3[] = [];
    const triangle = new THREE.Triangle();

    scene.updateWorldMatrix(true, true);

    scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        const positions = geometry.attributes.position;
        const index = geometry.index;

        if (!positions) return;

        object.updateWorldMatrix(true, false);
        const matrixWorld = object.matrixWorld;

        if (index) {
          for (let i = 0; i < index.count; i += 3) {
            const vA = new THREE.Vector3().fromBufferAttribute(positions, index.getX(i)).applyMatrix4(matrixWorld);
            const vB = new THREE.Vector3().fromBufferAttribute(positions, index.getX(i + 1)).applyMatrix4(matrixWorld);
            const vC = new THREE.Vector3().fromBufferAttribute(positions, index.getX(i + 2)).applyMatrix4(matrixWorld);
            triangle.set(vA, vB, vC);
            this.sampleTriangle(triangle, sampledPoints);
          }
        } else {
          for (let i = 0; i < positions.count; i += 3) {
            const vA = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(matrixWorld);
            const vB = new THREE.Vector3().fromBufferAttribute(positions, i + 1).applyMatrix4(matrixWorld);
            const vC = new THREE.Vector3().fromBufferAttribute(positions, i + 2).applyMatrix4(matrixWorld);
            triangle.set(vA, vB, vC);
            this.sampleTriangle(triangle, sampledPoints);
          }
        }
      }
    });

    // 智能采样：限制点数范围
    let finalPoints = sampledPoints;
    if (sampledPoints.length > this.maxPoints) {
      finalPoints = this.downsample(sampledPoints, this.maxPoints);
    } else if (sampledPoints.length < this.minPoints) {
      // 如果点太少，适当增加密度
      this.density *= 2;
      console.warn(`Point count too low (${sampledPoints.length}), doubling density`);
    }

    const allVertices = new Float32Array(finalPoints.length * 3);
    for (let i = 0; i < finalPoints.length; i++) {
      finalPoints[i].toArray(allVertices, i * 3);
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(allVertices, 3));

    // 根据点数调整点大小
    const pointSize = Math.max(0.005, Math.min(0.02, 50000 / finalPoints.length * 0.01));
    
    const material = new PointCloudMaterial({ 
      color1: new THREE.Color(0x00ffff), 
      color2: new THREE.Color(0xffffff), 
      pointSize: pointSize, 
      opacity: 0.8 
    });
    
    const points = new THREE.Points(pointsGeometry, material);
    points.name = 'Sampled_Point_Cloud';

    console.log(`Generated ${finalPoints.length} points with size ${pointSize.toFixed(4)}`);

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