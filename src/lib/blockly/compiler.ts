import { CartesianPose, JointAngles } from '../kinematics';
import { TrajectoryCommand, MotionParams } from '../simulation/types';

export type BlockType =
  | 'movj'
  | 'movl'
  | 'jump'
  | 'set_speed'
  | 'suction_on'
  | 'suction_off'
  | 'gripper_open'
  | 'gripper_close'
  | 'wait'
  | 'repeat';

export interface BlocklyProgramBlock {
  id: string;
  type: BlockType;
  params: {
    x?: number;
    y?: number;
    z?: number;
    r?: number;
    j1?: number;
    j2?: number;
    j3?: number;
    j4?: number;
    speed?: number;
    acceleration?: number;
    jumpHeight?: number;
    durationMs?: number;
    repeatCount?: number;
    nestedBlocks?: BlocklyProgramBlock[];
  };
  comment?: string;
}

export interface BlocklyProgram {
  id: string;
  name: string;
  blocks: BlocklyProgramBlock[];
}

export function compileBlocklyToCommands(
  blocks: BlocklyProgramBlock[],
  initialPose: CartesianPose
): TrajectoryCommand[] {
  const commands: TrajectoryCommand[] = [];
  let currentSpeed = 50;
  let currentAccel = 50;
  let currentPose = { ...initialPose };

  function processBlock(block: BlocklyProgramBlock) {
    switch (block.type) {
      case 'set_speed':
        currentSpeed = block.params.speed ?? currentSpeed;
        currentAccel = block.params.acceleration ?? currentAccel;
        break;

      case 'movj':
      case 'movl':
      case 'jump': {
        const target: CartesianPose = {
          x: block.params.x ?? currentPose.x,
          y: block.params.y ?? currentPose.y,
          z: block.params.z ?? currentPose.z,
          r: block.params.r ?? currentPose.r,
        };
        const motionType = block.type === 'movj' ? 'MOVJ' : block.type === 'movl' ? 'MOVL' : 'JUMP';
        commands.push({
          id: `cmd-${block.id}-${commands.length}`,
          source: 'blockly',
          sourceId: block.id,
          motionType,
          targetPose: target,
          params: {
            speed: currentSpeed,
            acceleration: currentAccel,
            jumpHeight: block.params.jumpHeight ?? 25,
          },
          notes: `${motionType} to (${target.x}, ${target.y}, ${target.z})`,
        });
        currentPose = target;
        break;
      }

      case 'suction_on':
        commands.push({
          id: `cmd-${block.id}-${commands.length}`,
          source: 'blockly',
          sourceId: block.id,
          motionType: 'MOVJ',
          targetPose: { ...currentPose },
          params: { speed: currentSpeed, acceleration: currentAccel },
          toolAction: 'on',
          pauseDuration: 300,
          notes: 'Suction ON',
        });
        break;

      case 'suction_off':
        commands.push({
          id: `cmd-${block.id}-${commands.length}`,
          source: 'blockly',
          sourceId: block.id,
          motionType: 'MOVJ',
          targetPose: { ...currentPose },
          params: { speed: currentSpeed, acceleration: currentAccel },
          toolAction: 'off',
          pauseDuration: 250,
          notes: 'Suction OFF',
        });
        break;

      case 'gripper_open':
        commands.push({
          id: `cmd-${block.id}-${commands.length}`,
          source: 'blockly',
          sourceId: block.id,
          motionType: 'MOVJ',
          targetPose: { ...currentPose },
          params: { speed: currentSpeed, acceleration: currentAccel },
          toolAction: 'open',
          pauseDuration: 300,
          notes: 'Gripper OPEN',
        });
        break;

      case 'gripper_close':
        commands.push({
          id: `cmd-${block.id}-${commands.length}`,
          source: 'blockly',
          sourceId: block.id,
          motionType: 'MOVJ',
          targetPose: { ...currentPose },
          params: { speed: currentSpeed, acceleration: currentAccel },
          toolAction: 'close',
          pauseDuration: 300,
          notes: 'Gripper CLOSE',
        });
        break;

      case 'wait':
        commands.push({
          id: `cmd-${block.id}-${commands.length}`,
          source: 'blockly',
          sourceId: block.id,
          motionType: 'MOVJ',
          targetPose: { ...currentPose },
          params: { speed: currentSpeed, acceleration: currentAccel },
          pauseDuration: block.params.durationMs ?? 1000,
          notes: `Wait ${block.params.durationMs ?? 1000}ms`,
        });
        break;

      case 'repeat': {
        const count = block.params.repeatCount ?? 1;
        const nested = block.params.nestedBlocks ?? [];
        for (let i = 0; i < count; i++) {
          nested.forEach(processBlock);
        }
        break;
      }
    }
  }

  blocks.forEach(processBlock);
  return commands;
}
