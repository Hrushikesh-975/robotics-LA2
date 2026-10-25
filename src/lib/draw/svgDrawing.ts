import { CartesianPose } from '../kinematics';
import { TrajectoryCommand } from '../simulation/types';

export interface DrawPathPoint {
  x: number; // mm
  y: number; // mm
  penDown: boolean;
}

export interface DrawConfig {
  originX: number; // Table X offset for drawing center (e.g. 240mm)
  originY: number; // Table Y offset for drawing center (e.g. 0mm)
  scale: number;   // mm per SVG unit
  penUpZ: number;  // mm (safe transit height)
  penDownZ: number;// mm (paper contact height)
  speed: number;   // 1 to 100
}

export const DEFAULT_DRAW_CONFIG: DrawConfig = {
  originX: 240,
  originY: 0,
  scale: 0.5,
  penUpZ: 25,
  penDownZ: 10,
  speed: 40,
};

/**
 * Extracts polylines from simple SVG path string or line/rect primitives
 */
export function parseSvgToDrawingPoints(svgContent: string, config: DrawConfig = DEFAULT_DRAW_CONFIG): DrawPathPoint[] {
  const points: DrawPathPoint[] = [];

  // Parse path 'd' attributes
  const pathRegex = /d\s*=\s*["']([^"']+)["']/g;
  let match;

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const d = match[1];
    const commands = d.match(/([a-zA-Z])|([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g);
    if (!commands) continue;

    let cursorX = 0;
    let cursorY = 0;
    let currentCmd = '';
    let isPenDown = false;

    let i = 0;
    while (i < commands.length) {
      const token = commands[i];
      if (/^[a-zA-Z]$/.test(token)) {
        currentCmd = token;
        i++;
      }

      if (currentCmd === 'M' || currentCmd === 'm') {
        const x = parseFloat(commands[i++]);
        const y = parseFloat(commands[i++]);
        cursorX = currentCmd === 'M' ? x : cursorX + x;
        cursorY = currentCmd === 'M' ? y : cursorY + y;
        isPenDown = false;

        // Map to robot coordinate plane
        const rx = config.originX + (cursorX - 50) * config.scale;
        const ry = config.originY + (cursorY - 50) * config.scale;
        points.push({ x: rx, y: ry, penDown: false });
        currentCmd = currentCmd === 'M' ? 'L' : 'l'; // Subsequent pairs are implicit lines
      } else if (currentCmd === 'L' || currentCmd === 'l') {
        const x = parseFloat(commands[i++]);
        const y = parseFloat(commands[i++]);
        cursorX = currentCmd === 'L' ? x : cursorX + x;
        cursorY = currentCmd === 'L' ? y : cursorY + y;
        isPenDown = true;

        const rx = config.originX + (cursorX - 50) * config.scale;
        const ry = config.originY + (cursorY - 50) * config.scale;
        points.push({ x: rx, y: ry, penDown: true });
      } else if (currentCmd === 'Z' || currentCmd === 'z') {
        isPenDown = false;
      } else {
        i++; // Skip unsupported SVG curve commands for now or advance
      }
    }
  }

  return points;
}

/**
 * Compiles drawing waypoints into simulation TrajectoryCommands
 */
export function compileDrawingToCommands(
  points: DrawPathPoint[],
  config: DrawConfig = DEFAULT_DRAW_CONFIG
): TrajectoryCommand[] {
  const commands: TrajectoryCommand[] = [];

  points.forEach((pt, idx) => {
    const targetZ = pt.penDown ? config.penDownZ : config.penUpZ;
    const pose: CartesianPose = {
      x: pt.x,
      y: pt.y,
      z: targetZ,
      r: 0,
    };

    commands.push({
      id: `draw-cmd-${idx}`,
      source: 'manual',
      sourceId: `pt-${idx}`,
      motionType: pt.penDown ? 'MOVL' : 'MOVJ',
      targetPose: pose,
      params: {
        speed: config.speed,
        acceleration: 40,
      },
      notes: pt.penDown ? `Draw Line -> (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})` : `Transit -> (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`,
    });
  });

  return commands;
}
