import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { GLTFLoader } from '../GLTF-loader.js';
import type { GLTFParser } from '../GLTF-parser.js';
import type { GLTFJsonData } from '../constants.js';
import { EXTENSIONS } from '../constants.js';
import { GLTFBinaryExtension } from './GLTF-binary-extension.js';
import {
  GLTFDracoMeshCompressionExtension,
  GLTFMeshGpuInstancing,
  GLTFMeshQuantizationExtension,
  GLTFMeshoptCompression,
} from './geometry-extensions.js';
import { GLTFLightsExtension } from './lights-extension.js';
import {
  GLTFMaterialsAnisotropyExtension,
  GLTFMaterialsBumpExtension,
  GLTFMaterialsClearcoatExtension,
  GLTFMaterialsDispersionExtension,
  GLTFMaterialsEmissiveStrengthExtension,
  GLTFMaterialsIorExtension,
  GLTFMaterialsIridescenceExtension,
  GLTFMaterialsSheenExtension,
  GLTFMaterialsSpecularExtension,
  GLTFMaterialsTransmissionExtension,
  GLTFMaterialsUnlitExtension,
  GLTFMaterialsVolumeExtension,
} from './materials-extensions.js';
import {
  GLTFTextureAVIFExtension,
  GLTFTextureBasisUExtension,
  GLTFTextureTransformExtension,
  GLTFTextureWebPExtension,
} from './texture-extensions.js';

// 注册默认扩展
export function registerDefaultExtensions(loader: GLTFLoader) {
  loader.register((parser) => {
    return new GLTFMaterialsClearcoatExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsDispersionExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFTextureBasisUExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFTextureWebPExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFTextureAVIFExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsSheenExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsTransmissionExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsVolumeExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsIorExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsEmissiveStrengthExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsSpecularExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsIridescenceExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsAnisotropyExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMaterialsBumpExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFLightsExtension(parser);
  });

  loader.register((parser) => {
    return new GLTFMeshoptCompression(parser);
  });

  loader.register((parser) => {
    return new GLTFMeshGpuInstancing(parser);
  });
}

// 加载扩展
export function loadExtension(
  extensionName: string,
  json: GLTFJsonData,
  parser: GLTFParser,
  dracoLoader?: DRACOLoader,
) {
  switch (extensionName) {
    case EXTENSIONS.KHR_MATERIALS_IOR:
      return new GLTFMaterialsIorExtension(parser);
    case EXTENSIONS.KHR_MATERIALS_TRANSMISSION:
      return new GLTFMaterialsTransmissionExtension(parser);
    case EXTENSIONS.KHR_MATERIALS_DISPERSION:
      return new GLTFMaterialsDispersionExtension(parser);
    case EXTENSIONS.KHR_MATERIALS_UNLIT:
      return new GLTFMaterialsUnlitExtension();
    case EXTENSIONS.KHR_MATERIALS_VOLUME:
      return new GLTFMaterialsVolumeExtension(parser);
    case EXTENSIONS.KHR_MATERIALS_SPECULAR:
      return new GLTFMaterialsSpecularExtension(parser);
    case EXTENSIONS.KHR_MATERIALS_IRIDESCENCE:
      return new GLTFMaterialsIridescenceExtension(parser);
    case EXTENSIONS.KHR_MATERIALS_ANISOTROPY:
      return new GLTFMaterialsAnisotropyExtension(parser);
    case EXTENSIONS.EXT_MATERIALS_BUMP:
      return new GLTFMaterialsBumpExtension(parser);
    case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
      return new GLTFDracoMeshCompressionExtension(json, dracoLoader);
    case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
      return new GLTFTextureTransformExtension();
    case EXTENSIONS.KHR_TEXTURE_BASISU:
      return new GLTFTextureBasisUExtension(parser);
    case EXTENSIONS.KHR_MESH_QUANTIZATION:
      return new GLTFMeshQuantizationExtension();
    case EXTENSIONS.EXT_TEXTURE_WEBP:
      return new GLTFTextureWebPExtension(parser);
    case EXTENSIONS.EXT_TEXTURE_AVIF:
      return new GLTFTextureAVIFExtension(parser);
    default:
      return null;
  }
}

export {
  GLTFBinaryExtension,
  GLTFDracoMeshCompressionExtension,
  GLTFLightsExtension,
  GLTFMaterialsAnisotropyExtension,
  GLTFMaterialsBumpExtension,
  GLTFMaterialsClearcoatExtension,
  GLTFMaterialsDispersionExtension,
  GLTFMaterialsEmissiveStrengthExtension,
  GLTFMaterialsIorExtension,
  GLTFMaterialsIridescenceExtension,
  GLTFMaterialsSheenExtension,
  GLTFMaterialsSpecularExtension,
  GLTFMaterialsTransmissionExtension,
  GLTFMaterialsUnlitExtension,
  GLTFMaterialsVolumeExtension,
  GLTFMeshGpuInstancing,
  GLTFMeshQuantizationExtension,
  GLTFMeshoptCompression,
  GLTFTextureAVIFExtension,
  GLTFTextureBasisUExtension,
  GLTFTextureTransformExtension,
  GLTFTextureWebPExtension,
};
