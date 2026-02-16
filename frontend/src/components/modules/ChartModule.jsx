import React from 'react';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { mockChartData } from '../../data/mockData';
import ModuleHeader from './ModuleHeader';

const ChartModule = () => {
  const maxValue = Math.max(...mockChartData.map(d => d.hodnota));

  return (
    <div className="h-full flex flex-col">
      <ModuleHeader
        icon={BarChart3}
        title="Statistiky"
        subtitle="Týdenní přehled produktivity"
      />

      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end justify-between gap-4 h-48 mb-4">
          {mockChartData.map((data, index) => (
            <div key={data.name} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-sm font-semibold text-cyan-400">{data.hodnota}%</div>
              <div
                className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg transition-all duration-500 hover:from-cyan-400 hover:to-blue-400 cursor-pointer"
                style={{
                  height: `${(data.hodnota / maxValue) * 100}%`,
                  animationDelay: `${index * 100}ms`
                }}
              />
              <div className="text-xs text-gray-400">{data.name}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-[#0a1628] rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-gray-400">Průměr</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {Math.round(mockChartData.reduce((acc, d) => acc + d.hodnota, 0) / mockChartData.length)}%
            </div>
          </div>
          <div className="p-3 bg-[#0a1628] rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-gray-400">Maximum</span>
            </div>
            <div className="text-2xl font-bold text-white">{maxValue}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartModule;
