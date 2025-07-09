import type { Texture } from 'three';
import type { GLTFParser } from '../GLTF-parser.js';
import { EXTENSIONS } from '../constants.js';

/**
 * Texture Transform Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_transform
 */
export class GLTFTextureTransformExtension {
  name: string;
  constructor() {
    this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;
  }

  extendTexture(
    texture: Texture,
    transform: { texCoord?: number; offset?: number[]; rotation?: number; scale?: number[] },
  ): Texture {
    if (
      (transform.texCoord === undefined || transform.texCoord === texture.channel) &&
      transform.offset === undefined &&
      transform.rotation === undefined &&
      transform.scale === undefined
    ) {
      // See https://github.com/mrdoob/three.js/issues/21819.
      return texture;
    }

    texture = texture.clone();

    if (transform.texCoord !== undefined) {
      texture.channel = transform.texCoord;
    }

    if (transform.offset !== undefined) {
      texture.offset.fromArray(transform.offset);
    }

    if (transform.rotation !== undefined) {
      texture.rotation = transform.rotation;
    }

    if (transform.scale !== undefined) {
      texture.repeat.fromArray(transform.scale);
    }

    texture.needsUpdate = true;

    return texture;
  }
}

/**
 * BasisU Texture Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu
 *
 * @private
 */
export class GLTFTextureBasisUExtension {
  parser: GLTFParser;
  name: string;

  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_TEXTURE_BASISU;
  }

  loadTexture(textureIndex: number) {
    const parser = this.parser;
    const json = parser.json;
    const texturesDef = json.textures || [];
    const extensionsRequiredDef = json.extensionsRequired || [];

    const textureDef = texturesDef[textureIndex];

    if (!textureDef.extensions || !textureDef.extensions[this.name]) {
      return null;
    }

    const extension = textureDef.extensions[this.name];
    const loader = parser.options.ktx2Loader;

    if (!loader) {
      if (extensionsRequiredDef.includes(this.name)) {
        throw new Error(
          'THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures',
        );
      } else {
        // Assumes that the extension is optional and that a fallback texture is present
        return null;
      }
    }

    return parser.loadTextureImage(textureIndex, extension.source as number, loader);
  }
}

/**
 * WebP Texture Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp
 */
export class GLTFTextureWebPExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.EXT_TEXTURE_WEBP;
  }

  loadTexture(textureIndex: number) {
    const name = this.name;
    const parser = this.parser;
    const json = parser.json;

    const texturesDef = json.textures || [];
    const textureDef = texturesDef[textureIndex];
    const imagesDef = json.images || [];

    if (!textureDef.extensions || !textureDef.extensions[name]) {
      return null;
    }

    const extension = textureDef.extensions[name];
    const sourceIndex = extension.source ?? textureDef.source;
    const source = imagesDef[sourceIndex as number];

    let loader = parser.textureLoader;

    if (source.uri) {
      const handler = parser.options.manager.getHandler(source.uri);

      if (handler !== null) {
        loader = handler;
      }
    }

    return parser.loadTextureImage(textureIndex, sourceIndex as number, loader);
  }
}

/**
 * AVIF Texture Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_avif
 */
export class GLTFTextureAVIFExtension {
  parser: GLTFParser;
  name: string;
  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.EXT_TEXTURE_AVIF;
  }

  loadTexture(textureIndex: number) {
    const name = this.name;
    const parser = this.parser;
    const json = parser.json;

    const texturesDef = json.textures || [];
    const textureDef = texturesDef[textureIndex];
    const imagesDef = json.images || [];

    if (!textureDef.extensions || !textureDef.extensions[name]) {
      return null;
    }

    const extension = textureDef.extensions[name];
    const sourceIndex = extension.source ?? textureDef.source;
    const source = imagesDef[sourceIndex as number];

    let loader = parser.textureLoader;

    if (source.uri) {
      const handler = parser.options.manager.getHandler(source.uri);

      if (handler !== null) {
        loader = handler;
      }
    }

    return parser.loadTextureImage(textureIndex, sourceIndex as number, loader);
  }
}
