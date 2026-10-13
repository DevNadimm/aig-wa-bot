"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

interface TemperatureSliderProps {
  defaultValue?: number;
}

export function TemperatureSlider({ defaultValue = 0.4 }: TemperatureSliderProps) {
  const [value, setValue] = useState(defaultValue);
  
  // Calculate percentage to fill the left side of the track
  const fillPercentage = value * 100;

  return (
    <div className="pt-0.5">
      <div className="flex justify-between items-end mb-2.5">
        <Label htmlFor="temperature" className="text-zinc-300 text-sm font-medium">
          Temperature <span className="text-red-500">*</span>
        </Label>
        <span className="text-zinc-300 font-mono text-xs bg-[#0c0c0e] border border-zinc-800 px-1.5 py-0.5 rounded-md leading-none h-6 flex items-center">
          {value.toFixed(1)}
        </span>
      </div>
      
      <div className="relative flex items-center">
        <input
          type="range"
          id="temperature"
          name="temperature"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110
            [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-500 [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-transform hover:[&::-moz-range-thumb]:scale-110"
          style={{
            background: `linear-gradient(to right, #6366f1 ${fillPercentage}%, #27272a ${fillPercentage}%)`
          }}
        />
      </div>
      
      <div className="flex justify-between text-[11px] text-zinc-500 font-medium mt-1.5">
        <span>Precise</span>
        <span>Creative</span>
      </div>
    </div>
  );
}
