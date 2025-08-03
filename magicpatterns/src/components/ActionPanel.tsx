import React, { useState } from 'react';
import { Swords, Undo2, Timer } from 'lucide-react';
export const ActionPanel = ({
  character,
  movement,
  actions
}) => {
  const [activeAction, setActiveAction] = useState(null);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0
  });
  const handleActionClick = actionIndex => {
    if (activeAction === actionIndex) {
      setActiveAction(null); // Toggle off if already selected
    } else {
      setActiveAction(actionIndex); // Set as active
    }
  };
  const handleActionHover = (action, e) => {
    const content = action.cost === null ? 'Basic attack with no mana cost' : `${action.name}: Uses ${action.cost} mana`;
    setTooltipContent(content);
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });
  };
  const handleActionLeave = () => {
    setTooltipContent(null);
  };
  return <div className="w-full bg-gray-900/80 backdrop-blur-sm text-white p-4 border-t-2 border-pink-500/50">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Active: <span className="text-pink-400">{character}</span>
          </h2>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="mr-2">Movement:</span>
              <span className="px-3 py-1 bg-gray-800 rounded-md">
                {movement}
              </span>
            </div>
            <div className="flex items-center bg-gray-800 px-3 py-1 rounded-md">
              <Timer className="h-4 w-4 mr-2 text-yellow-400" />
              <span className="text-yellow-400 font-bold">20s</span>
            </div>
            <button className="flex items-center px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md transition">
              <Undo2 className="h-4 w-4 mr-1" />
              <span>Undo Movement</span>
            </button>
          </div>
        </div>
        <div className="flex space-x-3">
          {actions.map((action, index) => <button key={index} className={`
                flex-1 py-2 px-4 rounded-md transition flex items-center justify-center 
                ${activeAction === index ? 'bg-pink-700 border border-pink-500' : 'bg-indigo-900/80 hover:bg-indigo-800/80 border border-indigo-700'}
              `} onClick={() => handleActionClick(index)} onMouseEnter={e => handleActionHover(action, e)} onMouseLeave={handleActionLeave}>
              {action.cost === null ? <Swords className="h-5 w-5 mr-2" /> : <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center mr-2 text-xs font-bold">
                  {action.cost}
                </div>}
              <span>{action.name}</span>
              {action.cost !== null && <span className="ml-1 text-xs text-orange-300">(Mana)</span>}
            </button>)}
        </div>
      </div>
      {/* Tooltip */}
      {tooltipContent && <div className="fixed z-50 bg-gray-900 text-white p-2 rounded shadow-lg text-sm max-w-xs" style={{
      top: tooltipPosition.y + 10,
      left: tooltipPosition.x + 10
    }}>
          {tooltipContent}
        </div>}
    </div>;
};