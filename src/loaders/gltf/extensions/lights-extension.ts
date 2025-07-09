import type { Object3D } from 'three';
import { Color, DirectionalLight, LinearSRGBColorSpace, PointLight, SpotLight } from 'three';
import type { GLTFParser } from '../GLTF-parser.js';
import type { GLTFLight } from '../constants.js';
import { EXTENSIONS } from '../constants.js';
import { assignExtrasToUserData } from '../utils.js';

/**
 * Punctual Lights Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual
 */
export class GLTFLightsExtension {
  name: string;
  parser: GLTFParser;
  cache: { refs: Record<number, number>; uses: Record<number, number> };

  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL;

    // Object3D instance caches
    this.cache = { refs: {}, uses: {} };
  }

  _markDefs() {
    const parser = this.parser;
    const nodeDefs = this.parser.json.nodes || [];

    for (let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
      const nodeDef = nodeDefs[nodeIndex];

      if (
        nodeDef.extensions &&
        nodeDef.extensions[this.name] &&
        nodeDef.extensions[this.name].light !== undefined
      ) {
        parser._addNodeRef(this.cache, nodeDef.extensions[this.name].light as number);
      }
    }
  }

  _loadLight(lightIndex: number): Promise<SpotLight | DirectionalLight | PointLight> {
    const parser = this.parser;
    const cacheKey = 'light:' + lightIndex;
    let dependency = parser.cache.get(cacheKey);

    if (dependency) {
      return dependency as Promise<SpotLight | DirectionalLight | PointLight>;
    }

    const json = parser.json;
    const extendsDef = json.extensions || {};
    const extensions = extendsDef[this.name] || {};
    const lightDefs = (extensions.lights as GLTFLight[]) || [];
    const lightDef = lightDefs[lightIndex];
    let lightNode;

    const color = new Color(0xffffff);

    if (lightDef.color !== undefined) {
      color.setRGB(lightDef.color[0], lightDef.color[1], lightDef.color[2], LinearSRGBColorSpace);
    }

    const range = lightDef.range !== undefined ? lightDef.range : 0;

    switch (lightDef.type) {
      case 'directional':
        lightNode = new DirectionalLight(color);
        lightNode.target.position.set(0, 0, -1);
        lightNode.add(lightNode.target);

        break;
      case 'point':
        lightNode = new PointLight(color);
        lightNode.distance = range;

        break;
      case 'spot':
        lightNode = new SpotLight(color);
        lightNode.distance = range;
        // Handle spotlight properties.
        lightDef.spot = lightDef.spot || ({} as { innerConeAngle: number; outerConeAngle: number });
        lightDef.spot.innerConeAngle =
          lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
        lightDef.spot.outerConeAngle =
          lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
        lightNode.angle = lightDef.spot.outerConeAngle;
        lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
        lightNode.target.position.set(0, 0, -1);
        lightNode.add(lightNode.target);

        break;
      default:
        throw new Error('THREE.GLTFLoader: Unexpected light type: ' + lightDef.type);
    }

    // Some lights (e.g. spot) default to a position other than the origin. Reset the position
    // here, because node-level parsing will only override position if explicitly specified.
    lightNode.position.set(0, 0, 0);

    assignExtrasToUserData(lightNode, lightDef);

    if (lightDef.intensity !== undefined) {
      lightNode.intensity = lightDef.intensity;
    }

    lightNode.name = parser.createUniqueName(lightDef.name || 'light_' + lightIndex);

    dependency = Promise.resolve(lightNode);

    parser.cache.add(cacheKey, dependency);

    return dependency as Promise<SpotLight | DirectionalLight | PointLight>;
  }

  getDependency(type: string, index: number) {
    if (type !== 'light') {
      return;
    }

    return this._loadLight(index);
  }

  createNodeAttachment(nodeIndex: number) {
    const parser = this.parser;
    const json = parser.json;
    const nodeDefs = json.nodes || [];
    const nodeDef = nodeDefs[nodeIndex];
    const lightDef =
      (nodeDef.extensions && (nodeDef.extensions as Record<string, any>)[this.name]) || {};
    const lightIndex = lightDef.light as number;

    if (lightIndex === undefined) {
      return null;
    }

    return this._loadLight(lightIndex).then((light) => {
      return parser._getNodeRef(this.cache, lightIndex, light as Object3D);
    });
  }
}
