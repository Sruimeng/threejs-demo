import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

/**
 * 基于LineSegments2原理的FBX边框几何体
 * 将线条转换为四边形几何体，通过instanceStart和instanceEnd定义线段端点
 */
export class FBXEdgesGeometry extends BufferGeometry {
  constructor(
    /**
     * 顶点位置数组，每个面一个数组，格式为 [x, y, z, x, y, z, ...]
     * 例如: [[x1, y1, z1, x2, y2, z2, ...], [x1, y1, z1, x2, y2, z2, ...], ...]
     * 每个子数组代表一个面的顶点位置
     */
    positions: number[][],
    /**
     * 顶点索引数组，每个面一个数组，格式为 [顶点数量, 索引1, 索引2, ...]
     * 例如: [[4, 0, 1, 2, 3], [4, 0, 1, 2, 3], ...]
     * 每个子数组代表一个面的顶点索引
     */
    indices: number[][],
    /**
     * 法向量数组，每个面一个数组，格式为 [nx, ny, nz, nx, ny, nz, ...]
     * 如果没有提供，将自动计算面法向量
     */
    normals: number[][] = [],
  ) {
    super();

    // 收集所有线段的起点和终点
    const instanceStarts: number[] = [];
    const instanceEnds: number[] = [];
    const instanceNormals: number[] = [];
    const vertices: number[] = [];
    const uvs: number[] = [];
    const geometryIndices: number[] = [];

    let segmentCount = 0;

    // 遍历每个面，为每个面的边创建线段
    for (let faceIndex = 0; faceIndex < Math.min(positions.length, indices.length); faceIndex++) {
      const facePositions = positions[faceIndex];
      const faceIndices = indices[faceIndex];
      const faceNormals = normals[faceIndex];

      if (!facePositions || !faceIndices || faceIndices.length < 4) {
        console.warn(`面 ${faceIndex} 数据无效:`, { facePositions, faceIndices });
        continue;
      }

      // 第一个元素是顶点数量
      const vertexCount = faceIndices[0];

      if (vertexCount < 3 || faceIndices.length < vertexCount + 1) {
        console.warn(`面 ${faceIndex} 顶点数据不匹配:`, {
          vertexCount,
          indicesLength: faceIndices.length,
        });
        continue;
      }

      // 检查位置数据是否足够
      if (facePositions.length < vertexCount * 3) {
        console.warn(`面 ${faceIndex} 位置数据不足:`, {
          expectedPositions: vertexCount * 3,
          actualPositions: facePositions.length,
        });
        continue;
      }

      // 为当前面的每条边创建线段
      for (let i = 0; i < vertexCount; i++) {
        const currentVertexIndex = faceIndices[i + 1]; // +1 是因为第一个元素是顶点数量
        const nextVertexIndex = faceIndices[((i + 1) % vertexCount) + 1];

        // 检查顶点索引是否有效
        if (currentVertexIndex >= vertexCount || nextVertexIndex >= vertexCount) {
          console.error(`面 ${faceIndex} 顶点索引超出范围:`, {
            currentVertexIndex,
            nextVertexIndex,
            vertexCount,
          });
          continue;
        }

        // 获取当前边的两个顶点位置
        const startX = facePositions[currentVertexIndex * 3];
        const startY = facePositions[currentVertexIndex * 3 + 1];
        const startZ = facePositions[currentVertexIndex * 3 + 2];

        const endX = facePositions[nextVertexIndex * 3];
        const endY = facePositions[nextVertexIndex * 3 + 1];
        const endZ = facePositions[nextVertexIndex * 3 + 2];

        // 计算这条边的法向量（使用边的两个顶点的法向量或面法向量）
        const edgeNormal = this.calculateEdgeNormal(
          facePositions,
          faceIndices,
          currentVertexIndex,
          nextVertexIndex,
          faceNormals,
        );

        // 为这个线段创建四边形（4个顶点，2个三角形）
        this.addLineSegmentQuad(
          startX,
          startY,
          startZ,
          endX,
          endY,
          endZ,
          edgeNormal,
          segmentCount,
          instanceStarts,
          instanceEnds,
          instanceNormals,
          vertices,
          uvs,
          geometryIndices,
        );

        segmentCount++;
      }
    }

    // 设置几何体属性
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setAttribute('instanceStart', new Float32BufferAttribute(instanceStarts, 3));
    this.setAttribute('instanceEnd', new Float32BufferAttribute(instanceEnds, 3));
    this.setAttribute('instanceNormal', new Float32BufferAttribute(instanceNormals, 3));
    this.setIndex(geometryIndices);
  }

  /**
   * 计算边法向量
   */
  private calculateEdgeNormal(
    facePositions: number[],
    faceIndices: number[],
    startVertexIndex: number,
    endVertexIndex: number,
    faceNormals?: number[],
  ): Vector3 {
    // 如果有顶点法向量数据，使用边两端顶点法向量的平均值
    if (faceNormals && faceNormals.length >= (Math.max(startVertexIndex, endVertexIndex) + 1) * 3) {
      const startNormal = new Vector3(
        faceNormals[startVertexIndex * 3],
        faceNormals[startVertexIndex * 3 + 1],
        faceNormals[startVertexIndex * 3 + 2],
      );

      const endNormal = new Vector3(
        faceNormals[endVertexIndex * 3],
        faceNormals[endVertexIndex * 3 + 1],
        faceNormals[endVertexIndex * 3 + 2],
      );

      // 验证法向量有效性
      if (startNormal.length() > 0.01 && endNormal.length() > 0.01) {
        startNormal.normalize();
        endNormal.normalize();

        // 返回两个顶点法向量的平均值
        const avgNormal = new Vector3().addVectors(startNormal, endNormal).normalize();

        // 确保平均法向量有效
        if (avgNormal.length() > 0.5) {
          return avgNormal;
        }
      }
    }

    // 回退到面法向量计算
    const faceNormal = this.calculateFaceNormal(facePositions, faceIndices);

    // 如果面法向量也无效，使用边向量计算默认法向量
    if (faceNormal.length() < 0.5) {
      return this.calculateEdgeDefaultNormal(facePositions, startVertexIndex, endVertexIndex);
    }

    return faceNormal;
  }

  /**
   * 计算边的默认法向量（基于边向量）
   */
  private calculateEdgeDefaultNormal(
    facePositions: number[],
    startVertexIndex: number,
    endVertexIndex: number,
  ): Vector3 {
    // 获取边的两个顶点
    const startX = facePositions[startVertexIndex * 3];
    const startY = facePositions[startVertexIndex * 3 + 1];
    const startZ = facePositions[startVertexIndex * 3 + 2];

    const endX = facePositions[endVertexIndex * 3];
    const endY = facePositions[endVertexIndex * 3 + 1];
    const endZ = facePositions[endVertexIndex * 3 + 2];

    // 计算边向量
    const edgeVector = new Vector3(endX - startX, endY - startY, endZ - startZ);

    // 如果边长度太小，返回默认法向量
    if (edgeVector.length() < 0.001) {
      return new Vector3(0, 0, 1);
    }

    edgeVector.normalize();

    // 尝试与Z轴叉积
    let normal = new Vector3().crossVectors(edgeVector, new Vector3(0, 0, 1));

    // 如果结果太小（边向量接近Z轴），使用X轴
    if (normal.length() < 0.1) {
      normal = new Vector3().crossVectors(edgeVector, new Vector3(1, 0, 0));
    }

    // 如果还是太小，使用Y轴
    if (normal.length() < 0.1) {
      normal = new Vector3().crossVectors(edgeVector, new Vector3(0, 1, 0));
    }

    return normal.normalize();
  }

  /**
   * 计算面法向量
   */
  private calculateFaceNormal(facePositions: number[], faceIndices: number[]): Vector3 {
    // 根据面的前三个顶点计算法向量
    const vertexCount = faceIndices[0];
    if (vertexCount < 3) {
      return new Vector3(0, 0, 1); // 默认法向量
    }

    // 获取前三个顶点
    const v0Index = faceIndices[1];
    const v1Index = faceIndices[2];
    const v2Index = faceIndices[3] || faceIndices[1]; // 处理只有2个顶点的情况

    const v0 = new Vector3(
      facePositions[v0Index * 3],
      facePositions[v0Index * 3 + 1],
      facePositions[v0Index * 3 + 2],
    );

    const v1 = new Vector3(
      facePositions[v1Index * 3],
      facePositions[v1Index * 3 + 1],
      facePositions[v1Index * 3 + 2],
    );

    const v2 = new Vector3(
      facePositions[v2Index * 3],
      facePositions[v2Index * 3 + 1],
      facePositions[v2Index * 3 + 2],
    );

    // 计算叉积得到法向量
    const edge1 = new Vector3().subVectors(v1, v0);
    const edge2 = new Vector3().subVectors(v2, v0);
    const normal = new Vector3().crossVectors(edge1, edge2).normalize();

    // 确保法向量有效
    if (normal.length() < 0.5) {
      return new Vector3(0, 0, 1); // 默认法向量
    }

    return normal;
  }

  /**
   * 为单个线段添加四边形几何体
   * 根据LineSegments2原理，每个线段被表示为一个四边形（2个三角形）
   */
  private addLineSegmentQuad(
    startX: number,
    startY: number,
    startZ: number,
    endX: number,
    endY: number,
    endZ: number,
    edgeNormal: Vector3,
    segmentIndex: number,
    instanceStarts: number[],
    instanceEnds: number[],
    instanceNormals: number[],
    vertices: number[],
    uvs: number[],
    indices: number[],
  ) {
    // 线段起点和终点
    const start = [startX, startY, startZ];
    const end = [endX, endY, endZ];

    // 为这个线段添加4个instanceStart、instanceEnd和instanceNormal
    for (let i = 0; i < 4; i++) {
      instanceStarts.push(start[0], start[1], start[2]);
      instanceEnds.push(end[0], end[1], end[2]);
      instanceNormals.push(edgeNormal.x, edgeNormal.y, edgeNormal.z);
    }

    // 四边形的四个顶点位置（标准化坐标）
    // position.x 控制线条宽度方向：-1 = 左侧，1 = 右侧
    // position.y 控制线条长度方向：0 = 起点，1 = 终点
    const quadVertices = [
      [-1, 0, 0], // 左下 (起点左侧)
      [1, 0, 0], // 右下 (起点右侧)
      [-1, 1, 0], // 左上 (终点左侧)
      [1, 1, 0], // 右上 (终点右侧)
    ];

    // UV坐标，用于片段着色器中的抗锯齿
    const quadUVs = [
      [0, 0], // 左下
      [1, 0], // 右下
      [0, 1], // 左上
      [1, 1], // 右上
    ];

    // 添加顶点数据
    const baseVertexIndex = segmentIndex * 4;
    for (let i = 0; i < 4; i++) {
      vertices.push(quadVertices[i][0], quadVertices[i][1], quadVertices[i][2]);
      uvs.push(quadUVs[i][0], quadUVs[i][1]);
    }

    // 添加两个三角形的索引
    // 第一个三角形: 0 -> 1 -> 2
    indices.push(baseVertexIndex + 0, baseVertexIndex + 1, baseVertexIndex + 2);

    // 第二个三角形: 1 -> 3 -> 2
    indices.push(baseVertexIndex + 1, baseVertexIndex + 3, baseVertexIndex + 2);
  }
}
