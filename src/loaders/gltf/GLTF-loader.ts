import { FileLoader, Loader, LoaderUtils } from 'three';
import type { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type { LoaderOptions } from '../constants.js';
import { GLTFParser } from './GLTF-parser.js';
import type { GLTF, GLTFExtensionParseType, GLTFJsonData } from './constants';
import { BINARY_EXTENSION_HEADER_MAGIC, EXTENSIONS } from './constants';
import { GLTFBinaryExtension, loadExtension, registerDefaultExtensions } from './extensions';
/**
 * A loader for the glTF 2.0 format.
 *
 * @augments Loader
 */
export class GLTFLoader extends Loader<GLTF> {
  dracoLoader?: DRACOLoader;
  ktx2Loader?: KTX2Loader;
  meshoptDecoder?: typeof MeshoptDecoder;
  pluginCallbacks: Array<(parser: GLTFParser) => { name: string }>;
  wireframe?: boolean;
  /**
   * Constructs a new glTF loader.
   *
   * @param {LoaderOptions} [options] - The loading options.
   */
  constructor(options?: LoaderOptions) {
    const { manager, wireframe } = options || {};
    super(manager);

    this.dracoLoader = undefined;
    this.ktx2Loader = undefined;
    this.meshoptDecoder = undefined;
    this.wireframe = wireframe;

    this.pluginCallbacks = [];

    registerDefaultExtensions(this);
  }

  /**
   * Starts loading from the given URL and passes the loaded glTF asset
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  override load(
    url: string,
    onLoad: (data: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ) {
    let resourcePath;

    if (this.resourcePath !== '') {
      resourcePath = this.resourcePath;
    } else if (this.path !== '') {
      // If a base path is set, resources will be relative paths from that plus the relative path of the gltf file
      // Example  path = 'https://my-cnd-server.com/', url = 'assets/models/model.gltf'
      // resourcePath = 'https://my-cnd-server.com/assets/models/'
      // referenced resource 'model.bin' will be loaded from 'https://my-cnd-server.com/assets/models/model.bin'
      // referenced resource '../textures/texture.png' will be loaded from 'https://my-cnd-server.com/assets/textures/texture.png'
      const relativeUrl = LoaderUtils.extractUrlBase(url);

      resourcePath = LoaderUtils.resolveURL(relativeUrl, this.path);
    } else {
      resourcePath = LoaderUtils.extractUrlBase(url);
    }

    // Tells the LoadingManager to track an extra item, which resolves after
    // the model is fully loaded. This means the count of items loaded will
    // be incorrect, but ensures manager.onLoad() does not fire early.
    this.manager.itemStart(url);

    const _onError = (e: unknown) => {
      if (onError) {
        onError(e);
      } else {
        console.error(e);
      }

      this.manager.itemError(url);
      this.manager.itemEnd(url);
    };

    const loader = new FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(
      url,
      (data) => {
        try {
          this.parse(
            data,
            resourcePath,
            (gltf: GLTF) => {
              onLoad(gltf);
              this.manager.itemEnd(url);
            },
            _onError,
          );
        } catch (e) {
          _onError(e);
        }
      },
      onProgress,
      _onError,
    );
  }

  /**
   * Sets the given Draco loader to this loader. Required for decoding assets
   * compressed with the `KHR_draco_mesh_compression` extension.
   *
   * @param {DRACOLoader} dracoLoader - The Draco loader to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setDRACOLoader(dracoLoader: DRACOLoader) {
    this.dracoLoader = dracoLoader;

    return this;
  }

  /**
   * Sets the given KTX2 loader to this loader. Required for loading KTX2
   * compressed textures.
   *
   * @param {KTX2Loader} ktx2Loader - The KTX2 loader to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setKTX2Loader(ktx2Loader: KTX2Loader) {
    this.ktx2Loader = ktx2Loader;

    return this;
  }

  /**
   * Sets the given meshopt decoder. Required for decoding assets
   * compressed with the `EXT_meshopt_compression` extension.
   *
   * @param {Object} meshoptDecoder - The meshopt decoder to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setMeshoptDecoder(meshoptDecoder: {
    supported: boolean;
    ready: Promise<void>;
    decodeVertexBuffer: (
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
      filter?: string,
    ) => void;
    decodeIndexBuffer: (
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
    ) => void;
    decodeIndexSequence: (
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
    ) => void;
    decodeGltfBuffer: (
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
      mode: string,
      filter?: string,
    ) => void;
  }) {
    this.meshoptDecoder = meshoptDecoder;

    return this;
  }

  /**
   * Registers a plugin callback. This API is internally used to implement the various
   * glTF extensions but can also used by third-party code to add additional logic
   * to the loader.
   *
   * @param {function(parser:GLTFParser)} callback - The callback function to register.
   * @return {GLTFLoader} A reference to this loader.
   */
  register(callback: (parser: GLTFParser) => { name: string }) {
    if (!this.pluginCallbacks.includes(callback)) {
      this.pluginCallbacks.push(callback);
    }

    return this;
  }

  /**
   * Unregisters a plugin callback.
   *
   * @param {Function} callback - The callback function to unregister.
   * @return {GLTFLoader} A reference to this loader.
   */
  unregister(callback: (parser: GLTFParser) => { name: string }) {
    if (this.pluginCallbacks.includes(callback)) {
      this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(callback), 1);
    }

    return this;
  }

  /**
   * Parses the given FBX data and returns the resulting group.
   *
   * @param {string|ArrayBuffer} data - The raw glTF data.
   * @param {string} path - The URL base path.
   * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  parse(
    data: string | AllowSharedBufferSource,
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

    const parser = new GLTFParser(json, {
      path: path || this.resourcePath || '',
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      dracoLoader: this.dracoLoader,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder,
    });

    parser.fileLoader.setRequestHeader(this.requestHeader);
    for (let i = 0; i < this.pluginCallbacks.length; i++) {
      const plugin = this.pluginCallbacks[i](parser);

      if (!plugin.name) {
        console.error('THREE.GLTFLoader: Invalid plugin found: missing name');
      }

      plugins[plugin.name] = plugin;

      // Workaround to avoid determining as unknown extension
      // in addUnknownExtensionsToUserData().
      // Remove this workaround if we move all the existing
      // extension handlers to plugin system
      extensions[plugin.name] = true;
    }

    if (json.extensionsUsed) {
      for (let i = 0; i < json.extensionsUsed.length; ++i) {
        const extensionName = json.extensionsUsed[i];
        const extensionsRequired = json.extensionsRequired || [];

        // Load built-in extensions
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
    parser.parse(onLoad, onError, this.wireframe);
  }

  /**
   * Async version of {@link GLTFLoader#parse}.
   *
   * @async
   * @param {string|ArrayBuffer} data - The raw glTF data.
   * @param {string} path - The URL base path.
   * @return {Promise<GLTFLoader~LoadObject>} A Promise that resolves with the loaded glTF when the parsing has been finished.
   */
  parseAsync(data: string | ArrayBuffer, path: string) {
    return new Promise((resolve, reject) => {
      this.parse(data, path, resolve, reject);
    });
  }
}
