import {
  Color,
  DoubleSide,
  LessEqualDepth,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
} from 'three';

// 创建线框专用的 uniforms
const WireframeUniforms = {
  linewidth: { value: 1 }, // 线宽
  resolution: { value: new Vector2(1, 1) }, // 分辨率
  wireframeColor: { value: new Color(0x000000) }, // 线框颜色
  wireframeOpacity: { value: 1.0 }, // 线框透明度
  normalOffset: { value: 0.008 }, // 固定偏移量
  depthBias: { value: -0.0001 }, // 深度偏移
  minAlpha: { value: 0.3 }, // 最小alpha值
  edgeThreshold: { value: 0.8 }, // 抗锯齿阈值
  distanceFadeStart: { value: 10.0 }, // 距离渐变开始距离
  distanceFadeEnd: { value: 50.0 }, // 距离渐变结束距离
};

/**
 * 按照 LineMaterial 拓展的材质，用于渲染线框
 */
export class TriangleWireframeMaterial extends ShaderMaterial {
  constructor(
    options: {
      color?: number;
      lineWidth?: number;
      opacity?: number;
      normalOffset?: number;
      depthBias?: number;
      minAlpha?: number;
      edgeThreshold?: number;
      distanceFadeStart?: number;
      distanceFadeEnd?: number;
    } = {},
  ) {
    const {
      color = 0x000000, // 线框颜色
      lineWidth = 1.0, // 线框宽度
      opacity = 0.4, // 线框透明度
      normalOffset = 0, // 法线偏移量
      depthBias = -0.0002, // 深度偏移量
      minAlpha = 0.1, // 最小透明度
      edgeThreshold = 0.75, // 边缘阈值
      distanceFadeStart = 1.0, // 距离渐变开始
      distanceFadeEnd = 5.0, // 距离渐变结束
    } = options;

    const uniforms = UniformsUtils.merge([UniformsLib.common, WireframeUniforms]);

    // 设置初始uniform值
    uniforms.wireframeColor.value = new Color(color);
    uniforms.linewidth.value = lineWidth;
    uniforms.wireframeOpacity.value = opacity;
    uniforms.normalOffset.value = normalOffset;
    uniforms.depthBias.value = depthBias;
    uniforms.minAlpha.value = minAlpha;
    uniforms.edgeThreshold.value = edgeThreshold;
    uniforms.distanceFadeStart.value = distanceFadeStart;
    uniforms.distanceFadeEnd.value = distanceFadeEnd;

    super({
      uniforms: uniforms,

      vertexShader: `
        #include <common>
        #include <color_pars_vertex>
        #include <fog_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>

        uniform float linewidth;
        uniform vec2 resolution;
        uniform float normalOffset;
        uniform float depthBias;

        attribute vec3 instanceStart;
        attribute vec3 instanceEnd;
        attribute vec3 instanceNormal;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vViewZ;
        varying float vLineWidth;
        varying float vLineLength;
        varying float vDistance; // 距离摄像机的距离

        void trimSegment(const in vec4 start, inout vec4 end) {
          float a = projectionMatrix[2][2];
          float b = projectionMatrix[3][2];
          float nearEstimate = -0.5 * b / a;
          float alpha = (nearEstimate - start.z) / (end.z - start.z);
          end.xyz = mix(start.xyz, end.xyz, alpha);
        }

        void main() {
          float aspect = resolution.x / resolution.y;

          // 确保法线单位化并验证有效性
          vec3 normal = instanceNormal;
          float normalLength = length(normal);
          if (normalLength > 0.01) {
            normal = normal / normalLength;
          } else {
            // 如果法向量无效，计算线段的默认法向量
            vec3 lineDir = normalize(instanceEnd - instanceStart);
            normal = normalize(cross(lineDir, vec3(0.0, 0.0, 1.0)));
            if (length(normal) < 0.1) {
              normal = normalize(cross(lineDir, vec3(1.0, 0.0, 0.0)));
            }
          }
          vNormal = normal;

          // 沿法线方向偏移，让线框稍微偏离表面
          vec3 offsetStart = instanceStart + normal * normalOffset;
          vec3 offsetEnd = instanceEnd + normal * normalOffset;

          // 计算线段长度，用于一致性处理
          float lineLength = length(instanceEnd - instanceStart);
          vLineLength = lineLength;

          // 摄像机空间中的线段端点
          vec4 start = modelViewMatrix * vec4(offsetStart, 1.0);
          vec4 end = modelViewMatrix * vec4(offsetEnd, 1.0);

          // 记录视图空间Z坐标和距离
          vViewZ = -(start.z + end.z) * 0.5;
          vDistance = length((start.xyz + end.xyz) * 0.5); // 线段中点到摄像机的距离
          
          vUv = uv;

          // 透视投影特殊处理
          bool perspective = (projectionMatrix[2][3] == -1.0);

          if (perspective) {
            if (start.z < 0.0 && end.z >= 0.0) {
              trimSegment(start, end);
            } else if (end.z < 0.0 && start.z >= 0.0) {
              trimSegment(end, start);
            }
          }

          // 裁剪空间
          vec4 clipStart = projectionMatrix * start;
          vec4 clipEnd = projectionMatrix * end;

          // NDC空间
          vec3 ndcStart = clipStart.xyz / clipStart.w;
          vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

          // 计算线段方向
          vec2 dir = ndcEnd.xy - ndcStart.xy;
          
          // 处理零长度线段
          if (length(dir) < 0.0001) {
            dir = vec2(1.0, 0.0);
          }
          
          dir.x *= aspect;
          dir = normalize(dir);

          // 屏幕空间单位模式
          vec2 offset = vec2(dir.y, -dir.x);
          dir.x /= aspect;
          offset.x /= aspect;

          // 根据position.x决定线宽方向
          if (position.x < 0.0) offset *= -1.0;

          // 端点扩展 - 减少端点的扩展以避免过度延伸
          if (position.y < 0.0) {
            offset += -dir * 0.3;
          } else if (position.y > 1.0) {
            offset += dir * 0.3;
          }

          // 应用线宽
          float pixelLineWidth = linewidth;
          offset *= pixelLineWidth;
          offset /= resolution.y;

          // 选择起点或终点
          vec4 clip = (position.y < 0.5) ? clipStart : clipEnd;
          offset *= clip.w;
          clip.xy += offset;

          // 应用深度偏移 - 稍微向前偏移避免Z-fighting
          clip.z += depthBias * clip.w;
          
          // 传递线宽信息到片元着色器
          vLineWidth = pixelLineWidth;

          gl_Position = clip;

          vec4 mvPosition = (position.y < 0.5) ? start : end;

          #include <logdepthbuf_vertex>
          #include <clipping_planes_vertex>
          #include <fog_vertex>
        }
      `,

      fragmentShader: `
        uniform vec3 wireframeColor;
        uniform float wireframeOpacity;
        uniform float linewidth;
        uniform float minAlpha;
        uniform float edgeThreshold;
        uniform float distanceFadeStart;
        uniform float distanceFadeEnd;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vViewZ;
        varying float vLineWidth;
        varying float vLineLength;
        varying float vDistance;

        #include <common>
        #include <color_pars_fragment>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>

        void main() {
          #include <clipping_planes_fragment>

          float alpha = wireframeOpacity;
          vec3 finalColor = wireframeColor;

          // 改进的端点处理
          if (abs(vUv.y) > 1.0) {
            float a = vUv.x;
            float b = (vUv.y > 0.0) ? vUv.y - 1.0 : vUv.y + 1.0;
            float len2 = a * a + b * b;

            if (len2 > 1.8) discard;
            
            if (len2 > 1.0) {
              alpha *= 1.0 - smoothstep(1.0, 1.8, len2);
            }
          }

          // 抗锯齿算法
          float edgeAlpha = 1.0;
          float edgeFactor = abs(vUv.x);
          
          if (edgeFactor > edgeThreshold) {
            edgeAlpha = 1.0 - smoothstep(edgeThreshold, 1.0, edgeFactor);
          }
          
          // 距离渐变透明度 - 核心功能
          float distanceFactor = 1.0;
          if (vDistance > distanceFadeStart) {
            distanceFactor = 1.0 - smoothstep(distanceFadeStart, distanceFadeEnd, vDistance);
            // 确保最远处有最小可见度
            distanceFactor = max(distanceFactor, 0.05);
          }
          
          alpha *= edgeAlpha * distanceFactor;

          // 确保最小可见度
          alpha = max(alpha, minAlpha * distanceFactor);

          // 线宽相关的alpha调整
          if (vLineWidth < 1.0) {
            alpha *= smoothstep(0.1, 1.0, vLineWidth);
          }

          gl_FragColor = vec4(finalColor, alpha);

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
          #include <premultiplied_alpha_fragment>
        }
      `,

      side: DoubleSide,
      transparent: true, // 必要，否则alpha混合不工作
      depthTest: true, // 必要，否则线框会穿透其他物体
      depthWrite: false, // 必要，否则线框会穿透其他物体
      depthFunc: LessEqualDepth, // 必要，否则线框会穿透其他物体
    });
  }
}
