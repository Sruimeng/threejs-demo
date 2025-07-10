import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '@ant-design/v5-patch-for-react-19';
import { Button, Slider, Space } from 'antd';
import { ModelViewer } from '../../src/componets/ModelViewer';

const models = {
  Helmet: '../assets/3bbaadad912f57a039a7d5d9da4a1fcb.glb',
  Sponza: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Sponza/glTF-Binary/Sponza.glb',
};

const App = () => {
  const [currentModel, setCurrentModel] = useState<'Helmet' | 'Sponza'>('Helmet');
  const [loadAsPoints, setLoadAsPoints] = useState(false);
  const [density, setDensity] = useState(100);
  const [reloadKey, setReloadKey] = useState(0);

  const handleDensityChange = (value: number) => {
    setDensity(value);
    // Force a re-render by updating the key
    setReloadKey(prev => prev + 1);
  };

  const handleToggleModel = () => {
    setCurrentModel(prev => prev === 'Helmet' ? 'Sponza' : 'Helmet');
  };

  const handleToggleView = () => {
    setLoadAsPoints(prev => !prev);
  };

  return (
    <React.StrictMode>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, color: 'white', width: '300px' }}>
        <Space direction="vertical">
          <Space>
            <Button type="primary" onClick={handleToggleModel}>
              Switch Model ({currentModel})
            </Button>
            <Button onClick={handleToggleView}>
              View as {loadAsPoints ? 'Model' : 'Point Cloud'}
            </Button>
          </Space>
          {loadAsPoints && (
            <div>
              <p>Point Density: {density}</p>
              <Slider
                min={10}
                max={1000}
                value={density}
                onChange={handleDensityChange}
              />
            </div>
          )}
        </Space>
      </div>
      <ModelViewer 
        key={`${currentModel}-${reloadKey}`}
        url={models[currentModel]} 
        loadAsPoints={loadAsPoints} 
        pointDensity={density} 
      />
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
