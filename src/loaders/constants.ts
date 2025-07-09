import type { LoadingManager } from 'three';

/**
 * Loader 参数
 */
export interface LoaderOptions {
  /**
   * 加载管理器
   */
  manager?: LoadingManager;
  /**
   * 是否显示线框
   * @default true
   */
  wireframe?: boolean;
}
