"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
  Loader2,
  MapPinOff,
} from "lucide-react";
import { motion } from "framer-motion";

interface WeatherData {
  temperature: number;
  weathercode: number;
}

const WMO_CODES: Record<
  number,
  { label: string; Icon: any; color: string; bgGradient: string; bgOrb: string }
> = {
  0: {
    label: "Clear sky",
    Icon: Sun,
    color: "text-amber-500",
    bgGradient: "from-amber-500/15",
    bgOrb: "bg-amber-500/20",
  },
  1: {
    label: "Mainly clear",
    Icon: Sun,
    color: "text-amber-500",
    bgGradient: "from-amber-500/15",
    bgOrb: "bg-amber-500/20",
  },
  2: {
    label: "Partly cloudy",
    Icon: Cloud,
    color: "text-slate-300",
    bgGradient: "from-slate-400/10",
    bgOrb: "bg-slate-400/20",
  },
  3: {
    label: "Overcast",
    Icon: Cloud,
    color: "text-slate-400",
    bgGradient: "from-slate-500/15",
    bgOrb: "bg-slate-500/20",
  },
  45: {
    label: "Fog",
    Icon: CloudFog,
    color: "text-slate-400",
    bgGradient: "from-slate-500/15",
    bgOrb: "bg-slate-500/20",
  },
  48: {
    label: "Depositing rime fog",
    Icon: CloudFog,
    color: "text-slate-400",
    bgGradient: "from-slate-500/15",
    bgOrb: "bg-slate-500/20",
  },
  51: {
    label: "Light drizzle",
    Icon: CloudRain,
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/15",
    bgOrb: "bg-cyan-500/20",
  },
  53: {
    label: "Moderate drizzle",
    Icon: CloudRain,
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/15",
    bgOrb: "bg-cyan-500/20",
  },
  55: {
    label: "Dense drizzle",
    Icon: CloudRain,
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/15",
    bgOrb: "bg-cyan-500/20",
  },
  56: {
    label: "Light freezing drizzle",
    Icon: CloudRain,
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/15",
    bgOrb: "bg-cyan-500/20",
  },
  57: {
    label: "Dense freezing drizzle",
    Icon: CloudRain,
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/15",
    bgOrb: "bg-cyan-500/20",
  },
  61: {
    label: "Slight rain",
    Icon: CloudRain,
    color: "text-blue-400",
    bgGradient: "from-blue-500/15",
    bgOrb: "bg-blue-500/20",
  },
  63: {
    label: "Moderate rain",
    Icon: CloudRain,
    color: "text-blue-400",
    bgGradient: "from-blue-500/15",
    bgOrb: "bg-blue-500/20",
  },
  65: {
    label: "Heavy rain",
    Icon: CloudRain,
    color: "text-blue-500",
    bgGradient: "from-blue-600/15",
    bgOrb: "bg-blue-600/20",
  },
  66: {
    label: "Light freezing rain",
    Icon: CloudRain,
    color: "text-blue-400",
    bgGradient: "from-blue-500/15",
    bgOrb: "bg-blue-500/20",
  },
  67: {
    label: "Heavy freezing rain",
    Icon: CloudRain,
    color: "text-blue-500",
    bgGradient: "from-blue-600/15",
    bgOrb: "bg-blue-600/20",
  },
  71: {
    label: "Slight snow fall",
    Icon: Snowflake,
    color: "text-white",
    bgGradient: "from-blue-300/15",
    bgOrb: "bg-blue-300/20",
  },
  73: {
    label: "Moderate snow fall",
    Icon: Snowflake,
    color: "text-white",
    bgGradient: "from-blue-300/15",
    bgOrb: "bg-blue-300/20",
  },
  75: {
    label: "Heavy snow fall",
    Icon: Snowflake,
    color: "text-white",
    bgGradient: "from-blue-300/15",
    bgOrb: "bg-blue-300/20",
  },
  77: {
    label: "Snow grains",
    Icon: Snowflake,
    color: "text-white",
    bgGradient: "from-blue-300/15",
    bgOrb: "bg-blue-300/20",
  },
  80: {
    label: "Slight rain showers",
    Icon: CloudRain,
    color: "text-blue-400",
    bgGradient: "from-blue-500/15",
    bgOrb: "bg-blue-500/20",
  },
  81: {
    label: "Moderate rain showers",
    Icon: CloudRain,
    color: "text-blue-400",
    bgGradient: "from-blue-500/15",
    bgOrb: "bg-blue-500/20",
  },
  82: {
    label: "Violent rain showers",
    Icon: CloudRain,
    color: "text-blue-500",
    bgGradient: "from-blue-600/15",
    bgOrb: "bg-blue-600/20",
  },
  85: {
    label: "Slight snow showers",
    Icon: Snowflake,
    color: "text-white",
    bgGradient: "from-blue-300/15",
    bgOrb: "bg-blue-300/20",
  },
  86: {
    label: "Heavy snow showers",
    Icon: Snowflake,
    color: "text-white",
    bgGradient: "from-blue-300/15",
    bgOrb: "bg-blue-300/20",
  },
  95: {
    label: "Thunderstorm",
    Icon: CloudLightning,
    color: "text-purple-400",
    bgGradient: "from-purple-500/15",
    bgOrb: "bg-purple-500/20",
  },
  96: {
    label: "Thunderstorm with slight hail",
    Icon: CloudLightning,
    color: "text-purple-400",
    bgGradient: "from-purple-500/15",
    bgOrb: "bg-purple-500/20",
  },
  99: {
    label: "Thunderstorm with heavy hail",
    Icon: CloudLightning,
    color: "text-purple-500",
    bgGradient: "from-purple-600/15",
    bgOrb: "bg-purple-600/20",
  },
};

const AmbientWeather = ({ code }: { code: number }) => {
  const isCloudy = (code >= 2 && code <= 3) || (code >= 45 && code <= 48);
  const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
  const isStorm = code >= 95 && code <= 99;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 rounded-2xl">
      {/* CLOUDS: Floating blurred shapes */}
      {(isCloudy || isStorm) && (
        <>
          <motion.div
            animate={{ x: ["-50%", "250%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-2 -left-1/4 w-32 h-12 bg-white/10 blur-2xl rounded-full"
          />
          <motion.div
            animate={{ x: ["-50%", "250%"] }}
            transition={{
              duration: 40,
              repeat: Infinity,
              ease: "linear",
              delay: 10,
            }}
            className="absolute top-8 -left-1/4 w-48 h-16 bg-white/5 blur-3xl rounded-full"
          />
        </>
      )}

      {/* RAIN: Fast falling lines */}
      {isRain && (
        <div className="absolute inset-0 flex justify-around opacity-40">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`rain-${i}`}
              animate={{ y: ["-100%", "200%"] }}
              transition={{
                duration: 0.8 + Math.random() * 0.5,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random(),
              }}
              className="w-px h-8 bg-cyan-200/50 rounded-full"
            />
          ))}
        </div>
      )}

      {/* SNOW: Slow drifting dots */}
      {isSnow && (
        <div className="absolute inset-0 flex justify-around opacity-60">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`snow-${i}`}
              animate={{
                y: ["-20%", "120%"],
                x: [0, (Math.random() - 0.5) * 40, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
              className="w-1.5 h-1.5 bg-white/80 blur-[1px] rounded-full"
            />
          ))}
        </div>
      )}

      {/* STORM: Lightning flashes */}
      {isStorm && (
        <motion.div
          animate={{ opacity: [0, 0, 0, 0.6, 0, 0, 0.4, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute inset-0 bg-white/20 mix-blend-overlay"
        />
      )}
    </div>
  );
};

const WeatherWidget = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`,
        );
        if (!res.ok) throw new Error("Failed to fetch weather");
        const json = await res.json();
        setData({
          temperature: Math.round(json.current_weather.temperature),
          weathercode: json.current_weather.weathercode,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          // Fallback to Toronto if permission denied or error
          console.warn(
            "Geolocation error, using default location (Toronto)",
            err,
          );
          fetchWeather(43.6532, -79.3832);
        },
        { timeout: 10000 },
      );
    } else {
      // Fallback
      fetchWeather(43.6532, -79.3832);
    }
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4 space-y-2 col-span-2 md:col-span-1">
        <div className="flex items-center gap-2 text-amber-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">
            Weather
          </span>
        </div>
        <p className="text-xl font-semibold text-foreground">--</p>
        <p className="text-[11px] text-muted-foreground">Locating...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-4 space-y-2 col-span-2 md:col-span-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPinOff className="w-5 h-5" />
          <span className="text-xs font-mono">Weather</span>
        </div>
        <p className="text-xl font-semibold text-foreground">--</p>
        <p className="text-[11px] text-muted-foreground">Unavailable</p>
      </div>
    );
  }

  const codeData = WMO_CODES[data.weathercode] || {
    label: "Unknown",
    Icon: Sun,
    color: "text-amber-500",
    bgGradient: "from-transparent",
    bgOrb: "bg-transparent",
  };
  const WeatherIcon = codeData.Icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      className="glass-card relative overflow-hidden group col-span-2 md:col-span-1"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${codeData.bgOrb}`}
      />

      {/* Live Window Weather Overlay */}
      <AmbientWeather code={data.weathercode} />

      <div
        className={`relative z-10 p-4 space-y-2 flex flex-col justify-center h-full`}
      >
        <div className="flex items-center justify-between md:justify-start gap-2">
          <div className={`flex items-center gap-2 ${codeData.color}`}>
            <WeatherIcon className="w-5 h-5" />
            <span className="text-xs font-mono text-muted-foreground md:inline">
              Weather
            </span>
          </div>
        </div>
        <div className="flex items-end justify-between md:flex-col md:items-start md:space-y-0.5">
          <p className="text-2xl md:text-xl font-semibold text-foreground">
            {data.temperature}°C
          </p>
          <p className="text-xs md:text-[11px] text-muted-foreground truncate">
            {codeData.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherWidget;
