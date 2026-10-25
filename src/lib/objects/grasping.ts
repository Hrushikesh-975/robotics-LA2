import { PlacedObjectInstance, OBJECT_REGISTRY } from '../objects/types';
import { CartesianPose, JointAngles } from '../kinematics';

export interface PickupTolerances {
  maxHorizontalDist: number; // mm (distance in XY plane between tool TCP and top-center of object)
  maxVerticalDist: number;   // mm (vertical distance in Z between tool tip and top surface)
  maxVerticalPenetration: number; // mm (allowed bellows compression into object)
  maxTiltAngleDeg: number;   // degrees (maximum deviation from normal downward grasp)
}

export const DEFAULT_PICKUP_TOLERANCES: PickupTolerances = {
  maxHorizontalDist: 35, // mm
  maxVerticalDist: 26,   // mm
  maxVerticalPenetration: 12, // mm
  maxTiltAngleDeg: 30,   // deg
};

export type GraspValidationResult =
  | { success: true; targetObjectId: string; relativeOffset: [number, number, number]; message: string }
  | { success: false; reason: 'TOO_FAR' | 'WRONG_ORIENTATION' | 'NO_OBJECT' | 'ALREADY_ATTACHED' | 'INVALID_STATE'; message: string };

/**
 * Validates whether the suction cup TCP can successfully grasp an object in the scene.
 * Evaluates:
 * 1. Object grippability (must be a pickable Workpiece, not a fixed Station/Scale)
 * 2. Proximity in XY (radial alignment or top-surface bounding box overlap with suction lip)
 * 3. Proximity in Z (tool hovering at top surface or compressing into flexible bellows)
 * 4. Object state (must not be already attached to another tool)
 */
export function validateSuctionPickup(
  tcpPose: CartesianPose,
  objects: PlacedObjectInstance[],
  tolerances: PickupTolerances = DEFAULT_PICKUP_TOLERANCES
): GraspValidationResult {
  // Check if any object is already attached
  const alreadyAttached = objects.find((o) => o.attachedToTool);
  if (alreadyAttached) {
    return {
      success: false,
      reason: 'ALREADY_ATTACHED',
      message: `Suction cup already holding ${alreadyAttached.name}`,
    };
  }

  // Filter candidate grippable workpieces near TCP (exclude static fixtures like scale)
  let closestObj: PlacedObjectInstance | null = null;
  let minHorizDist = Infinity;
  let correspondingVertDiff = Infinity;
  let candidateScore = Infinity;

  for (const obj of objects) {
    const def = OBJECT_REGISTRY[obj.typeId];
    if (!def) continue;

    // Fixed stations (e.g., weighing scale) are static receptacles, not pickable workpieces
    if (def.category === 'Station' || obj.typeId === 'scale') {
      continue;
    }

    // The target grasp surface is the top-center of the object
    const topCenterX = obj.position[0];
    const topCenterY = obj.position[1];
    const topSurfaceZ = obj.position[2] + def.dimensions.height;

    const dx = Math.abs(tcpPose.x - topCenterX);
    const dy = Math.abs(tcpPose.y - topCenterY);
    const horizDist = Math.hypot(dx, dy);

    // Suction cup has a 14mm outer radius rim
    const cupRadius = 14;
    const inTopFaceBounds =
      dx <= def.dimensions.width / 2 + cupRadius &&
      dy <= def.dimensions.depth / 2 + cupRadius;

    // Vertical delta: positive = cup hovering above; negative = cup pressed into top surface
    const vertDiff = tcpPose.z - topSurfaceZ;

    // Score based on distance
    const score = horizDist + Math.abs(vertDiff);

    if (score < candidateScore) {
      candidateScore = score;
      minHorizDist = inTopFaceBounds ? 0 : horizDist;
      correspondingVertDiff = vertDiff;
      closestObj = obj;
    }
  }

  if (!closestObj) {
    return {
      success: false,
      reason: 'NO_OBJECT',
      message: 'Suction ON: No pickable workpieces in workspace',
    };
  }

  const def = OBJECT_REGISTRY[closestObj.typeId];
  const topCenterX = closestObj.position[0];
  const topCenterY = closestObj.position[1];
  const topSurfaceZ = closestObj.position[2] + (def ? def.dimensions.height : 35);
  const dx = Math.abs(tcpPose.x - topCenterX);
  const dy = Math.abs(tcpPose.y - topCenterY);
  const horizDist = Math.hypot(dx, dy);
  const vertDiff = tcpPose.z - topSurfaceZ;

  const cupRadius = 14;
  const inTopFaceBounds = def
    ? dx <= def.dimensions.width / 2 + cupRadius && dy <= def.dimensions.depth / 2 + cupRadius
    : horizDist <= tolerances.maxHorizontalDist;

  // Check horizontal alignment
  if (!inTopFaceBounds && horizDist > tolerances.maxHorizontalDist) {
    return {
      success: false,
      reason: 'TOO_FAR',
      message: `Pickup failed: Target too far (${horizDist.toFixed(1)}mm > ${tolerances.maxHorizontalDist}mm tolerance)`,
    };
  }

  // Check vertical contact height (allow hovering up to maxVerticalDist, and compression down to maxVerticalPenetration)
  if (vertDiff > tolerances.maxVerticalDist) {
    return {
      success: false,
      reason: 'TOO_FAR',
      message: `Pickup failed: Cup elevation too high by ${vertDiff.toFixed(1)}mm (limit ${tolerances.maxVerticalDist}mm)`,
    };
  }
  if (vertDiff < -tolerances.maxVerticalPenetration) {
    return {
      success: false,
      reason: 'TOO_FAR',
      message: `Pickup failed: Cup submerged into object by ${Math.abs(vertDiff).toFixed(1)}mm`,
    };
  }

  // Successful acquisition: compute relative offset in tool frame
  // When sealed against the suction nozzle, the top face of the workpiece is flush with the tool tip.
  // The object's reference origin [X, Y, Z] has Z at the bottom surface.
  // Therefore, relative Z from TCP tip to object bottom is exactly -height.
  const objHeight = def ? def.dimensions.height : 35;
  const relativeOffset: [number, number, number] = [
    0, // Centered horizontally directly beneath suction nozzle
    0,
    -objHeight, // Top of box flush with suction lip at TCP
  ];

  return {
    success: true,
    targetObjectId: closestObj.id,
    relativeOffset,
    message: `Suction locked: Attached to ${closestObj.name}`,
  };
}

/**
 * Calculates deterministic release position when suction is deactivated.
 * Performs supporting surface raycast / bounding-box drop test onto the worktable or stacked objects.
 */
export function calculateObjectDropZ(
  releasingObj: PlacedObjectInstance,
  allObjects: PlacedObjectInstance[]
): number {
  const def = OBJECT_REGISTRY[releasingObj.typeId];
  if (!def) return 0;

  let landingZ = 0; // Default table surface level

  for (const other of allObjects) {
    if (other.id === releasingObj.id || other.attachedToTool) continue;
    const otherDef = OBJECT_REGISTRY[other.typeId];
    if (!otherDef) continue;

    const dx = Math.abs(releasingObj.position[0] - other.position[0]);
    const dy = Math.abs(releasingObj.position[1] - other.position[1]);

    const overlapX = (def.dimensions.width + otherDef.dimensions.width) / 2;
    const overlapY = (def.dimensions.depth + otherDef.dimensions.depth) / 2;

    if (dx <= overlapX && dy <= overlapY) {
      // Resting on top of this object
      const topOfOther = other.position[2] + otherDef.dimensions.height;
      if (topOfOther > landingZ && topOfOther <= releasingObj.position[2] + 2) {
        landingZ = topOfOther;
      }
    }
  }

  return landingZ;
}
