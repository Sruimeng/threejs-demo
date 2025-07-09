import {
  BINARY_EXTENSION_CHUNK_TYPES,
  BINARY_EXTENSION_HEADER_LENGTH,
  BINARY_EXTENSION_HEADER_MAGIC,
  EXTENSIONS,
} from '../constants.js';

/**
 * Binary Extension
 */
export class GLTFBinaryExtension {
  name: string;
  content: string | null;
  body: ArrayBuffer | null;
  header: { magic: string; version: number; length: number };
  constructor(data: ArrayBuffer) {
    this.name = EXTENSIONS.KHR_BINARY_GLTF;
    this.content = null;
    this.body = null;

    const headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
    const textDecoder = new TextDecoder();

    this.header = {
      magic: textDecoder.decode(new Uint8Array(data.slice(0, 4))),
      version: headerView.getUint32(4, true),
      length: headerView.getUint32(8, true),
    };

    if (this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC) {
      throw new Error('THREE.GLTFLoader: Unsupported glTF-Binary header.');
    } else if (this.header.version < 2.0) {
      throw new Error('THREE.GLTFLoader: Legacy binary file detected.');
    }

    const chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
    const chunkView = new DataView(data, BINARY_EXTENSION_HEADER_LENGTH);
    let chunkIndex = 0;

    while (chunkIndex < chunkContentsLength) {
      const chunkLength = chunkView.getUint32(chunkIndex, true);

      chunkIndex += 4;

      const chunkType = chunkView.getUint32(chunkIndex, true);

      chunkIndex += 4;

      if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON) {
        const contentArray = new Uint8Array(
          data,
          BINARY_EXTENSION_HEADER_LENGTH + chunkIndex,
          chunkLength,
        );

        this.content = textDecoder.decode(contentArray);
      } else if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN) {
        const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;

        this.body = data.slice(byteOffset, byteOffset + chunkLength);
      }

      // Clients must ignore chunks with unknown types.
      chunkIndex += chunkLength;
    }

    if (this.content === null) {
      throw new Error('THREE.GLTFLoader: JSON content not found.');
    }
  }
}
