import type {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Camera,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import {
  Box3,
  FrontSide,
  Matrix4,
  MeshStandardMaterial,
  Sphere,
  TriangleFanDrawMode,
  Vector3,
} from 'three';

import type {
  GLTF,
  GLTFExtensionParseType,
  GLTFImage,
  GLTFJsonData,
  GLTFMaterial,
  GLTFMorphTarget,
  GLTFPrimitive,
} from './constants.js';
import { ATTRIBUTES, WEBGL_COMPONENT_TYPES } from './constants.js';
import type { GLTFParser } from './GLTF-parser.js';
import type { GLTFRegistry } from './GLTF-registry.js';

/**
 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
 */
export function createDefaultMaterial(cache: GLTFRegistry): MeshStandardMaterial {
  if (cache.get('DefaultMaterial') === undefined) {
    cache.add(
      'DefaultMaterial',
      new MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x000000,
        metalness: 1,
        roughness: 1,
        transparent: false,
        depthTest: true,
        side: FrontSide,
      }),
    );
  }

  return cache.get('DefaultMaterial') as MeshStandardMaterial;
}

/**
 * Add unknown glTF extensions to an object's userData.
 */
export function addUnknownExtensionsToUserData(
  knownExtensions: Record<string, GLTFExtensionParseType | boolean>,
  object:
    | GLTF
    | MeshStandardMaterial
    | MeshBasicMaterial
    | BufferGeometry
    | Mesh
    | Group
    | Object3D
    | Bone,
  objectDef: GLTFJsonData | GLTFMaterial,
) {
  for (const name in objectDef.extensions) {
    if (knownExtensions[name] === undefined) {
      object.userData.gltfExtensions = object.userData.gltfExtensions || {};
      object.userData.gltfExtensions[name] = objectDef.extensions[name];
    }
  }
}

/**
 * Assign extras to object's userData.
 */
export function assignExtrasToUserData(
  object:
    | GLTF
    | MeshStandardMaterial
    | Object3D
    | Bone
    | MeshBasicMaterial
    | BufferGeometry
    | Mesh
    | Camera
    | Group,
  gltfDef: GLTFJsonData | GLTFImage,
) {
  if (gltfDef.extras !== undefined) {
    if (typeof gltfDef.extras === 'object') {
      Object.assign(object.userData, gltfDef.extras);
    } else {
      console.warn('THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras);
    }
  }
}

/**
 * Update morph targets for mesh.
 */
export function updateMorphTargets(mesh: Mesh, meshDef?: GLTFMorphTarget) {
  mesh.updateMorphTargets();
  if (!meshDef) {
    return;
  }
  if (mesh.morphTargetInfluences === undefined) {
    throw new Error('THREE.GLTFLoader: Mesh does not have morphTargetInfluences.');
  }
  if (meshDef.weights !== undefined) {
    for (let i = 0, il = meshDef.weights.length; i < il; i++) {
      mesh.morphTargetInfluences[i] = meshDef.weights[i];
    }
  }

  // .extras has user-defined data, so check that .extras.targetNames is an array.
  if (meshDef.extras && Array.isArray(meshDef.extras.targetNames)) {
    const targetNames = meshDef.extras.targetNames;

    if (mesh.morphTargetInfluences.length === targetNames.length) {
      mesh.morphTargetDictionary = {};

      for (let i = 0, il = targetNames.length; i < il; i++) {
        mesh.morphTargetDictionary[targetNames[i]] = i;
      }
    } else {
      console.warn('THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.');
    }
  }
}

export function createAttributesKey(attributes: Record<string, number | string>) {
  let attributesKey = '';

  const keys = Object.keys(attributes).sort();

  for (let i = 0, il = keys.length; i < il; i++) {
    attributesKey += keys[i] + ':' + attributes[keys[i]] + ';';
  }

  return attributesKey;
}

export function createPrimitiveKey(primitiveDef: GLTFPrimitive) {
  let geometryKey;

  const dracoExtension =
    primitiveDef.extensions && primitiveDef.extensions.KHR_draco_mesh_compression;

  if (dracoExtension) {
    geometryKey =
      'draco:' +
      dracoExtension.bufferView +
      ':' +
      dracoExtension.indices +
      ':' +
      createAttributesKey(dracoExtension.attributes as Record<string, number | string>);
  } else {
    geometryKey =
      primitiveDef.indices +
      ':' +
      createAttributesKey(primitiveDef.attributes as Record<string, number | string>) +
      ':' +
      primitiveDef.mode;
  }

  if (primitiveDef.targets !== undefined) {
    for (let i = 0, il = primitiveDef.targets.length; i < il; i++) {
      geometryKey +=
        ':' +
        createAttributesKey(primitiveDef.targets[i] as unknown as Record<string, number | string>);
    }
  }

  return geometryKey;
}

export function getNormalizedComponentScale(
  constructor:
    | typeof Int8Array
    | typeof Uint8Array
    | typeof Int16Array
    | typeof Uint16Array
    | typeof Uint32Array
    | typeof Float32Array,
) {
  // Reference:
  // https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization#encoding-quantized-data

  switch (constructor) {
    case Int8Array:
      return 1 / 127;
    case Uint8Array:
      return 1 / 255;
    case Int16Array:
      return 1 / 32767;
    case Uint16Array:
      return 1 / 65535;
    default:
      throw new Error('THREE.GLTFLoader: Unsupported normalized accessor component type.');
  }
}

export function getImageURIMimeType(uri?: string) {
  if (uri && (uri.search(/\.jpe?g($|\?)/i) > 0 || uri.search(/^data:image\/jpeg/) === 0)) {
    return 'image/jpeg';
  }
  if (uri && (uri.search(/\.webp($|\?)/i) > 0 || uri.search(/^data:image\/webp/) === 0)) {
    return 'image/webp';
  }
  if (uri && (uri.search(/\.ktx2($|\?)/i) > 0 || uri.search(/^data:image\/ktx2/) === 0)) {
    return 'image/ktx2';
  }

  return 'image/png';
}

/**
 * Compute bounding boxes for loaded geometries.
 */
export function computeBounds(
  geometry: BufferGeometry,
  primitiveDef: GLTFPrimitive,
  parser: GLTFParser,
) {
  const attributes = primitiveDef.attributes;
  const accessorsDef = parser.json.accessors || [];

  const box = new Box3();

  if (attributes.POSITION !== undefined) {
    const accessor = accessorsDef[attributes.POSITION];

    const min = accessor.min;
    const max = accessor.max;

    // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.
    if (min !== undefined && max !== undefined) {
      box.set(new Vector3(min[0], min[1], min[2]), new Vector3(max[0], max[1], max[2]));

      if (accessor.normalized) {
        const boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[accessor.componentType]);

        box.min.multiplyScalar(boxScale);
        box.max.multiplyScalar(boxScale);
      }
    } else {
      console.warn('THREE.GLTFLoader: Missing min/max properties for accessor POSITION.');

      return;
    }
  } else {
    return;
  }

  const targets = primitiveDef.targets;

  if (targets !== undefined) {
    const maxDisplacement = new Vector3();
    const vector = new Vector3();

    for (let i = 0, il = targets.length; i < il; i++) {
      const target = targets[i];

      if (target.POSITION !== undefined) {
        const accessor = accessorsDef[target.POSITION];
        const min = accessor.min;
        const max = accessor.max;

        // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.
        if (min !== undefined && max !== undefined) {
          // we need to get max of absolute components because target weight is [-1,1]
          vector.setX(Math.max(Math.abs(min[0]), Math.abs(max[0])));
          vector.setY(Math.max(Math.abs(min[1]), Math.abs(max[1])));
          vector.setZ(Math.max(Math.abs(min[2]), Math.abs(max[2])));

          if (accessor.normalized) {
            const boxScale = getNormalizedComponentScale(
              WEBGL_COMPONENT_TYPES[accessor.componentType],
            );

            vector.multiplyScalar(boxScale);
          }

          // Note: this assumes that the sum of all weights is at most 1. This isn't quite correct - it's more conservative
          // to assume that each target can have a max weight of 1. However, for some use cases - notably, when morph targets
          // are used to implement key-frame animations and as such only two are active at a time - this results in very large
          // boxes. So for now we make a box that's sometimes a touch too small but is hopefully mostly of reasonable size.
          maxDisplacement.max(vector);
        } else {
          console.warn('THREE.GLTFLoader: Missing min/max properties for accessor POSITION.');
        }
      }
    }

    // As per comment above this box isn't conservative, but has a reasonable size for a very large number of morph targets.
    box.expandByVector(maxDisplacement);
  }

  geometry.boundingBox = box;

  const sphere = new Sphere();

  box.getCenter(sphere.center);
  sphere.radius = box.min.distanceTo(box.max) / 2;

  geometry.boundingSphere = sphere;
}

export const _identityMatrix = new Matrix4();

/**
 * 将几何体转换为三角形绘制模式
 * @param {BufferGeometry} geometry
 * @param {number} drawMode
 */
export function toTrianglesDrawMode(geometry: BufferGeometry, drawMode: number) {
  let index = geometry.getIndex();

  // 生成索引，如果不存在
  if (index === null) {
    const indices = [];
    const position = geometry.getAttribute('position');

    if (position !== undefined) {
      for (let i = 0; i < position.count; i++) {
        indices.push(i);
      }

      geometry.setIndex(indices);
      index = geometry.getIndex();
    } else {
      console.error(
        'THREE.GLTFLoader.toTrianglesDrawMode(): 在没有位置属性的几何体上无法生成索引。',
      );

      return geometry;
    }
  }

  if (!index) {
    throw new Error('THREE.GLTFLoader.toTrianglesDrawMode(): 索引无效。');
  }

  const numberOfTriangles = index.count - 2;
  const newIndices = [];

  if (drawMode === TriangleFanDrawMode) {
    // gl.TRIANGLE_FAN
    for (let i = 1; i <= numberOfTriangles; i++) {
      newIndices.push(index.getX(0));
      newIndices.push(index.getX(i));
      newIndices.push(index.getX(i + 1));
    }
  } else {
    // gl.TRIANGLE_STRIP
    for (let i = 0; i < numberOfTriangles; i++) {
      if (i % 2 === 0) {
        newIndices.push(index.getX(i));
        newIndices.push(index.getX(i + 1));
        newIndices.push(index.getX(i + 2));
      } else {
        newIndices.push(index.getX(i + 2));
        newIndices.push(index.getX(i + 1));
        newIndices.push(index.getX(i));
      }
    }
  }

  if (newIndices.length / 3 !== numberOfTriangles) {
    console.error('THREE.GLTFLoader.toTrianglesDrawMode(): 无法转换为三角形。');
  }

  const newGeometry = geometry.clone();

  newGeometry.setIndex(newIndices);
  newGeometry.clearGroups();

  return newGeometry;
}

/**
 * 添加变形目标
 * @private
 * @param {BufferGeometry} geometry
 * @param {Array<GLTF.Target>} targets
 * @param {GLTFParser} parser
 * @return {Promise<BufferGeometry>}
 */
export function addMorphTargets(
  geometry: BufferGeometry,
  targets: GLTFMorphTarget[],
  parser: GLTFParser,
) {
  let hasMorphPosition = false;
  let hasMorphNormal = false;
  let hasMorphColor = false;

  for (let i = 0, il = targets.length; i < il; i++) {
    const target = targets[i];

    if (target.POSITION !== undefined) {
      hasMorphPosition = true;
    }
    if (target.NORMAL !== undefined) {
      hasMorphNormal = true;
    }
    if (target.COLOR_0 !== undefined) {
      hasMorphColor = true;
    }

    if (hasMorphPosition && hasMorphNormal && hasMorphColor) {
      break;
    }
  }

  if (!hasMorphPosition && !hasMorphNormal && !hasMorphColor) {
    return Promise.resolve(geometry);
  }

  const pendingPositionAccessors = [];
  const pendingNormalAccessors = [];
  const pendingColorAccessors = [];

  for (let i = 0, il = targets.length; i < il; i++) {
    const target = targets[i];

    if (hasMorphPosition) {
      const pendingAccessor =
        target.POSITION !== undefined
          ? parser.getDependency('accessor', target.POSITION)
          : geometry.attributes.position;

      pendingPositionAccessors.push(pendingAccessor);
    }

    if (hasMorphNormal) {
      const pendingAccessor =
        target.NORMAL !== undefined
          ? parser.getDependency('accessor', target.NORMAL)
          : geometry.attributes.normal;

      pendingNormalAccessors.push(pendingAccessor);
    }

    if (hasMorphColor) {
      const pendingAccessor =
        target.COLOR_0 !== undefined
          ? parser.getDependency('accessor', target.COLOR_0)
          : geometry.attributes.color;

      pendingColorAccessors.push(pendingAccessor);
    }
  }

  return Promise.all([
    Promise.all(pendingPositionAccessors),
    Promise.all(pendingNormalAccessors),
    Promise.all(pendingColorAccessors),
  ]).then(function (accessors) {
    const morphPositions = accessors[0] as BufferAttribute[];
    const morphNormals = accessors[1] as BufferAttribute[];
    const morphColors = accessors[2] as BufferAttribute[];

    if (hasMorphPosition) {
      geometry.morphAttributes.position = morphPositions;
    }
    if (hasMorphNormal) {
      geometry.morphAttributes.normal = morphNormals;
    }
    if (hasMorphColor) {
      geometry.morphAttributes.color = morphColors;
    }
    geometry.morphTargetsRelative = true;

    return geometry;
  });
}

/**
 * 向BufferGeometry添加属性
 * @private
 * @param {BufferGeometry} geometry
 * @param {GLTF.Primitive} primitiveDef
 * @param {GLTFParser} parser
 * @return {Promise<BufferGeometry>}
 */
export function addPrimitiveAttributes(
  geometry: BufferGeometry,
  primitiveDef: GLTFPrimitive,
  parser: GLTFParser,
) {
  const attributes = primitiveDef.attributes;
  // const accessorsDef = parser.json.accessors || [];

  const pending = [];

  function assignAttributeAccessor(accessorIndex: number, attributeName: string) {
    return parser.getDependency('accessor', accessorIndex).then(function (accessor) {
      geometry.setAttribute(attributeName, accessor as BufferAttribute);
    });
  }

  for (const gltfAttributeName in attributes) {
    const threeAttributeName = ATTRIBUTES[gltfAttributeName] || gltfAttributeName.toLowerCase();

    // 跳过已提供的属性
    if (threeAttributeName in geometry.attributes) {
      continue;
    }

    pending.push(assignAttributeAccessor(attributes[gltfAttributeName], threeAttributeName));
  }

  if (primitiveDef.indices !== undefined && !geometry.index) {
    const accessor = parser
      .getDependency('accessor', primitiveDef.indices)
      .then(function (accessor) {
        geometry.setIndex(accessor as BufferAttribute);
      });

    pending.push(accessor);
  }

  // 添加用户数据和计算边界
  assignExtrasToUserData(geometry, primitiveDef);
  computeBounds(geometry, primitiveDef, parser);

  return Promise.all(pending).then(function () {
    return primitiveDef.targets !== undefined
      ? addMorphTargets(geometry, primitiveDef.targets as GLTFMorphTarget[], parser)
      : geometry;
  });
}
