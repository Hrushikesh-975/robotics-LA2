import { CartesianPose, JointAngles, EndEffectorType } from '../kinematics';

export type MotionType = 'MOVJ' | 'MOVL' | 'JUMP';

export interface MotionParams {
  speed: number;       // 1 to 100 (%)
  acceleration: number;// 1 to 100 (%)
  jumpHeight?: number; // mm (for JUMP motion, e.g. 25mm)
  safeZ?: number;      // mm (optional safe travel plane)
}

export type ToolAction = 'none' | 'on' | 'off' | 'open' | 'close';

export interface TrajectoryCommand {
  id: string;
  source: 'teaching' | 'blockly' | 'script' | 'manual';
  sourceId?: string; // blockId or script line
  motionType: MotionType;
  targetPose: CartesianPose;
  targetJoints?: JointAngles;
  params: MotionParams;
  pauseDuration?: number; // ms to pause after motion finishes
  toolAction?: ToolAction;
  notes?: string;
}

export type ExecutorState = 'idle' | 'running' | 'paused' | 'stopped' | 'error';

export type CycleMode = 'once' | 'repeat' | 'infinite';

export interface ExecutorTelemetry {
  state: ExecutorState;
  activeCommandId: string | null;
  activeCommandIndex: number;
  totalCommands: number;
  progressPercent: number; // 0 - 100
  elapsedTimeMs: number;
  currentInstruction: string;
  errorMessage: string | null;
  currentCycle: number;
  totalCycles: number; // 1 for once, N for finite repeat, Infinity for infinite
  isHoldingObject: boolean;
}
