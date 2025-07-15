import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import AODemo from './ao-demo';

// 配置模型列表 - 使用在线模型作为后备
const MODELS = {
  'Duck': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
  'Box': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
  'Sphere': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Sphere/glTF-Binary/Sphere.glb',
  'BoomBox': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb',
  'DamagedHelmet': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
};

// 创建根元素
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// 渲染应用
root.render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: 'rgba(0, 0, 0, 0.85)',
          colorText: 'white',
          colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
          colorBorder: '#434343',
          colorFillSecondary: 'rgba(255, 255, 255, 0.08)',
        },
        components: {
          Slider: {
            handleColor: '#1890ff',
            trackBg: '#1890ff',
            railBg: '#262626',
          },
          Select: {
            colorBgContainer: '#141414',
            colorText: 'white',
            colorBorder: '#434343',
          },
          Collapse: {
            colorText: 'white',
            colorTextHeading: 'white',
            colorBorder: '#434343',
            colorBgContainer: 'transparent',
            headerBg: 'transparent',
          },
        },
      }}
    >
      <AODemo models={MODELS} defaultModel="Duck" />
    </ConfigProvider>
  </React.StrictMode>
);