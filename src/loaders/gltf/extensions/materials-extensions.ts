import type { MeshPhysicalMaterialParameters, MeshStandardMaterialParameters } from 'three';
import {
  Color,
  LinearSRGBColorSpace,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Vector2,
} from 'three';

import type { GLTFMaterial, GLTFTextureInfo } from '../constants.js';
import { EXTENSIONS } from '../constants.js';
import type { GLTFParser } from '../GLTF-parser.js';

function isGLTFTextureInfo(obj: unknown): obj is GLTFTextureInfo {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // GLTFTextureInfo 通常有 index 属性，且为 number
  return 'index' in obj && typeof (obj as unknown as { index: number }).index === 'number';
}
/**
 * Unlit Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit
 */
export class GLTFMaterialsUnlitExtension {
  name: string;
  constructor() {
    this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;
  }

  getMaterialType() {
    return MeshBasicMaterial;
  }

  extendParams(
    materialParams: MeshStandardMaterialParameters,
    materialDef: GLTFMaterial,
    parser: GLTFParser,
  ) {
    const pending = [];

    materialParams.color = new Color(1.0, 1.0, 1.0);
    materialParams.opacity = 1.0;

    const metallicRoughness = materialDef.pbrMetallicRoughness;

    if (metallicRoughness) {
      if (Array.isArray(metallicRoughness.baseColorFactor)) {
        const array = metallicRoughness.baseColorFactor;

        materialParams.color.setRGB(array[0], array[1], array[2], LinearSRGBColorSpace);
        materialParams.opacity = array[3];
      }

      if (metallicRoughness.baseColorTexture !== undefined) {
        pending.push(
          parser.assignTexture(
            materialParams,
            'map',
            metallicRoughness.baseColorTexture,
            SRGBColorSpace,
          ),
        );
      }
    }

    return Promise.all(pending);
  }
}

/**
 * Materials Emissive Strength Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/blob/5768b3ce0ef32bc39cdf1bef10b948586635ead3/extensions/2.0/Khronos/KHR_materials_emissive_strength/README.md
 */
export class GLTFMaterialsEmissiveStrengthExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_EMISSIVE_STRENGTH;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshStandardMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const emissiveStrength = materialDef.extensions[this.name].emissiveStrength;

    if (emissiveStrength !== undefined && typeof emissiveStrength === 'number') {
      materialParams.emissiveIntensity = emissiveStrength;
    }

    return Promise.resolve();
  }
}

/**
 * Clearcoat Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_clearcoat
 */
export class GLTFMaterialsClearcoatExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];

    const extension = materialDef.extensions[this.name];

    if (extension.clearcoatFactor !== undefined && typeof extension.clearcoatFactor === 'number') {
      materialParams.clearcoat = extension.clearcoatFactor;
    }

    if (extension.clearcoatTexture !== undefined && isGLTFTextureInfo(extension.clearcoatTexture)) {
      pending.push(
        parser.assignTexture(materialParams, 'clearcoatMap', extension.clearcoatTexture),
      );
    }

    if (
      extension.clearcoatRoughnessFactor !== undefined &&
      typeof extension.clearcoatRoughnessFactor === 'number'
    ) {
      materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;
    }

    if (
      extension.clearcoatRoughnessTexture !== undefined &&
      isGLTFTextureInfo(extension.clearcoatRoughnessTexture)
    ) {
      pending.push(
        parser.assignTexture(
          materialParams,
          'clearcoatRoughnessMap',
          extension.clearcoatRoughnessTexture,
        ),
      );
    }

    if (
      extension.clearcoatNormalTexture !== undefined &&
      isGLTFTextureInfo(extension.clearcoatNormalTexture)
    ) {
      pending.push(
        parser.assignTexture(
          materialParams,
          'clearcoatNormalMap',
          extension.clearcoatNormalTexture,
        ),
      );

      if (extension.clearcoatNormalTexture.scale !== undefined) {
        const scale = extension.clearcoatNormalTexture.scale;

        materialParams.clearcoatNormalScale = new Vector2(scale, scale);
      }
    }

    return Promise.all(pending);
  }
}

/**
 * Transmission Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission
 * Draft: https://github.com/KhronosGroup/glTF/pull/1698
 *
 * @private
 */
export class GLTFMaterialsTransmissionExtension {
  parser: GLTFParser;
  name: string;

  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];

    const extension = materialDef.extensions[this.name];

    if (
      extension.transmissionFactor !== undefined &&
      typeof extension.transmissionFactor === 'number'
    ) {
      materialParams.transmission = extension.transmissionFactor;
    }

    if (
      extension.transmissionTexture !== undefined &&
      isGLTFTextureInfo(extension.transmissionTexture)
    ) {
      pending.push(
        parser.assignTexture(materialParams, 'transmissionMap', extension.transmissionTexture),
      );
    }

    return Promise.all(pending);
  }
}

/**
 * Sheen Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_sheen
 *
 * @private
 */
export class GLTFMaterialsSheenExtension {
  parser: GLTFParser;
  name: string;

  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_SHEEN;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];

    materialParams.sheenColor = new Color(0, 0, 0);
    materialParams.sheenRoughness = 0;
    materialParams.sheen = 1;

    const extension = materialDef.extensions[this.name];

    if (extension.sheenColorFactor !== undefined && Array.isArray(extension.sheenColorFactor)) {
      const colorFactor = extension.sheenColorFactor;

      materialParams.sheenColor.setRGB(
        colorFactor[0],
        colorFactor[1],
        colorFactor[2],
        LinearSRGBColorSpace,
      );
    }

    if (
      extension.sheenRoughnessFactor !== undefined &&
      typeof extension.sheenRoughnessFactor === 'number'
    ) {
      materialParams.sheenRoughness = extension.sheenRoughnessFactor;
    }

    if (
      extension.sheenColorTexture !== undefined &&
      isGLTFTextureInfo(extension.sheenColorTexture)
    ) {
      pending.push(
        parser.assignTexture(
          materialParams,
          'sheenColorMap',
          extension.sheenColorTexture,
          SRGBColorSpace,
        ),
      );
    }

    if (
      extension.sheenRoughnessTexture !== undefined &&
      isGLTFTextureInfo(extension.sheenRoughnessTexture)
    ) {
      pending.push(
        parser.assignTexture(materialParams, 'sheenRoughnessMap', extension.sheenRoughnessTexture),
      );
    }

    return Promise.all(pending);
  }
}

/**
 * Materials Dispersion Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_dispersion
 */
export class GLTFMaterialsDispersionExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_DISPERSION;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const extension = materialDef.extensions[this.name];

    if (extension.dispersion !== undefined && typeof extension.dispersion === 'number') {
      materialParams.dispersion = extension.dispersion !== undefined ? extension.dispersion : 0;
    }

    return Promise.resolve();
  }
}

/**
 * Materials IOR Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_ior
 */
export class GLTFMaterialsIorExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_IOR;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const extension = materialDef.extensions[this.name];

    if (extension.ior !== undefined && typeof extension.ior === 'number') {
      materialParams.ior = extension.ior;
    }

    return Promise.resolve();
  }
}

/**
 * 材质体积扩展
 *
 * 规范: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_volume
 */
export class GLTFMaterialsVolumeExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_VOLUME;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];
    const extension = materialDef.extensions[this.name];

    if (extension.thicknessFactor !== undefined && typeof extension.thicknessFactor === 'number') {
      materialParams.thickness = extension.thicknessFactor;
    }

    if (extension.thicknessTexture !== undefined && isGLTFTextureInfo(extension.thicknessTexture)) {
      pending.push(
        parser.assignTexture(materialParams, 'thicknessMap', extension.thicknessTexture),
      );
    }

    if (
      extension.attenuationDistance !== undefined &&
      typeof extension.attenuationDistance === 'number'
    ) {
      materialParams.attenuationDistance = extension.attenuationDistance;
    }

    if (extension.attenuationColor !== undefined && Array.isArray(extension.attenuationColor)) {
      materialParams.attenuationColor = new Color().fromArray(
        extension.attenuationColor as number[],
      );
    }

    return Promise.all(pending);
  }
}

/**
 * 材质高光扩展
 *
 * 规范: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_specular
 */
export class GLTFMaterialsSpecularExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_SPECULAR;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];
    const extension = materialDef.extensions[this.name];

    if (extension.specularFactor !== undefined && typeof extension.specularFactor === 'number') {
      materialParams.specularIntensity = extension.specularFactor;
    }

    if (extension.specularTexture !== undefined && isGLTFTextureInfo(extension.specularTexture)) {
      pending.push(
        parser.assignTexture(materialParams, 'specularIntensityMap', extension.specularTexture),
      );
    }

    if (
      extension.specularColorFactor !== undefined &&
      Array.isArray(extension.specularColorFactor)
    ) {
      materialParams.specularColor = new Color().fromArray(
        extension.specularColorFactor as number[],
      );
    }

    if (
      extension.specularColorTexture !== undefined &&
      isGLTFTextureInfo(extension.specularColorTexture)
    ) {
      pending.push(
        parser.assignTexture(
          materialParams,
          'specularColorMap',
          extension.specularColorTexture,
          SRGBColorSpace,
        ),
      );
    }

    return Promise.all(pending);
  }
}

/**
 * 材质彩虹色扩展
 *
 * 规范: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_iridescence
 */
export class GLTFMaterialsIridescenceExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_IRIDESCENCE;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];
    const extension = materialDef.extensions[this.name];

    if (
      extension.iridescenceFactor !== undefined &&
      typeof extension.iridescenceFactor === 'number'
    ) {
      materialParams.iridescence = extension.iridescenceFactor;
    }

    if (
      extension.iridescenceTexture !== undefined &&
      isGLTFTextureInfo(extension.iridescenceTexture)
    ) {
      pending.push(
        parser.assignTexture(materialParams, 'iridescenceMap', extension.iridescenceTexture),
      );
    }

    if (extension.iridescenceIor !== undefined && typeof extension.iridescenceIor === 'number') {
      materialParams.iridescenceIOR = extension.iridescenceIor;
    }

    if (
      extension.iridescenceThicknessMinimum !== undefined &&
      typeof extension.iridescenceThicknessMinimum === 'number' &&
      extension.iridescenceThicknessMaximum !== undefined &&
      typeof extension.iridescenceThicknessMaximum === 'number'
    ) {
      materialParams.iridescenceThicknessRange = [
        extension.iridescenceThicknessMinimum,
        extension.iridescenceThicknessMaximum,
      ];
    }

    if (
      extension.iridescenceThicknessTexture !== undefined &&
      isGLTFTextureInfo(extension.iridescenceThicknessTexture)
    ) {
      pending.push(
        parser.assignTexture(
          materialParams,
          'iridescenceThicknessMap',
          extension.iridescenceThicknessTexture,
        ),
      );
    }

    return Promise.all(pending);
  }
}

/**
 * 材质各向异性扩展
 *
 * 规范: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_anisotropy
 */
export class GLTFMaterialsAnisotropyExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_ANISOTROPY;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];
    const extension = materialDef.extensions[this.name];

    if (
      extension.anisotropyStrength !== undefined &&
      typeof extension.anisotropyStrength === 'number'
    ) {
      materialParams.anisotropy = extension.anisotropyStrength;
    }

    if (
      extension.anisotropyRotation !== undefined &&
      typeof extension.anisotropyRotation === 'number'
    ) {
      materialParams.anisotropyRotation = extension.anisotropyRotation;
    }

    if (
      extension.anisotropyTexture !== undefined &&
      isGLTFTextureInfo(extension.anisotropyTexture)
    ) {
      pending.push(
        parser.assignTexture(materialParams, 'anisotropyMap', extension.anisotropyTexture),
      );
    }

    return Promise.all(pending);
  }
}

/**
 * 材质凹凸扩展
 *
 * 规范: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/EXT_materials_bump
 */
export class GLTFMaterialsBumpExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.EXT_MATERIALS_BUMP;
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    return MeshPhysicalMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: MeshPhysicalMaterialParameters) {
    const parser = this.parser;
    const materialsDef = parser.json.materials || [];
    const materialDef = materialsDef[materialIndex];

    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending = [];
    const extension = materialDef.extensions[this.name];

    if (extension.bumpFactor !== undefined && typeof extension.bumpFactor === 'number') {
      materialParams.bumpScale = extension.bumpFactor;
    }

    if (extension.bumpTexture !== undefined && isGLTFTextureInfo(extension.bumpTexture)) {
      pending.push(parser.assignTexture(materialParams, 'bumpMap', extension.bumpTexture));
    }

    return Promise.all(pending);
  }
}
