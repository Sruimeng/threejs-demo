import React, { useState } from 'react';
import { Slider, Space, Select, Collapse, Switch, Button, Card } from 'antd';
import { AOViewer, AOParams } from '../../src/componets/AO-viewer';

const { Panel } = Collapse;
const { Option } = Select;

// 输出模式常量 - 匹配 AOPass.OUTPUT
const OUTPUT_MODES = {
  'Default': 0,
  'Diffuse': 1,
  'Depth': 2,
  'Normal': 3,
  'AO': 4,
  'Denoise': 5
} as const;

interface AODemoProps {
  models: Record<string, string>;
  defaultModel?: string;
}

export const AODemo: React.FC<AODemoProps> = ({ 
  models, 
  defaultModel = Object.keys(models)[0] 
}) => {
  const [currentModel, setCurrentModel] = useState(defaultModel);
  const [aoParams, setAOParams] = useState<AOParams>({
    output: 3, // AO Only + Denoise
    intensity: 1,
    radius: 4,
    bias: 0.001,
    scale: 1,
    samples: 24,
    thickness: 10,
    distanceFallOff: 1,
    enabled: true
  });

  // 参数更新处理
  const handleParamChange = <K extends keyof AOParams>(
    key: K,
    value: AOParams[K]
  ) => {
    setAOParams((prev: AOParams) => ({ ...prev, [key]: value }));
  };

  // 重置参数
  const resetParams = () => {
    setAOParams({
      output: 3,
      intensity: 1,
      radius: 4,
      bias: 0.001,
      scale: 1,
      samples: 24,
      thickness: 10,
      distanceFallOff: 1,
      enabled: true
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 3D 视窗 */}
      <AOViewer url={models[currentModel]} aoParams={aoParams} />
      
      {/* 控制面板 */}
      <div style={{ 
        position: 'absolute', 
        top: 16, 
        left: 16, 
        width: '320px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        zIndex: 1000
      }}>
        <Card 
          title="AO Controls" 
          size="small"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            color: 'white',
            border: '1px solid #434343'
          }}
          headStyle={{ 
            color: 'white', 
            borderBottom: '1px solid #434343' 
          }}
          bodyStyle={{ color: 'white' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 模型选择和基础控制 */}
            <Space wrap>
              <Select 
                value={currentModel}
                onChange={setCurrentModel}
                style={{ width: 120 }}
              >
                {Object.keys(models).map((key) => (
                  <Option key={key} value={key}>{key}</Option>
                ))}
              </Select>
              
              <Button size="small" onClick={resetParams}>
                Reset
              </Button>
              
              <Switch
                checked={aoParams.enabled}
                onChange={(checked) => handleParamChange('enabled', checked)}
                checkedChildren="AO On"
                unCheckedChildren="AO Off"
              />
            </Space>

            {/* AO 参数控制 */}
            <Collapse 
              defaultActiveKey={['main']} 
              ghost
              size="small"
            >
              <Panel header="Main Controls" key="main">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {/* 输出模式 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Output Mode
                    </label>
                    <Select 
                      value={aoParams.output}
                      onChange={(value) => handleParamChange('output', value)}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      {Object.entries(OUTPUT_MODES).map(([key, value]) => (
                        <Option key={value} value={value}>{key}</Option>
                      ))}
                    </Select>
                  </div>

                  {/* 强度 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Intensity: {aoParams.intensity.toFixed(2)}
                    </label>
                    <Slider
                      min={0}
                      max={3}
                      step={0.1}
                      value={aoParams.intensity}
                      onChange={(value) => handleParamChange('intensity', value)}
                    />
                  </div>

                  {/* 半径 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Radius: {aoParams.radius.toFixed(1)}
                    </label>
                    <Slider
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={aoParams.radius}
                      onChange={(value) => handleParamChange('radius', value)}
                    />
                  </div>

                  {/* 采样数 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Samples: {aoParams.samples}
                    </label>
                    <Slider
                      min={4}
                      max={64}
                      step={4}
                      value={aoParams.samples}
                      onChange={(value) => handleParamChange('samples', value)}
                    />
                  </div>
                </Space>
              </Panel>

              <Panel header="Advanced" key="advanced">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {/* 偏移 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Bias: {aoParams.bias.toFixed(4)}
                    </label>
                    <Slider
                      min={0}
                      max={0.1}
                      step={0.001}
                      value={aoParams.bias}
                      onChange={(value) => handleParamChange('bias', value)}
                    />
                  </div>

                  {/* 缩放 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Scale: {aoParams.scale.toFixed(2)}
                    </label>
                    <Slider
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={aoParams.scale}
                      onChange={(value) => handleParamChange('scale', value)}
                    />
                  </div>

                  {/* 厚度 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Thickness: {aoParams.thickness}
                    </label>
                    <Slider
                      min={1}
                      max={50}
                      step={1}
                      value={aoParams.thickness}
                      onChange={(value) => handleParamChange('thickness', value)}
                    />
                  </div>

                  {/* 距离衰减 */}
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: 4 }}>
                      Distance FallOff: {aoParams.distanceFallOff.toFixed(2)}
                    </label>
                    <Slider
                      min={0}
                      max={5}
                      step={0.1}
                      value={aoParams.distanceFallOff}
                      onChange={(value) => handleParamChange('distanceFallOff', value)}
                    />
                  </div>
                </Space>
              </Panel>
            </Collapse>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default AODemo;