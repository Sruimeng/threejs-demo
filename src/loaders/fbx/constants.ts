import type { Bone, EulerOrder, Matrix4 } from 'three';
import { Group } from 'three';

// FBX 上下文参数
export interface FBXDocumentOptions {
  fbxTree: IFBXTree;
  fbxConnections: Map<number, FBXConnectionNode>;
  sceneGraph?: Group;
}

export interface IFBXTree {
  FBXHeaderExtension?: FBXHeaderExtension;
  FileId?: FBXProperty;
  CreationTime?: FBXProperty;
  Creator?: FBXProperty;
  GlobalSettings?: FBXGlobalSettings;
  Documents?: FBXDocuments;
  References?: FBXProperty;
  Definitions?: FBXDefinitions;
  Objects?: FBXObjects;
  Connections?: FBXConnectionDocment;
  [key: string]: any;
}

export interface FBXProperty {
  singleProperty: boolean;
  propertyList: object[];
  name: string;
  [key: string]: any;
}

export interface FBXHeaderExtension {
  singleProperty: boolean;
  FBXHeaderVersion: number;
  FBXVersion: number;
  EncryptionType: number;
  CreationTimeStamp: FBXTimeStamp;
  Creator: string;
  SceneInfo: FBXSceneInfo;
  propertyList: any[];
  name: string;
}

export interface FBXConnectionDocment extends FBXPropertyTemplate {
  connections: [number, number, string][];
}

export interface FBXTimeStamp {
  singleProperty: boolean;
  Version: number;
  Year: number;
  Month: number;
  Day: number;
  Hour: number;
  Minute: number;
  Second: number;
  Millisecond: number;
  propertyList: any[];
  name: string;
}

export interface FBXSceneInfo {
  singleProperty: boolean;
  Type: string;
  Version: number;
  MetaData: FBXMetaData;
  DocumentUrl: FBXTypedProperty;
  SrcDocumentUrl: FBXTypedProperty;
  Original: FBXTypedProperty;
  LastSaved: FBXTypedProperty;
  propertyList: string[];
  name: string;
  attrName: string;
  [key: string]: any;
}

export interface FBXMetaData {
  singleProperty: boolean;
  Version: number;
  Title: string;
  Subject: string;
  Author: string;
  Keywords: string;
  Revision: string;
  Comment: string;
  propertyList: any[];
  name: string;
}

export interface FBXTypedProperty {
  type: string;
  type2?: string;
  flag: string;
  value?: any;
}

export interface FBXGlobalSettings {
  singleProperty: boolean;
  Version: number;
  UpAxis: FBXTypedProperty;
  UpAxisSign: FBXTypedProperty;
  FrontAxis: FBXTypedProperty;
  FrontAxisSign: FBXTypedProperty;
  CoordAxis: FBXTypedProperty;
  CoordAxisSign: FBXTypedProperty;
  OriginalUpAxis: FBXTypedProperty;
  OriginalUpAxisSign: FBXTypedProperty;
  UnitScaleFactor: FBXTypedProperty;
  OriginalUnitScaleFactor: FBXTypedProperty;
  AmbientColor: FBXTypedProperty;
  DefaultCamera: FBXTypedProperty;
  TimeMode: FBXTypedProperty;
  TimeProtocol: FBXTypedProperty;
  SnapOnFrameMode: FBXTypedProperty;
  TimeSpanStart: FBXTypedProperty;
  TimeSpanStop: FBXTypedProperty;
  CustomFrameRate: FBXTypedProperty;
  TimeMarker: FBXTypedProperty;
  CurrentTimeMarker: FBXTypedProperty;
  propertyList: any[];
  name: string;
}

export interface FBXDocuments {
  singleProperty: boolean;
  Count: number;
  Document: {
    [id: string]: FBXDocument;
  };
  propertyList: any[];
  name: string;
}

export interface FBXDocument {
  singleProperty: boolean;
  SourceObject: FBXTypedProperty;
  ActiveAnimStackName: FBXTypedProperty;
  propertyList: any[];
  name: string;
  RootNode: number;
  id: number;
  attrType: string;
}

export interface FBXDefinitions {
  singleProperty: boolean;
  Version: number;
  Count: number;
  ObjectType: {
    [key: string]: FBXObjectType;
  };
  propertyList: string[];
  name: string;
}

export interface FBXObjectType {
  singleProperty: boolean;
  Count: number;
  PropertyTemplate?: FBXPropertyTemplate;
  propertyList: string[];
  name: string;
  undefined?: FBXObjectType;
}

export interface FBXPropertyTemplate {
  singleProperty: boolean;
  Description: FBXTypedProperty;
  LocalStart: FBXTypedProperty;
  LocalStop: FBXTypedProperty;
  ReferenceStart: FBXTypedProperty;
  ReferenceStop: FBXTypedProperty;
  propertyList: string[];
  name: string;
}
export interface FBXRawTargets {
  geoID?: number;
  name: string;
  initialWeight: FBXTreeNodeDetails;
  id: number;
  fullWeights: number[];
}
export interface FBXMorphTarget {
  id: string;
  rawTargets?: FBXRawTargets[];
  skeleton?: FBXSkeleton;
}
export interface UserDataTransform {
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  preRotation?: number[];
  postRotation?: number[];
  rotationOffset?: number[];
  rotationPivot?: number[];
  scalingOffset?: number[];
  scalingPivot?: number[];
  eulerOrder?: EulerOrder;
  inheritType?: number;
  parentMatrix?: Matrix4;
  parentMatrixWorld?: Matrix4;
}

export interface FBXSkeleton {
  ID: string;
  rawBones: RawBone[];
  bones: Bone[];
  geometryID: number;
}

export interface RawBone {
  ID: number;
  indices: number[];
  weights: number[];
  transformLink: Matrix4;
}

export interface FBXPoseNode extends FBXTreeNode {
  PoseNode: FBXMeshNode | FBXMeshNode[] | Record<string, FBXMeshNode>[];
  NbPoseNodes: number;
}

export interface Deformers {
  skeletons: Record<number, FBXSkeleton>;
  morphTargets: Record<number, FBXMorphTarget>;
}

export interface FBXNodeAttribute extends FBXTreeNode {
  CameraProjectionType?: FBXTreeNode;
  NearPlane?: FBXTreeNode;
  FarPlane?: FBXTreeNode;
  FocalLength?: FBXTreeNode;
  AspectWidth?: FBXTreeNode;
  AspectHeight?: FBXTreeNode;
  FieldOfView?: FBXTreeNode;
}

export interface FBXAnimationCurveNode extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails;
  KeyValueFloat: FBXTreeNodeDetails;
}

export interface FBXLightNodeAttribute extends FBXNodeAttribute {
  CastShadows?: FBXTreeNode;
  LightType?: FBXTreeNode;
  Color?: FBXTreeNode;
  Intensity?: FBXTreeNode;
  InnerAngle?: FBXTreeNode;
  OuterAngle?: FBXTreeNode;
  CastLightOnObject?: FBXTreeNode;
  EnableFarAttenuation?: FBXTreeNode;
  FarAttenuationEnd?: FBXTreeNode;
}

export interface FBXObjects {
  singleProperty: boolean;
  Geometry?: {
    [id: string]: FBXGeometryNode;
  };
  Model?: Record<string, FBXModelNode>;
  Material?: Record<string, FBXMaterialNode>;
  Pose?: Record<string, FBXPoseNode>;
  Video?: Record<string, FBXVideoNode>;
  NodeAttribute?: Record<string, FBXNodeAttribute>;
  AnimationCurveNode?: Record<string, FBXAnimationCurveNode>;
  AnimationCurve?: Record<string, FBXAnimationCurveNode>;
  [key: string]: any;
  propertyList: any[];
  name: string;
}

export interface FBXGeometryNode {
  Order?: string;
  Form?: string;
  KnotVector?: FBXTreeNodeDetails;
  Points?: FBXTreeNodeDetails;
  LayerElementColor: any;
  attrName: string;
  singleProperty: boolean;
  Vertices: FBXProperty;
  Indexes?: FBXProperty;
  PolygonVertexIndex: FBXProperty;
  GeometryVersion: number;
  LayerElementNormal?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementBinormal?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementTangent?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementUV?: {
    [id: string]: FBXLayerElementUV;
  };
  LayerElementSmoothing?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementMaterial?: {
    [id: string]: FBXMaterialNode;
  };
  Layer?: {
    [id: string]: FBXLayer;
  };
  propertyList: any[];
  id: number;
  attrType: string;
  name: string;
}

export interface FBXLayerElement {
  singleProperty: boolean;
  Version: number;
  Name: string;
  MappingInformationType: string;
  ReferenceInformationType: string;
  Normals?: FBXTreeNodeDetails;
  NormalsW?: FBXProperty;
  Binormals?: FBXProperty;
  BinormalsW?: FBXProperty;
  Tangents?: FBXProperty;
  TangentsW?: FBXProperty;
  Smoothing?: FBXProperty;
  Materials?: FBXProperty;
  propertyList: any[];
  id: number;
  name: string;
}

export interface FBXLayerElementUV extends FBXLayerElement {
  UV: FBXProperty;
  UVIndex: FBXProperty;
}

export interface FBXLayerElementColor extends FBXLayerElement {
  Colors: FBXTreeNodeDetails;
  ColorIndex: FBXTreeNodeDetails;
}
export interface FBXLayerElementNormal extends FBXLayerElement {
  NormalIndex?: FBXTreeNodeDetails;
  NormalsIndex?: FBXTreeNodeDetails;
}

export interface FBXLayer {
  singleProperty: boolean;
  Version: number;
  LayerElement: FBXLayerElementRef;
  propertyList: any[];
  id: number;
  name: string;
}

export interface FBXLayerElementRef {
  singleProperty: boolean;
  Type: string;
  TypedIndex: number;
  propertyList: object[];
  name: string;
  undefined?: FBXLayerElementRef;
}

export interface FBXMaterial {
  singleProperty: boolean;
  Version: number;
  ShadingModel: string;
  MultiLayer: number;
  AmbientColor: FBXTypedProperty;
  DiffuseColor: FBXTypedProperty;
  DiffuseFactor: FBXTypedProperty;
  TransparencyFactor: FBXTypedProperty;
  Emissive: FBXTypedProperty;
  Ambient: FBXTypedProperty;
  Diffuse: FBXTypedProperty;
  Opacity: FBXTypedProperty;
  propertyList: object[];
  name: string;
  id: number;
  attrName: string;
}

export interface FBXTransformData {
  postRotation?: number[];
  scalingOffset?: number[];
  scalingPivot?: number[];
  rotationOffset?: number[];
  rotationPivot?: number[];
  parentMatrixWorld?: Matrix4;
  parentMatrix?: Matrix4;
  eulerOrder?: string;
  inheritType?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  preRotation?: number[];
}

export interface FBXConnectionNode {
  parents: FBXConnectionReference[];
  children: FBXConnectionReference[];
}

export interface FBXTreeNode {
  value?: FBXEulerOrder | string | number;
  ID?: number;
  id?: number;
  attrName?: string;
  attrType?: string;
  name?: string;
  propertyList?: string[];
  singleProperty?: boolean;
  version?: number;
}

export interface FBXConnectionReference {
  ID: number;
  relationship?: number | string; // 可能是OO或OP等关系类型
}

export interface FBXTreeNodeDetails extends FBXTreeNode {
  a: number[];
}

export interface FBXMeshNode extends FBXTreeNode {
  DeformPercent: FBXTreeNodeDetails;
  FullWeights: FBXTreeNodeDetails;
  Indexes?: FBXTreeNodeDetails;
  Transform?: FBXTreeNodeDetails;
  TransformLink?: FBXTreeNodeDetails;
  UserData?: FBXTreeNodeDetails;
  Weights?: FBXTreeNodeDetails;
  Material?: FBXTreeNodeDetails;
  Matrix?: FBXTreeNodeDetails;
  Node?: number;
}

export interface FBXModelNode extends FBXTreeNode {
  LookAtProperty?: string;
  GeometricTranslation: FBXTypedProperty;
  GeometricRotation: FBXTypedProperty;
  GeometricScaling: FBXTypedProperty;
  singleProperty: boolean;
  ScalingOffset: FBXTypedProperty;
  RotationOffset: FBXTypedProperty;
  Lcl_Rotation: FBXTypedProperty;
  PostRotation: FBXTypedProperty;
  Version: number;
  RotationPivot: FBXTypedProperty;
  ScalingPivot: FBXTypedProperty;
  RotationActive: FBXTypedProperty;
  InheritType: FBXTypedProperty;
  ScalingMax: FBXTypedProperty;
  DefaultAttributeIndex: FBXTypedProperty;
  currentUVSet: FBXTypedProperty;
  RotationOrder: FBXTreeNode;
  Shading: boolean;
  Lcl_Translation: FBXTypedProperty;
  Lcl_Scaling: FBXTypedProperty;
  filmboxTypeID: FBXTypedProperty;
  lockInfluenceWeights: FBXTypedProperty;
  PreRotation: FBXTypedProperty;
  Culling: string;
}

/**
 * FBX文件中纹理节点的接口定义
 */
export interface FBXTextureNode {
  WrapModeU: {
    value: number;
  };
  Scaling: FBXTypedProperty;
  WrapModeV: {
    value: number;
  }; // Added back the WrapModeV property
  Translation: FBXTypedProperty;
  /** 纹理文件的完整路径 */
  FileName: string;

  /** 媒体文件名 */
  Media: string;

  /** 相对路径的文件名 */
  RelativeFilename: string;

  /** 纹理名称，通常描述纹理用途 */
  TextureName: string;

  /** 纹理类型 */
  Type: string;

  /** 使用材质的标志 */
  UseMaterial: {
    type: string;
    type2: string;
    flag: string;
    value: number;
  };

  /** 版本号 */
  Version: number;

  /** 属性名称 */
  attrName: string;

  /** 属性类型 */
  attrType: string;

  /** 唯一标识符 */
  id: number;

  /** 节点名称 */
  name: string;

  /** 属性列表，通常包含 [id, 名称, 类型] */
  propertyList: Array<number | string>;

  /** 是否为单一属性 */
  singleProperty: boolean;
}

export interface FBXVideoNode {
  // 主要属性
  Content: ArrayBuffer;
  Filename: string;
  RelativeFilename: string;
  Path: string;

  // 类型标识
  Type: string;
  type: string;
  type2: string;
  attrType: string;

  // 标志和值
  flag: string;
  value: string;
  UseMipMap: number;

  // 标识信息
  id: number;
  name: string;
  attrName: string;

  // 属性列表，通常包含 [id, 文件名, 类型]
  propertyList: Array<string | number>;

  // 是否为单一属性
  singleProperty: boolean;
}

export interface FBXConnectionDocment {
  from: number;
  to: number;
  relationship?: number;
}

// FBX连接类型
export enum FBXConnectionType {
  OBJECT_OBJECT = 'OO', // 对象到对象的连接
  OBJECT_PROPERTY = 'OP', // 对象到属性的连接
}

/**
 * FBX材质节点中颜色或数值属性的通用接口
 */
export interface IFBXPropertyValue<T> {
  /** 属性类型 */
  type: string;
  /** 次级类型 */
  type2: string;
  /** 标志 */
  flag: string;
  /** 属性值 */
  value: T;
}

/**
 * FBX文件中材质节点的接口定义
 */
export interface FBXMaterialNode {
  MappingInformationType: string;
  ReferenceInformationType: string;
  Materials: any;
  Diffuse: IFBXPropertyValue<number[]>;
  DisplacementFactor: IFBXPropertyValue<number[] | number>;
  Emissive: IFBXPropertyValue<number[]>;
  TransparencyFactor: IFBXPropertyValue<string>;
  Opacity: IFBXPropertyValue<string>;
  TransparentColor: IFBXPropertyValue<string[]>;
  Specular: IFBXPropertyValue<number[]>;
  /** 唯一标识符 */
  id: number;

  /** 属性名称 */
  attrName: string;

  /** 属性类型 */
  attrType: string;

  /** 是否为单一属性 */
  singleProperty: boolean;

  /** 节点名称 */
  name: string;

  /** 版本号 */
  Version: number;

  /** 着色模型类型 */
  ShadingModel: IFBXPropertyValue<string>;

  /** 是否多层 */
  MultiLayer: number;

  /** 漫反射颜色 */
  DiffuseColor: IFBXPropertyValue<number[]>;

  /** 自发光颜色 */
  EmissiveColor: IFBXPropertyValue<number[]>;

  /** 自发光因子 */
  EmissiveFactor: IFBXPropertyValue<string>;

  /** 环境光颜色 */
  AmbientColor: IFBXPropertyValue<number[]>;

  /** 环境光因子 */
  AmbientFactor: IFBXPropertyValue<number>;

  /** 凹凸因子 */
  BumpFactor: IFBXPropertyValue<number>;

  /** 镜面颜色 */
  SpecularColor: IFBXPropertyValue<number[]>;

  /** 镜面因子 */
  SpecularFactor: IFBXPropertyValue<number>;

  /** 光泽度 */
  Shininess: IFBXPropertyValue<number>;

  /** 光泽度指数 */
  ShininessExponent: IFBXPropertyValue<number>;

  /** 反射颜色 */
  ReflectionColor: IFBXPropertyValue<number[]>;

  /** 反射因子 */
  ReflectionFactor: IFBXPropertyValue<number>;

  /** 属性列表，通常包含 [id, 名称, 类型] */
  propertyList: Array<number | string>;
}

export enum FBXEulerOrder {
  'ZYX' = 0, // -> XYZ extrinsic
  'YZX' = 1, // -> XZY extrinsic
  'XZY' = 2, // -> YZX extrinsic
  'ZXY' = 3, // -> YXZ extrinsic
  'YXZ' = 4, // -> ZXY extrinsic
  'XYZ' = 5, // -> ZYX extrinsic
  'SphericXYZ' = 6, // not possible to support
}

// FBX节点类型枚举
export enum FBXNodeType {
  MODEL = 'Model',
  GEOMETRY = 'Geometry',
  MATERIAL = 'Material',
  TEXTURE = 'Texture',
  VIDEO = 'Video',
  ANIMATION = 'Animation',
  DEFORMER = 'Deformer',
}

// FBX材质属性类型
export enum FBXMaterialPropertyType {
  EMISSIVE = 'Emissive',
  AMBIENT = 'Ambient',
  DIFFUSE = 'Diffuse',
  SPECULAR = 'Specular',
  SHININESS = 'Shininess',
  REFLECTIVITY = 'Reflectivity',
}

// FBX映射信息类型
export enum MappingInformationType {
  BY_POLYGON_VERTEX = 'ByPolygonVertex',
  BY_POLYGON = 'ByPolygon',
  BY_VERTEX = 'ByVertex',
  BY_EDGE = 'ByEdge',
  ALL_SAME = 'AllSame',
}

// FBX引用信息类型
export enum ReferenceInformationType {
  DIRECT = 'Direct',
  INDEX_TO_DIRECT = 'IndexToDirect',
}

// FBX层元素类型
export enum LayerElementType {
  NORMAL = 'LayerElementNormal',
  BINORMAL = 'LayerElementBinormal',
  TANGENT = 'LayerElementTangent',
  UV = 'LayerElementUV',
  COLOR = 'LayerElementColor',
  MATERIAL = 'LayerElementMaterial',
  SMOOTHING = 'LayerElementSmoothing',
}

export interface Global {
  wireframe?: boolean;
  fbxTree: IFBXTree;
  connections: Map<number, FBXConnectionNode>;
  sceneGraph: Group;
}

export const global: Global = {
  fbxTree: {},
  connections: new Map(),
  sceneGraph: new Group(),
  wireframe: true,
};
