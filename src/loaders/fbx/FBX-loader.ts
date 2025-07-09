import * as fflate from 'fflate';
import type { Group, Object3DEventMap } from 'three';
import { FileLoader, Loader, LoaderUtils, TextureLoader } from 'three';
import type { LoaderOptions } from '../constants';
import {
  global,
  type FBXConnectionDocment,
  type FBXConnectionNode,
  type FBXDefinitions,
  type FBXDocuments,
  type FBXGlobalSettings,
  type FBXHeaderExtension,
  type FBXObjects,
  type FBXProperty,
  type FBXTreeNode,
  type IFBXTree,
} from './constants';
import { FBXTreeParser } from './parse/FBX-tree-parser';

// ************** UTILITY FUNCTIONS **************

function convertArrayBufferToString(buffer: ArrayBuffer, from?: number, to?: number) {
  if (from === undefined) {
    from = 0;
  }
  if (to === undefined) {
    to = buffer.byteLength;
  }

  return new TextDecoder().decode(new Uint8Array(buffer, from, to));
}

function isFbxFormatBinary(buffer: ArrayBuffer) {
  const CORRECT = 'Kaydara\u0020FBX\u0020Binary\u0020\u0020\0';

  return (
    buffer.byteLength >= CORRECT.length &&
    CORRECT === convertArrayBufferToString(buffer, 0, CORRECT.length)
  );
}

function isFbxFormatASCII(text: string) {
  const CORRECT = [
    'K',
    'a',
    'y',
    'd',
    'a',
    'r',
    'a',
    '\\',
    'F',
    'B',
    'X',
    '\\',
    'B',
    'i',
    'n',
    'a',
    'r',
    'y',
    '\\',
    '\\',
  ];

  let cursor = 0;

  function read(offset: number) {
    const result = text[offset - 1];

    text = text.slice(cursor + offset);
    cursor++;

    return result;
  }

  for (let i = 0; i < CORRECT.length; ++i) {
    const num = read(1);

    if (num === CORRECT[i]) {
      return false;
    }
  }

  return true;
}

function getFbxVersion(text: string) {
  const versionRegExp = /FBXVersion: (\d+)/;
  const match = text.match(versionRegExp);

  if (match) {
    const version = parseInt(match[1]);

    return version;
  }

  throw new Error('THREE.FBXLoader: Cannot find the version number for the file given.');
}

// Parses comma separated list of numbers and returns them an array.
// Used internally by the TextParser
function parseNumberArray(value: string) {
  const array = value.split(',').map(function (val) {
    return parseFloat(val);
  });

  return array;
}

function append(a: any[], b: any[]) {
  for (let i = 0, j = a.length, l = b.length; i < l; i++, j++) {
    a[j] = b[i];
  }
}

class BinaryReader {
  dv: DataView<any>;
  offset: number;
  littleEndian: any;
  _textDecoder: TextDecoder;

  constructor(buffer: ArrayBuffer, littleEndian?: boolean) {
    this.dv = new DataView(buffer);
    this.offset = 0;
    this.littleEndian = littleEndian !== undefined ? littleEndian : true;
    this._textDecoder = new TextDecoder();
  }

  getOffset() {
    return this.offset;
  }

  size() {
    return this.dv.buffer.byteLength;
  }

  skip(length: number) {
    this.offset += length;
  }

  // seems like true/false representation depends on exporter.
  // true: 1 or 'Y'(=0x59), false: 0 or 'T'(=0x54)
  // then sees LSB.
  getBoolean() {
    return (this.getUint8() & 1) === 1;
  }

  getBooleanArray(size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getBoolean());
    }

    return a;
  }

  getUint8() {
    const value = this.dv.getUint8(this.offset);

    this.offset += 1;

    return value;
  }

  getInt16() {
    const value = this.dv.getInt16(this.offset, this.littleEndian);

    this.offset += 2;

    return value;
  }

  getInt32() {
    const value = this.dv.getInt32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getInt32Array(size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt32());
    }

    return a;
  }

  getUint32() {
    const value = this.dv.getUint32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  // JavaScript doesn't support 64-bit integer so calculate this here
  // 1 << 32 will return 1 so using multiply operation instead here.
  // There's a possibility that this method returns wrong value if the value
  // is out of the range between Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER.
  // TODO: safely handle 64-bit integer
  getInt64() {
    let low, high;

    if (this.littleEndian) {
      low = this.getUint32();
      high = this.getUint32();
    } else {
      high = this.getUint32();
      low = this.getUint32();
    }

    // calculate negative value
    if (high & 0x80000000) {
      high = ~high & 0xffffffff;
      low = ~low & 0xffffffff;

      if (low === 0xffffffff) {
        high = (high + 1) & 0xffffffff;
      }

      low = (low + 1) & 0xffffffff;

      return -(high * 0x100000000 + low);
    }

    return high * 0x100000000 + low;
  }

  getInt64Array(size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt64());
    }

    return a;
  }

  // Note: see getInt64() comment
  getUint64() {
    let low, high;

    if (this.littleEndian) {
      low = this.getUint32();
      high = this.getUint32();
    } else {
      high = this.getUint32();
      low = this.getUint32();
    }

    return high * 0x100000000 + low;
  }

  getFloat32() {
    const value = this.dv.getFloat32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getFloat32Array(size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getFloat32());
    }

    return a;
  }

  getFloat64() {
    const value = this.dv.getFloat64(this.offset, this.littleEndian);

    this.offset += 8;

    return value;
  }

  getFloat64Array(size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getFloat64());
    }

    return a;
  }

  getArrayBuffer(size: number) {
    const value = this.dv.buffer.slice(this.offset, this.offset + size);

    this.offset += size;

    return value;
  }

  getString(size: number) {
    const start = this.offset;
    let a = new Uint8Array(this.dv.buffer, start, size);

    this.skip(size);

    const nullByte = a.indexOf(0);

    if (nullByte >= 0) {
      a = new Uint8Array(this.dv.buffer, start, nullByte);
    }

    return this._textDecoder.decode(a);
  }
}

// FBXTree holds a representation of the FBX data, returned by the TextParser ( FBX ASCII format)
// and BinaryParser( FBX Binary format)
class FBXTree implements IFBXTree {
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
  [key: string]: any; // 添加索引签名
  add(key: string, val: any) {
    this[key] = val;
  }
}

// parse an FBX file in ASCII format
class TextParser {
  nodeStack: any[];
  currentIndent: number;
  currentProp: any;
  currentPropName: any;
  allNodes: FBXTree;

  constructor() {
    this.nodeStack = [];
    this.currentIndent = 0;
    this.currentProp = [];
    this.currentPropName = '';
    this.allNodes = new FBXTree();
  }

  getPrevNode() {
    return this.nodeStack[this.currentIndent - 2];
  }

  getCurrentNode() {
    return this.nodeStack[this.currentIndent - 1];
  }

  getCurrentProp() {
    return this.currentProp;
  }

  pushStack(node: any) {
    this.nodeStack.push(node);
    this.currentIndent += 1;
  }

  popStack() {
    this.nodeStack.pop();
    this.currentIndent -= 1;
  }

  setCurrentProp(val: any, name: string) {
    this.currentProp = val;
    this.currentPropName = name;
  }

  parse(text: string) {
    this.currentIndent = 0;

    this.allNodes = new FBXTree();
    this.nodeStack = [];
    this.currentProp = [];
    this.currentPropName = '';

    const split = text.split(/[\r\n]+/);

    split.forEach((line, i) => {
      const matchComment = line.match(/^[\s\t]*;/);
      const matchEmpty = line.match(/^[\s\t]*$/);

      if (matchComment || matchEmpty) {
        return;
      }

      const matchBeginning = line.match('^\\t{' + this.currentIndent + '}(\\w+):(.*){');
      const matchProperty = line.match('^\\t{' + this.currentIndent + '}(\\w+):[\\s\\t\\r\\n](.*)');
      const matchEnd = line.match('^\\t{' + (this.currentIndent - 1) + '}}');

      if (matchBeginning) {
        this.parseNodeBegin(line, matchBeginning);
      } else if (matchProperty) {
        this.parseNodeProperty(line, matchProperty, split[++i]);
      } else if (matchEnd) {
        this.popStack();
      } else if (line.match(/^[^\s\t}]/)) {
        // large arrays are split over multiple lines terminated with a ',' character
        // if this is encountered the line needs to be joined to the previous line
        this.parseNodePropertyContinued(line);
      }
    });

    return this.allNodes;
  }

  parseNodeBegin(_line: string, property: string[]) {
    const nodeName = property[1].trim().replace(/^"/, '').replace(/"$/, '');

    const nodeAttrs = property[2].split(',').map(function (attr) {
      return attr.trim().replace(/^"/, '').replace(/"$/, '');
    });

    const node: { id?: number; name: string; attrName?: string; attrType?: string } = {
      name: nodeName,
    };
    const attrs = this.parseNodeAttr(nodeAttrs);

    const currentNode = this.getCurrentNode();

    // a top node
    if (this.currentIndent === 0) {
      this.allNodes.add(nodeName, node);
    } else {
      // a subnode

      // if the subnode already exists, append it
      if (nodeName in currentNode) {
        // special case Pose needs PoseNodes as an array
        if (nodeName === 'PoseNode') {
          currentNode.PoseNode.push(node);
        } else if (currentNode[nodeName].id !== undefined) {
          currentNode[nodeName] = {};
          currentNode[nodeName][currentNode[nodeName].id] = currentNode[nodeName];
        }

        if (attrs.id !== '') {
          currentNode[nodeName][attrs.id] = node;
        }
      } else if (typeof attrs.id === 'number') {
        currentNode[nodeName] = {};
        currentNode[nodeName][attrs.id] = node;
      } else if (nodeName !== 'Properties70') {
        if (nodeName === 'PoseNode') {
          currentNode[nodeName] = [node];
        } else {
          currentNode[nodeName] = node;
        }
      }
    }

    if (typeof attrs.id === 'number') {
      node.id = attrs.id;
    }
    if (attrs.name !== '') {
      node.attrName = attrs.name;
    }
    if (attrs.type !== '') {
      node.attrType = attrs.type;
    }

    this.pushStack(node);
  }

  parseNodeAttr(attrs: string[]) {
    let id: string | number = attrs[0];

    if (attrs[0] !== '') {
      id = parseInt(attrs[0]);

      if (isNaN(id)) {
        id = attrs[0];
      }
    }

    let name = '',
      type = '';

    if (attrs.length > 1) {
      name = attrs[1].replace(/^(\w+)::/, '');
      type = attrs[2];
    }

    return { id: id, name: name, type: type };
  }

  parseNodeProperty(line: string, property: string[], contentLine: string) {
    let propName = property[1].replace(/^"/, '').replace(/"$/, '').trim();
    let propValue: string | number[] = property[2].replace(/^"/, '').replace(/"$/, '').trim();

    // for special case: base64 image data follows "Content: ," line
    //	Content: ,
    //	 "/9j/4RDaRXhpZgAATU0A..."
    if (propName === 'Content' && propValue === ',') {
      propValue = contentLine.replace(/"/g, '').replace(/,$/, '').trim();
    }

    const currentNode = this.getCurrentNode();
    const parentName = currentNode.name;

    if (parentName === 'Properties70') {
      this.parseNodeSpecialProperty(line, propName, propValue);

      return;
    }

    // Connections
    if (propName === 'C') {
      const connProps = propValue.split(',').slice(1);
      const from = parseInt(connProps[0]);
      const to = parseInt(connProps[1]);

      let rest = propValue.split(',').slice(3);

      rest = rest.map(function (elem) {
        return elem.trim().replace(/^"/, '');
      });

      propName = 'connections';
      propValue = [from, to];
      append(propValue, rest);

      if (currentNode[propName] === undefined) {
        currentNode[propName] = [];
      }
    }

    // Node
    if (propName === 'Node') {
      currentNode.id = propValue;
    }

    // connections
    if (propName in currentNode && Array.isArray(currentNode[propName])) {
      currentNode[propName].push(propValue);
    } else {
      if (propName !== 'a') {
        currentNode[propName] = propValue;
      } else {
        currentNode.a = propValue;
      }
    }

    this.setCurrentProp(currentNode, propName);

    // convert string to array, unless it ends in ',' in which case more will be added to it
    if (propName === 'a' && propValue.slice(-1) !== ',') {
      currentNode.a = parseNumberArray(propValue as string);
    }
  }

  parseNodePropertyContinued(line: string) {
    const currentNode = this.getCurrentNode();

    currentNode.a += line;

    // if the line doesn't end in ',' we have reached the end of the property value
    // so convert the string to an array
    if (line.slice(-1) !== ',') {
      currentNode.a = parseNumberArray(currentNode.a);
    }
  }

  // parse "Property70"
  parseNodeSpecialProperty(_line: string, _propName: string, propValue: string) {
    // split this
    // P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
    // into array like below
    // ["Lcl Scaling", "Lcl Scaling", "", "A", "1,1,1" ]
    const props = propValue.split('",').map(function (prop) {
      return prop.trim().replace(/^"/, '').replace(/\s/, '_');
    });

    const innerPropName = props[0];
    const innerPropType1 = props[1];
    const innerPropType2 = props[2];
    const innerPropFlag = props[3];
    let innerPropValue = props[4] as number | string | number[];

    // cast values where needed, otherwise leave as strings
    switch (innerPropType1) {
      case 'int':
      case 'enum':
      case 'bool':
      case 'ULongLong':
      case 'double':
      case 'Number':
      case 'FieldOfView':
        innerPropValue = parseFloat(innerPropValue as string);

        break;
      case 'Color':
      case 'ColorRGB':
      case 'Vector3D':
      case 'Lcl_Translation':
      case 'Lcl_Rotation':
      case 'Lcl_Scaling':
        innerPropValue = parseNumberArray(innerPropValue as string);

        break;
    }

    // CAUTION: these props must append to parent's parent
    this.getPrevNode()[innerPropName] = {
      type: innerPropType1,
      type2: innerPropType2,
      flag: innerPropFlag,
      value: innerPropValue,
    };

    this.setCurrentProp(this.getPrevNode(), innerPropName);
  }
}

// Parse an FBX file in Binary format
class BinaryParser {
  parse(buffer: ArrayBuffer): IFBXTree {
    const reader = new BinaryReader(buffer);

    reader.skip(23); // skip magic 23 bytes

    const version = reader.getUint32();

    if (version < 6400) {
      throw new Error('THREE.FBXLoader: FBX version not supported, FileVersion: ' + version);
    }

    const allNodes = new FBXTree();

    while (!this.endOfContent(reader)) {
      const node = this.parseNode(reader, version);

      if (node !== null && node.name) {
        allNodes.add(node.name, node);
      }
    }

    return allNodes as unknown as IFBXTree;
  }

  // Check if reader has reached the end of content.
  endOfContent(reader: BinaryReader) {
    // footer size: 160bytes + 16-byte alignment padding
    // - 16bytes: magic
    // - padding til 16-byte alignment (at least 1byte?)
    //	(seems like some exporters embed fixed 15 or 16bytes?)
    // - 4bytes: magic
    // - 4bytes: version
    // - 120bytes: zero
    // - 16bytes: magic
    if (reader.size() % 16 === 0) {
      return ((reader.getOffset() + 160 + 16) & ~0xf) >= reader.size();
    } else {
      return reader.getOffset() + 160 + 16 >= reader.size();
    }
  }

  // recursively parse nodes until the end of the file is reached
  parseNode(reader: BinaryReader, version: number) {
    const node: FBXTreeNode = {};

    // The first three data sizes depends on version.
    const endOffset = version >= 7500 ? reader.getUint64() : reader.getUint32();
    const numProperties = version >= 7500 ? reader.getUint64() : reader.getUint32();

    if (version >= 7500) {
      reader.getUint64();
    } else {
      reader.getUint32();
    }

    const nameLen = reader.getUint8();
    const name = reader.getString(nameLen);

    // Regards this node as NULL-record if endOffset is zero
    if (endOffset === 0) {
      return null;
    }

    const propertyList = [];

    for (let i = 0; i < numProperties; i++) {
      propertyList.push(this.parseProperty(reader));
    }

    // Regards the first three elements in propertyList as id, attrName, and attrType
    const id = propertyList.length > 0 ? propertyList[0] : '';
    const attrName = propertyList.length > 1 ? propertyList[1] : '';
    const attrType = propertyList.length > 2 ? propertyList[2] : '';

    // check if this node represents just a single property
    // like (name, 0) set or (name2, [0, 1, 2]) set of {name: 0, name2: [0, 1, 2]}
    node.singleProperty = numProperties === 1 && reader.getOffset() === endOffset ? true : false;

    while (endOffset > reader.getOffset()) {
      const subNode = this.parseNode(reader, version);

      if (subNode !== null) {
        this.parseSubNode(name, node as unknown as FBXTree, subNode);
      }
    }

    node.propertyList = propertyList; // raw property list used by parent

    if (typeof id === 'number') {
      node.id = id;
    }
    if (attrName !== '') {
      node.attrName = attrName;
    }
    if (attrType !== '') {
      node.attrType = attrType;
    }
    if (name !== '') {
      node.name = name;
    }

    return node;
  }

  parseSubNode(name: string, node: FBXTree, subNode: any) {
    // special case: child node is single property
    if (subNode.singleProperty === true) {
      const value = subNode.propertyList[0];

      if (Array.isArray(value)) {
        node[subNode.name] = subNode;

        subNode.a = value;
      } else {
        node[subNode.name] = value;
      }
    } else if (name === 'Connections' && subNode.name === 'C') {
      const array: FBXConnectionNode[] = [];

      subNode.propertyList.forEach((property: any, i: number) => {
        // first Connection is FBX type (OO, OP, etc.). We'll discard these
        if (i !== 0) {
          array.push(property);
        }
      });

      if (node.connections === undefined) {
        node.connections = [];
      }

      node.connections.push(array);
    } else if (subNode.name === 'Properties70') {
      const keys = Object.keys(subNode);

      keys.forEach(function (key) {
        node[key] = subNode[key];
      });
    } else if (name === 'Properties70' && subNode.name === 'P') {
      let innerPropName = subNode.propertyList[0];
      let innerPropType1 = subNode.propertyList[1];
      const innerPropType2 = subNode.propertyList[2];
      const innerPropFlag = subNode.propertyList[3];
      let innerPropValue;

      if (innerPropName.indexOf('Lcl ') === 0) {
        innerPropName = innerPropName.replace('Lcl ', 'Lcl_');
      }
      if (innerPropType1.indexOf('Lcl ') === 0) {
        innerPropType1 = innerPropType1.replace('Lcl ', 'Lcl_');
      }

      if (
        innerPropType1 === 'Color' ||
        innerPropType1 === 'ColorRGB' ||
        innerPropType1 === 'Vector' ||
        innerPropType1 === 'Vector3D' ||
        innerPropType1.indexOf('Lcl_') === 0
      ) {
        innerPropValue = [
          subNode.propertyList[4],
          subNode.propertyList[5],
          subNode.propertyList[6],
        ];
      } else {
        innerPropValue = subNode.propertyList[4];
      }

      // this will be copied to parent, see above
      node[innerPropName] = {
        type: innerPropType1,
        type2: innerPropType2,
        flag: innerPropFlag,
        value: innerPropValue,
      };
    } else if (node[subNode.name] === undefined) {
      if (typeof subNode.id === 'number') {
        node[subNode.name] = {};
        node[subNode.name][subNode.id] = subNode;
      } else {
        node[subNode.name] = subNode;
      }
    } else {
      if (subNode.name === 'PoseNode') {
        if (!Array.isArray(node[subNode.name])) {
          node[subNode.name] = [node[subNode.name]];
        }

        node[subNode.name].push(subNode);
      } else if (node[subNode.name][subNode.id] === undefined) {
        node[subNode.name][subNode.id] = subNode;
      }
    }
  }

  parseProperty(reader: BinaryReader) {
    const type = reader.getString(1);
    let length;

    switch (type) {
      case 'C':
        return reader.getBoolean();
      case 'D':
        return reader.getFloat64();
      case 'F':
        return reader.getFloat32();
      case 'I':
        return reader.getInt32();
      case 'L':
        return reader.getInt64();
      case 'R':
        length = reader.getUint32();

        return reader.getArrayBuffer(length);
      case 'S':
        length = reader.getUint32();

        return reader.getString(length);
      case 'Y':
        return reader.getInt16();
      case 'b':
      case 'c':
      case 'd':
      case 'f':
      case 'i':
      case 'l': {
        const arrayLength = reader.getUint32();
        const encoding = reader.getUint32(); // 0: non-compressed, 1: compressed
        const compressedLength = reader.getUint32();

        if (encoding === 0) {
          switch (type) {
            case 'b':
            case 'c':
              return reader.getBooleanArray(arrayLength);
            case 'd':
              return reader.getFloat64Array(arrayLength);
            case 'f':
              return reader.getFloat32Array(arrayLength);
            case 'i':
              return reader.getInt32Array(arrayLength);
            case 'l':
              return reader.getInt64Array(arrayLength);
          }
        }

        const data = fflate.unzlibSync(new Uint8Array(reader.getArrayBuffer(compressedLength)), {});
        const reader2 = new BinaryReader(data.buffer);

        switch (type) {
          case 'b':
          case 'c':
            return reader2.getBooleanArray(arrayLength);
          case 'd':
            return reader2.getFloat64Array(arrayLength);
          case 'f':
            return reader2.getFloat32Array(arrayLength);
          case 'i':
            return reader2.getInt32Array(arrayLength);
          case 'l':
            return reader2.getInt64Array(arrayLength);
        }
      }

      // eslint-disable-next-line no-fallthrough
      default:
        throw new Error('THREE.FBXLoader: Unknown property type ' + type);
    }
  }
}

/**
 * A loader for the FBX format.
 *
 * Requires FBX file to be >= 7.0 and in ASCII or >= 6400 in Binary format.
 * Versions lower than this may load but will probably have errors.
 *
 * Needs Support:
 * - Morph normals / blend shape normals
 *
 * FBX format references:
 * - [C++ SDK reference]{@link https://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_index_html}
 *
 * Binary format specification:
 * - [FBX binary file format specification]{@link https://code.blender.org/2013/08/fbx-binary-file-format-specification/}
 *
 * ```js
 * const loader = new FBXLoader();
 * const object = await loader.loadAsync( 'models/fbx/stanford-bunny.fbx' );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 * @three_import import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
 */
class FBXLoader extends Loader<Group<Object3DEventMap>> {
  /**
   * Constructs a new FBX loader.
   *
   * @param {LoaderOptions} [options] - The loading options.
   */
  constructor(options?: LoaderOptions) {
    const { manager, wireframe } = options || {};

    super(manager);

    global.wireframe = wireframe;
  }

  /**
   * Starts loading from the given URL and passes the loaded FBX asset
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(Group)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  override load(
    url: string,
    onLoad: (group: Group<Object3DEventMap>) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: unknown) => void,
  ) {
    const path = this.path === '' ? LoaderUtils.extractUrlBase(url) : this.path;

    const loader = new FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(
      url,
      async (buffer: string | ArrayBuffer) => {
        onLoad(await this.parse(buffer as ArrayBuffer, path));

        // try {

        // 	onLoad( scope.parse( buffer, path ) );

        // } catch ( e ) {

        // 	if ( onError ) {

        // 		onError( e );

        // 	} else {

        // 		console.error( e );

        // 	}

        // 	scope.manager.itemError( url );

        // }
      },
      onProgress,
      onError,
    );
  }

  /**
   * Parses the given FBX data and returns the resulting group.
   *
   * @param {ArrayBuffer} FBXBuffer - The raw FBX data as an array buffer.
   * @param {string} path - The URL base path.
   * @return {Group} An object representing the parsed asset.
   */
  parse(FBXBuffer: ArrayBuffer | string, path: string) {
    if (isFbxFormatBinary(FBXBuffer as ArrayBuffer)) {
      global.fbxTree = new BinaryParser().parse(FBXBuffer as ArrayBuffer);
    } else {
      const FBXText = convertArrayBufferToString(FBXBuffer as ArrayBuffer);

      if (!isFbxFormatASCII(FBXText)) {
        throw new Error('THREE.FBXLoader: Unknown format.');
      }

      if (getFbxVersion(FBXText) < 7000) {
        throw new Error(
          'THREE.FBXLoader: FBX version not supported, FileVersion: ' + getFbxVersion(FBXText),
        );
      }

      global.fbxTree = new TextParser().parse(FBXText);
    }
    const textureLoader = new TextureLoader(this.manager)
      .setPath(this.resourcePath || path)
      .setCrossOrigin(this.crossOrigin);

    return new FBXTreeParser(textureLoader, this.manager).parse();
  }
}

export { FBXLoader };
