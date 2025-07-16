import { GLTFParser } from '../gltf/GLTF-parser';
import type { GLTFJsonData } from '../gltf/constants';
import type { GLTFLoaderOptions } from '../gltf/constants';
import * as THREE from 'three';
import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
} from 'three';

/**
 * 点数据专用的GLTF解析器
 * 继承自GLTFParser，但专门处理点数据
 */
export class PointsParser extends GLTFParser {
  constructor(json: GLTFJsonData = {
    asset: {
      version: [],
    },
  }, options: GLTFLoaderOptions) {
    super(json, options);
  }

  /**
   * 重写parse方法，专门处理点数据
   */
  override parse(onLoad: (result: any) => void, onError: (error: Error) => void, wireframe?: boolean): void {
    const json = this.json;
    const extensions = this.extensions;
    this.wireframe = wireframe;

    // 清除加载器缓存
    this.cache.removeAll();
    this.nodeCache = {};

    // 标记特殊节点/网格用于高效解析
    this._invokeAll<any, unknown>(function (ext) {
      return ext._markDefs && ext._markDefs();
    });

    Promise.all(
      this._invokeAll<any, unknown>((ext) => {
        return ext.beforeRoot && ext.beforeRoot();
      }),
    )
      .then(() => {
        // 只加载点相关的数据，不加载完整场景
        return this.loadPointsData();
      })
      .then((points) => {
        const result = {
          points,
          asset: json.asset,
          parser: this,
          userData: {},
        };

        return Promise.all(
          this._invokeAll<any, unknown>((ext) => {
            return ext.afterRoot && ext.afterRoot(result);
          }),
        ).then(() => {
          onLoad(result);
        });
      })
      .catch(onError);
  }

  /**
   * 加载点数据
   */
  private async loadPointsData(): Promise<Points> {
    // 查找所有点相关的网格
    const json = this.json;
    const meshes = json.meshes || [];
    const pointsMeshes = meshes.filter(mesh => 
      mesh.primitives && mesh.primitives.some(primitive => primitive.mode === 0) // POINTS = 0
    );

    if (pointsMeshes.length === 0) {
      // 如果没有点数据，从网格几何体创建点
      return this.createPointsFromMeshes();
    }

    // 加载所有点网格
    const allPoints: number[] = [];
    
    for (const mesh of pointsMeshes) {
      const primitives = mesh.primitives || [];
      
      for (const primitive of primitives) {
        if (primitive.mode === 0) { // POINTS
          const geometry = await this.loadPrimitiveGeometry(primitive);
          const positions = geometry.attributes.position;
          
          if (positions) {
            for (let i = 0; i < positions.count; i++) {
              allPoints.push(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
              );
            }
          }
        }
      }
    }

    if (allPoints.length === 0) {
      throw new Error('PointsParser: 未找到点数据');
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(allPoints), 3)
    );

    const material = new PointsMaterial({ color: 0xffffff, size: 1 });
    return new Points(geometry, material);
  }

  /**
   * 从网格几何体创建点
   */
  private async createPointsFromMeshes(): Promise<Points> {
    const json = this.json;
    const meshes = json.meshes || [];
    const allPositions: number[] = [];
    
    for (let i = 0; i < meshes.length; i++) {
      const mesh = await this.loadMesh(i);
      
      mesh.traverse((object: any) => {
        if (object.isMesh || object.isPoints) {
          const geometry = object.geometry;
          const positions = geometry.attributes.position;
          
          if (positions) {
            for (let j = 0; j < positions.count; j++) {
              allPositions.push(
                positions.getX(j),
                positions.getY(j),
                positions.getZ(j)
              );
            }
          }
        }
      });
    }

    if (allPositions.length === 0) {
      throw new Error('PointsParser: 未找到几何体数据');
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(allPositions), 3)
    );

    const material = new PointsMaterial({ color: 0xffffff, size: 1 });
    return new Points(geometry, material);
  }

  /**
   * 加载原始几何体
   */
  private async loadPrimitiveGeometry(primitive: any): Promise<BufferGeometry> {
    const geometry = new BufferGeometry();
    
    // 加载属性
    const attributes = primitive.attributes || {};
    const pendingAttributes: Promise<void>[] = [];
    
    for (const [name, accessorIndex] of Object.entries(attributes)) {
      pendingAttributes.push(
        this.getDependency('accessor', accessorIndex as number).then(attribute => {
          geometry.setAttribute(name, attribute as BufferAttribute);
        })
      );
    }
    
    // 加载索引（如果存在）
    if (primitive.indices !== undefined) {
      pendingAttributes.push(
        this.getDependency('accessor', primitive.indices).then(attribute => {
          geometry.setIndex(attribute as BufferAttribute);
        })
      );
    }
    
    await Promise.all(pendingAttributes);
    
    return geometry;
  }

  /**
   * 重写loadMesh方法，只处理点模式
   */
  override async loadMesh(meshIndex: number): Promise<THREE.Group | THREE.Mesh | THREE.SkinnedMesh | THREE.Line | THREE.Points> {
    const json = this.json;
    const meshes = json.meshes || [];
    const meshDef = meshes[meshIndex];
    
    if (!meshDef) {
      throw new Error(`PointsParser: 网格 ${meshIndex} 未找到`);
    }

    const primitives = meshDef.primitives || [];
    
    // 检查是否有POINTS模式的原始体
    const pointsPrimitives = primitives.filter(p => p.mode === 0);
    
    if (pointsPrimitives.length > 0) {
      // 处理点数据
      const geometries = await Promise.all(
        pointsPrimitives.map(primitive => this.loadPrimitiveGeometry(primitive))
      );
      
      if (geometries.length === 1) {
        const material = new PointsMaterial({ color: 0xffffff, size: 1 });
        return new Points(geometries[0], material);
      } else {
        const group = new THREE.Group();
        geometries.forEach(geometry => {
          const material = new PointsMaterial({ color: 0xffffff, size: 1 });
          group.add(new Points(geometry, material));
        });
        return group;
      }
    } else {
      // 使用父类方法处理其他模式
      return super.loadMesh(meshIndex);
    }
  }
}