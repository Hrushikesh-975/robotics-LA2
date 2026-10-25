import { create } from 'zustand';
import {
  CartesianPose,
  JointAngles,
  forwardKinematics,
  inverseKinematics,
  HOME_JOINTS,
  areJointsWithinLimits,
  ROBOT_LIMITS,
  EndEffectorType,
  getDimensionsForTool,
  validateCartesianTarget,
} from '../kinematics';
import { PlacedObjectInstance, OBJECT_REGISTRY } from '../objects/types';
import {
  TrajectoryCommand,
  ExecutorTelemetry,
  MotionType,
  CycleMode,
} from '../simulation/types';
import { SimulationExecutor } from '../simulation/executor';
import { BlocklyProgramBlock, compileBlocklyToCommands } from '../blockly/compiler';
import { parseDobotScript } from '../script/parser';
import {
  DrawConfig,
  DEFAULT_DRAW_CONFIG,
  parseSvgToDrawingPoints,
  compileDrawingToCommands,
} from '../draw/svgDrawing';
import { validateSuctionPickup, calculateObjectDropZ } from '../objects/grasping';

export interface TeachingPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  r: number;
  motionType: MotionType;
  speed: number;
  pauseMs: number;
  toolAction: 'none' | 'on' | 'off' | 'open' | 'close';
}

export type TabType =
  | 'operation'
  | 'teaching'
  | 'blockly'
  | 'script'
  | 'objects'
  | 'draw'
  | 'diagnostics'
  | 'settings';

export interface DobotState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Robot State
  joints: JointAngles;
  cartesian: CartesianPose;
  speed: number; // 1 to 100 (%)
  setSpeed: (speed: number) => void;
  isEmergencyStopped: boolean;
  setEmergencyStopped: (stopped: boolean) => void;
  endEffectorType: EndEffectorType;
  setEndEffectorType: (type: EndEffectorType) => void;
  endEffectorActive: boolean;
  setEndEffectorActive: (active: boolean) => void;
  gripperState: 'open' | 'closed';
  setGripperState: (state: 'open' | 'closed') => void;

  // Cycle Repeat Configuration
  cycleMode: CycleMode;
  setCycleMode: (mode: CycleMode) => void;
  repeatCount: number;
  setRepeatCount: (count: number) => void;
  autoResetObjectsOnCycle: boolean;
  setAutoResetObjectsOnCycle: (enabled: boolean) => void;

  // Warning & Feedback
  jogWarning: string | null;
  setJogWarning: (warning: string | null) => void;
  statusNotification: string | null;
  setStatusNotification: (msg: string | null) => void;

  // Visualization
  showReachDome: boolean;
  setShowReachDome: (show: boolean) => void;
  showTrajectory: boolean;
  setShowTrajectory: (show: boolean) => void;
  trajectoryPoints: [number, number, number][];
  addTrajectoryPoint: (pt: [number, number, number]) => void;
  clearTrajectory: () => void;

  // Jogging Actions
  jogJoint: (joint: keyof JointAngles, delta: number) => boolean;
  jogCartesian: (axis: keyof CartesianPose, delta: number) => boolean;
  moveToPose: (target: CartesianPose) => boolean;
  setJointsDirect: (joints: JointAngles) => void;
  homeRobot: () => void;

  // Object Placement & Grasping
  objects: PlacedObjectInstance[];
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  ghostPlacementType: string | null;
  setGhostPlacementType: (type: string | null) => void;
  ghostPosition: [number, number, number] | null;
  ghostValid: boolean;
  ghostError: string | null;
  setGhostState: (pos: [number, number, number] | null, valid: boolean, error: string | null) => void;
  confirmGhostPlacement: () => boolean;
  cancelGhostPlacement: () => void;
  deleteObject: (id: string) => void;
  resetObjects: () => void;
  updateObjectPosition: (id: string, pos: [number, number, number]) => void;

  // Teaching Points
  teachingPoints: TeachingPoint[];
  addTeachingPoint: (pt: Omit<TeachingPoint, 'id'>) => void;
  updateTeachingPoint: (id: string, pt: Partial<TeachingPoint>) => void;
  deleteTeachingPoint: (id: string) => void;
  reorderTeachingPoints: (fromIndex: number, toIndex: number) => void;

  // Blockly Visual Program State
  blocklyBlocks: BlocklyProgramBlock[];
  setBlocklyBlocks: (blocks: BlocklyProgramBlock[]) => void;
  addBlocklyBlock: (block: BlocklyProgramBlock) => void;
  removeBlocklyBlock: (id: string) => void;
  updateBlocklyBlock: (id: string, updates: Partial<BlocklyProgramBlock>) => void;

  // Script Code State
  scriptCode: string;
  setScriptCode: (code: string) => void;

  // Write & Draw State
  drawSvgContent: string;
  setDrawSvgContent: (svg: string) => void;
  drawConfig: DrawConfig;
  setDrawConfig: (cfg: Partial<DrawConfig>) => void;

  // Unified Simulation Execution
  telemetry: ExecutorTelemetry;
  runTeachingProgram: () => void;
  runBlocklyProgram: () => void;
  runScriptProgram: () => void;
  runDrawProgram: () => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;

  // Project Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  exportToJson: () => string;
  importFromJson: (jsonStr: string) => boolean;
}

const initialCartesian = forwardKinematics(
  HOME_JOINTS.j1,
  HOME_JOINTS.j2,
  HOME_JOINTS.j3,
  HOME_JOINTS.j4
);

const DEFAULT_OBJECTS: PlacedObjectInstance[] = [
  {
    id: 'scale-default-1',
    typeId: 'scale',
    name: 'Weighing Scale',
    position: [240, -100, 0],
    rotationY: 0,
    attachedToTool: false,
  },
  {
    id: 'box-default-1',
    typeId: 'box',
    name: 'Cube Block A',
    position: [240, 100, 0],
    rotationY: 0,
    attachedToTool: false,
  },
];

const DEFAULT_TEACHING_POINTS: TeachingPoint[] = [
  {
    id: 'tp-1',
    name: '1. Home Standby',
    x: 250,
    y: 0,
    z: 100,
    r: 0,
    motionType: 'MOVJ',
    speed: 60,
    pauseMs: 200,
    toolAction: 'off',
  },
  {
    id: 'tp-2',
    name: '2. Approach Box A',
    x: 240,
    y: 100,
    z: 70,
    r: 0,
    motionType: 'MOVJ',
    speed: 50,
    pauseMs: 150,
    toolAction: 'none',
  },
  {
    id: 'tp-3',
    name: '3. Lower to Contact & Suction ON',
    x: 240,
    y: 100,
    z: 35,
    r: 0,
    motionType: 'MOVL',
    speed: 40,
    pauseMs: 350,
    toolAction: 'on',
  },
  {
    id: 'tp-4',
    name: '4. Lift with Box (Safe Z)',
    x: 240,
    y: 100,
    z: 110,
    r: 0,
    motionType: 'MOVL',
    speed: 50,
    pauseMs: 200,
    toolAction: 'none',
  },
  {
    id: 'tp-5',
    name: '5. Transfer Above Scale',
    x: 240,
    y: -100,
    z: 110,
    r: 0,
    motionType: 'MOVJ',
    speed: 50,
    pauseMs: 200,
    toolAction: 'none',
  },
  {
    id: 'tp-6',
    name: '6. Lower onto Scale & Suction OFF',
    x: 240,
    y: -100,
    z: 53,
    r: 0,
    motionType: 'MOVL',
    speed: 40,
    pauseMs: 300,
    toolAction: 'off',
  },
  {
    id: 'tp-7',
    name: '7. Retract Upward',
    x: 240,
    y: -100,
    z: 110,
    r: 0,
    motionType: 'MOVL',
    speed: 50,
    pauseMs: 150,
    toolAction: 'none',
  },
  {
    id: 'tp-8',
    name: '8. Return Home Standby',
    x: 250,
    y: 0,
    z: 100,
    r: 0,
    motionType: 'MOVJ',
    speed: 60,
    pauseMs: 200,
    toolAction: 'none',
  },
];

const DEFAULT_BLOCKLY_BLOCKS: BlocklyProgramBlock[] = [
  { id: 'b-1', type: 'set_speed', params: { speed: 60 } },
  { id: 'b-2', type: 'jump', params: { x: 240, y: 100, z: 35, jumpHeight: 35 } },
  { id: 'b-3', type: 'suction_on', params: {} },
  { id: 'b-4', type: 'jump', params: { x: 240, y: -100, z: 53, jumpHeight: 40 } },
  { id: 'b-5', type: 'suction_off', params: {} },
  { id: 'b-6', type: 'movj', params: { x: 250, y: 0, z: 100 } },
];

const DEFAULT_SCRIPT_CODE = `// Dobot Magician Automated Pick-and-Place Script
SPEED 60
MOVJ X 250 Y 0 Z 100 R 0
MOVJ X 240 Y 100 Z 70 R 0
MOVL X 240 Y 100 Z 35 R 0
SUCTION ON
WAIT 350
MOVL X 240 Y 100 Z 110 R 0
MOVJ X 240 Y -100 Z 110 R 0
MOVL X 240 Y -100 Z 53 R 0
SUCTION OFF
WAIT 300
MOVL X 240 Y -100 Z 110 R 0
MOVJ X 250 Y 0 Z 100 R 0
`;

let executorInstance: SimulationExecutor | null = null;

/**
 * Synchronizes scene object transforms with the robot tool pose.
 * If suction/gripper is active:
 * 1. Automatically grasps and latches any valid workpiece entering proximity.
 * 2. Continuously updates position and yaw rotation for attached workpieces.
 */
function syncObjectsWithPose(
  objects: PlacedObjectInstance[],
  pose: CartesianPose,
  endEffectorActive: boolean
): PlacedObjectInstance[] {
  let currentObjects = objects;

  // Continuous Proximity Latching: If suction/gripper is active and not currently holding an object
  const isHolding = currentObjects.some((o) => o.attachedToTool);
  if (endEffectorActive && !isHolding) {
    const grasp = validateSuctionPickup(pose, currentObjects);
    if (grasp.success) {
      currentObjects = currentObjects.map((obj) =>
        obj.id === grasp.targetObjectId
          ? {
              ...obj,
              attachedToTool: true,
              attachedRelativeOffset: grasp.relativeOffset,
            }
          : obj
      );
    }
  }

  // Continuously transform all attached objects with tool world pose
  return currentObjects.map((obj) => {
    if (!obj.attachedToTool || !obj.attachedRelativeOffset) return obj;
    return {
      ...obj,
      position: [
        pose.x + obj.attachedRelativeOffset[0],
        pose.y + obj.attachedRelativeOffset[1],
        pose.z + obj.attachedRelativeOffset[2],
      ] as [number, number, number],
      rotationY: (pose.r * Math.PI) / 180,
    };
  });
}

export const useDobotStore = create<DobotState>((set, get) => {
  function getExecutor(): SimulationExecutor {
    if (!executorInstance) {
      executorInstance = new SimulationExecutor(
        (pose, joints) => {
          const { objects, endEffectorActive } = get();
          const updatedObjects = syncObjectsWithPose(objects, pose, endEffectorActive);

          set({
            cartesian: pose,
            joints,
            objects: updatedObjects,
          });
          get().addTrajectoryPoint([pose.x, pose.y, pose.z]);
        },
        (action) => {
          if (action === 'on') {
            get().setEndEffectorActive(true);
          } else if (action === 'off') {
            get().setEndEffectorActive(false);
          } else if (action === 'open') {
            get().setGripperState('open');
            get().setEndEffectorActive(false);
          } else if (action === 'close') {
            get().setGripperState('closed');
            get().setEndEffectorActive(true);
          }
        },
        (telemetry) => {
          set({ telemetry });
        },
        {
          onCycleComplete: (completedCycle) => {
            set({ statusNotification: `Completed Cycle #${completedCycle}` });
          },
          onCycleResetRequest: () => {
            get().resetObjects();
          },
          getHoldingState: () => {
            return get().objects.some((o) => o.attachedToTool);
          },
        }
      );
    }
    return executorInstance;
  }

  return {
    activeTab: 'operation',
    setActiveTab: (tab) => set({ activeTab: tab }),

    joints: { ...HOME_JOINTS },
    cartesian: { ...initialCartesian },
    speed: 50,
    setSpeed: (speed) => set({ speed: Math.max(5, Math.min(100, speed)) }),

    isEmergencyStopped: false,
    setEmergencyStopped: (stopped) => {
      if (stopped) {
        getExecutor().stop();
        set({
          isEmergencyStopped: true,
          jogWarning: 'EMERGENCY STOP ACTIVATED! All robot motions halted.',
        });
      } else {
        set({
          isEmergencyStopped: false,
          jogWarning: null,
        });
      }
    },

    endEffectorType: 'suction',
    setEndEffectorType: (type) => set({ endEffectorType: type }),

    endEffectorActive: false,
    setEndEffectorActive: (active) => {
      const state = get();
      const { cartesian, objects, endEffectorType } = state;

      if (!active) {
        // Release any attached objects and settle with deterministic drop calculations
        let releasedCount = 0;
        const updatedObjects = objects.map((obj) => {
          if (!obj.attachedToTool) return obj;
          releasedCount++;
          const dropZ = calculateObjectDropZ(obj, objects);
          return {
            ...obj,
            attachedToTool: false,
            position: [obj.position[0], obj.position[1], dropZ] as [number, number, number],
            attachedRelativeOffset: undefined,
          };
        });

        set({
          endEffectorActive: false,
          objects: updatedObjects,
          statusNotification:
            releasedCount > 0
              ? `${endEffectorType.toUpperCase()} OFF: Object released onto supporting surface`
              : `${endEffectorType.toUpperCase()} turned OFF`,
        });
        return;
      }

      // Suction cup / Gripper activation: run validation
      const graspCheck = validateSuctionPickup(cartesian, objects);

      if (graspCheck.success) {
        const updatedObjects = objects.map((obj) => {
          if (obj.id === graspCheck.targetObjectId) {
            return {
              ...obj,
              attachedToTool: true,
              attachedRelativeOffset: graspCheck.relativeOffset,
            };
          }
          return obj;
        });

        set({
          endEffectorActive: true,
          objects: updatedObjects,
          statusNotification: graspCheck.message,
          jogWarning: null,
        });
      } else {
        // Suction vacuum is turned ON in standby — will auto-grasp when brought in range of an object
        set({
          endEffectorActive: true,
          statusNotification: `${endEffectorType.toUpperCase()} ON: Vacuum active — move tool toward workpiece to grasp`,
          jogWarning: null,
        });
      }
    },

    gripperState: 'open',
    setGripperState: (state) => set({ gripperState: state }),

    // Cycle repeat settings
    cycleMode: 'once',
    setCycleMode: (mode) => {
      set({ cycleMode: mode });
      getExecutor().setCycleOptions({
        mode,
        repeatCount: get().repeatCount,
        autoResetObjects: get().autoResetObjectsOnCycle,
      });
    },

    repeatCount: 1,
    setRepeatCount: (count) => {
      const safeCount = Math.max(1, count);
      set({ repeatCount: safeCount });
      getExecutor().setCycleOptions({
        mode: get().cycleMode,
        repeatCount: safeCount,
        autoResetObjects: get().autoResetObjectsOnCycle,
      });
    },

    autoResetObjectsOnCycle: false,
    setAutoResetObjectsOnCycle: (enabled) => {
      set({ autoResetObjectsOnCycle: enabled });
      getExecutor().setCycleOptions({
        mode: get().cycleMode,
        repeatCount: get().repeatCount,
        autoResetObjects: enabled,
      });
    },

    jogWarning: null,
    setJogWarning: (warning) => set({ jogWarning: warning }),

    statusNotification: null,
    setStatusNotification: (msg) => set({ statusNotification: msg }),

    showReachDome: false,
    setShowReachDome: (show) => set({ showReachDome: show }),

    showTrajectory: true,
    setShowTrajectory: (show) => set({ showTrajectory: show }),

    trajectoryPoints: [[initialCartesian.x, initialCartesian.y, initialCartesian.z]],
    addTrajectoryPoint: (pt) => {
      const list = get().trajectoryPoints;
      const last = list[list.length - 1];
      if (
        !last ||
        Math.hypot(pt[0] - last[0], pt[1] - last[1], pt[2] - last[2]) > 3
      ) {
        set({ trajectoryPoints: [...list.slice(-500), pt] });
      }
    },
    clearTrajectory: () => set({ trajectoryPoints: [] }),

    jogJoint: (joint, delta) => {
      const { joints, isEmergencyStopped, objects, endEffectorActive } = get();
      if (isEmergencyStopped) {
        set({ jogWarning: 'Robot is halted by Emergency Stop! Release E-Stop first.' });
        return false;
      }

      const newJoints = { ...joints, [joint]: joints[joint] + delta };
      const limits = ROBOT_LIMITS[joint];

      if (newJoints[joint] < limits[0] || newJoints[joint] > limits[1]) {
        set({
          jogWarning: `Joint limit reached: ${joint.toUpperCase()} limit is [${limits[0]}°, ${limits[1]}°]`,
        });
        return false;
      }

      const newPose = forwardKinematics(
        newJoints.j1,
        newJoints.j2,
        newJoints.j3,
        newJoints.j4
      );

      const updatedObjects = syncObjectsWithPose(objects, newPose, endEffectorActive);

      set({
        joints: newJoints,
        cartesian: newPose,
        jogWarning: null,
        objects: updatedObjects,
      });
      get().addTrajectoryPoint([newPose.x, newPose.y, newPose.z]);
      return true;
    },

    jogCartesian: (axis, delta) => {
      const { cartesian, isEmergencyStopped, objects, endEffectorActive } = get();
      if (isEmergencyStopped) {
        set({ jogWarning: 'Robot is halted by Emergency Stop! Release E-Stop first.' });
        return false;
      }

      const targetPose = { ...cartesian, [axis]: cartesian[axis] + delta };
      const solvedJoints = inverseKinematics(
        targetPose.x,
        targetPose.y,
        targetPose.z,
        targetPose.r
      );

      if (!solvedJoints) {
        set({
          jogWarning: `Cannot jog ${axis.toUpperCase()}: Position is outside reachable workspace or violates joint limits.`,
        });
        return false;
      }

      if (!areJointsWithinLimits(solvedJoints)) {
        set({
          jogWarning: `Cannot jog ${axis.toUpperCase()}: Resulting joint angles exceed physical limits.`,
        });
        return false;
      }

      const truePose = forwardKinematics(
        solvedJoints.j1,
        solvedJoints.j2,
        solvedJoints.j3,
        solvedJoints.j4
      );

      const updatedObjects = syncObjectsWithPose(objects, truePose, endEffectorActive);

      set({
        joints: solvedJoints,
        cartesian: truePose,
        jogWarning: null,
        objects: updatedObjects,
      });
      get().addTrajectoryPoint([truePose.x, truePose.y, truePose.z]);
      return true;
    },

    moveToPose: (target) => {
      const check = validateCartesianTarget(target.x, target.y, target.z, target.r);
      if (!check.valid) {
        set({ jogWarning: check.reason || 'Unreachable target position' });
        return false;
      }

      const solved = inverseKinematics(target.x, target.y, target.z, target.r);
      if (!solved) return false;

      get().setJointsDirect(solved);
      return true;
    },

    setJointsDirect: (newJoints) => {
      const pose = forwardKinematics(
        newJoints.j1,
        newJoints.j2,
        newJoints.j3,
        newJoints.j4
      );
      const { objects, endEffectorActive } = get();
      const updatedObjects = syncObjectsWithPose(objects, pose, endEffectorActive);

      set({
        joints: newJoints,
        cartesian: pose,
        objects: updatedObjects,
      });
      get().addTrajectoryPoint([pose.x, pose.y, pose.z]);
    },

    homeRobot: () => {
      const { isEmergencyStopped } = get();
      if (isEmergencyStopped) {
        set({ jogWarning: 'Cannot home: Emergency Stop is active!' });
        return;
      }
      getExecutor().stop();
      const pose = forwardKinematics(
        HOME_JOINTS.j1,
        HOME_JOINTS.j2,
        HOME_JOINTS.j3,
        HOME_JOINTS.j4
      );
      set({
        joints: { ...HOME_JOINTS },
        cartesian: pose,
        jogWarning: null,
      });
      get().addTrajectoryPoint([pose.x, pose.y, pose.z]);
    },

    // Objects
    objects: DEFAULT_OBJECTS,
    selectedObjectId: 'box-default-1',
    setSelectedObjectId: (id) => set({ selectedObjectId: id }),

    ghostPlacementType: null,
    setGhostPlacementType: (type) =>
      set({
        ghostPlacementType: type,
        ghostPosition: null,
        ghostValid: false,
        ghostError: null,
      }),

    ghostPosition: null,
    ghostValid: false,
    ghostError: null,
    setGhostState: (pos, valid, error) =>
      set({
        ghostPosition: pos,
        ghostValid: valid,
        ghostError: error,
      }),

    confirmGhostPlacement: () => {
      const { ghostPlacementType, ghostPosition, ghostValid, objects } = get();
      if (!ghostPlacementType || !ghostPosition || !ghostValid) {
        return false;
      }

      const def = OBJECT_REGISTRY[ghostPlacementType];
      const newId = `${ghostPlacementType}-${Date.now()}`;
      const newObj: PlacedObjectInstance = {
        id: newId,
        typeId: ghostPlacementType,
        name: `${def.name} #${objects.length + 1}`,
        position: [...ghostPosition],
        rotationY: 0,
        attachedToTool: false,
      };

      set({
        objects: [...objects, newObj],
        selectedObjectId: newId,
        ghostPlacementType: null,
        ghostPosition: null,
        ghostValid: false,
        ghostError: null,
      });
      return true;
    },

    cancelGhostPlacement: () =>
      set({
        ghostPlacementType: null,
        ghostPosition: null,
        ghostValid: false,
        ghostError: null,
      }),

    deleteObject: (id) => {
      const { objects, selectedObjectId } = get();
      set({
        objects: objects.filter((o) => o.id !== id),
        selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
      });
    },

    resetObjects: () => {
      set({
        objects: DEFAULT_OBJECTS.map((obj) => ({
          ...obj,
          attachedToTool: false,
          attachedRelativeOffset: undefined,
        })),
        selectedObjectId: 'box-default-1',
        endEffectorActive: false,
      });
    },

    updateObjectPosition: (id, pos) => {
      set((state) => ({
        objects: state.objects.map((o) =>
          o.id === id ? { ...o, position: pos } : o
        ),
      }));
    },

    // Teaching Points
    teachingPoints: DEFAULT_TEACHING_POINTS,

    addTeachingPoint: (pt) => {
      const newPt: TeachingPoint = {
        ...pt,
        id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      set((state) => ({ teachingPoints: [...state.teachingPoints, newPt] }));
    },

    updateTeachingPoint: (id, updates) => {
      set((state) => ({
        teachingPoints: state.teachingPoints.map((tp) =>
          tp.id === id ? { ...tp, ...updates } : tp
        ),
      }));
    },

    deleteTeachingPoint: (id) => {
      set((state) => ({
        teachingPoints: state.teachingPoints.filter((tp) => tp.id !== id),
      }));
    },

    reorderTeachingPoints: (fromIndex, toIndex) => {
      set((state) => {
        const list = [...state.teachingPoints];
        const [removed] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, removed);
        return { teachingPoints: list };
      });
    },

    // Blockly
    blocklyBlocks: DEFAULT_BLOCKLY_BLOCKS,
    setBlocklyBlocks: (blocks) => set({ blocklyBlocks: blocks }),
    addBlocklyBlock: (block) =>
      set((state) => ({ blocklyBlocks: [...state.blocklyBlocks, block] })),
    removeBlocklyBlock: (id) =>
      set((state) => ({
        blocklyBlocks: state.blocklyBlocks.filter((b) => b.id !== id),
      })),
    updateBlocklyBlock: (id, updates) =>
      set((state) => ({
        blocklyBlocks: state.blocklyBlocks.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        ),
      })),

    // Script
    scriptCode: DEFAULT_SCRIPT_CODE,
    setScriptCode: (code) => set({ scriptCode: code }),

    // Draw
    drawSvgContent: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 20 20 L 80 20 L 80 80 L 20 80 Z M 35 35 L 65 35 L 65 65 L 35 65 Z" fill="none" stroke="black"/>
</svg>`,
    setDrawSvgContent: (svg) => set({ drawSvgContent: svg }),
    drawConfig: DEFAULT_DRAW_CONFIG,
    setDrawConfig: (cfg) =>
      set((state) => ({ drawConfig: { ...state.drawConfig, ...cfg } })),

    // Telemetry
    telemetry: {
      state: 'idle',
      activeCommandId: null,
      activeCommandIndex: -1,
      totalCommands: 0,
      progressPercent: 0,
      elapsedTimeMs: 0,
      currentInstruction: 'Idle - Ready',
      errorMessage: null,
      currentCycle: 1,
      totalCycles: 1,
      isHoldingObject: false,
    },

    // Unified Execution
    runTeachingProgram: () => {
      const {
        teachingPoints,
        cartesian,
        joints,
        isEmergencyStopped,
        cycleMode,
        repeatCount,
        autoResetObjectsOnCycle,
      } = get();
      if (isEmergencyStopped || teachingPoints.length === 0) return;

      const commands: TrajectoryCommand[] = teachingPoints.map((tp, idx) => ({
        id: tp.id,
        source: 'teaching',
        sourceId: tp.id,
        motionType: tp.motionType,
        targetPose: { x: tp.x, y: tp.y, z: tp.z, r: tp.r },
        params: { speed: tp.speed, acceleration: 50, jumpHeight: 35 },
        pauseDuration: tp.pauseMs,
        toolAction: tp.toolAction,
        notes: `Step ${idx + 1}: ${tp.name}`,
      }));

      const exec = getExecutor();
      exec.setCycleOptions({
        mode: cycleMode,
        repeatCount,
        autoResetObjects: autoResetObjectsOnCycle,
      });
      exec.loadProgram(cartesian, commands);
      exec.start(cartesian, joints);
    },

    runBlocklyProgram: () => {
      const {
        blocklyBlocks,
        cartesian,
        joints,
        isEmergencyStopped,
        cycleMode,
        repeatCount,
        autoResetObjectsOnCycle,
      } = get();
      if (isEmergencyStopped || blocklyBlocks.length === 0) return;

      const commands = compileBlocklyToCommands(blocklyBlocks, cartesian);
      const exec = getExecutor();
      exec.setCycleOptions({
        mode: cycleMode,
        repeatCount,
        autoResetObjects: autoResetObjectsOnCycle,
      });
      exec.loadProgram(cartesian, commands);
      exec.start(cartesian, joints);
    },

    runScriptProgram: () => {
      const {
        scriptCode,
        cartesian,
        joints,
        isEmergencyStopped,
        cycleMode,
        repeatCount,
        autoResetObjectsOnCycle,
      } = get();
      if (isEmergencyStopped || !scriptCode.trim()) return;

      const res = parseDobotScript(scriptCode, cartesian);
      if (!res.success) {
        set({
          jogWarning: `Script Error line ${res.errors[0]?.line}: ${res.errors[0]?.message}`,
        });
        return;
      }

      const exec = getExecutor();
      exec.setCycleOptions({
        mode: cycleMode,
        repeatCount,
        autoResetObjects: autoResetObjectsOnCycle,
      });
      exec.loadProgram(cartesian, res.commands);
      exec.start(cartesian, joints);
    },

    runDrawProgram: () => {
      const { drawSvgContent, drawConfig, cartesian, joints, isEmergencyStopped } = get();
      if (isEmergencyStopped || !drawSvgContent.trim()) return;

      const pts = parseSvgToDrawingPoints(drawSvgContent, drawConfig);
      const commands = compileDrawingToCommands(pts, drawConfig);

      if (commands.length === 0) {
        set({ jogWarning: 'No valid SVG path polylines found to draw' });
        return;
      }

      const exec = getExecutor();
      exec.setCycleOptions({ mode: 'once', repeatCount: 1, autoResetObjects: false });
      exec.loadProgram(cartesian, commands);
      exec.start(cartesian, joints);
    },

    pauseExecution: () => getExecutor().pause(),
    resumeExecution: () => getExecutor().resume(),
    stopExecution: () => getExecutor().stop(),

    // Persistence
    saveToLocalStorage: () => {
      try {
        const data = {
          teachingPoints: get().teachingPoints,
          objects: get().objects,
          blocklyBlocks: get().blocklyBlocks,
          scriptCode: get().scriptCode,
          cycleMode: get().cycleMode,
          repeatCount: get().repeatCount,
          autoResetObjectsOnCycle: get().autoResetObjectsOnCycle,
        };
        localStorage.setItem('dobot_simulator_project', JSON.stringify(data));
        set({ statusNotification: 'Project saved to browser storage' });
      } catch (e) {
        console.error('Failed to save', e);
      }
    },

    loadFromLocalStorage: () => {
      try {
        const raw = localStorage.getItem('dobot_simulator_project');
        if (raw) {
          const parsed = JSON.parse(raw);
          set({
            ...(Array.isArray(parsed.teachingPoints)
              ? { teachingPoints: parsed.teachingPoints }
              : {}),
            ...(Array.isArray(parsed.objects) ? { objects: parsed.objects } : {}),
            ...(Array.isArray(parsed.blocklyBlocks)
              ? { blocklyBlocks: parsed.blocklyBlocks }
              : {}),
            ...(parsed.scriptCode ? { scriptCode: parsed.scriptCode } : {}),
            ...(parsed.cycleMode ? { cycleMode: parsed.cycleMode } : {}),
            ...(parsed.repeatCount ? { repeatCount: parsed.repeatCount } : {}),
            ...(typeof parsed.autoResetObjectsOnCycle === 'boolean'
              ? { autoResetObjectsOnCycle: parsed.autoResetObjectsOnCycle }
              : {}),
          });
          set({ statusNotification: 'Project loaded from browser storage' });
        }
      } catch (e) {
        console.error('Failed to load', e);
      }
    },

    exportToJson: () => {
      const data = {
        version: '2.1',
        exportedAt: new Date().toISOString(),
        teachingPoints: get().teachingPoints,
        objects: get().objects,
        blocklyBlocks: get().blocklyBlocks,
        scriptCode: get().scriptCode,
        cycleMode: get().cycleMode,
        repeatCount: get().repeatCount,
        autoResetObjectsOnCycle: get().autoResetObjectsOnCycle,
        joints: get().joints,
        cartesian: get().cartesian,
      };
      return JSON.stringify(data, null, 2);
    },

    importFromJson: (jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        set({
          ...(Array.isArray(parsed.teachingPoints)
            ? { teachingPoints: parsed.teachingPoints }
            : {}),
          ...(Array.isArray(parsed.objects) ? { objects: parsed.objects } : {}),
          ...(Array.isArray(parsed.blocklyBlocks)
            ? { blocklyBlocks: parsed.blocklyBlocks }
            : {}),
          ...(parsed.scriptCode ? { scriptCode: parsed.scriptCode } : {}),
          ...(parsed.cycleMode ? { cycleMode: parsed.cycleMode } : {}),
          ...(parsed.repeatCount ? { repeatCount: parsed.repeatCount } : {}),
          ...(typeof parsed.autoResetObjectsOnCycle === 'boolean'
            ? { autoResetObjectsOnCycle: parsed.autoResetObjectsOnCycle }
            : {}),
        });
        set({ statusNotification: 'Project successfully imported from JSON' });
        return true;
      } catch {
        return false;
      }
    },
  };
});
