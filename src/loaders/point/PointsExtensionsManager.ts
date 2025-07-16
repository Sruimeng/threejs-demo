import type { GLTFJsonData } from '../gltf/constants';
import type { GLTFExtensionParseType } from '../gltf/constants';
import type * as THREE from 'three';
import { PointsParser } from './PointsParser';

/**
 * Manages extensions for points-specific parsing while reusing
 * the extension system from the GLTF loader
 */
export class PointsExtensionsManager {
  private extensionLoaders: Map<string, ExtensionLoader> = new Map();

  constructor() {
    this.registerDefaultExtensions();
  }

  /**
   * Register a default extension loader
   */
  private registerDefaultExtensions(): void {
    // Register binary glTF extension for GLB files
    this.registerExtension('KHR_binary_glTF', {
      name: 'KHR_binary_glTF',
      load: () => {
        // Binary extension is handled at the parser level
        return null;
      },
    });

    // Register Draco mesh compression extension
    this.registerExtension('KHR_draco_mesh_compression', {
      name: 'KHR_draco_mesh_compression',
      load: () => {
        // Import and use the Draco extension from GLTF
        try {
          const { GLTFDracoMeshCompressionExtension } = require('../gltf/extensions');
          return new GLTFDracoMeshCompressionExtension({});
        } catch (e) {
          console.warn('Draco extension not available for points loading');
          return null;
        }
      },
    });

    // Register meshopt compression extension
    this.registerExtension('EXT_meshopt_compression', {
      name: 'EXT_meshopt_compression',
      load: () => {
        // Import and use the meshopt extension from GLTF
        try {
          const { GLTFMeshoptCompression } = require('../gltf/extensions');
          return new GLTFMeshoptCompression({});
        } catch (e) {
          console.warn('Meshopt extension not available for points loading');
          return null;
        }
      },
    });
  }

  /**
   * Register a custom extension loader
   */
  registerExtension(name: string, loader: ExtensionLoader): void {
    this.extensionLoaders.set(name, loader);
  }

  /**
   * Unregister an extension loader
   */
  unregisterExtension(name: string): void {
    this.extensionLoaders.delete(name);
  }

  /**
   * Load an extension based on its name
   */
  loadExtension(
    name: string,
    json: GLTFJsonData,
    parser: PointsParser
  ): GLTFExtensionParseType | null {
    const loader = this.extensionLoaders.get(name);
    if (loader) {
      try {
        return loader.load(json, parser);
      } catch (error) {
        console.warn(`Failed to load extension ${name}:`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get all registered extension names
   */
  getRegisteredExtensions(): string[] {
    return Array.from(this.extensionLoaders.keys());
  }

  /**
   * Check if an extension is supported
   */
  isExtensionSupported(name: string): boolean {
    return this.extensionLoaders.has(name);
  }
}

/**
 * Interface for extension loaders
 */
export interface ExtensionLoader {
  name: string;
  load: (json: GLTFJsonData, parser: PointsParser) => GLTFExtensionParseType | null;
}

/**
 * Extension for handling specific geometry compression formats
 * This provides a base class for geometry-specific extensions
 */
export abstract class PointsGeometryExtension {
  abstract name: string;
  abstract decodePrimitive(primitive: any, parser: PointsParser): Promise<THREE.BufferGeometry>;
}

/**
 * Extension for handling texture-related extensions
 * Useful for point cloud color data
 */
export abstract class PointsTextureExtension {
  abstract name: string;
  abstract loadTexture(textureIndex: number, parser: PointsParser): Promise<THREE.Texture | null>;
}

/**
 * Extension for handling material-related extensions
 * Useful for point cloud materials
 */
export abstract class PointsMaterialExtension {
  abstract name: string;
  abstract loadMaterial(materialIndex: number, parser: PointsParser): Promise<THREE.Material>;
}