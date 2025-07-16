import { AdditiveBlending, BufferGeometry, Color, IUniform, ShaderMaterial, ShaderMaterialParameters, Vector3 } from 'three';

/**
 * 点云材质参数接口
 * 扩展了 ShaderMaterialParameters，添加了点云特有的参数
 */
interface PointCloudMaterialParameters extends ShaderMaterialParameters {
  color1?: Color;              // 第一种颜色（用于颜色混合）
  color2?: Color;              // 第二种颜色（用于颜色混合）
  pointSize?: number;                // 点的基础大小
  opacity?: number;                  // 透明度
  flowSpeed?: number;                // 流动效果的速度
  noiseScale?: number;               // 噪声的缩放比例
  flowStrength?: number;             // 流动效果的强度
  // 新增过渡动画参数
  transitionProgress?: number;       // 过渡进度 (0-1)
  transitionCenter?: Vector3;  // 过渡动画的中心点
  transitionRadius?: number;         // 过渡动画的影响半径
  transitionSpeed?: number;          // 过渡动画的速度
  targetPositions?: Float32Array;    // 目标位置数据（用于形变动画）
}

/**
 * 点云材质的 Uniforms 类型定义
 * 定义了所有传递给着色器的 uniform 变量
 */
interface PointCloudUniforms extends Record<string, IUniform> {
  uTime: { value: number };                    // 时间变量（用于动画）
  color1: { value: Color };             // 第一种颜色
  color2: { value: Color };             // 第二种颜色
  pointSize: { value: number };               // 点大小
  opacity: { value: number };                 // 透明度
  flowSpeed: { value: number };               // 流动速度
  noiseScale: { value: number };              // 噪声缩放
  flowStrength: { value: number };            // 流动强度
  // 过渡动画相关 uniforms
  transitionProgress: { value: number };      // 过渡进度
  transitionCenter: { value: Vector3 }; // 过渡中心
  transitionRadius: { value: number };        // 过渡半径
  transitionSpeed: { value: number };         // 过渡速度
}

/**
 * 点云材质类
 * 
 * 这个类实现了一个具有流动效果的点云材质，包含以下特性：
 * 1. 基于时间的流动动画效果
 * 2. 多层噪声扰动
 * 3. 颜色渐变和过渡
 * 4. 动态点大小变化
 * 5. 形变过渡动画（从点云到实体模型）
 * 
 * @extends ShaderMaterial
 */
export class PointCloudMaterial extends ShaderMaterial {  
  
  /** 目标几何体（用于过渡动画） */
  private targetGeometry?: BufferGeometry;
  
  /** 过渡动画是否激活 */
  private transitionActive: boolean = false;
  
  /**
   * 构造函数
   * @param parameters 材质参数
   */
  constructor(parameters: PointCloudMaterialParameters = {}) {
    // 解构参数并设置默认值
    const {
      color1 = new Color(0x00ffff),           // 默认青色
      color2 = new Color(0xff00ff),           // 默认洋红色
      pointSize = 0.1,                              // 默认点大小
      opacity = 0.8,                                // 默认透明度
      flowSpeed = 1.4,                              // 默认流动速度
      noiseScale = 3.0,                             // 默认噪声缩放
      flowStrength = 0.1,                           // 默认流动强度
      transitionProgress = 0.0,                     // 默认过渡进度
      transitionCenter = new Vector3(0, 0, 0), // 默认过渡中心
      transitionRadius = 5.0,                       // 默认过渡半径
      transitionSpeed = 1.0,                        // 默认过渡速度
      ...restParams                                 // 其他参数
    } = parameters;

    // 初始化 uniforms 对象
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

    /**
     * 顶点着色器
     * 
     * 主要功能：
     * 1. 计算流动效果的位置偏移
     * 2. 处理过渡动画的插值
     * 3. 动态调整点的大小
     * 4. 计算颜色混合
     */
    const vertexShader = `
      // === Uniforms 变量声明 ===
      uniform float uTime;                // 时间变量
      uniform float pointSize;            // 点大小
      uniform vec3 color1;                // 颜色1
      uniform vec3 color2;                // 颜色2
      uniform float flowSpeed;            // 流动速度
      uniform float noiseScale;           // 噪声缩放
      uniform float flowStrength;         // 流动强度
      
      // 过渡动画相关 uniforms
      uniform float transitionProgress;   // 过渡进度
      uniform vec3 transitionCenter;      // 过渡中心点
      uniform float transitionRadius;     // 过渡影响半径
      uniform float transitionSpeed;      // 过渡速度
      
      // === Attributes 属性声明 ===
      attribute vec3 targetPosition;      // 目标位置（用于过渡动画）
      
      // === Varying 变量声明 ===
      varying vec3 vColor;                // 传递给片元着色器的颜色
      varying float vAlpha;               // 传递给片元着色器的透明度
      varying vec3 vPosition;             // 传递给片元着色器的位置
      varying float vTransition;          // 传递给片元着色器的过渡进度
      
      /**
       * 哈希函数 - 生成伪随机数
       * @param p 输入的3D向量
       * @return 范围在[0,1]的随机数
       */
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      /**
       * 噪声函数 - 基于三线性插值的噪声
       * @param x 输入的3D坐标
       * @return 范围在[0,1]的噪声值
       */
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);  // 平滑插值
        
        // 三线性插值计算噪声值
        return mix(mix(mix(hash(i + vec3(0,0,0)), 
                          hash(i + vec3(1,0,0)), f.x),
                      mix(hash(i + vec3(0,1,0)), 
                          hash(i + vec3(1,1,0)), f.x), f.y),
                  mix(mix(hash(i + vec3(0,0,1)), 
                          hash(i + vec3(1,0,1)), f.x),
                      mix(hash(i + vec3(0,1,1)), 
                          hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      
      /**
       * 分形布朗运动 (Fractal Brownian Motion)
       * 通过叠加多个频率的噪声创建更复杂的噪声模式
       * @param p 输入的3D坐标
       * @return 分形噪声值
       */
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        
        // 叠加3个不同频率的噪声
        for(int i = 0; i < 3; i++) {
          value += amplitude * noise(p);
          p *= 2.0;          // 频率翻倍
          amplitude *= 0.5;  // 振幅减半
        }
        
        return value;
      }
      
      /**
       * 缓动函数 - 三次贝塞尔曲线
       * 创建平滑的进入和退出动画
       * @param t 输入值 [0,1]
       * @return 缓动后的值 [0,1]
       */
      float easeInOutCubic(float t) {
        return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
      }
      
      void main() {
        // === 计算过渡动画效果 ===
        
        // 计算当前点到过渡中心的距离
        float distToCenter = length(position - transitionCenter);
        
        // 计算局部过渡进度（基于距离的波纹扩散效果）
        float localProgress = transitionProgress - (distToCenter / transitionRadius);
        localProgress = clamp(localProgress, 0.0, 1.0);
        
        // 应用缓动函数使过渡更平滑
        float smoothProgress = easeInOutCubic(localProgress);
        vTransition = smoothProgress;
        
        // === 创建多层流动效果 ===
        
        // 时间偏移量
        vec3 timeOffset = vec3(uTime * flowSpeed);
        
        // 第一层：波浪运动
        vec3 wave1 = vec3(
          sin(position.x * 0.5 + uTime * flowSpeed * 2.0),
          cos(position.y * 0.5 + uTime * flowSpeed * 1.5),
          sin(position.z * 0.5 + uTime * flowSpeed * 1.8)
        ) * flowStrength * 2.0;
        
        // 第二层：噪声扰动
        vec3 noisePos = position * noiseScale * 0.1 + timeOffset;
        vec3 noiseOffset = vec3(
          fbm(noisePos) - 0.5,
          fbm(noisePos + vec3(5.0, 0.0, 0.0)) - 0.5,
          fbm(noisePos + vec3(0.0, 5.0, 0.0)) - 0.5
        ) * flowStrength * 3.0;
        
        // 第三层：螺旋运动
        float angle = uTime * flowSpeed + length(position) * 0.1;
        vec3 spiral = vec3(
          cos(angle) * flowStrength,
          sin(angle) * flowStrength,
          cos(angle * 1.3) * flowStrength
        ) * 1.5;
        
        // 合并所有流动效果
        vec3 totalFlow = (wave1 + noiseOffset + spiral) * (1.0 - smoothProgress);
        
        // === 位置计算 ===
        
        // 当前位置 = 原始位置 + 流动偏移
        vec3 currentPos = position + totalFlow;
        
        // 根据过渡进度插值到目标位置
        vec3 finalPos = mix(currentPos, targetPosition, smoothProgress);
        
        // 转换到视图空间
        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        // === 动态颜色计算 ===
        
        // 基于时间的颜色偏移
        float timeColorOffset = uTime * 0.5;
        float colorNoise = fbm(position * 1.5 + vec3(timeColorOffset));
        float colorMix = 0.3 + 0.4 * sin(colorNoise * 6.28 + timeColorOffset);
        
        // 基础颜色混合
        vec3 baseColor = mix(color1, color2, colorMix);
        vec3 targetColor = vec3(0.8, 0.8, 0.9);  // 过渡时的目标颜色
        
        // 根据过渡进度混合颜色
        vColor = mix(baseColor, targetColor, smoothProgress * 0.7);
        
        // === 动态透明度计算 ===
        
        // 基于噪声的透明度变化
        float alphaNoise = fbm(position * 1.0 + vec3(uTime * 0.2));
        float dynamicAlpha = 0.6 + 0.4 * sin(alphaNoise * 6.28 + uTime);
        
        // 过渡时透明度变化
        vAlpha = mix(dynamicAlpha, 1.0, smoothProgress);
        
        // === 动态点大小计算 ===
        
        // 基于噪声的大小变化
        float sizeNoise = 0.8 + 0.4 * fbm(position * 2.0 + vec3(uTime * 0.3));
        
        // 基于距离的透视缩放
        float distanceFactor = 50.0 / -mvPosition.z;
        
        // 根据过渡进度调整大小
        float sizeMultiplier = mix(1.0 + 0.3 * sin(uTime * 2.0), 0.1, smoothProgress);
        
        // 最终点大小
        gl_PointSize = pointSize * distanceFactor * sizeNoise * sizeMultiplier;
        
        // === 输出变量 ===
        vPosition = finalPos;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    /**
     * 片元着色器
     * 
     * 主要功能：
     * 1. 创建圆形点的形状
     * 2. 处理边缘柔化
     * 3. 添加过渡期间的特殊效果
     * 4. 计算最终颜色和透明度
     */
    const fragmentShader = `
      #ifdef GL_ES
      precision highp float;
      #endif
      
      // === Uniforms 变量声明 ===
      uniform float opacity;              // 整体透明度
      uniform float uTime;                // 时间变量
      
      // === Varying 变量声明 ===
      varying vec3 vColor;                // 从顶点着色器传入的颜色
      varying float vAlpha;               // 从顶点着色器传入的透明度
      varying vec3 vPosition;             // 从顶点着色器传入的位置
      varying float vTransition;          // 从顶点着色器传入的过渡进度
      
      void main() {
        // === 创建圆形点 ===
        
        // 计算从点中心的距离
        vec2 uv = gl_PointCoord.xy - 0.5;
        float dist = length(uv);
        
        // 丢弃圆形外的像素
        if (dist > 0.5) {
          discard;
        }
        
        // === 动态效果计算 ===
        
        // 脉冲效果
        float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + vPosition.x * 5.0);
        
        // 基本的边缘柔化
        float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * opacity * pulse;
        
        // === 过渡期间的特殊效果 ===
        
        // 检查是否在过渡状态
        if (vTransition > 0.01 && vTransition < 0.99) {
          // 光晕强度（在过渡中期最强）
          float glowIntensity = sin(vTransition * 3.14159) * 0.5;
          alpha *= (1.0 + glowIntensity);
          
          // 能量波纹效果
          float ripple = sin(dist * 10.0 - uTime * 8.0) * 0.1 + 1.0;
          alpha *= ripple;
        }
        
        // === 颜色计算 ===
        
        // 基于距离的亮度变化（中心更亮）
        float brightness = 1.0 - smoothstep(0.0, 0.3, dist);
        vec3 finalColor = vColor * (0.8 + 0.2 * brightness);
        
        // === 输出最终颜色 ===
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    // 调用父类构造函数
    super({
      ...restParams,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,              // 启用透明度
      depthWrite: false,             // 禁用深度写入（避免透明度问题）
      blending: AdditiveBlending // 使用加法混合模式
    });

    // 保存 uniforms 引用
    this.uniforms = uniforms;
  }
  
  /**
   * 设置目标几何体（用于过渡动画）
   * 
   * 当点云需要过渡到实体模型时，使用这个方法设置目标几何体
   * 
   * @param geometry 目标几何体
   */
  setTargetGeometry(geometry: BufferGeometry) {
    this.targetGeometry = geometry;
  }
  
  /**
   * 开始过渡动画
   * 
   * 启动从点云到实体模型的过渡动画
   * 
   * @param startPoint 过渡起始点（波纹扩散的中心）
   * @param duration 过渡持续时间（秒）
   */
  startTransition(startPoint: Vector3, duration: number = 3.0) {
    this.transitionActive = true;
    this.uniforms.transitionCenter.value.copy(startPoint);
    this.uniforms.transitionProgress.value = 0;
    this.uniforms.transitionSpeed.value = 1.0 / duration;
  }
  
  /**
   * 停止过渡动画
   * 
   * 重置过渡状态，回到纯点云模式
   */
  stopTransition() {
    this.transitionActive = false;
    this.uniforms.transitionProgress.value = 0;
  }
  
  /**
   * 更新材质（每帧调用）
   * 
   * 更新时间变量和过渡进度，驱动所有的动画效果
   * 
   * @param time 当前时间
   */
  update(time: number) {
    // 更新时间 uniform
    this.uniforms.uTime.value = time;
    
    // 如果过渡动画激活，更新过渡进度
    if (this.transitionActive) {
      this.uniforms.transitionProgress.value += this.uniforms.transitionSpeed.value * (1/60); // 假设60FPS
      
      // 检查过渡是否完成
      if (this.uniforms.transitionProgress.value >= 1.0) {
        this.uniforms.transitionProgress.value = 1.0;
        this.transitionActive = false;
      }
    }
    
    // 标记 uniforms 需要更新
    this.uniformsNeedUpdate = true;
  }
}