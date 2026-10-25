import {
  CartesianPose,
  JointAngles,
  forwardKinematics,
  inverseKinematics,
  areJointsWithinLimits,
  ROBOT_DIMENSIONS,
  ROBOT_LIMITS,
} from '../kinematics';
import {
  TrajectoryCommand,
  ExecutorState,
  ExecutorTelemetry,
  MotionType,
  CycleMode,
} from './types';

export interface TrajectoryWaypoint {
  pose: CartesianPose;
  joints: JointAngles;
  durationMs: number;
  toolAction?: 'none' | 'on' | 'off' | 'open' | 'close';
  pauseMs?: number;
  commandId: string;
  commandIndex: number;
  label: string;
}

/**
 * Decomposes high-level commands (MOVJ, MOVL, JUMP) into executable waypoints.
 * For JUMP motion, generates a 3-stage trajectory:
 * 1. Retract vertically to (startX, startY, safeZ)
 * 2. Rapid linear transfer to (targetX, targetY, safeZ)
 * 3. Descend vertically to (targetX, targetY, targetZ)
 */
export function planCommandWaypoints(
  startPose: CartesianPose,
  commands: TrajectoryCommand[]
): TrajectoryWaypoint[] {
  const waypoints: TrajectoryWaypoint[] = [];
  let currentPose = { ...startPose };

  commands.forEach((cmd, cmdIdx) => {
    const target = cmd.targetPose;
    const speedScale = Math.max(0.1, Math.min(2.0, (cmd.params.speed || 50) / 50));

    if (cmd.motionType === 'JUMP') {
      const jumpHeight = cmd.params.jumpHeight ?? 25;
      const safeZStart = Math.max(currentPose.z + jumpHeight, target.z + jumpHeight);

      // Stage 1: Lift
      const liftPose: CartesianPose = {
        x: currentPose.x,
        y: currentPose.y,
        z: safeZStart,
        r: currentPose.r,
      };
      const liftJoints = inverseKinematics(liftPose.x, liftPose.y, liftPose.z, liftPose.r);
      if (liftJoints) {
        const liftDist = Math.abs(safeZStart - currentPose.z);
        const duration = Math.max(180, (liftDist / (120 * speedScale)) * 1000);
        waypoints.push({
          pose: liftPose,
          joints: liftJoints,
          durationMs: duration,
          commandId: cmd.id,
          commandIndex: cmdIdx,
          label: `${cmd.notes || 'JUMP'} [Lift]`,
        });
        currentPose = liftPose;
      }

      // Stage 2: Transfer across horizontally at safeZ
      const transferPose: CartesianPose = {
        x: target.x,
        y: target.y,
        z: safeZStart,
        r: target.r,
      };
      const transferJoints = inverseKinematics(transferPose.x, transferPose.y, transferPose.z, transferPose.r);
      if (transferJoints) {
        const horizDist = Math.hypot(target.x - currentPose.x, target.y - currentPose.y);
        const duration = Math.max(220, (horizDist / (150 * speedScale)) * 1000);
        waypoints.push({
          pose: transferPose,
          joints: transferJoints,
          durationMs: duration,
          commandId: cmd.id,
          commandIndex: cmdIdx,
          label: `${cmd.notes || 'JUMP'} [Transfer]`,
        });
        currentPose = transferPose;
      }

      // Stage 3: Descend to target position & trigger tool action
      const targetJoints = inverseKinematics(target.x, target.y, target.z, target.r);
      if (targetJoints) {
        const dropDist = Math.abs(currentPose.z - target.z);
        const duration = Math.max(180, (dropDist / (120 * speedScale)) * 1000);
        waypoints.push({
          pose: target,
          joints: targetJoints,
          durationMs: duration,
          toolAction: cmd.toolAction,
          pauseMs: cmd.pauseDuration,
          commandId: cmd.id,
          commandIndex: cmdIdx,
          label: `${cmd.notes || 'JUMP'} [Target]`,
        });
        currentPose = target;
      }
    } else {
      // Point-to-Point (MOVJ) or Linear (MOVL)
      const targetJoints =
        cmd.targetJoints || inverseKinematics(target.x, target.y, target.z, target.r);

      if (targetJoints) {
        const dist = Math.hypot(
          target.x - currentPose.x,
          target.y - currentPose.y,
          target.z - currentPose.z
        );
        const duration = Math.max(250, (dist / (130 * speedScale)) * 1000);

        waypoints.push({
          pose: target,
          joints: targetJoints,
          durationMs: duration,
          toolAction: cmd.toolAction,
          pauseMs: cmd.pauseDuration,
          commandId: cmd.id,
          commandIndex: cmdIdx,
          label: cmd.notes || `${cmd.motionType} -> (${target.x.toFixed(0)}, ${target.y.toFixed(0)}, ${target.z.toFixed(0)})`,
        });
        currentPose = target;
      }
    }
  });

  return waypoints;
}

export class SimulationExecutor {
  private waypoints: TrajectoryWaypoint[] = [];
  private originalCommands: TrajectoryCommand[] = [];
  private currentWaypointIdx: number = -1;
  private state: ExecutorState = 'idle';
  private startTime: number = 0;
  private waypointStartTime: number = 0;
  private pauseTime: number = 0;
  private settleUntil: number = 0;
  private startPose: CartesianPose | null = null;
  private rafId: number | null = null;
  private errorMessage: string | null = null;

  // Repeat cycle control
  private cycleMode: CycleMode = 'once';
  private targetRepeatCount: number = 1;
  private currentCycle: number = 1;
  private autoResetObjectsOnCycle: boolean = false;

  private onPoseUpdate: (pose: CartesianPose, joints: JointAngles) => void;
  private onToolAction: (action: 'none' | 'on' | 'off' | 'open' | 'close') => void;
  private onTelemetryUpdate: (telemetry: ExecutorTelemetry) => void;
  private onCycleComplete?: (completedCycle: number) => void;
  private onCycleResetRequest?: () => void;
  private getHoldingState?: () => boolean;

  constructor(
    onPoseUpdate: (pose: CartesianPose, joints: JointAngles) => void,
    onToolAction: (action: 'none' | 'on' | 'off' | 'open' | 'close') => void,
    onTelemetryUpdate: (telemetry: ExecutorTelemetry) => void,
    options?: {
      onCycleComplete?: (completedCycle: number) => void;
      onCycleResetRequest?: () => void;
      getHoldingState?: () => boolean;
    }
  ) {
    this.onPoseUpdate = onPoseUpdate;
    this.onToolAction = onToolAction;
    this.onTelemetryUpdate = onTelemetryUpdate;
    this.onCycleComplete = options?.onCycleComplete;
    this.onCycleResetRequest = options?.onCycleResetRequest;
    this.getHoldingState = options?.getHoldingState;
  }

  public setCycleOptions(options: {
    mode: CycleMode;
    repeatCount: number;
    autoResetObjects: boolean;
  }): void {
    this.cycleMode = options.mode;
    this.targetRepeatCount = options.repeatCount;
    this.autoResetObjectsOnCycle = options.autoResetObjects;
    this.emitTelemetry();
  }

  public loadProgram(startPose: CartesianPose, commands: TrajectoryCommand[]): boolean {
    this.stop();
    this.originalCommands = [...commands];
    this.waypoints = planCommandWaypoints(startPose, commands);
    this.currentWaypointIdx = 0;
    this.currentCycle = 1;
    this.errorMessage = null;
    this.emitTelemetry();
    return this.waypoints.length > 0;
  }

  public start(currentPose: CartesianPose, currentJoints: JointAngles): void {
    if (this.waypoints.length === 0) return;
    if (this.state === 'running') return;

    this.state = 'running';
    this.startPose = { ...currentPose };
    const now = performance.now();
    this.startTime = now;
    this.waypointStartTime = now;
    this.settleUntil = 0;
    this.loop(now);
  }

  public pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.pauseTime = performance.now();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.emitTelemetry();
  }

  public resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    const now = performance.now();
    const pausedDelta = now - this.pauseTime;
    this.waypointStartTime += pausedDelta;
    if (this.settleUntil > 0) {
      this.settleUntil += pausedDelta;
    }
    this.loop(now);
  }

  public stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.state = 'stopped';
    this.currentWaypointIdx = -1;
    this.emitTelemetry();
  }

  public reset(): void {
    this.stop();
    this.waypoints = [];
    this.originalCommands = [];
    this.state = 'idle';
    this.currentCycle = 1;
    this.errorMessage = null;
    this.emitTelemetry();
  }

  private loop = (now: number): void => {
    if (this.state !== 'running') return;

    if (this.currentWaypointIdx >= this.waypoints.length) {
      // Completed current trajectory list
      this.handleCycleEnd(now);
      return;
    }

    // Handle wait/pause delays between points
    if (now < this.settleUntil) {
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    const currentWp = this.waypoints[this.currentWaypointIdx];
    const elapsed = now - this.waypointStartTime;
    const t = Math.min(1, Math.max(0, elapsed / currentWp.durationMs));

    // Cosine S-curve ease in-out interpolation
    const easeT = 0.5 - 0.5 * Math.cos(Math.PI * t);

    const sP = this.startPose!;
    const eP = currentWp.pose;

    const interpPose: CartesianPose = {
      x: sP.x + (eP.x - sP.x) * easeT,
      y: sP.y + (eP.y - sP.y) * easeT,
      z: sP.z + (eP.z - sP.z) * easeT,
      r: sP.r + (eP.r - sP.r) * easeT,
    };

    const solvedJoints = inverseKinematics(
      interpPose.x,
      interpPose.y,
      interpPose.z,
      interpPose.r
    );

    if (solvedJoints && areJointsWithinLimits(solvedJoints)) {
      this.onPoseUpdate(interpPose, solvedJoints);
    } else {
      this.state = 'error';
      this.errorMessage = `Trajectory violated joint boundaries at point ${this.currentWaypointIdx + 1}`;
      this.emitTelemetry();
      return;
    }

    if (t >= 1) {
      // Finished current waypoint
      if (currentWp.toolAction && currentWp.toolAction !== 'none') {
        this.onToolAction(currentWp.toolAction);
      }

      const pauseTime = currentWp.pauseMs || 0;
      this.settleUntil = now + pauseTime;

      this.currentWaypointIdx++;
      if (this.currentWaypointIdx < this.waypoints.length) {
        this.startPose = { ...currentWp.pose };
        this.waypointStartTime = now + pauseTime;
      } else {
        this.handleCycleEnd(now);
        return;
      }
    }

    this.emitTelemetry();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private handleCycleEnd(now: number): void {
    if (this.onCycleComplete) {
      this.onCycleComplete(this.currentCycle);
    }

    const shouldRepeat =
      this.cycleMode === 'infinite' ||
      (this.cycleMode === 'repeat' && this.currentCycle < this.targetRepeatCount);

    if (shouldRepeat && this.state === 'running') {
      this.currentCycle++;

      // If auto-reset objects option is enabled, reset scene workpieces
      if (this.autoResetObjectsOnCycle && this.onCycleResetRequest) {
        this.onCycleResetRequest();
      }

      // Re-plan waypoints from current pose and restart program
      const lastWp = this.waypoints[this.waypoints.length - 1];
      const startP = lastWp ? lastWp.pose : this.startPose!;
      this.waypoints = planCommandWaypoints(startP, this.originalCommands);
      this.currentWaypointIdx = 0;
      this.startPose = { ...startP };
      this.waypointStartTime = now + 400; // 400ms inter-cycle pause
      this.settleUntil = now + 400;
      this.emitTelemetry();
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      // Completed all repetitions
      this.state = 'idle';
      this.emitTelemetry();
    }
  }

  private emitTelemetry(): void {
    const total = this.waypoints.length;
    const currentIdx = Math.max(0, Math.min(total, this.currentWaypointIdx));
    const activeWp = this.waypoints[currentIdx];

    const totalCyclesNum =
      this.cycleMode === 'infinite'
        ? Infinity
        : this.cycleMode === 'repeat'
        ? this.targetRepeatCount
        : 1;

    const telemetry: ExecutorTelemetry = {
      state: this.state,
      activeCommandId: activeWp ? activeWp.commandId : null,
      activeCommandIndex: activeWp ? activeWp.commandIndex : -1,
      totalCommands: total,
      progressPercent: total > 0 ? Math.round((currentIdx / total) * 100) : 0,
      elapsedTimeMs: this.startTime > 0 ? Math.round(performance.now() - this.startTime) : 0,
      currentInstruction: activeWp ? activeWp.label : 'Idle - Ready',
      errorMessage: this.errorMessage,
      currentCycle: this.currentCycle,
      totalCycles: totalCyclesNum,
      isHoldingObject: this.getHoldingState ? this.getHoldingState() : false,
    };

    this.onTelemetryUpdate(telemetry);
  }
}
