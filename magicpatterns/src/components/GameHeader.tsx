import React from 'react';
import { Crown, Clock } from 'lucide-react';
export const GameHeader = () => {
  return <div className="w-full bg-gray-900/80 backdrop-blur-sm text-white p-3 border-b-2 border-pink-500/50">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">Turn 4</span>
        </div>
        <div className="flex-1 mx-4">
          <div className="flex justify-center items-center">
            <p className="text-lg font-semibold mr-3">Turn Queue</p>
            <div className="flex space-x-1">
              {/* Active character highlighted */}
              <div className="w-12 h-12 rounded-full border-2 border-yellow-400 p-0.5 bg-blue-600">
                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Da Vinci-chan" className="w-full h-full rounded-full object-cover" />
              </div>
              {/* Upcoming characters in queue */}
              {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-10 h-10 rounded-full border p-0.5 ${i % 2 === 0 ? 'bg-blue-600 border-blue-300' : 'bg-red-600 border-red-300'} opacity-${100 - i * 10}`}>
                  <img src={`https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${40 + i}.jpg`} alt={`Character ${i}`} className="w-full h-full rounded-full object-cover" />
                </div>)}
            </div>
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center px-3 py-1 rounded-lg bg-blue-500/30 border border-blue-300">
            <Crown className="h-5 w-5 text-blue-200 mr-2" />
            <span className="font-semibold text-blue-100">Mana Crystal</span>
            <span className="ml-2 text-gray-200">Neutral</span>
          </div>
          <div className="flex items-center px-3 py-1 rounded-lg bg-red-500/30 border border-red-300">
            <Crown className="h-5 w-5 text-red-200 mr-2" />
            <span className="font-semibold text-red-100">Beast Camps</span>
            <span className="ml-2 text-gray-200">0/2 Cleared</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition shadow-lg shadow-red-600/30">
          End Turn
        </button>
      </div>
    </div>;
};