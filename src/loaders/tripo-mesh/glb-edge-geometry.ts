import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

/**
 * 基于LineSegments2原理的GLB边框几何体
 * 将线条转换为四边形几何体，通过instanceStart和instanceEnd定义线段端点
 */
export class GLBEdgeMeshGeometry extends BufferGeometry {
  constructor(geometry: BufferGeometry) {
    super();

    const indexAttr = geometry.getIndex();
    const posAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const indexCount = indexAttr ? indexAttr.count : posAttr.count;

    // 边去重Map
    const edgeMap = new Map<string, { start: Vector3; end: Vector3; normal: Vector3 }>();

    const _v0 = new Vector3();
    const _v1 = new Vector3();
    const _v2 = new Vector3();
    const _n0 = new Vector3();
    const _n1 = new Vector3();
    const _n2 = new Vector3();
    const _faceNormal = new Vector3();

    // 遍历三角形，按LOD级别采样
    for (let i = 0; i < indexCount; i += 3) {
      const idx0 = indexAttr ? indexAttr.getX(i) : i;
      const idx1 = indexAttr ? indexAttr.getX(i + 1) : i + 1;
      const idx2 = indexAttr ? indexAttr.getX(i + 2) : i + 2;

      // 获取顶点位置
      _v0.fromBufferAttribute(posAttr, idx0);
      _v1.fromBufferAttribute(posAttr, idx1);
      _v2.fromBufferAttribute(posAttr, idx2);

      // 获取顶点法线（如果有的话）
      if (normalAttr) {
        _n0.fromBufferAttribute(normalAttr, idx0);
        _n1.fromBufferAttribute(normalAttr, idx1);
        _n2.fromBufferAttribute(normalAttr, idx2);
      } else {
        // 计算面法线
        _faceNormal.subVectors(_v2, _v1).cross(_v0.clone().sub(_v1)).normalize();
        _n0.copy(_faceNormal);
        _n1.copy(_faceNormal);
        _n2.copy(_faceNormal);
      }

      // 三角形的三条边
      const triangleEdges = [
        { start: _v0, end: _v1, startNormal: _n0, endNormal: _n1 },
        { start: _v1, end: _v2, startNormal: _n1, endNormal: _n2 },
        { start: _v2, end: _v0, startNormal: _n2, endNormal: _n0 },
      ];

      // 处理每条边
      for (const edge of triangleEdges) {
        // 过滤过短的边（性能优化）
        const edgeLength = edge.start.distanceTo(edge.end);
        if (edgeLength < 0.001) continue;

        // 创建边的唯一标识符（确保边的方向一致性）
        const edgeKey = this.createEdgeKey(edge.start, edge.end);

        // 如果边已存在，跳过（去重）
        if (edgeMap.has(edgeKey)) continue;

        // 计算边的法向量（使用两端顶点法向量的平均值）
        const edgeNormal = new Vector3().addVectors(edge.startNormal, edge.endNormal).normalize();

        // 确保法向量有效
        if (edgeNormal.length() < 0.5) {
          edgeNormal.set(0, 0, 1);
        }

        // 添加边到Map
        edgeMap.set(edgeKey, {
          start: edge.start.clone(),
          end: edge.end.clone(),
          normal: edgeNormal,
        });
      }
    }
    // 生成几何体数据
    const instanceStarts: number[] = [];
    const instanceEnds: number[] = [];
    const instanceNormals: number[] = [];
    const vertices: number[] = [];
    const uvs: number[] = [];
    const geometryIndices: number[] = [];

    let segmentCount = 0;

    // 将去重后的边转换为线段几何体
    for (const edge of edgeMap.values()) {
      this.addLineSegmentQuad(
        edge.start.x,
        edge.start.y,
        edge.start.z,
        edge.end.x,
        edge.end.y,
        edge.end.z,
        edge.normal,
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
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setAttribute('instanceStart', new Float32BufferAttribute(instanceStarts, 3));
    this.setAttribute('instanceEnd', new Float32BufferAttribute(instanceEnds, 3));
    this.setAttribute('instanceNormal', new Float32BufferAttribute(instanceNormals, 3));
    this.setIndex(geometryIndices);
  }

  /**
   * 创建边的唯一标识符，确保边的方向一致性
   */
  private createEdgeKey(v1: Vector3, v2: Vector3): string {
    // 确保较小的顶点在前，保证边的方向一致性
    const precision = 10000; // 精度控制
    const x1 = Math.round(v1.x * precision);
    const y1 = Math.round(v1.y * precision);
    const z1 = Math.round(v1.z * precision);
    const x2 = Math.round(v2.x * precision);
    const y2 = Math.round(v2.y * precision);
    const z2 = Math.round(v2.z * precision);

    // 比较顶点，确保较小的在前
    if (x1 < x2 || (x1 === x2 && y1 < y2) || (x1 === x2 && y1 === y2 && z1 < z2)) {
      return `${x1},${y1},${z1}|${x2},${y2},${z2}`;
    } else {
      return `${x2},${y2},${z2}|${x1},${y1},${z1}`;
    }
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
