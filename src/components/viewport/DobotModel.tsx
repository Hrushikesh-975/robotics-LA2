'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDobotStore } from '@/lib/store/useDobotStore';
import { ROBOT_DIMENSIONS } from '@/lib/kinematics';

const DEG_TO_RAD = Math.PI / 180;

export const DobotModel: React.FC = () => {
  const { joints, endEffectorType, endEffectorActive } = useDobotStore();

  // Internal smoothed angles to achieve butter-smooth 60fps animation
  const currentJoints = useRef({
    j1: joints.j1,
    j2: joints.j2,
    j3: joints.j3,
    j4: joints.j4,
  });

  // Object refs for mechanical link transforms
  const turretRef = useRef<THREE.Group>(null);
  const rearArmRef = useRef<THREE.Group>(null);
  const forearmRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);
  const toolRef = useRef<THREE.Group>(null);
  const upperParallelogramRef = useRef<THREE.Group>(null);
  const lowerParallelogramRef = useRef<THREE.Group>(null);

  // Anodized aluminum & Dobot industrial materials
  const matCharcoal = new THREE.MeshStandardMaterial({
    color: '#252932',
    roughness: 0.35,
    metalness: 0.65,
  });
  const matSilver = new THREE.MeshStandardMaterial({
    color: '#d0d5dd',
    roughness: 0.25,
    metalness: 0.85,
  });
  const matBlueAccent = new THREE.MeshStandardMaterial({
    color: '#1890ff',
    roughness: 0.3,
    metalness: 0.5,
  });
  const matGoldJoint = new THREE.MeshStandardMaterial({
    color: '#cca048',
    roughness: 0.2,
    metalness: 0.9,
  });
  const matBlackRubber = new THREE.MeshStandardMaterial({
    color: '#1a1d24',
    roughness: 0.85,
    metalness: 0.05,
  });
  // Realistic industrial NBR nitrile suction rubber
  const matSuctionRubber = new THREE.MeshStandardMaterial({
    color: endEffectorActive ? '#15171c' : '#22262f',
    roughness: 0.9,
    metalness: 0.05,
  });
  // Brass / gold pneumatic threaded connector fitting
  const matBrassFitting = new THREE.MeshStandardMaterial({
    color: '#cca048',
    roughness: 0.25,
    metalness: 0.85,
  });

  useFrame((_, delta) => {
    // Smooth dampening factor (approximates ~25Hz spring damper)
    const factor = Math.min(1, delta * 18);

    currentJoints.current.j1 += (joints.j1 - currentJoints.current.j1) * factor;
    currentJoints.current.j2 += (joints.j2 - currentJoints.current.j2) * factor;
    currentJoints.current.j3 += (joints.j3 - currentJoints.current.j3) * factor;
    currentJoints.current.j4 += (joints.j4 - currentJoints.current.j4) * factor;

    const j1Rad = currentJoints.current.j1 * DEG_TO_RAD;
    const j2Rad = currentJoints.current.j2 * DEG_TO_RAD;
    const j3Rad = currentJoints.current.j3 * DEG_TO_RAD;
    const j4Rad = currentJoints.current.j4 * DEG_TO_RAD;

    // 1. Turret yaw: Joint 1 rotates around Three.js Y (Robot Z)
    if (turretRef.current) {
      turretRef.current.rotation.y = -j1Rad;
    }

    // 2. Rear arm pitch: Joint 2 rotates around local X axis
    // In local turret coordinates:
    // Local Z is forward (radial direction), local Y is up
    // Positive j2 tilts rear arm forward (+local Z, -local Y)
    if (rearArmRef.current) {
      rearArmRef.current.rotation.x = j2Rad;
    }

    // 3. Forearm pitch:
    // Forearm is connected at elbow: local position [0, L1, 0] along rear arm.
    // In Dobot Magician kinematics, forearm angle relative to horizontal is j3Rad (downwards).
    // In rearArmRef coordinate frame (which is already rotated by j2Rad),
    // the local rotation of forearm must be: j3Rad - j2Rad.
    if (forearmRef.current) {
      forearmRef.current.rotation.x = j3Rad - j2Rad;
    }

    // 4. Parallelogram rods to keep wrist level
    if (upperParallelogramRef.current) {
      // Runs parallel to rear arm
      upperParallelogramRef.current.rotation.x = j2Rad;
    }

    // 5. Wrist: parallelogram keeps wrist always vertical regardless of arm angles
    if (wristRef.current) {
      // Counteracts the net forearm pitch so the tool is always oriented plumb/level
      wristRef.current.rotation.x = -j3Rad;
    }

    // 6. Tool rotation (Joint 4 / R)
    if (toolRef.current) {
      toolRef.current.rotation.y = -j4Rad;
    }
  });

  const L0 = ROBOT_DIMENSIONS.baseHeight;    // 138
  const L1 = ROBOT_DIMENSIONS.rearArmLength; // 135
  const L2 = ROBOT_DIMENSIONS.forearmLength; // 147
  const L3 = ROBOT_DIMENSIONS.toolOffsetR;   // 60
  const L4 = ROBOT_DIMENSIONS.toolOffsetZ;   // 70

  return (
    <group position={[0, 0, 0]} name="DobotMagicianRobot">
      {/* ---------------- FIXED BASE ON TABLE ---------------- */}
      <group position={[0, 0, 0]}>
        {/* Anti-slip rubber base feet */}
        <mesh position={[0, 3, 0]} material={matBlackRubber}>
          <cylinderGeometry args={[84, 86, 6, 48]} />
        </mesh>
        {/* Main die-cast aluminum base housing */}
        <mesh position={[0, 24, 0]} material={matCharcoal} castShadow receiveShadow>
          <cylinderGeometry args={[78, 82, 36, 48]} />
        </mesh>
        {/* Top chamfer ring with Dobot blue accent */}
        <mesh position={[0, 44, 0]} material={matBlueAccent} castShadow>
          <cylinderGeometry args={[75, 78, 4, 48]} />
        </mesh>
        {/* Dobot front branding badge */}
        <mesh position={[0, 24, 80]} material={matSilver}>
          <boxGeometry args={[40, 12, 2]} />
        </mesh>
      </group>

      {/* ---------------- ROTATING TURRET (JOINT 1) ---------------- */}
      <group ref={turretRef} position={[0, 46, 0]}>
        {/* Turret swivel body */}
        <mesh position={[0, 26, 0]} material={matCharcoal} castShadow receiveShadow>
          <cylinderGeometry args={[65, 72, 52, 48]} />
        </mesh>

        {/* Dual shoulder bracket towers reaching up to Joint 2 (L0 = 138 mm from table) */}
        {/* Height from 46 + 26 = 72 mm up to 138 mm (delta = 92 mm from turret base) */}
        {/* Left shoulder tower */}
        <mesh position={[-36, 56, 0]} material={matCharcoal} castShadow>
          <boxGeometry args={[14, 76, 54]} />
        </mesh>
        {/* Right shoulder tower */}
        <mesh position={[36, 56, 0]} material={matCharcoal} castShadow>
          <boxGeometry args={[14, 76, 54]} />
        </mesh>

        {/* Stepper motor hubs with brass joint caps at shoulder axis (L0 = 138 - 46 = 92 mm) */}
        <mesh position={[-44, 92, 0]} rotation={[0, 0, Math.PI / 2]} material={matGoldJoint}>
          <cylinderGeometry args={[20, 20, 8, 32]} />
        </mesh>
        <mesh position={[44, 92, 0]} rotation={[0, 0, Math.PI / 2]} material={matGoldJoint}>
          <cylinderGeometry args={[20, 20, 8, 32]} />
        </mesh>

        {/* ---------------- REAR ARM (JOINT 2 / L1 = 135 mm) ---------------- */}
        {/* Shoulder axis pivot at [0, 92, 0] relative to turret */}
        <group ref={rearArmRef} position={[0, 92, 0]}>
          {/* Main twin aluminum booms */}
          <mesh position={[-24, L1 / 2, 0]} material={matSilver} castShadow>
            <boxGeometry args={[10, L1, 24]} />
          </mesh>
          <mesh position={[24, L1 / 2, 0]} material={matSilver} castShadow>
            <boxGeometry args={[10, L1, 24]} />
          </mesh>
          {/* Rear arm cross brace */}
          <mesh position={[0, L1 * 0.45, 0]} material={matCharcoal} castShadow>
            <boxGeometry args={[44, 16, 18]} />
          </mesh>
          {/* Rear counterbalance weight styling */}
          <mesh position={[0, -18, -12]} material={matCharcoal} castShadow>
            <boxGeometry args={[40, 24, 22]} />
          </mesh>

          {/* Elbow Joint (J3) Pivot at top of Rear Arm: [0, L1, 0] */}
          {/* Elbow brass joint bearings */}
          <mesh position={[-28, L1, 0]} rotation={[0, 0, Math.PI / 2]} material={matGoldJoint}>
            <cylinderGeometry args={[16, 16, 6, 32]} />
          </mesh>
          <mesh position={[28, L1, 0]} rotation={[0, 0, Math.PI / 2]} material={matGoldJoint}>
            <cylinderGeometry args={[16, 16, 6, 32]} />
          </mesh>

          {/* ---------------- FOREARM (JOINT 3 / L2 = 147 mm) ---------------- */}
          <group ref={forearmRef} position={[0, L1, 0]}>
            {/* Forearm links extending forward along local Z */}
            <mesh position={[-18, 0, L2 / 2]} material={matSilver} castShadow>
              <boxGeometry args={[8, 18, L2]} />
            </mesh>
            <mesh position={[18, 0, L2 / 2]} material={matSilver} castShadow>
              <boxGeometry args={[8, 18, L2]} />
            </mesh>
            {/* Forearm center connector */}
            <mesh position={[0, 0, L2 * 0.5]} material={matCharcoal} castShadow>
              <boxGeometry args={[32, 14, 24]} />
            </mesh>

            {/* Parallelogram secondary leveling tie rod */}
            <mesh position={[0, 22, L2 / 2]} rotation={[Math.PI / 2, 0, 0]} material={matCharcoal} castShadow>
              <cylinderGeometry args={[3, 3, L2, 16]} />
            </mesh>

            {/* ---------------- WRIST & TOOL BRACKET (at end of forearm [0, 0, L2]) ---------------- */}
            <group ref={wristRef} position={[0, 0, L2]}>
              {/* Wrist pivot hinge */}
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matGoldJoint}>
                <cylinderGeometry args={[14, 14, 38, 32]} />
              </mesh>

              {/* Tool forward extension arm (L3 = 60 mm forward) */}
              <mesh position={[0, 0, L3 / 2]} material={matCharcoal} castShadow>
                <boxGeometry args={[26, 22, L3]} />
              </mesh>

              {/* End-Effector Stepper Mount at [0, 0, L3] */}
              <group position={[0, 0, L3]}>
                {/* Stepper motor cylinder (Joint 4 / R axis) */}
                <mesh position={[0, 8, 0]} material={matCharcoal} castShadow>
                  <cylinderGeometry args={[18, 18, 28, 32]} />
                </mesh>
                <mesh position={[0, 24, 0]} material={matBlueAccent}>
                  <cylinderGeometry args={[16, 16, 4, 32]} />
                </mesh>

                {/* ---------------- TOOL HEAD ROTATING SHAFT (JOINT 4 / R) ---------------- */}
                <group ref={toolRef} position={[0, -6, 0]}>
                  {/* Tool chuck / quick release clamp */}
                  <mesh position={[0, 0, 0]} material={matSilver}>
                    <cylinderGeometry args={[12, 14, 12, 24]} />
                  </mesh>

                  {/* ---------------- REALISTIC MECHANICAL SUCTION CUP END EFFECTOR (L4 = 70 mm drop) ---------------- */}
                  {endEffectorType === 'suction' && (
                    <group position={[0, -6, 0]}>
                      {/* Upper quick-mount hex nut fitting */}
                      <mesh position={[0, -2, 0]} material={matBrassFitting} castShadow>
                        <cylinderGeometry args={[7, 7, 4, 6]} />
                      </mesh>

                      {/* Precision stainless-steel vacuum stem tube */}
                      <mesh position={[0, -21, 0]} material={matSilver} castShadow>
                        <cylinderGeometry args={[2.5, 2.5, 36, 24]} />
                      </mesh>

                      {/* Pneumatic tube barb connector collar */}
                      <mesh position={[0, -12, 0]} material={matBrassFitting}>
                        <cylinderGeometry args={[4.5, 4.5, 6, 24]} />
                      </mesh>

                      {/* Lower suction nozzle adapter housing */}
                      <mesh position={[0, -40, 0]} material={matSilver} castShadow>
                        <cylinderGeometry args={[5, 6, 8, 24]} />
                      </mesh>

                      {/* Hex locknut securing rubber cup */}
                      <mesh position={[0, -44, 0]} material={matBrassFitting}>
                        <cylinderGeometry args={[6, 6, 2.5, 6]} />
                      </mesh>

                      {/* ---------------- INDUSTRIAL SUCTION NOZZLE (BELLOWS & HOLLOW CUP: lip at -70mm) ---------------- */}
                      <group position={[0, -45, 0]}>
                        {/* Upper neck convolution */}
                        <mesh position={[0, -3, 0]} material={matSuctionRubber} castShadow>
                          <cylinderGeometry args={[4.5, 7.5, 4, 32]} />
                        </mesh>

                        {/* Middle bellows expansion ring */}
                        <mesh position={[0, -6, 0]} material={matSuctionRubber} castShadow>
                          <cylinderGeometry args={[7.5, 9, 3, 32]} />
                        </mesh>

                        {/* Main flared suction cup body tapering to rim */}
                        <mesh position={[0, -10, 0]} material={matSuctionRubber} castShadow>
                          <cylinderGeometry args={[9, 13.5, 6, 32]} />
                        </mesh>

                        {/* Flexible sealing lip (outer rim at L4 = 70mm from wrist) */}
                        <mesh position={[0, -13, 0]} material={matSuctionRubber} castShadow>
                          <cylinderGeometry args={[13.5, 14, 2, 32]} />
                        </mesh>

                        {/* Inner recessed hollow vacuum cavity (actual physical depression) */}
                        <mesh position={[0, -13.2, 0]}>
                          <cylinderGeometry args={[10.5, 7, 2.5, 32]} />
                          <meshStandardMaterial color="#0b0d11" roughness={0.95} />
                        </mesh>

                        {/* Central vacuum orifice hole */}
                        <mesh position={[0, -13.5, 0]}>
                          <cylinderGeometry args={[2.5, 2.5, 2.2, 24]} />
                          <meshBasicMaterial color="#000000" />
                        </mesh>

                        {/* Subtle Active Vacuum Indicator Ring (tasteful, non-distracting) */}
                        <mesh position={[0, -1, 0]}>
                          <ringGeometry args={[4.6, 5.2, 24]} />
                          <meshBasicMaterial
                            color={endEffectorActive ? '#10b981' : '#374151'}
                            side={THREE.DoubleSide}
                          />
                        </mesh>
                      </group>
                    </group>
                  )}

                  {/* ---------------- GRIPPER END EFFECTOR ---------------- */}
                  {endEffectorType === 'gripper' && (
                    <group position={[0, -6, 0]}>
                      {/* Gripper actuator body */}
                      <mesh position={[0, -18, 0]} material={matCharcoal} castShadow>
                        <boxGeometry args={[36, 26, 26]} />
                      </mesh>
                      {/* Gripper pneumatic cylinder */}
                      <mesh position={[0, -18, -16]} material={matSilver} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[8, 8, 16, 24]} />
                      </mesh>
                      {/* Dual mechanical finger jaws */}
                      <mesh
                        position={[endEffectorActive ? -7 : -15, -45, 0]}
                        material={matSilver}
                        castShadow
                      >
                        <boxGeometry args={[6, 32, 14]} />
                      </mesh>
                      <mesh
                        position={[endEffectorActive ? 7 : 15, -45, 0]}
                        material={matSilver}
                        castShadow
                      >
                        <boxGeometry args={[6, 32, 14]} />
                      </mesh>
                      {/* Rubber contact pads */}
                      <mesh position={[endEffectorActive ? -4 : -12, -48, 0]} material={matBlackRubber}>
                        <boxGeometry args={[2, 20, 12]} />
                      </mesh>
                      <mesh position={[endEffectorActive ? 4 : 12, -48, 0]} material={matBlackRubber}>
                        <boxGeometry args={[2, 20, 12]} />
                      </mesh>
                    </group>
                  )}

                  {/* ---------------- LASER END EFFECTOR ---------------- */}
                  {endEffectorType === 'laser' && (
                    <group position={[0, -6, 0]}>
                      {/* Heatsink module */}
                      <mesh position={[0, -22, 0]} material={matCharcoal} castShadow>
                        <boxGeometry args={[28, 36, 28]} />
                      </mesh>
                      {/* Laser aperture lens */}
                      <mesh position={[0, -42, 0]} material={matGoldJoint}>
                        <cylinderGeometry args={[8, 10, 6, 24]} />
                      </mesh>
                      {/* Glowing red beam when laser is active */}
                      {endEffectorActive && (
                        <group position={[0, -45, 0]}>
                          <mesh position={[0, -75, 0]}>
                            <cylinderGeometry args={[1, 1.5, 150, 16]} />
                            <meshBasicMaterial color="#ff0033" transparent opacity={0.8} />
                          </mesh>
                          <mesh position={[0, -150, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <ringGeometry args={[0, 8, 32]} />
                            <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
                          </mesh>
                        </group>
                      )}
                    </group>
                  )}

                  {/* ---------------- PEN HOLDER END EFFECTOR ---------------- */}
                  {endEffectorType === 'pen' && (
                    <group position={[0, -6, 0]}>
                      {/* Pen clamp bracket */}
                      <mesh position={[0, -16, 0]} material={matCharcoal} castShadow>
                        <cylinderGeometry args={[8, 9, 20, 24]} />
                      </mesh>
                      {/* Ballpoint / marker pen body */}
                      <mesh position={[0, -36, 0]} material={matSilver} castShadow>
                        <cylinderGeometry args={[4.5, 4.5, 40, 24]} />
                      </mesh>
                      {/* Pen tip cone */}
                      <mesh position={[0, -58, 0]} material={matBlueAccent}>
                        <cylinderGeometry args={[4.5, 0.5, 12, 24]} />
                      </mesh>
                      {/* Nib contact point */}
                      <mesh position={[0, -64, 0]} material={matBlackRubber}>
                        <sphereGeometry args={[1, 12, 12]} />
                      </mesh>
                    </group>
                  )}

                  {/* ---------------- TCP (Tool Center Point) GIZMO ---------------- */}
                  <group position={[0, -64, 0]}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[1.5, 3.5, 16]} />
                      <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
