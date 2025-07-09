import type {
  AnimationClip,
  BufferAttribute,
  Camera,
  CompressedTexture,
  Group,
  InterleavedBufferAttribute,
  LoadingManager,
  Material,
  Mesh,
  Object3D,
  SkinnedMesh,
  Texture,
  TextureFilter,
  Wrapping,
} from 'three';
import {
  ClampToEdgeWrapping,
  InterpolateDiscrete,
  InterpolateLinear,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  MirroredRepeatWrapping,
  NearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  RepeatWrapping,
} from 'three';
import type { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import type { GLTFParser } from './GLTF-parser';
import type {
  GLTFBinaryExtension,
  GLTFDracoMeshCompressionExtension,
  GLTFLightsExtension,
  GLTFMaterialsAnisotropyExtension,
  GLTFMaterialsBumpExtension,
  GLTFMaterialsClearcoatExtension,
  GLTFMaterialsDispersionExtension,
  GLTFMaterialsIorExtension,
  GLTFMaterialsIridescenceExtension,
  GLTFMaterialsSheenExtension,
  GLTFMaterialsSpecularExtension,
  GLTFMaterialsTransmissionExtension,
  GLTFMaterialsUnlitExtension,
  GLTFMaterialsVolumeExtension,
  GLTFMeshQuantizationExtension,
  GLTFMeshoptCompression,
  GLTFTextureAVIFExtension,
  GLTFTextureBasisUExtension,
  GLTFTextureTransformExtension,
  GLTFTextureWebPExtension,
} from './extensions';

// 创建导出类型定义
export interface ExtensionsType {
  KHR_BINARY_GLTF: string;
  KHR_DRACO_MESH_COMPRESSION: string;
  KHR_LIGHTS_PUNCTUAL: string;
  KHR_MATERIALS_CLEARCOAT: string;
  KHR_MATERIALS_DISPERSION: string;
  KHR_MATERIALS_IOR: string;
  KHR_MATERIALS_SHEEN: string;
  KHR_MATERIALS_SPECULAR: string;
  KHR_MATERIALS_TRANSMISSION: string;
  KHR_MATERIALS_IRIDESCENCE: string;
  KHR_MATERIALS_ANISOTROPY: string;
  KHR_MATERIALS_UNLIT: string;
  KHR_MATERIALS_VOLUME: string;
  KHR_TEXTURE_BASISU: string;
  KHR_TEXTURE_TRANSFORM: string;
  KHR_MESH_QUANTIZATION: string;
  KHR_MATERIALS_EMISSIVE_STRENGTH: string;
  EXT_MATERIALS_BUMP: string;
  EXT_TEXTURE_WEBP: string;
  EXT_TEXTURE_AVIF: string;
  EXT_MESHOPT_COMPRESSION: string;
  EXT_MESH_GPU_INSTANCING: string;
}

export const EXTENSIONS: ExtensionsType = {
  KHR_BINARY_GLTF: 'KHR_binary_glTF',
  KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
  KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
  KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
  KHR_MATERIALS_DISPERSION: 'KHR_materials_dispersion',
  KHR_MATERIALS_IOR: 'KHR_materials_ior',
  KHR_MATERIALS_SHEEN: 'KHR_materials_sheen',
  KHR_MATERIALS_SPECULAR: 'KHR_materials_specular',
  KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
  KHR_MATERIALS_IRIDESCENCE: 'KHR_materials_iridescence',
  KHR_MATERIALS_ANISOTROPY: 'KHR_materials_anisotropy',
  KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
  KHR_MATERIALS_VOLUME: 'KHR_materials_volume',
  KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
  KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
  KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
  KHR_MATERIALS_EMISSIVE_STRENGTH: 'KHR_materials_emissive_strength',
  EXT_MATERIALS_BUMP: 'EXT_materials_bump',
  EXT_TEXTURE_WEBP: 'EXT_texture_webp',
  EXT_TEXTURE_AVIF: 'EXT_texture_avif',
  EXT_MESHOPT_COMPRESSION: 'EXT_meshopt_compression',
  EXT_MESH_GPU_INSTANCING: 'EXT_mesh_gpu_instancing',
};

export interface WebGLConstantsType {
  FLOAT: number;
  FLOAT_MAT3: number;
  FLOAT_MAT4: number;
  FLOAT_VEC2: number;
  FLOAT_VEC3: number;
  FLOAT_VEC4: number;
  LINEAR: number;
  REPEAT: number;
  SAMPLER_2D: number;
  POINTS: number;
  LINES: number;
  LINE_LOOP: number;
  LINE_STRIP: number;
  TRIANGLES: number;
  TRIANGLE_STRIP: number;
  TRIANGLE_FAN: number;
  UNSIGNED_BYTE: number;
  UNSIGNED_SHORT: number;
}

export const WEBGL_CONSTANTS: WebGLConstantsType = {
  FLOAT: 5126,
  // FLOAT_MAT2: 35674,
  FLOAT_MAT3: 35675,
  FLOAT_MAT4: 35676,
  FLOAT_VEC2: 35664,
  FLOAT_VEC3: 35665,
  FLOAT_VEC4: 35666,
  LINEAR: 9729,
  REPEAT: 10497,
  SAMPLER_2D: 35678,
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6,
  UNSIGNED_BYTE: 5121,
  UNSIGNED_SHORT: 5123,
};

export interface WebGLComponentTypesType {
  5120: Int8ArrayConstructor;
  5121: Uint8ArrayConstructor;
  5122: Int16ArrayConstructor;
  5123: Uint16ArrayConstructor;
  5125: Uint32ArrayConstructor;
  5126: Float32ArrayConstructor;
}

export const WEBGL_COMPONENT_TYPES: WebGLComponentTypesType = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

export interface WebGLFiltersType {
  9728: TextureFilter;
  9729: TextureFilter;
  9984: TextureFilter;
  9985: TextureFilter;
  9986: TextureFilter;
  9987: TextureFilter;
}

export const WEBGL_FILTERS: WebGLFiltersType = {
  9728: NearestFilter,
  9729: LinearFilter,
  9984: NearestMipmapNearestFilter,
  9985: LinearMipmapNearestFilter,
  9986: NearestMipmapLinearFilter,
  9987: LinearMipmapLinearFilter,
};

export interface WebGLWrappingsType {
  33071: Wrapping;
  33648: Wrapping;
  10497: Wrapping;
}

export const WEBGL_WRAPPINGS: WebGLWrappingsType = {
  33071: ClampToEdgeWrapping,
  33648: MirroredRepeatWrapping,
  10497: RepeatWrapping,
};

export interface WebGLTypeSizesType {
  SCALAR: number;
  VEC2: number;
  VEC3: number;
  VEC4: number;
  MAT2: number;
  MAT3: number;
  MAT4: number;
}

export const WEBGL_TYPE_SIZES: WebGLTypeSizesType = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

export interface AttributesType {
  POSITION: string;
  NORMAL: string;
  TANGENT: string;
  TEXCOORD_0: string;
  TEXCOORD_1: string;
  TEXCOORD_2: string;
  TEXCOORD_3: string;
  COLOR_0: string;
  WEIGHTS_0: string;
  JOINTS_0: string;
  [key: string]: string; // 允许用任意字符串索引
}

export const ATTRIBUTES: AttributesType = {
  POSITION: 'position',
  NORMAL: 'normal',
  TANGENT: 'tangent',
  TEXCOORD_0: 'uv',
  TEXCOORD_1: 'uv1',
  TEXCOORD_2: 'uv2',
  TEXCOORD_3: 'uv3',
  COLOR_0: 'color',
  WEIGHTS_0: 'skinWeight',
  JOINTS_0: 'skinIndex',
};

export interface PathPropertiesType {
  scale: string;
  translation: string;
  rotation: string;
  weights: string;
}

export const PATH_PROPERTIES: PathPropertiesType = {
  scale: 'scale',
  translation: 'position',
  rotation: 'quaternion',
  weights: 'morphTargetInfluences',
};

export interface InterpolationType {
  CUBICSPLINE: undefined;
  LINEAR: number;
  STEP: number;
}

export const INTERPOLATION: InterpolationType = {
  CUBICSPLINE: undefined, // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
  // keyframe track will be initialized with a default interpolation type, then modified.
  LINEAR: InterpolateLinear,
  STEP: InterpolateDiscrete,
};

export interface AlphaModesType {
  OPAQUE: string;
  MASK: string;
  BLEND: string;
}

export const ALPHA_MODES: AlphaModesType = {
  OPAQUE: 'OPAQUE',
  MASK: 'MASK',
  BLEND: 'BLEND',
};

export const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
export const BINARY_EXTENSION_HEADER_LENGTH = 12;

export interface BinaryExtensionChunkTypesType {
  JSON: number;
  BIN: number;
}

export const BINARY_EXTENSION_CHUNK_TYPES: BinaryExtensionChunkTypesType = {
  JSON: 0x4e4f534a,
  BIN: 0x004e4942,
};

export interface WebGLInterpolateType {
  STEP: number;
  LINEAR: number;
}

export const WEBGL_INTERPOLATE: WebGLInterpolateType = {
  STEP: InterpolateDiscrete,
  LINEAR: InterpolateLinear,
};

// 导出公共类型定义
export type GLTFComponentType =
  | 5120 // Int8Array
  | 5121 // Uint8Array
  | 5122 // Int16Array
  | 5123 // Uint16Array
  | 5125 // Uint32Array
  | 5126; // Float32Array

export type GLTFAccessorType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4';

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Uint32Array
  | Float32Array;

export interface GLTFAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: GLTFComponentType;
  count: number;
  max?: number[];
  min?: number[];
  type: GLTFAccessorType;
  normalized?: boolean;
  sparse?: {
    count: number;
    indices: {
      bufferView: number;
      byteOffset?: number;
      componentType: GLTFComponentType;
    };
    values: {
      bufferView: number;
      byteOffset?: number;
    };
  };
}

export interface GLTFBufferView {
  extensions: Record<string, GLTFExtensionObject>;
  buffer: number;
  byteLength: number;
  byteOffset?: number;
  byteStride?: number;
  target?: number;
}
export interface GLTFLight {
  spot?: {
    innerConeAngle: number;
    outerConeAngle: number;
  };
  color: [number, number, number];
  intensity: number;
  name?: string;
  range?: number;
  type: 'point' | 'spot' | 'directional' | 'ambient' | 'area';
}

export interface GLTFMaterial {
  name?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
  pbrMetallicRoughness?: {
    baseColorFactor?: [number, number, number, number];
    baseColorTexture?: GLTFTextureInfo;
    metallicFactor?: number;
    roughnessFactor?: number;
    metallicRoughnessTexture?: GLTFTextureInfo;
  };
  normalTexture?: GLTFTextureInfo & {
    scale?: number;
  };
  occlusionTexture?: GLTFTextureInfo & {
    strength?: number;
  };
  emissiveTexture?: GLTFTextureInfo;
  emissiveFactor?: [number, number, number];
  alphaMode?: string;
  alphaCutoff?: number;
  doubleSided?: boolean;
}

export interface GLTFTextureInfo {
  scale?: number;
  index: number;
  texCoord?: number;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

export interface GLTFNode {
  name?: string;
  isBone?: boolean;
  children?: number[];
  matrix?: number[];
  translation?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  mesh?: number;
  camera?: number;
  skin?: number;
  weights?: number[];
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

export interface GLTFPrimitive {
  attributes: {
    [key: string]: number;
  };
  indices?: number;
  material?: number;
  mode?: number;
  targets?: GLTFMorphTarget[];
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF相关接口定义
export interface GLTFLoaderResult {
  scene: Group;
  scenes: Group[];
  cameras: Camera[];
  animations: AnimationClip[];
  asset: {
    copyright?: string;
    generator?: string;
    version: string;
    minVersion?: string;
    extensions?: Record<string, GLTFExtensionObject>;
    extras?: GLTFExtras;
  };
  userData: GLTFExtras;
  parser: GLTFParserInterface;
}

// 定义GLTF扩展对象接口
export interface GLTFExtensionObject {
  [key: string]:
    | GLTFExtras
    | Record<
        string,
        | string
        | number
        | GLTFLight[]
        | GLTFTextureInfo
        | GLTFNode
        | GLTFAnimationChannel
        | GLTFAnimationSampler
        | GLTFAnimation
      >;
}

// 定义GLTF额外数据类型
export type GLTFExtras = string | number | boolean | object | null | object[];

// 定义GLTF解析器接口
export interface GLTFParserInterface {
  json: GLTFJsonData;
  getDependency(
    type: string,
    index: number,
  ): Promise<
    | Object3D
    | Material
    | Texture
    | AnimationClip
    | Camera
    | BufferAttribute
    | InterleavedBufferAttribute
  >;
  getDependencies(
    type: string,
  ): Promise<
    Array<
      | Object3D
      | Material
      | Texture
      | AnimationClip
      | Camera
      | BufferAttribute
      | InterleavedBufferAttribute
    >
  >;
  loadBufferView(index: number): Promise<ArrayBuffer>;
  loadTexture(index: number): Promise<Texture | CompressedTexture>;
  loadMesh(index: number): Promise<Mesh | Group>;
  loadMaterial(index: number): Promise<Material>;
  loadSkin(index: number): Promise<{
    joints: number[];
    inverseBindMatrices?: BufferAttribute | InterleavedBufferAttribute;
  }>;
  loadAnimation(index: number): Promise<AnimationClip>;
  loadNode(index: number): Promise<Object3D>;
  loadScene(index: number): Promise<Group>;
  associations: Map<
    Object3D | Material | Texture,
    {
      type: string;
      index: number;
      primitives?: number[];
    }
  >;
}

export type GLTFExtensionParseType =
  | GLTFBinaryExtension
  | GLTFMaterialsIorExtension
  | GLTFMaterialsTransmissionExtension
  | GLTFMaterialsDispersionExtension
  | GLTFMaterialsUnlitExtension
  | GLTFMaterialsVolumeExtension
  | GLTFMaterialsSpecularExtension
  | GLTFMaterialsIridescenceExtension
  | GLTFMaterialsAnisotropyExtension
  | GLTFMaterialsBumpExtension
  | GLTFMaterialsSheenExtension
  | GLTFLightsExtension
  | GLTFMeshoptCompression
  | GLTFTextureBasisUExtension
  | GLTFTextureWebPExtension
  | GLTFTextureAVIFExtension
  | GLTFDracoMeshCompressionExtension
  | GLTFTextureTransformExtension
  | GLTFMeshQuantizationExtension
  | GLTFMaterialsClearcoatExtension;

export interface GLTFAsset {
  version: number[];
  copyright?: string;
  generator?: string;
  minVersion?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

export interface GLTFLoaderPlugin {
  readonly name: string;
  loadAnimation?: (index: number) => Promise<AnimationClip>;
  beforeRoot?: () => Promise<void> | null;
  afterRoot?: (result: GLTF) => Promise<void> | null;
  loadNode?: (nodeIndex: number) => Promise<Object3D> | null;
  loadMesh?: (meshIndex: number) => Promise<Group | Mesh | SkinnedMesh> | null;
  loadBufferView?: (bufferViewIndex: number) => Promise<ArrayBuffer> | null;
  loadMaterial?: (materialIndex: number) => Promise<Material> | null;
  loadTexture?: (textureIndex: number) => Promise<Texture> | null;
  getMaterialType?: (materialIndex: number) => typeof Material | null;
  extendMaterialParams?: (
    materialIndex: number,
    materialParams: { [key: string]: any },
  ) => Promise<any> | null;
  createNodeMesh?: (nodeIndex: number) => Promise<Group | Mesh | SkinnedMesh> | null;
  createNodeAttachment?: (nodeIndex: number) => Promise<Object3D> | null;
}
// 定义GLTF JSON数据结构
export interface GLTFJsonData {
  [key: string]: unknown;
  asset: GLTFAsset;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  scenes?: GLTFScene[];
  scene?: number;
  nodes?: GLTFNode[];
  materials?: GLTFMaterial[];
  meshes?: GLTFMesh[];
  accessors?: GLTFAccessor[];
  bufferViews?: GLTFBufferView[];
  buffers?: GLTFBuffer[];
  textures?: GLTFTexture[];
  images?: GLTFImage[];
  samplers?: GLTFSampler[];
  skins?: GLTFSkin[];
  cameras?: GLTFCamera[];
  animations?: GLTFAnimation[];
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// 定义GLTF场景
export interface GLTFScene {
  name?: string;
  nodes?: number[];
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF相机定义
export interface GLTFCamera {
  name?: string;
  type: 'perspective' | 'orthographic';
  perspective?: {
    aspectRatio?: number;
    yfov: number;
    zfar?: number;
    znear: number;
    extensions?: Record<string, GLTFExtensionObject>;
    extras?: GLTFExtras;
  };
  orthographic?: {
    xmag: number;
    ymag: number;
    zfar: number;
    znear: number;
    extensions?: Record<string, GLTFExtensionObject>;
    extras?: GLTFExtras;
  };
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF动画定义
export interface GLTFAnimation {
  parameters: undefined;
  name?: string;
  channels: GLTFAnimationChannel[];
  samplers: GLTFAnimationSampler[];
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

export interface GLTFAnimationTarget {
  node?: number;
  path: 'translation' | 'rotation' | 'scale' | 'weights';
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF动画通道
export interface GLTFAnimationChannel {
  sampler: number;
  target: GLTFAnimationTarget;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF动画采样器
export interface GLTFAnimationSampler {
  input: number;
  interpolation?: 'LINEAR' | 'STEP' | 'CUBICSPLINE';
  output: number;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF蒙皮
export interface GLTFSkin {
  inverseBindMatrices?: number;
  skeleton?: number;
  joints: number[];
  name?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF纹理
export interface GLTFTexture {
  sampler?: number;
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
  source?: number;
  name?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF采样器
export interface GLTFSampler {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
  name?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF图像
export interface GLTFImage {
  uri?: string;
  mimeType?: string;
  bufferView?: number;
  name?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF网格
export interface GLTFMesh {
  primitives: GLTFPrimitive[];
  weights?: number[];
  name?: string;
  isSkinnedMesh?: boolean;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

// GLTF缓冲区
export interface GLTFBuffer {
  uri?: string;
  type: string;
  byteLength: number;
  name?: string;
  extensions?: Record<string, GLTFExtensionObject>;
  extras?: GLTFExtras;
}

export interface GLTF {
  animations: AnimationClip[];
  scene: Group;
  scenes: Group[];
  cameras: Camera[];
  asset: GLTFAsset;
  parser: GLTFParser;
  userData: Record<string, any>;
}

export interface GLTFMorphTarget {
  POSITION: number;
  NORMAL: number;
  COLOR_0: number;
  TEXCOORD_0: number;
  TEXCOORD_1: number;
  name: string;
  weights: number[];
  primitives: GLTFPrimitive[];
  extras?: { targetNames: string };
}

// 加载器配置选项
export interface GLTFLoaderOptions {
  resourcePath?: string;
  withCredentials?: boolean;
  /** 资源路径 */
  path: string;

  /** 跨域设置 */
  crossOrigin: string;

  /** 请求头设置 */
  requestHeader: Record<string, string>;

  /** 加载管理器 */
  manager: LoadingManager;

  dracoLoader?: DRACOLoader;
  ktx2Loader?: KTX2Loader;
  meshoptDecoder?: typeof MeshoptDecoder;
}
