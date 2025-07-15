import * as THREE from 'three';

// 定义着色器参数接口
interface PointCloudMaterialParameters extends THREE.ShaderMaterialParameters {
  color1?: THREE.Color;
  color2?: THREE.Color;
  pointSize?: number;
  opacity?: number;
  flowSpeed?: number;
  noiseScale?: number;
  flowStrength?: number;
  // 新增过渡参数
  transitionProgress?: number;
  transitionCenter?: THREE.Vector3;
  transitionRadius?: number;
  transitionSpeed?: number;
  targetPositions?: Float32Array; // 目标位置数据
}

// 定义自定义uniforms类型
interface PointCloudUniforms {
  uTime: { value: number };
  color1: { value: THREE.Color };
  color2: { value: THREE.Color };
  pointSize: { value: number };
  opacity: { value: number };
  flowSpeed: { value: number };
  noiseScale: { value: number };
  flowStrength: { value: number };
  // 新增过渡uniforms
  transitionProgress: { value: number };
  transitionCenter: { value: THREE.Vector3 };
  transitionRadius: { value: number };
  transitionSpeed: { value: number };
}

export class PointCloudMaterial extends THREE.ShaderMaterial {
  uniforms: PointCloudUniforms;
  uniformsNeedUpdate: boolean;
  private targetGeometry?: THREE.BufferGeometry;
  private transitionActive: boolean = false;
  
  constructor(parameters: PointCloudMaterialParameters = {}) {
    const {
      color1 = new THREE.Color(0x00ffff),
      color2 = new THREE.Color(0xff00ff),
      pointSize = 0.1,
      opacity = 0.8,
      flowSpeed = 0.4,
      noiseScale = 3.0,
      flowStrength = 0.1,
      transitionProgress = 0.0,
      transitionCenter = new THREE.Vector3(0, 0, 0),
      transitionRadius = 5.0,
      transitionSpeed = 1.0,
      ...restParams
    } = parameters;

    // 定义uniforms
    const uniforms: PointCloudUniforms = {
      uTime: { value: 0 },
      color1: { value: color1 },
      color2: { value: color2 },
      pointSize: { value: pointSize },
      opacity: { value: opacity },
      flowSpeed: { value: flowSpeed },
      noiseScale: { value: noiseScale },
      flowStrength: { value: flowStrength },
      transitionProgress: { value: transitionProgress },
      transitionCenter: { value: transitionCenter },
      transitionRadius: { value: transitionRadius },
      transitionSpeed: { value: transitionSpeed }
    };

    // 顶点着色器
    const vertexShader = `
      uniform float uTime;
      uniform float pointSize;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float flowSpeed;
      uniform float noiseScale;
      uniform float flowStrength;
      
      // 过渡相关uniforms
      uniform float transitionProgress;
      uniform vec3 transitionCenter;
      uniform float transitionRadius;
      uniform float transitionSpeed;
      
      // 目标位置属性
      attribute vec3 targetPosition;
      
      varying vec3 vColor;
      varying float vAlpha;
      varying vec3 vPosition;
      varying float vTransition;
      
      // 简化的噪声函数
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        
        return mix(mix(mix(hash(i + vec3(0,0,0)), 
                          hash(i + vec3(1,0,0)), f.x),
                      mix(hash(i + vec3(0,1,0)), 
                          hash(i + vec3(1,1,0)), f.x), f.y),
                  mix(mix(hash(i + vec3(0,0,1)), 
                          hash(i + vec3(1,0,1)), f.x),
                      mix(hash(i + vec3(0,1,1)), 
                          hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
        
        value += amplitude * noise(p);
        
        return value;
      }
      
      // 缓动函数
      float easeInOutCubic(float t) {
        return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
      }
      
      void main() {
        // 计算到过渡中心的距离
        float distToCenter = length(position - transitionCenter);
        
        // 计算局部过渡进度（基于距离的波纹扩散）
        float localProgress = transitionProgress - (distToCenter / transitionRadius);
        localProgress = clamp(localProgress, 0.0, 1.0);
        
        // 应用缓动函数
        float smoothProgress = easeInOutCubic(localProgress);
        vTransition = smoothProgress;
        
        // 流动效果（在过渡完成前保持）
        vec3 flowPos = position * noiseScale + vec3(uTime * flowSpeed, 0.0, 0.0);
        vec3 noiseOffset = vec3(
          fbm(flowPos) - 0.5,
          fbm(flowPos + vec3(5.0, 0.0, 0.0)) - 0.5,
          fbm(flowPos + vec3(0.0, 5.0, 0.0)) - 0.5
        ) * flowStrength * (1.0 - smoothProgress);
        
        // 插值到目标位置
        vec3 currentPos = position + noiseOffset;
        vec3 finalPos = mix(currentPos, targetPosition, smoothProgress);
        
        // 计算视图空间位置
        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        // 颜色过渡
        float colorNoise = fbm(position * 1.5 + vec3(uTime * 0.2));
        float colorMix = 0.4 + 0.2 * colorNoise * (1.0 - smoothProgress);
        
        // 过渡期间颜色变化
        vec3 baseColor = mix(color1, color2, colorMix);
        vec3 targetColor = vec3(0.8, 0.8, 0.9); // 过渡到更中性的颜色
        vColor = mix(baseColor, targetColor, smoothProgress * 0.7);
        
        // 透明度过渡
        float alphaNoise = fbm(position * 1.0 + vec3(uTime * 0.1));
        float baseAlpha = 0.7 + 0.3 * alphaNoise;
        vAlpha = mix(baseAlpha, 1.0, smoothProgress);
        
        // 点大小过渡（逐渐变小直到消失）
        float sizeNoise = 0.9 + 0.1 * fbm(position * 3.0 + vec3(uTime * 0.3));
        float distanceFactor = 50.0 / -mvPosition.z;
        float sizeMultiplier = mix(1.0, 0.1, smoothProgress); // 过渡时变小
        gl_PointSize = pointSize * distanceFactor * sizeNoise * sizeMultiplier;
        
        vPosition = finalPos;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    // 片元着色器
    const fragmentShader = `
      #ifdef GL_ES
      precision highp float;
      #endif
      
      uniform float opacity;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;
      varying vec3 vPosition;
      varying float vTransition;
      
      void main() {
        vec2 uv = gl_PointCoord.xy - 0.5;
        float dist = length(uv);
        
        if (dist > 0.5) {
          discard;
        }
        
        // 过渡期间的特殊效果
        float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + vPosition.x * 5.0);
        
        // 边缘柔化
        float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * opacity * pulse;
        
        // 过渡时添加光晕效果
        if (vTransition > 0.01 && vTransition < 0.99) {
          float glowIntensity = sin(vTransition * 3.14159) * 0.5;
          alpha *= (1.0 + glowIntensity);
          
          // 添加能量波纹效果
          float ripple = sin(dist * 10.0 - uTime * 8.0) * 0.1 + 1.0;
          alpha *= ripple;
        }
        
        float brightness = 1.0 - smoothstep(0.0, 0.3, dist);
        vec3 finalColor = vColor * (0.8 + 0.2 * brightness);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    super({
      ...restParams,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.uniforms = uniforms;
  }
  
  /**
   * 设置目标几何体（真实模型的顶点位置）
   */
  setTargetGeometry(geometry: THREE.BufferGeometry) {
    this.targetGeometry = geometry;
  }
  
  /**
   * 开始过渡动画
   * @param startPoint 过渡起始点
   * @param duration 过渡持续时间（秒）
   */
  startTransition(startPoint: THREE.Vector3, duration: number = 3.0) {
    this.transitionActive = true;
    this.uniforms.transitionCenter.value.copy(startPoint);
    this.uniforms.transitionProgress.value = 0;
    this.uniforms.transitionSpeed.value = 1.0 / duration;
  }
  
  /**
   * 停止过渡动画
   */
  stopTransition() {
    this.transitionActive = false;
    this.uniforms.transitionProgress.value = 0;
  }
  
  /**
   * 更新时间和过渡进度
   */
  update(time: number) {
    this.uniforms.uTime.value = time;
    
    if (this.transitionActive) {
      this.uniforms.transitionProgress.value += this.uniforms.transitionSpeed.value * (1/60); // 假设60FPS
      
      // 过渡完成
      if (this.uniforms.transitionProgress.value >= 1.0) {
        this.uniforms.transitionProgress.value = 1.0;
        this.transitionActive = false;
      }
    }
    
    this.uniformsNeedUpdate = true;
  }
  
  // 新增过渡相关属性
  get transitionProgress(): number {
    return this.uniforms.transitionProgress.value;
  }
  
  set transitionProgress(value: number) {
    this.uniforms.transitionProgress.value = Math.max(0, Math.min(1, value));
  }
  
  get transitionCenter(): THREE.Vector3 {
    return this.uniforms.transitionCenter.value;
  }
  
  set transitionCenter(value: THREE.Vector3) {
    this.uniforms.transitionCenter.value.copy(value);
  }
  
  get transitionRadius(): number {
    return this.uniforms.transitionRadius.value;
  }
  
  set transitionRadius(value: number) {
    this.uniforms.transitionRadius.value = value;
  }
  
  // ...existing code... (保留之前的所有 getter/setter)
  get flowSpeed(): number {
    return this.uniforms.flowSpeed.value;
  }
  
  set flowSpeed(value: number) {
    this.uniforms.flowSpeed.value = value;
  }
  
  get noiseScale(): number {
    return this.uniforms.noiseScale.value;
  }
  
  set noiseScale(value: number) {
    this.uniforms.noiseScale.value = value;
  }
  
  get flowStrength(): number {
    return this.uniforms.flowStrength.value;
  }
  
  set flowStrength(value: number) {
    this.uniforms.flowStrength.value = value;
  }

  get color1(): THREE.Color {
    return this.uniforms.color1.value;
  }
  
  set color1(value: THREE.Color) {
    this.uniforms.color1.value.copy(value);
  }
  
  get color2(): THREE.Color {
    return this.uniforms.color2.value;
  }
  
  set color2(value: THREE.Color) {
    this.uniforms.color2.value.copy(value);
  }
  
  get pointSize(): number {
    return this.uniforms.pointSize.value;
  }
  
  set pointSize(value: number) {
    this.uniforms.pointSize.value = value;
  }
  
  get materialOpacity(): number {
    return this.uniforms.opacity.value;
  }
  
  set materialOpacity(value: number) {
    this.uniforms.opacity.value = value;
  }
}