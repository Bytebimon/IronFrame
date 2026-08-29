/* =========================================================
   IronFrame pose library
   A small layer of NAMED poses built on top of animation.js
   (window.SuitAnimation). animation.js knows how to move limbs
   given raw numbers; this file just gives good combinations of
   those numbers memorable names, so callers can say "walk" or
   "attackSword" instead of repeating angle/speed literals.

   Load AFTER animation.js:
     <script src="animation.js"></script>
     <script src="poses.js"></script>

   Exposes window.Poses:
     Poses.apply(animator, name, overrides?)   -> apply one named pose
     Poses.applyState(animator, state)         -> apply movement + combat pose together
     Poses.movementPose(isMoving, isSprinting) -> resolve a pose name
     Poses.combatPose(weaponClass, isAttacking)-> resolve a pose name
     Poses.presets                             -> the raw preset table

   Because this sits on top of SuitAnimation's set()/update() API, it
   works identically for a locally-controlled Player, an AI Enemy, or
   a networked remote player — anything with a SuitAnimation
   `animator` can be driven by Poses. That's what makes it easy to
   reuse over multiplayer: a peer only needs to send a few cheap
   booleans/strings (moving, weaponClass, attacking) instead of full
   animation config, and the receiving client resolves that into a
   pose locally with Poses.applyState().
   ========================================================= */
(function () {
    'use strict';

    // Each preset is a PARTIAL SuitAnimation config: only the fields
    // that pose cares about. Poses.apply() merges it into the animator
    // via animator.set(), which itself does Object.assign onto the
    // running config — so a movement pose (walk/idle) and a combat pose
    // (weaponClass/attack) can be applied back-to-back in the same
    // frame without clobbering each other.
    const presets = {
        idle: { walk: false, idle: true, idleSpeed: 2, idleAmount: 2 },
        walk: { walk: true, idle: false, walkSpeed: 7, walkAngle: 28, legAngle: 22 },
        sprint: { walk: true, idle: false, walkSpeed: 11, walkAngle: 34, legAngle: 30 },

        aimRifle: { weaponClass: 'rifle', attack: false },
        readySword: { weaponClass: 'sword', attack: false },
        attackSword: { weaponClass: 'sword', attack: true, attackSpeed: 1.4, swingAngle: 60 },

        // Frame is destroyed / powered down — freeze the rig where it is.
        destroyed: { enabled: false }
    };

    function apply(animator, name, overrides) {
        if (!animator) return null;
        const preset = presets[name];
        if (!preset) {
            console.warn('[Poses] Unknown pose "' + name + '"');
            return animator;
        }
        animator.set(overrides ? Object.assign({}, preset, overrides) : preset);
        return animator;
    }

    // ---- Helpers to turn simple state into a pose name -------------

    function movementPose(isMoving, isSprinting) {
        if (isMoving) return isSprinting ? 'sprint' : 'walk';
        return 'idle';
    }

    function combatPose(weaponClass, isAttacking) {
        if (weaponClass === 'sword') return isAttacking ? 'attackSword' : 'readySword';
        return 'aimRifle';
    }

    // Applies BOTH the movement pose and the combat pose to an animator
    // in one call. This is the single entry point local players,
    // AI-driven enemies, and networked remote players should all use
    // every frame — pass in whatever you know about that mech's state.
    //
    //   Poses.applyState(animator, {
    //     moving: true,          // is it currently translating?
    //     sprinting: false,      // optional, defaults to false
    //     weaponClass: 'sword',  // 'sword' or 'rifle'
    //     attacking: false       // is an attack swing active?
    //   });
    function applyState(animator, state) {
        if (!animator || !state) return null;
        const moving = !!state.moving;
        const sprinting = !!state.sprinting;
        const weaponClass = state.weaponClass === 'sword' ? 'sword' : 'rifle';
        const attacking = !!state.attacking;

        apply(animator, movementPose(moving, sprinting));
        apply(animator, combatPose(weaponClass, attacking));
        return animator;
    }

    window.Poses = { presets, apply, applyState, movementPose, combatPose };
})();
