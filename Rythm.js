/* =========================================================
   RYTHM.JS — IRONFRAME Mech Builder Engine
   Reads the pilot's part selections and generates the live
   mobile suit: recomputes the stat sheet and re-skins the
   preview diagram to match the equipped loadout.
   ========================================================= */
(function () {
    'use strict';

    /* ---- Starter chassis base stats ---- */
    var FRAMES = {
        vesper: { name: 'VESPER-A', class: 'Assault Frame', mobility: 82, armor: 54, firepower: 70 },
        bastion: { name: 'BASTION-K', class: 'Heavy Support', mobility: 38, armor: 93, firepower: 61 },
        wisp: { name: 'WISP-R', class: 'Recon Frame', mobility: 97, armor: 31, firepower: 45 }
    };

    /* ---- Part catalog: each slot offers options with stat deltas + a preview color ---- */
    var PARTS = {
        head: [
            { id: 'wide-sensor', label: 'Wide-Band Sensor', mobility: 0, armor: 0, firepower: 2, color: '#4a90c4' },
            { id: 'recon-optic', label: 'Recon Optic Array', mobility: 3, armor: -2, firepower: 0, color: '#7fd1ff' },
            { id: 'armored-dome', label: 'Armored Dome', mobility: -2, armor: 6, firepower: 0, color: '#c7d3dc' }
        ],
        shoulder: [
            { id: 'light-plate', label: 'Light Composite', mobility: 4, armor: -2, firepower: 0, color: '#4a90c4' },
            { id: 'reinforced', label: 'Reinforced Composite', mobility: -4, armor: 9, firepower: 0, color: '#ffb627' },
            { id: 'missile-pod', label: 'Missile Pod Mount', mobility: -1, armor: 2, firepower: 8, color: '#e8664a' }
        ],
        backpack: [
            { id: 'twin-thruster', label: 'Twin Thruster Pack', mobility: 8, armor: 0, firepower: 0, color: '#4a90c4' },
            { id: 'shield-gen', label: 'Shield Generator', mobility: -3, armor: 10, firepower: 0, color: '#7fd1ff' },
            { id: 'missile-rack', label: 'Deployable Missile Rack', mobility: -2, armor: 0, firepower: 9, color: '#e8664a' }
        ],
        right: [
            { id: 'beam-saber', label: 'Beam Saber', mobility: 1, armor: 0, firepower: 6, color: '#4a90c4' },
            { id: 'shield', label: 'Anti-Beam Shield', mobility: -2, armor: 8, firepower: 0, color: '#c7d3dc' },
            { id: 'beam-cannon', label: 'Beam Cannon', mobility: -3, armor: 0, firepower: 12, color: '#e8664a' }
        ],
        left: [
            { id: 'mid-rifle', label: 'Mid-Range Rifle', mobility: 0, armor: 0, firepower: 7, color: '#4a90c4' },
            { id: 'machine-gun', label: 'Machine Gun', mobility: 1, armor: -1, firepower: 5, color: '#ffb627' },
            { id: 'grapple', label: 'Grapple Claw', mobility: 2, armor: 1, firepower: 1, color: '#7fd1ff' }
        ]
    };

    function clamp(n) { return Math.max(0, Math.min(100, n)); }

    /**
     * Rythm.init(frameKey)
     * frameKey: 'vesper' | 'bastion' | 'wisp'
     * Wires up every element under [data-rythm-root] on the page.
     */
    function init(frameKey) {
        var frame = FRAMES[frameKey] || FRAMES.vesper;
        var currentFrameKey = frameKey || 'vesper';
        var root = document.querySelector('[data-rythm-root]');
        if (!root) return;

        var state = {};
        Object.keys(PARTS).forEach(function (slot) { state[slot] = 0; });

        // --- NEW: Restore from Cache (localStorage) if available ---
        var cacheKey = 'ironframe_loadout_' + currentFrameKey;
        var cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                var parsedCache = JSON.parse(cachedData);
                if (parsedCache && parsedCache.parts) {
                    Object.keys(PARTS).forEach(function (slot) {
                        var cachedPartId = parsedCache.parts[slot];
                        // Find the array index of the cached part ID
                        var partIndex = PARTS[slot].findIndex(function (p) { return p.id === cachedPartId; });
                        if (partIndex !== -1) {
                            state[slot] = partIndex;
                        }
                    });
                }
            } catch (e) {
                console.warn('Rythm: Failed to read loadout from cache.', e);
            }
        }

        // Wire up each <select data-slot="...">
        Object.keys(PARTS).forEach(function (slot) {
            var select = root.querySelector('select[data-slot="' + slot + '"]');
            if (!select) return;
            select.innerHTML = PARTS[slot].map(function (opt, i) {
                // Pre-select the cached option if it exists
                var isSelected = (i === state[slot]) ? ' selected' : '';
                return '<option value="' + i + '"' + isSelected + '>' + opt.label + '</option>';
            }).join('');

            select.addEventListener('change', function (e) {
                state[slot] = parseInt(e.target.value, 10);
                render();
            });
        });

        // Randomize button
        var randomBtn = root.querySelector('[data-rythm-random]');
        if (randomBtn) {
            randomBtn.addEventListener('click', function () {
                Object.keys(PARTS).forEach(function (slot) {
                    var idx = Math.floor(Math.random() * PARTS[slot].length);
                    state[slot] = idx;
                    var select = root.querySelector('select[data-slot="' + slot + '"]');
                    if (select) select.value = idx;
                });
                render();
            });
        }

        // Reset button
        var resetBtn = root.querySelector('[data-rythm-reset]');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                Object.keys(PARTS).forEach(function (slot) {
                    state[slot] = 0;
                    var select = root.querySelector('select[data-slot="' + slot + '"]');
                    if (select) select.value = 0;
                });
                render();
            });
        }

        // --- CHANGED: Save Loadout to Cache ---
        var saveBtn = root.querySelector('[data-rythm-save]');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var loadout = {
                    frame: currentFrameKey,
                    parts: {}
                };

                // Map current state indices to actual semantic part IDs
                Object.keys(PARTS).forEach(function (slot) {
                    loadout.parts[slot] = PARTS[slot][state[slot]].id;
                });

                // Save to browser's localStorage
                localStorage.setItem(cacheKey, JSON.stringify(loadout));

                // Optional: visual feedback for the user
                var originalText = saveBtn.textContent;
                saveBtn.textContent = 'Saved!';
                setTimeout(function () { saveBtn.textContent = originalText; }, 1500);
            });
        }

        function computeStats() {
            var mobility = frame.mobility, armor = frame.armor, firepower = frame.firepower;
            Object.keys(PARTS).forEach(function (slot) {
                var opt = PARTS[slot][state[slot]];
                mobility += opt.mobility;
                armor += opt.armor;
                firepower += opt.firepower;
            });
            return { mobility: clamp(mobility), armor: clamp(armor), firepower: clamp(firepower) };
        }

        function render() {
            var stats = computeStats();

            // Numeric stat readouts
            root.querySelectorAll('[data-stat]').forEach(function (el) {
                el.textContent = stats[el.getAttribute('data-stat')];
            });
            // Stat bar widths
            root.querySelectorAll('[data-bar]').forEach(function (el) {
                el.style.width = stats[el.getAttribute('data-bar')] + '%';
            });

            // Re-skin the preview SVG per equipped part
            Object.keys(PARTS).forEach(function (slot) {
                var opt = PARTS[slot][state[slot]];
                root.querySelectorAll('[data-preview="' + slot + '"]').forEach(function (el) {
                    el.setAttribute('stroke', opt.color);
                });
            });

            // Loadout label readouts
            Object.keys(PARTS).forEach(function (slot) {
                var opt = PARTS[slot][state[slot]];
                var label = root.querySelector('[data-readout="' + slot + '"]');
                if (label) label.textContent = opt.label;
            });

            // Frame identity
            var nameEl = root.querySelector('[data-frame-name]');
            var classEl = root.querySelector('[data-frame-class]');
            if (nameEl) nameEl.textContent = frame.name;
            if (classEl) classEl.textContent = frame.class;
        }

        render();
    }

    window.Rythm = { init: init };
})();