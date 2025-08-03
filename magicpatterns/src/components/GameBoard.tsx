import React from 'react';
export const GameBoard = () => {
  // Generate a hex grid
  const renderHexGrid = () => {
    const rows = 9;
    const cols = 9;
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const hexRow = [];
      const effectiveColumns = cols - Math.floor(Math.abs(rows / 2 - r) / 2);
      for (let c = 0; c < effectiveColumns; c++) {
        // Determine hex type randomly for this demo
        const types = ['forest', 'water', 'plain', 'mountain', 'character'];
        const weights = [0.2, 0.15, 0.5, 0.1, 0.05];
        const type = weightedRandom(types, weights);
        hexRow.push(<div key={`${r}-${c}`} className={`hex ${getHexClass(type)}`} style={{
          left: `${c * 52 + (r % 2 === 0 ? 0 : 26)}px`,
          top: `${r * 45}px`
        }}>
            {type === 'character' && <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-600 overflow-hidden">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Character" className="w-full h-full object-cover" />
                </div>
              </div>}
          </div>);
      }
      grid.push(...hexRow);
    }
    return grid;
  };
  const getHexClass = type => {
    switch (type) {
      case 'forest':
        return 'bg-green-700';
      case 'water':
        return 'bg-blue-500';
      case 'mountain':
        return 'bg-gray-700';
      case 'character':
        return 'bg-yellow-200/50';
      default:
        return 'bg-yellow-200/80';
      // plain
    }
  };
  const weightedRandom = (items, weights) => {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      if (random < weights[i]) {
        return items[i];
      }
      random -= weights[i];
    }
    return items[0];
  };
  return <div className="relative w-[550px] h-[500px] mx-auto my-2">
      {renderHexGrid()}
    </div>;
};