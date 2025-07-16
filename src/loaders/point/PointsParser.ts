import { GLTFParser } from '../gltf/GLTF-parser';
import type { GLTFJsonData } from '../gltf/constants';
import type { GLTFLoaderOptions } from '../gltf/constants';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  Mesh,
  Points,
  SkinnedMesh,
} from 'three';
import { PointCloudMaterial } from './PointCloudMaterial';

/**
 * 点数据专用的GLTF解析器
 * 继承自GLTFParser，但专门处理点数据
 */
export class PointsParser extends GLTFParser {
  material: PointCloudMaterial;
  constructor(json: GLTFJsonData = {
    asset: {
      version: [],
    },
  }, options: GLTFLoaderOptions) {
    super(json, options);
        this.material = new PointCloudMaterial({
      color1: new Color(0x00ffff),
      color2: new Color(0xffffff),
      pointSize: 4,
      opacity: 0.8,
      flowSpeed: 1.4,
      noiseScale: 3.0,
      flowStrength: 0.1,
      transitionProgress: 0.0,
    })
  }

  /**
   * 处理点数据
   */
  override parse(onLoad: (result: any) => void, onError: (error: Error) => void): void {
    const json = this.json;

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

  // 收集所有需要加载的原始体
  const primitivePromises: Promise<Float32Array>[] = [];
  
  for (const mesh of pointsMeshes) {
    const primitives = mesh.primitives || [];
    
    for (const primitive of primitives) {
      if (primitive.mode === 0) { // POINTS
        // 创建一个Promise来处理每个原始体
        const primitivePromise = this.loadPrimitiveGeometry(primitive)
          .then(geometry => {
            const positions = geometry.attributes.position;
            if (positions && positions.array) {
              return new Float32Array(positions.array);
            }
            return new Float32Array();
          })
          .catch(error => {
            console.warn('加载原始体几何体失败:', error);
            return new Float32Array();
          });
        
        primitivePromises.push(primitivePromise);
      }
    }
  }

  // 等待所有原始体加载完成
  const positionArrays = await Promise.all(primitivePromises);
  
  // 合并所有位置数据
  const totalLength = positionArrays.reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalLength === 0) {
    throw new Error('PointsParser: 未找到有效的点数据');
  }

  const allPoints = new Float32Array(totalLength);
  let offset = 0;
  
  for (const positions of positionArrays) {
    if (positions.length > 0) {
      allPoints.set(positions, offset);
      offset += positions.length;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(allPoints, 3)
  );

  return new Points(geometry, this.material);
}

/**
 * 从网格几何体创建点
 */
private async createPointsFromMeshes(): Promise<Points> {
  const json = this.json;
  const meshes = json.meshes || [];
  
  // 收集所有网格加载的Promise
  const meshPromises = meshes.map((_, index) => 
    this.loadMesh(index)
      .then(mesh => {
        const positions: number[] = [];
        
        mesh.traverse((object: any) => {
          if (object.isMesh || object.isPoints) {
            const geometry = object.geometry;
            const positionAttr = geometry.attributes.position;
            
            if (positionAttr) {
              for (let j = 0; j < positionAttr.count; j++) {
                positions.push(
                  positionAttr.getX(j),
                  positionAttr.getY(j),
                  positionAttr.getZ(j)
                );
              }
            }
          }
        });
        
        return positions;
      })
      .catch(error => {
        console.warn(`加载网格 ${index} 失败:`, error);
        return [];
      })
  );

  // 等待所有网格加载完成
  const allPositionArrays = await Promise.all(meshPromises);  
  const allPositions = allPositionArrays.flat();

  if (allPositions.length === 0) {
    throw new Error('PointsParser: 未找到几何体数据');
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(allPositions), 3)
  );
  return new Points(geometry, this.material);
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
          geometry.setAttribute(name.toLowerCase(), attribute as BufferAttribute);
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
    console.log('geometry loaded:', geometry);
    
    return geometry;
  }

  /**
   * 重写loadMesh方法，只处理点模式
   */
  override async loadMesh(meshIndex: number): Promise<Group | Mesh | SkinnedMesh | Line | Points> {
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
        return new Points(geometries[0], this.material);
      } else {
        const group = new Group();
        geometries.forEach(geometry => {
          group.add(new Points(geometry, this.material));
        });
        return group;
      }
    } else {
      // 使用父类方法处理其他模式
      return super.loadMesh(meshIndex);
    }
  }
}