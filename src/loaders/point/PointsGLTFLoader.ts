import { GLTFLoader } from '../gltf/GLTF-loader';
import type { GLTF, GLTFJsonData, GLTFExtensionParseType } from '../gltf/constants';
import { BINARY_EXTENSION_HEADER_MAGIC, EXTENSIONS } from '../gltf/constants';
import { GLTFBinaryExtension, loadExtension } from '../gltf/extensions';
import { PointsParser } from './PointsParser';
import type { GLTFLoaderOptions } from '../gltf/constants';
import { LoaderOptions } from '../constants';
import { PointCloudMaterial } from './PointCloudMaterial';
import { Color } from 'three';

/**
 * A specialized loader for GLTF/GLB files that only loads points data
 * This loader shares extension capabilities with the main GLTF loader
 * but is isolated from the full GLTF loading pipeline
 */
export class PointsGLTFLoader extends GLTFLoader {

  constructor(options: LoaderOptions = {}) {
    super(options);
  }

  /**
     * Parses the given FBX data and returns the resulting group.
     *
     * @param {string|ArrayBuffer} data - The raw glTF data.
     * @param {string} path - The URL base path.
     * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
     * @param {onErrorCallback} onError - Executed when errors occur.
     */
    override parse(
      data: string | ArrayBuffer,
      path: string,
      onLoad: (gltf: GLTF) => void,
      onError: (error: Error) => void,
    ) {
      let json: GLTFJsonData = {
        asset: {
          version: [],
          copyright: undefined,
          generator: undefined,
          minVersion: undefined,
          extensions: undefined,
          extras: undefined,
        },
      };
      const extensions: Record<string, GLTFExtensionParseType | boolean> = {};
      const plugins: Record<string, GLTFExtensionParseType> = {};
      const textDecoder = new TextDecoder();
  
      if (typeof data === 'string') {
        json = JSON.parse(data);
      } else if (data instanceof ArrayBuffer) {
        const magic = textDecoder.decode(new Uint8Array(data, 0, 4));
  
        if (magic === BINARY_EXTENSION_HEADER_MAGIC) {
          try {
            extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(data);
          } catch (error) {
            if (onError) {
              onError(error as Error);
            }
            return;
          }
          const binaryExtension = extensions[EXTENSIONS.KHR_BINARY_GLTF];
          const binaryExtensionBody = (binaryExtension as GLTFBinaryExtension).content;
  
          if (!binaryExtension || !binaryExtensionBody) {
            throw new Error('THREE.GLTFLoader: KHR_BINARY_GLTF extension not found.');
          }
  
          if (typeof binaryExtension !== 'boolean') {
            json = JSON.parse(binaryExtensionBody);
          }
        } else {
          json = JSON.parse(textDecoder.decode(data));
        }
      } else {
        json = JSON.parse('');
      }
      const asset = json.asset;
  
      if (asset.version[0] < 2) {
        if (onError) {
          onError(
            new Error('THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.'),
          );
        }
        return;
      }
  
      const parser = new PointsParser(json, {
        path: path || this.resourcePath || '',
        crossOrigin: this.crossOrigin,
        requestHeader: this.requestHeader,
        manager: this.manager,
      });
  
      parser.fileLoader.setRequestHeader(this.requestHeader);
      for (let i = 0; i < this.pluginCallbacks.length; i++) {
        const plugin = this.pluginCallbacks[i](parser);
  
        if (!plugin.name) {
          console.error('THREE.GLTFLoader: Invalid plugin found: missing name');
        }
  
        plugins[plugin.name] = plugin;
        extensions[plugin.name] = true;
      }
  
      if (json.extensionsUsed) {
        for (let i = 0; i < json.extensionsUsed.length; ++i) {
          const extensionName = json.extensionsUsed[i];
          const extensionsRequired = json.extensionsRequired || [];
  
          const extension = loadExtension(extensionName, json, parser, this.dracoLoader);
  
          if (extension) {
            extensions[extensionName] = extension;
          } else if (
            extensionsRequired.includes(extensionName) &&
            plugins[extensionName] === undefined
          ) {
            console.warn('THREE.GLTFLoader: Unknown extension "' + extensionName + '".');
          }
        }
      }
  
      parser.setExtensions(extensions);
      parser.setPlugins(plugins);
      parser.parse(onLoad, onError);
    }
}