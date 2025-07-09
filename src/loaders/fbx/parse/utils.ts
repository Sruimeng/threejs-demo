// Returns the three.js intrinsic Euler order corresponding to FBX extrinsic Euler order

import type { EulerOrder, EulerTuple } from 'three';
import { Euler, FrontSide, MathUtils, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import type { FBXTransformData } from '../constants';
import { FBXEulerOrder } from '../constants';

/**
 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
 */
export function createDefaultMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    name: 'default',
    color: 0xffffff,
    emissive: 0x000000,
    metalness: 0,
    roughness: 0.5,
    transparent: false,
    depthTest: true,
    side: FrontSide,
  });
}

// ref: http://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_class_fbx_euler_html
export function getEulerOrder(order: FBXEulerOrder): string {
  order = order || 0;

  if (order === FBXEulerOrder.SphericXYZ) {
    console.warn(
      'THREE.FBXLoader: unsupported Euler Order: Spherical XYZ. Animations and rotations may be incorrect.',
    );

    return FBXEulerOrder[0];
  }

  return FBXEulerOrder[order];
}

const tempEuler = new Euler();
const tempVec = new Vector3();
const dataArray: any[] = []; // corrected type annotation

// generate transformation from FBX transform data
// ref: https://help.autodesk.com/view/FBX/2017/ENU/?guid=__files_GUID_10CDD63C_79C1_4F2D_BB28_AD2BE65A02ED_htm
// ref: http://docs.autodesk.com/FBX/2014/ENU/FBX-SDK-Documentation/index.html?url=cpp_ref/_transformations_2main_8cxx-example.html,topicNumber=cpp_ref__transformations_2main_8cxx_example_htmlfc10a1e1-b18d-4e72-9dc0-70d0f1959f5e
export function generateTransform(transformData: FBXTransformData) {
  const lTranslationM = new Matrix4();
  const lPreRotationM = new Matrix4();
  const lRotationM = new Matrix4();
  const lPostRotationM = new Matrix4();

  const lScalingM = new Matrix4();
  const lScalingPivotM = new Matrix4();
  const lScalingOffsetM = new Matrix4();
  const lRotationOffsetM = new Matrix4();
  const lRotationPivotM = new Matrix4();

  const lParentGX = new Matrix4();
  const lParentLX = new Matrix4();
  const lGlobalT = new Matrix4();

  const inheritType = transformData.inheritType ? transformData.inheritType : 0;

  if (transformData.translation) {
    lTranslationM.setPosition(tempVec.fromArray(transformData.translation));
  }

  // For Maya models using "Joint Orient", Euler order only applies to rotation, not pre/post-rotations
  const defaultEulerOrder = getEulerOrder(0);

  if (transformData.preRotation) {
    const array = transformData.preRotation.map(MathUtils.degToRad) as EulerTuple;
    // Maya uses ZYX order for pre-rotation

    (array as string[]).push(defaultEulerOrder);
    lPreRotationM.makeRotationFromEuler(tempEuler.fromArray(array));
  }

  if (transformData.rotation) {
    const array = transformData.rotation.map(MathUtils.degToRad) as EulerTuple;

    array.push((transformData.eulerOrder || defaultEulerOrder) as EulerOrder);
    lRotationM.makeRotationFromEuler(tempEuler.fromArray(array));
  }

  if (transformData.postRotation) {
    const array = transformData.postRotation.map(MathUtils.degToRad) as EulerTuple;

    array.push(defaultEulerOrder as EulerOrder);
    lPostRotationM.makeRotationFromEuler(tempEuler.fromArray(array));
    lPostRotationM.invert();
  }

  if (transformData.scale) {
    lScalingM.scale(tempVec.fromArray(transformData.scale));
  }

  // Pivots and offsets
  if (transformData.scalingOffset) {
    lScalingOffsetM.setPosition(tempVec.fromArray(transformData.scalingOffset));
  }
  if (transformData.scalingPivot) {
    lScalingPivotM.setPosition(tempVec.fromArray(transformData.scalingPivot));
  }
  if (transformData.rotationOffset) {
    lRotationOffsetM.setPosition(tempVec.fromArray(transformData.rotationOffset));
  }
  if (transformData.rotationPivot) {
    lRotationPivotM.setPosition(tempVec.fromArray(transformData.rotationPivot));
  }

  // parent transform
  if (transformData.parentMatrixWorld) {
    lParentLX.copy(transformData.parentMatrix as Matrix4);
    lParentGX.copy(transformData.parentMatrixWorld);
  }

  const lLRM = lPreRotationM.clone().multiply(lRotationM).multiply(lPostRotationM);
  // Global Rotation
  const lParentGRM = new Matrix4();

  lParentGRM.extractRotation(lParentGX);

  // Global Shear*Scaling
  const lParentTM = new Matrix4();

  lParentTM.copyPosition(lParentGX);

  const lParentGRSM = lParentTM.clone().invert().multiply(lParentGX);
  const lParentGSM = lParentGRM.clone().invert().multiply(lParentGRSM);
  const lLSM = lScalingM;

  const lGlobalRS = new Matrix4();

  if (inheritType === 0) {
    lGlobalRS.copy(lParentGRM).multiply(lLRM).multiply(lParentGSM).multiply(lLSM);
  } else if (inheritType === 1) {
    lGlobalRS.copy(lParentGRM).multiply(lParentGSM).multiply(lLRM).multiply(lLSM);
  } else {
    const lParentLSM = new Matrix4().scale(new Vector3().setFromMatrixScale(lParentLX));
    const lParentLSM_inv = lParentLSM.clone().invert();
    const lParentGSM_noLocal = lParentGSM.clone().multiply(lParentLSM_inv);

    lGlobalRS.copy(lParentGRM).multiply(lLRM).multiply(lParentGSM_noLocal).multiply(lLSM);
  }

  const lRotationPivotM_inv = lRotationPivotM.clone().invert();
  const lScalingPivotM_inv = lScalingPivotM.clone().invert();
  // Calculate the local transform matrix
  let lTransform = lTranslationM
    .clone()
    .multiply(lRotationOffsetM)
    .multiply(lRotationPivotM)
    .multiply(lPreRotationM)
    .multiply(lRotationM)
    .multiply(lPostRotationM)
    .multiply(lRotationPivotM_inv)
    .multiply(lScalingOffsetM)
    .multiply(lScalingPivotM)
    .multiply(lScalingM)
    .multiply(lScalingPivotM_inv);

  const lLocalTWithAllPivotAndOffsetInfo = new Matrix4().copyPosition(lTransform);

  const lGlobalTranslation = lParentGX.clone().multiply(lLocalTWithAllPivotAndOffsetInfo);

  lGlobalT.copyPosition(lGlobalTranslation);

  lTransform = lGlobalT.clone().multiply(lGlobalRS);

  // from global to local
  lTransform.premultiply(lParentGX.invert());

  return lTransform;
}

function slice(a: number[], b: number[], from: number, to: number): number[] {
  for (let i = from, j = 0; i < to; i++, j++) {
    a[j] = b[i];
  }

  return a;
}

// extracts the data from the correct position in the FBX array based on indexing type
export function getData(
  polygonVertexIndex: number,
  polygonIndex: number,
  vertexIndex: number,
  infoObject: {
    mappingType: string;
    indices: number[];
    referenceType: string;
    dataSize: number;
    buffer: number[];
  },
): number[] {
  let index = 0;

  switch (infoObject.mappingType) {
    case 'ByPolygonVertex':
      index = polygonVertexIndex;

      break;
    case 'ByPolygon':
      index = polygonIndex;

      break;
    case 'ByVertice':
      index = vertexIndex;

      break;
    case 'AllSame':
      index = infoObject.indices[0];

      break;
    default:
      console.warn('THREE.FBXLoader: unknown attribute mapping type ' + infoObject.mappingType);
  }

  if (infoObject.referenceType === 'IndexToDirect') {
    index = infoObject.indices[index];
  }

  const from = index * infoObject.dataSize;
  const to = from + infoObject.dataSize;

  return slice(dataArray, infoObject.buffer, from, to);
}

// Converts FBX ticks into real time seconds.
export function convertFBXTimeToSeconds(time: number): number {
  return time / 46186158000;
}
