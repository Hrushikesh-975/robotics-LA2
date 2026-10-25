import { describe, it, expect } from 'vitest';
import {
  forwardKinematics,
  inverseKinematics,
  areJointsWithinLimits,
  validateCartesianTarget,
  getDimensionsForTool,
  HOME_JOINTS,
  ROBOT_LIMITS,
  ROBOT_DIMENSIONS,
} from './kinematics';
import { planCommandWaypoints, SimulationExecutor } from '../simulation/executor';
import { compileBlocklyToCommands } from '../blockly/compiler';
import { parseDobotScript } from '../script/parser';
import { parseSvgToDrawingPoints, compileDrawingToCommands } from '../draw/svgDrawing';
import { validateSuctionPickup, calculateObjectDropZ } from '../objects/grasping';
import { PlacedObjectInstance } from '../objects/types';

describe('Dobot Magician Comprehensive Verification & Grasping Engine', () => {
  it('correctly calculates forward kinematics for HOME_JOINTS', () => {
    const pose = forwardKinematics(
      HOME_JOINTS.j1,
      HOME_JOINTS.j2,
      HOME_JOINTS.j3,
      HOME_JOINTS.j4
    );
    expect(pose.x).toBeGreaterThan(200);
    expect(pose.y).toBeCloseTo(0, 2);
    expect(pose.r).toBeCloseTo(0, 2);
  });

  it('proves IK matches FK for HOME_JOINTS (round-trip)', () => {
    const pose = forwardKinematics(
      HOME_JOINTS.j1,
      HOME_JOINTS.j2,
      HOME_JOINTS.j3,
      HOME_JOINTS.j4
    );
    const solvedJoints = inverseKinematics(pose.x, pose.y, pose.z, pose.r);
    expect(solvedJoints).not.toBeNull();
    if (solvedJoints) {
      expect(solvedJoints.j1).toBeCloseTo(HOME_JOINTS.j1, 1);
      expect(solvedJoints.j2).toBeCloseTo(HOME_JOINTS.j2, 1);
      expect(solvedJoints.j3).toBeCloseTo(HOME_JOINTS.j3, 1);
      expect(solvedJoints.j4).toBeCloseTo(HOME_JOINTS.j4, 1);
    }
  });

  it('validates tool dimensions for suction, gripper, laser, pen', () => {
    const suctionDims = getDimensionsForTool('suction');
    const gripperDims = getDimensionsForTool('gripper');
    const penDims = getDimensionsForTool('pen');

    expect(suctionDims.toolOffsetZ).toBe(70);
    expect(gripperDims.toolOffsetZ).toBe(72);
    expect(penDims.toolOffsetZ).toBe(68);
  });

  it('validates target reachability via validateCartesianTarget', () => {
    const validPt = validateCartesianTarget(240, 0, 100, 0);
    expect(validPt.valid).toBe(true);

    const farPt = validateCartesianTarget(600, 0, 100, 0);
    expect(farPt.valid).toBe(false);
    expect(farPt.reason).toContain('reach');

    const originPt = validateCartesianTarget(0, 0, 100, 0);
    expect(originPt.valid).toBe(false);
  });

  // ---------------- OBJECT GRASPING & SUCTION VALIDATION TESTS ----------------
  const sampleObjects: PlacedObjectInstance[] = [
    {
      id: 'box-1',
      typeId: 'box', // height = 35mm
      name: 'Cube Block A',
      position: [240, 100, 0],
      rotationY: 0,
      attachedToTool: false,
    },
    {
      id: 'scale-1',
      typeId: 'scale', // height = 18mm
      name: 'Weighing Scale',
      position: [240, -100, 0],
      rotationY: 0,
      attachedToTool: false,
    },
  ];

  it('successfully locks suction grasp when tool is at top surface of object', () => {
    // Tool tip positioned right on top of Cube Block A: [240, 100, 35]
    const tcpAtTop = { x: 240, y: 100, z: 35, r: 0 };
    const res = validateSuctionPickup(tcpAtTop, sampleObjects);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.targetObjectId).toBe('box-1');
      // Relative offset: obj.position [240, 100, 0] - tcp [240, 100, 35] = [0, 0, -35]
      expect(res.relativeOffset).toEqual([0, 0, -35]);
    }
  });

  it('fails suction grasp with TOO_FAR error if tool is too high above object', () => {
    // Tool tip 50mm above top surface (z=85)
    const tcpHigh = { x: 240, y: 100, z: 85, r: 0 };
    const res = validateSuctionPickup(tcpHigh, sampleObjects);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.reason).toBe('TOO_FAR');
    }
  });

  it('fails suction grasp with TOO_FAR error if horizontally misaligned', () => {
    // Tool tip 50mm horizontally offset in X
    const tcpOffset = { x: 290, y: 100, z: 35, r: 0 };
    const res = validateSuctionPickup(tcpOffset, sampleObjects);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.reason).toBe('TOO_FAR');
    }
  });

  it('prevents multiple attachments if an object is already attached', () => {
    const objectsWithAttached: PlacedObjectInstance[] = [
      {
        ...sampleObjects[0],
        attachedToTool: true,
      },
    ];
    const tcp = { x: 240, y: 100, z: 35, r: 0 };
    const res = validateSuctionPickup(tcp, objectsWithAttached);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.reason).toBe('ALREADY_ATTACHED');
    }
  });

  it('prevents picking up fixed stations like weighing scale', () => {
    // Tool tip hovering directly above weighing scale: [240, -100, 18]
    const tcpOverScale = { x: 240, y: -100, z: 18, r: 0 };
    const res = validateSuctionPickup(tcpOverScale, sampleObjects);
    // Should NOT attach to the scale (returns NO_OBJECT or targets the box if in reach)
    if (res.success) {
      expect(res.targetObjectId).not.toBe('scale-1');
    } else {
      expect(res.reason).toBe('TOO_FAR');
    }
  });

  it('supports slight bellows compression into workpiece (z=32 vs top=35)', () => {
    const tcpCompressed = { x: 240, y: 100, z: 32, r: 0 };
    const res = validateSuctionPickup(tcpCompressed, sampleObjects);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.targetObjectId).toBe('box-1');
    }
  });

  it('calculates deterministic drop landing onto table surface (z=0)', () => {
    const releasingObj: PlacedObjectInstance = {
      id: 'box-1',
      typeId: 'box',
      name: 'Cube Block A',
      position: [240, 100, 75], // released at elevated height
      rotationY: 0,
      attachedToTool: true,
    };
    const dropZ = calculateObjectDropZ(releasingObj, sampleObjects);
    expect(dropZ).toBe(0); // drops to table surface
  });

  it('calculates deterministic drop landing onto weighing scale (z=18)', () => {
    const releasingOverScale: PlacedObjectInstance = {
      id: 'box-1',
      typeId: 'box',
      name: 'Cube Block A',
      position: [240, -100, 53], // directly over scale at [240, -100, 0]
      rotationY: 0,
      attachedToTool: true,
    };
    const dropZ = calculateObjectDropZ(releasingOverScale, sampleObjects);
    expect(dropZ).toBe(18); // rests on scale top surface
  });

  it('plans multi-stage JUMP trajectory correctly', () => {
    const startPose = { x: 240, y: 100, z: 35, r: 0 };
    const commands = [
      {
        id: 'cmd-jump-1',
        source: 'teaching' as const,
        motionType: 'JUMP' as const,
        targetPose: { x: 240, y: -100, z: 53, r: 0 },
        params: { speed: 50, acceleration: 50, jumpHeight: 30 },
        toolAction: 'off' as const,
      },
    ];

    const waypoints = planCommandWaypoints(startPose, commands);
    expect(waypoints.length).toBe(3);
    expect(waypoints[0].pose.z).toBeGreaterThanOrEqual(65);
    expect(waypoints[1].pose.y).toBe(-100);
    expect(waypoints[1].pose.z).toBeGreaterThanOrEqual(65);
    expect(waypoints[2].pose.y).toBe(-100);
    expect(waypoints[2].pose.z).toBe(53);
    expect(waypoints[2].toolAction).toBe('off');
  });

  it('supports finite and infinite cycle repetition in SimulationExecutor', () => {
    let telemetryState: any = null;
    const executor = new SimulationExecutor(
      () => {},
      () => {},
      (t) => {
        telemetryState = t;
      }
    );

    executor.setCycleOptions({
      mode: 'repeat',
      repeatCount: 3,
      autoResetObjects: true,
    });

    executor.loadProgram({ x: 250, y: 0, z: 100, r: 0 }, [
      {
        id: 'c1',
        source: 'teaching',
        motionType: 'MOVJ',
        targetPose: { x: 240, y: 100, z: 70, r: 0 },
        params: { speed: 50, acceleration: 50 },
      },
    ]);

    expect(telemetryState.totalCycles).toBe(3);
    expect(telemetryState.currentCycle).toBe(1);

    // Test infinite mode
    executor.setCycleOptions({
      mode: 'infinite',
      repeatCount: 1,
      autoResetObjects: false,
    });
    expect(telemetryState.totalCycles).toBe(Infinity);
  });

  it('compiles Blockly blocks into valid executable commands', () => {
    const blocks = [
      { id: 'b1', type: 'set_speed' as const, params: { speed: 80 } },
      { id: 'b2', type: 'movj' as const, params: { x: 250, y: 0, z: 100 } },
      { id: 'b3', type: 'suction_on' as const, params: {} },
    ];
    const cmds = compileBlocklyToCommands(blocks, { x: 200, y: 0, z: 100, r: 0 });
    expect(cmds.length).toBe(2);
    expect(cmds[0].motionType).toBe('MOVJ');
    expect(cmds[0].params.speed).toBe(80);
    expect(cmds[1].toolAction).toBe('on');
  });

  it('parses Dobot script and detects syntax errors accurately', () => {
    const script = `
      SPEED 70
      MOVJ X 250 Y 0 Z 100 R 0
      JUMP X 240 Y 100 Z 35 R 0 H 30
      SUCTION ON
      WAIT 200
    `;
    const res = parseDobotScript(script, { x: 200, y: 0, z: 100, r: 0 });
    expect(res.success).toBe(true);
    expect(res.commands.length).toBe(4);

    const badScript = `INVALID_COMMAND X 100`;
    const badRes = parseDobotScript(badScript, { x: 200, y: 0, z: 100, r: 0 });
    expect(badRes.success).toBe(false);
    expect(badRes.errors.length).toBeGreaterThan(0);
  });

  it('parses SVG path for Write & Draw into toolpath waypoints', () => {
    const svg = `<svg><path d="M 10 10 L 50 10 L 50 50 Z"/></svg>`;
    const pts = parseSvgToDrawingPoints(svg);
    expect(pts.length).toBeGreaterThanOrEqual(3);
    const cmds = compileDrawingToCommands(pts);
    expect(cmds.length).toBeGreaterThanOrEqual(3);
  });
});
