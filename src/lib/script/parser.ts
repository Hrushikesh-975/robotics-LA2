import { CartesianPose, JointAngles } from '../kinematics';
import { TrajectoryCommand } from '../simulation/types';

export interface ScriptParseResult {
  success: boolean;
  commands: TrajectoryCommand[];
  errors: { line: number; message: string }[];
}

/**
 * Dobot Script DSL parser:
 *
 * Supported Commands:
 *  SPEED <1-100>
 *  MOVJ X <val> Y <val> Z <val> [R <val>]
 *  MOVL X <val> Y <val> Z <val> [R <val>]
 *  JUMP X <val> Y <val> Z <val> [R <val>] [H <height>]
 *  SUCTION ON | OFF
 *  GRIPPER OPEN | CLOSE
 *  WAIT <ms>
 *  // Comments
 */
export function parseDobotScript(script: string, initialPose: CartesianPose): ScriptParseResult {
  const lines = script.split('\n');
  const commands: TrajectoryCommand[] = [];
  const errors: { line: number; message: string }[] = [];

  let currentSpeed = 50;
  let currentAccel = 50;
  let currentPose = { ...initialPose };

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return; // Comment or blank
    }

    const tokens = trimmed.split(/\s+/);
    const verb = tokens[0].toUpperCase();

    try {
      switch (verb) {
        case 'SPEED': {
          const s = parseInt(tokens[1], 10);
          if (isNaN(s) || s < 1 || s > 100) {
            errors.push({ line: lineNum, message: 'SPEED requires integer between 1 and 100' });
          } else {
            currentSpeed = s;
          }
          break;
        }

        case 'MOVJ':
        case 'MOVL':
        case 'JUMP': {
          let x = currentPose.x;
          let y = currentPose.y;
          let z = currentPose.z;
          let r = currentPose.r;
          let h = 25;

          for (let i = 1; i < tokens.length; i += 2) {
            const axis = tokens[i]?.toUpperCase();
            const val = parseFloat(tokens[i + 1]);
            if (isNaN(val)) {
              errors.push({ line: lineNum, message: `Invalid numeric value for parameter ${axis}` });
              return;
            }
            if (axis === 'X') x = val;
            else if (axis === 'Y') y = val;
            else if (axis === 'Z') z = val;
            else if (axis === 'R') r = val;
            else if (axis === 'H') h = val;
          }

          const target: CartesianPose = { x, y, z, r };
          const motionType = verb as 'MOVJ' | 'MOVL' | 'JUMP';

          commands.push({
            id: `script-cmd-${lineNum}`,
            source: 'script',
            sourceId: `line-${lineNum}`,
            motionType,
            targetPose: target,
            params: {
              speed: currentSpeed,
              acceleration: currentAccel,
              jumpHeight: h,
            },
            notes: `Line ${lineNum}: ${trimmed}`,
          });

          currentPose = target;
          break;
        }

        case 'SUCTION': {
          const state = tokens[1]?.toUpperCase();
          if (state !== 'ON' && state !== 'OFF') {
            errors.push({ line: lineNum, message: 'SUCTION parameter must be ON or OFF' });
          } else {
            commands.push({
              id: `script-cmd-${lineNum}`,
              source: 'script',
              sourceId: `line-${lineNum}`,
              motionType: 'MOVJ',
              targetPose: { ...currentPose },
              params: { speed: currentSpeed, acceleration: currentAccel },
              toolAction: state === 'ON' ? 'on' : 'off',
              pauseDuration: state === 'ON' ? 350 : 250,
              notes: `Line ${lineNum}: SUCTION ${state}`,
            });
          }
          break;
        }

        case 'GRIPPER': {
          const state = tokens[1]?.toUpperCase();
          if (state !== 'OPEN' && state !== 'CLOSE') {
            errors.push({ line: lineNum, message: 'GRIPPER parameter must be OPEN or CLOSE' });
          } else {
            commands.push({
              id: `script-cmd-${lineNum}`,
              source: 'script',
              sourceId: `line-${lineNum}`,
              motionType: 'MOVJ',
              targetPose: { ...currentPose },
              params: { speed: currentSpeed, acceleration: currentAccel },
              toolAction: state === 'OPEN' ? 'open' : 'close',
              pauseDuration: 300,
              notes: `Line ${lineNum}: GRIPPER ${state}`,
            });
          }
          break;
        }

        case 'WAIT': {
          const ms = parseInt(tokens[1], 10);
          if (isNaN(ms) || ms < 0) {
            errors.push({ line: lineNum, message: 'WAIT requires positive integer milliseconds' });
          } else {
            commands.push({
              id: `script-cmd-${lineNum}`,
              source: 'script',
              sourceId: `line-${lineNum}`,
              motionType: 'MOVJ',
              targetPose: { ...currentPose },
              params: { speed: currentSpeed, acceleration: currentAccel },
              pauseDuration: ms,
              notes: `Line ${lineNum}: WAIT ${ms}ms`,
            });
          }
          break;
        }

        default:
          errors.push({ line: lineNum, message: `Unknown command '${verb}'` });
      }
    } catch (err: any) {
      errors.push({ line: lineNum, message: err.message || 'Syntax error' });
    }
  });

  return {
    success: errors.length === 0,
    commands,
    errors,
  };
}
