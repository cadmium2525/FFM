/**
 * Hand-authored art direction for every spell in the battle database.
 * A blueprint controls an additional lightweight pixel-art layer; it is not
 * used for battle logic.  The combinations are semantic (flames rise, gravity
 * implodes, time rewinds) instead of hashes derived from record order.
 */
const art = (motif, motion, layers, rotation, spread, scale, impact, variant) => Object.freeze({ motif, motion, layers, rotation, spread, scale, impact, variant });

const beat = (role, pieces = 1) => Object.freeze({ role, pieces });
const scene = (id, beats, scale = 1) => Object.freeze({ id, beats: Object.freeze(beats), scale });
const PIXEL_SEQUENCE_FALLBACK = art('pixel-sequence', 'timeline', 1, 0, 96, 1, 'timeline-impact', 0);

/**
 * The first production storyboard set.  Unlike SPELL_ART_BLUEPRINTS, which
 * supplies a compact fallback grammar for every database entry, these scenes
 * produce spell-specific layer trees.  A scene is intentionally named after
 * one spell only: tiers do not share a DOM skeleton, so Fire/Fira/Firaga (and
 * the other commonly compared spells) cannot collapse into a palette swap.
 */
export const SPELL_CHOREOGRAPHIES = Object.freeze({
  magic_fire: scene('fire', [beat('kindle', 3), beat('flame-tongue', 4), beat('ember-burst', 5)], .86),
  magic_fira: scene('fira', [beat('fire-ring', 3), beat('spiral-flame', 6), beat('cross-burst', 4)], 1.02),
  magic_firaga: scene('firaga', [beat('inferno-gate', 2), beat('fire-pillar', 7), beat('crown-burst', 6)], 1.2),

  magic_blizzard: scene('blizzard', [beat('cold-mist', 3), beat('ice-needle', 5), beat('frost-crack', 4)], .88),
  magic_blizzara: scene('blizzara', [beat('freeze-ring', 2), beat('ice-spire', 6), beat('shatter', 6)], 1.04),
  magic_blizzaga: scene('blizzaga', [beat('snow-veil', 4), beat('glacier-crown', 7), beat('avalanche-shard', 7)], 1.2),

  magic_thunder: scene('thunder', [beat('storm-mark', 1), beat('bolt', 2), beat('spark', 5)], .88),
  magic_thundara: scene('thundara', [beat('charge-ring', 2), beat('forked-bolt', 4), beat('arc-node', 6)], 1.04),
  magic_thundaga: scene('thundaga', [beat('storm-cage', 3), beat('thunder-column', 6), beat('ground-arc', 7)], 1.2),

  magic_cure: scene('cure', [beat('life-seed', 3), beat('heal-drop', 4), beat('soft-cross', 1)], .88),
  magic_cura: scene('cura', [beat('double-halo', 2), beat('life-petal', 6), beat('heal-cross', 1)], 1.04),
  magic_curaga: scene('curaga', [beat('sanctuary-ring', 3), beat('life-column', 6), beat('radiant-cross', 1)], 1.18),
  magic_raise: scene('raise', [beat('soul-mark', 4), beat('return-soul', 1), beat('revive-halo', 2)], 1.08),
  magic_protect: scene('protect', [beat('shield-trace', 6), beat('ward-lattice', 3), beat('ward-lock', 2)], 1.02),
  magic_holy: scene('holy', [beat('holy-stars', 7), beat('judgment-column', 5), beat('radiant-cross', 1)], 1.28),
  magic_shell: scene('shell', [beat('prism-facet', 5), beat('shell-weave', 5), beat('prism-lock', 2)], 1.06),
  magic_reflect: scene('reflect', [beat('mirror-shard', 6), beat('mirror-form', 1), beat('reflection-line', 2)], 1.12),

  magic_haste: scene('haste', [beat('clock-face', 1), beat('fast-hand', 2), beat('speed-trail', 6)], 1),
  magic_slow: scene('slow', [beat('clock-face', 1), beat('slow-hand', 2), beat('time-weight', 4)], .96),
  magic_stop: scene('stop', [beat('clock-face', 1), beat('frozen-hand', 2), beat('glass-lock', 4)], 1.08),
  magic_comet: scene('comet', [beat('comet-tail', 4), beat('comet-core', 1), beat('crater', 5)], 1.02),
  magic_meteor: scene('meteor', [beat('sky-rift', 2), beat('meteor-body', 5), beat('meteor-crater', 7)], 1.24),
  magic_gravity: scene('gravity', [beat('gravity-lens', 3), beat('compress-ring', 3), beat('half-crush', 2)], 1.08),
  magic_graviga: scene('graviga', [beat('black-lens', 5), beat('triple-collapse', 5), beat('three-quarter-crush', 3)], 1.22),
  magic_return: scene('return', [beat('hourglass', 2), beat('rewind-line', 12), beat('timeline-snap', 16)], 1.24),

  magic_missile: scene('missile', [beat('target-ring', 3), beat('lock-tick', 4), beat('missile-body', 1), beat('quarter-break', 4)], 1.02),
  magic_flare: scene('flare', [beat('star-dust', 6), beat('gravity-core', 3), beat('white-nova', 8)], 1.25),
  magic_level_5_death: scene('level-5-death', [beat('level-five', 5), beat('death-gate', 2), beat('soul-cut', 5)], 1.18),

  magic_shiva: scene('shiva', [beat('diamond-seal', 3), beat('ice-curtain', 6), beat('diamond-dust', 8)], 1.26),
  magic_ifrit: scene('ifrit', [beat('horn-seal', 2), beat('hellfire-wave', 7), beat('hellfire-column', 6)], 1.28),
  magic_bahamut: scene('bahamut', [beat('dragon-seal', 3), beat('mega-charge', 5), beat('mega-beam', 6)], 1.34),

  ability_steal: scene('steal', [beat('vanish-step', 4), beat('snatch-hand', 1), beat('return-glint', 1)], .96),
  ability_jump: scene('jump', [beat('sky-launch', 3), beat('lance-drop', 1), beat('ground-star', 8)], 1.08),
  ability_rapid_fire: scene('rapid-fire', [beat('aim-ring', 1), beat('fourfold-line', 4), beat('impact-star', 4)], 1.08),
  ability_zeninage: scene('zeninage', [beat('coin-draw', 4), beat('gil-rain', 14), beat('coin-burst', 8)], 1.08),
  ability_mix: scene('mix', [beat('reagent-vial', 2), beat('compound-orbit', 8), beat('mix-burst', 12)], 1.02),

  'atomic-ray': scene('atomic-ray', [beat('reactor-ring', 6), beat('ray-grid', 5), beat('atomic-burst', 18)], 1.14),
  'wave-cannon': scene('wave-cannon', [beat('charge-lines', 7), beat('wave-core', 1), beat('cannon-band', 5)], 1.25),
  blaster: scene('blaster', [beat('binary-reticle', 2), beat('cross-lock', 2), beat('blaster-burst', 8)], 1.08),
  maelstrom: scene('maelstrom', [beat('vortex-ring', 6), beat('critical-pull', 19), beat('critical-line', 2)], 1.22),
  'delta-attack': scene('delta-attack', [beat('delta-node', 3), beat('triangle-bind', 3), beat('stone-prison', 6)], 1.14),

  magic_1000_needles: scene('1000-needles', [beat('thousand-count', 4), beat('needle-fan', 20), beat('fixed-impact', 1)], 1.12),
  magic_white_wind: scene('white-wind', [beat('white-feather', 13), beat('party-sweep', 4), beat('white-heal', 12)], 1.18),
  magic_aqua_breath: scene('aqua-breath', [beat('water-orb', 6), beat('breath-band', 7), beat('tidal-impact', 14)], 1.26),
  magic_mighty_guard: scene('mighty-guard', [beat('triple-shield', 3), beat('field-assemble', 3), beat('mighty-lock', 12)], 1.26),
  magic_goblin_punch: scene('goblin-punch', [beat('knuckle-mark', 1), beat('goblin-fist', 1), beat('level-impact', 10)], 1.02),
  magic_magic_hammer: scene('magic-hammer', [beat('mana-nail', 6), beat('mana-hammer', 1), beat('mp-shatter', 8)], 1.12),
  magic_aero: scene('aero', [beat('wind-seed', 4), beat('single-crescent', 1), beat('air-cut', 8)], .96),
  magic_aera: scene('aera', [beat('wind-tunnel', 4), beat('cross-crescent', 2), beat('cross-impact', 12)], 1.1),
  magic_aeroga: scene('aeroga', [beat('pressure-eye', 1), beat('tornado-ring', 8), beat('vacuum-impact', 14)], 1.24),
  magic_flame_thrower: scene('flame-thrower', [beat('ignition-nozzle', 1), beat('flame-jet', 5), beat('burn-line', 6)], 1.16),
  magic_time_slip: scene('time-slip', [beat('dream-clock', 6), beat('slipping-hourglass', 2), beat('sleep-age-lock', 4)], 1.16),
  magic_death_claw: scene('death-claw', [beat('shadow-palm', 1), beat('claw-rake', 4), beat('critical-grip', 8)], 1.18),
  magic_mind_blast: scene('mind-blast', [beat('mind-eye', 1), beat('neural-knot', 10), beat('psyche-wave', 5)], 1.18),
  magic_flash: scene('flash', [beat('light-aperture', 8), beat('whiteout', 1), beat('blind-eye', 1)], 1.14),
  magic_roulette: scene('roulette', [beat('unit-marker', 4), beat('roulette-wheel', 8), beat('random-cut', 6)], 1.22),
  magic_self_destruct: scene('self-destruct', [beat('caster-core', 1), beat('critical-crack', 9), beat('sacrifice-burst', 20)], 1.28),
  magic_vampire: scene('vampire', [beat('fang-mark', 1), beat('blood-return', 5), beat('life-restore', 8)], 1.18),
  magic_question_marks: scene('question-marks', [beat('broken-question', 3), beat('glitch-line', 8), beat('unknown-impact', 7)], 1.08),
  magic_moon_flute: scene('moon-flute', [beat('moon-crescent', 1), beat('lunar-note', 7), beat('berserk-wave', 4)], 1.22),
  magic_lilliputian_lyric: scene('lilliputian-lyric', [beat('music-staff', 5), beat('shrinking-note', 1), beat('tiny-lock', 1)], 1.08),
  magic_pond_s_chorus: scene('ponds-chorus', [beat('pond-ripple', 4), beat('frog-song', 1), beat('toad-lock', 5)], 1.1),
  magic_level_4_graviga: scene('level-4-graviga', [beat('level-four', 1), beat('gravity-well', 4), beat('fourfold-impact', 16)], 1.24),
  magic_doom: scene('doom', [beat('doom-clock', 1), beat('countdown-digit', 3), beat('death-sentence', 1)], 1.2),
  magic_level_2_old: scene('level-2-old', [beat('level-two', 1), beat('double-hourglass', 2), beat('age-lines', 7)], 1.2),
  magic_transfusion: scene('transfusion', [beat('soul-link', 2), beat('life-mana-stream', 10), beat('ally-restore', 12), beat('caster-fade', 7)], 1.24),
  magic_level_3_flare: scene('level-3-flare', [beat('level-three', 1), beat('triple-star-core', 3), beat('threefold-nova', 27)], 1.3),
  magic_off_guard: scene('off-guard', [beat('defense-lattice', 10), beat('shield-fracture', 6), beat('armor-shard', 13)], 1.12),
  magic_dark_spark: scene('dark-spark', [beat('level-lens', 3), beat('dark-bisect', 2), beat('half-level', 2)], 1.16),
  magic_phoenix: scene('phoenix', [beat('rebirth-crystal', 1), beat('flame-wing-sigil', 10), beat('enemy-flare', 15), beat('ally-rise', 7)], 1.38),
  magic_sylph: scene('sylph', [beat('wind-soul-crystal', 1), beat('life-feather', 9), beat('ally-return', 8)], 1.24),
  magic_odin: scene('odin', [beat('war-crystal', 1), beat('judgment-line', 2), beat('zantetsu-or-spear', 7)], 1.38),
  magic_golem: scene('golem', [beat('earth-soul-crystal', 1), beat('stone-slab', 4), beat('party-wall', 5)], 1.3),
  magic_carbuncle: scene('carbuncle', [beat('jewel-soul-crystal', 1), beat('prism-mirror', 5), beat('party-reflect', 8)], 1.32),
  magic_quick: scene('quick', [beat('double-clock', 2), beat('time-gate', 2), beat('two-actions', 2)], 1.22),
  magic_mute: scene('mute', [beat('sound-field', 5), beat('cancel-wave', 6), beat('silence-cross', 2)], 1.2),
  magic_banish: scene('banish', [beat('void-aperture', 8), beat('folding-target', 1), beat('erase-point', 10)], 1.22),
  magic_drain: scene('drain', [beat('life-mark', 1), beat('hp-droplet', 8), beat('red-return', 2)], 1.18),
  magic_osmose: scene('osmose', [beat('mana-mark', 1), beat('mp-rune', 12), beat('double-blue-return', 2)], 1.2),
  magic_mini: scene('mini', [beat('scale-frame', 2), beat('shrinking-silhouette', 1), beat('tiny-lock', 8)], 1.06),
  magic_toad: scene('toad', [beat('transform-ring', 6), beat('compressed-silhouette', 1), beat('hop-ripple', 4)], 1.08),
  magic_break: scene('break', [beat('stone-ray', 6), beat('silhouette-facet', 6), beat('petrify-prison', 5)], 1.2),
  magic_death: scene('death', [beat('death-gate', 1), beat('separated-soul', 1), beat('sever-line', 2)], 1.24),
  magic_arise: scene('arise', [beat('soul-fragment', 7), beat('spirit-reassembly', 1), beat('full-revival-column', 18)], 1.3),
  magic_blink: scene('blink', [beat('mirror-trace', 1), beat('afterimage', 3), beat('double-decoy', 2)], 1.14),
  magic_berserk: scene('berserk', [beat('rage-heartbeat', 4), beat('jagged-aura', 12), beat('overrun-crown', 14)], 1.16),
  magic_dispel: scene('dispel', [beat('buff-orbit', 4), beat('seal-peel', 4), beat('layer-shard', 12)], 1.18),
  magic_esuna: scene('esuna', [beat('status-knot', 6), beat('diagnosis-prism', 1), beat('multi-cleanse', 6)], 1.22),
  magic_confuse: scene('confuse', [beat('broken-compass', 8), beat('orbiting-silhouette', 3), beat('direction-scramble', 9)], 1.14),
});

export const SPELL_ART_BLUEPRINTS = Object.freeze({
  magic_cure: art('life-rune', 'rise', 4, 18, 56, 0.84, 'soft-ring', 1),
  magic_libra: art('scan-grid', 'sweep', 5, 0, 68, 0.92, 'reticle', 2),
  magic_poisona: art('cleanse-drop', 'expand', 4, -16, 52, 0.78, 'dissolve', 3),
  magic_silence: art('seal-glyph', 'snap', 5, 45, 48, 0.82, 'mute-ring', 4),
  magic_protect: art('barrier', 'assemble', 6, 30, 64, 0.96, 'hex-lock', 5),
  magic_mini: art('status-glyph', 'implode', 5, -25, 74, 0.72, 'shrink-star', 6),
  magic_cura: art('life-rune', 'orbit', 6, 36, 72, 1.02, 'double-ring', 7),
  magic_raise: art('soul-wing', 'rise', 7, 0, 66, 1.08, 'halo-return', 8),
  magic_confuse: art('status-glyph', 'spiral', 6, 72, 58, 0.88, 'broken-orbit', 9),
  magic_blink: art('afterimage', 'split', 6, 20, 76, 1.04, 'mirror-pop', 10),
  magic_shell: art('barrier', 'orbit', 7, 60, 70, 1.08, 'prism-lock', 11),
  magic_esuna: art('cleanse-drop', 'rain', 7, -35, 82, 1.12, 'prism-dissolve', 12),
  magic_curaga: art('life-rune', 'bloom', 8, 54, 92, 1.24, 'radiant-bloom', 13),
  magic_reflect: art('mirror', 'assemble', 7, 90, 78, 1.12, 'mirror-lock', 14),
  magic_berserk: art('status-glyph', 'pulse', 6, 12, 74, 1.08, 'rage-burst', 15),
  magic_arise: art('soul-wing', 'ascend', 8, 22, 96, 1.32, 'sun-halo', 16),
  magic_holy: art('holy-cross', 'descend', 8, 0, 104, 1.42, 'pillar', 17),
  magic_dispel: art('seal-glyph', 'unweave', 7, -50, 88, 1.14, 'shatter-ring', 18),

  magic_fire: art('flame', 'rise', 4, -18, 52, 0.82, 'ember-pop', 19),
  magic_blizzard: art('ice-shard', 'rain', 5, 12, 58, 0.86, 'frost-crack', 20),
  magic_thunder: art('lightning', 'descend', 4, -8, 50, 0.88, 'arc-pop', 21),
  magic_poison: art('venom-orb', 'seep', 5, 30, 60, 0.86, 'toxic-ring', 22),
  magic_sleep: art('moon-mist', 'drift', 5, -24, 70, 0.9, 'drowse-wave', 23),
  magic_toad: art('status-glyph', 'hop', 5, 40, 62, 0.84, 'ripple-pop', 24),
  magic_fira: art('flame', 'coil', 6, 25, 70, 1.04, 'fire-ring', 25),
  magic_blizzara: art('ice-shard', 'erupt', 6, -30, 76, 1.08, 'ice-crown', 26),
  magic_thundara: art('lightning', 'branch', 6, 18, 72, 1.08, 'forked-arc', 27),
  magic_drain: art('siphon', 'return', 6, -45, 76, 1.02, 'bloodless-pulse', 28),
  magic_break: art('stone', 'crystallize', 7, 15, 68, 1.1, 'stone-lock', 29),
  magic_bio: art('venom-orb', 'helix', 7, 56, 82, 1.12, 'bio-splash', 30),
  magic_firaga: art('flame', 'maelstrom', 8, 42, 98, 1.34, 'inferno-bloom', 31),
  magic_blizzaga: art('ice-shard', 'avalanche', 8, -62, 102, 1.36, 'glacier-break', 32),
  magic_thundaga: art('lightning', 'storm', 8, 70, 96, 1.38, 'thunder-cage', 33),
  magic_flare: art('star-core', 'collapse', 8, 135, 108, 1.48, 'white-nova', 34),
  magic_death: art('death-sigil', 'descend', 7, 180, 84, 1.2, 'soul-cut', 35),
  magic_osmose: art('siphon', 'double-return', 7, -90, 86, 1.08, 'mana-pulse', 36),

  magic_speed: art('clock', 'focus', 4, 20, 48, 0.8, 'time-lock', 37),
  magic_slow: art('clock', 'drag', 5, -30, 58, 0.88, 'slow-ring', 38),
  magic_regen: art('life-rune', 'heartbeat', 5, 45, 60, 0.92, 'green-pulse', 39),
  magic_mute: art('seal-glyph', 'field-expand', 6, 0, 110, 1.2, 'silent-field', 40),
  magic_haste: art('clock', 'accelerate', 6, 65, 68, 1.02, 'speed-lines', 41),
  magic_float: art('wind-ring', 'lift', 6, -18, 74, 1.06, 'air-cushion', 42),
  magic_gravity: art('gravity-well', 'implode', 6, 90, 72, 1.08, 'space-dent', 43),
  magic_stop: art('clock', 'freeze', 7, 0, 78, 1.12, 'glass-stop', 44),
  magic_teleport: art('portal', 'fold', 7, 40, 90, 1.18, 'iris-close', 45),
  magic_comet: art('meteor', 'diagonal-fall', 6, -35, 96, 1.14, 'crater-pop', 46),
  magic_slowga: art('clock', 'field-drag', 7, -70, 112, 1.22, 'slow-field', 47),
  magic_return: art('hourglass', 'rewind', 8, 180, 118, 1.28, 'timeline-snap', 48),
  magic_graviga: art('gravity-well', 'collapse', 8, 145, 102, 1.34, 'black-lens', 49),
  magic_hastega: art('clock', 'field-accelerate', 8, 95, 116, 1.28, 'speed-field', 50),
  magic_old: art('hourglass', 'drain', 6, -95, 76, 1.04, 'age-dust', 51),
  magic_meteor: art('meteor', 'meteor-rain', 8, 25, 126, 1.42, 'multi-crater', 52),
  magic_quick: art('clock', 'time-stop', 8, 270, 122, 1.38, 'double-turn', 53),
  magic_banish: art('portal', 'erase', 8, -140, 96, 1.3, 'void-iris', 54),

  magic_chocobo: art('summon-feather', 'charge', 6, -18, 86, 1.08, 'beak-comet', 55),
  magic_sylph: art('summon-feather', 'twin-return', 6, 40, 90, 1.1, 'healing-wing', 56),
  magic_remora: art('chain', 'bind', 6, 70, 72, 1.02, 'chain-lock', 57),
  magic_shiva: art('ice-crown', 'crystallize', 8, -40, 108, 1.34, 'diamond-dust', 58),
  magic_ramuh: art('staff-bolt', 'sky-strike', 8, 12, 110, 1.34, 'judgment-arc', 59),
  magic_ifrit: art('horned-flame', 'eruption', 8, 32, 112, 1.36, 'hellfire', 60),
  magic_titan: art('mountain-fist', 'heave', 8, -22, 120, 1.42, 'earth-shock', 61),
  magic_golem: art('guardian-slab', 'assemble', 8, 0, 118, 1.36, 'stone-wall', 62),
  magic_catoblepas: art('gaze-eye', 'focus', 7, 110, 88, 1.18, 'petrify-gaze', 63),
  magic_carbuncle: art('prism-jewel', 'facet-bloom', 8, 45, 120, 1.38, 'reflect-field', 64),
  magic_syldra: art('tidal-wing', 'serpentine', 8, -55, 124, 1.4, 'wind-tide', 65),
  magic_odin: art('spear-wheel', 'cleave', 8, 90, 118, 1.42, 'zantetsu-line', 66),
  magic_phoenix: art('rebirth-wing', 'ascend', 8, 18, 132, 1.48, 'rebirth-flare', 67),
  magic_leviathan: art('abyss-spiral', 'tidal-rise', 8, -100, 136, 1.5, 'tsunami', 68),
  magic_bahamut: art('megaflare', 'beam-charge', 8, 0, 142, 1.56, 'mega-flare', 69),

  magic_goblin_punch: art('impact-fist', 'straight', 4, 8, 46, 0.8, 'comic-hit', 70),
  magic_roulette: art('death-sigil', 'roulette', 7, 360, 108, 1.18, 'random-cut', 71),
  magic_self_destruct: art('star-core', 'caster-collapse', 8, 0, 126, 1.42, 'sacrifice-burst', 72),
  magic_vampire: art('siphon', 'fang-return', 6, -32, 78, 1.02, 'scarlet-thread', 73),
  magic_question_marks: art('broken-glyph', 'stutter', 5, 77, 66, 0.96, 'unknown-hit', 74),
  magic_magic_hammer: art('mana-hammer', 'swing', 6, -55, 74, 1.06, 'mana-crack', 75),
  magic_moon_flute: art('moon-mist', 'crescendo', 7, 22, 112, 1.2, 'lunar-wave', 76),
  magic_aero: art('wind-ring', 'slash', 4, -28, 58, 0.84, 'air-cut', 77),
  magic_flame_thrower: art('flame-jet', 'sweep', 6, 14, 88, 1.08, 'burn-line', 78),
  magic_lilliputian_lyric: art('music-note', 'shrink-song', 5, 38, 72, 0.9, 'tiny-note', 79),
  magic_pond_s_chorus: art('music-note', 'hop-song', 5, -42, 76, 0.92, 'pond-ripple', 80),
  magic_mind_blast: art('mind-eye', 'pulse', 7, 90, 86, 1.14, 'neural-break', 81),
  magic_flash: art('light-burst', 'screen-flash', 7, 0, 124, 1.3, 'blind-star', 82),
  magic_missile: art('target-reticle', 'lock-drop', 7, 45, 84, 1.16, 'quarter-break', 83),
  magic_level_4_graviga: art('number-sigil', 'fourfold-collapse', 8, 144, 116, 1.28, 'level-four', 84),
  magic_time_slip: art('hourglass', 'sleep-rewind', 7, -120, 92, 1.16, 'dream-age', 85),
  magic_aera: art('wind-ring', 'cross-slash', 6, 32, 82, 1.06, 'air-cross', 86),
  magic_doom: art('death-sigil', 'countdown', 7, 0, 88, 1.18, 'doom-clock', 87),
  magic_level_2_old: art('number-sigil', 'double-age', 7, 72, 106, 1.2, 'level-two', 88),
  magic_transfusion: art('soul-wing', 'caster-to-ally', 8, 28, 110, 1.3, 'life-transfer', 89),
  magic_level_3_flare: art('number-star', 'triple-collapse', 8, 108, 120, 1.38, 'level-three-nova', 90),
  magic_off_guard: art('broken-shield', 'unweave', 6, -24, 76, 1.04, 'armor-crack', 91),
  magic_death_claw: art('death-claw', 'rake', 7, 35, 88, 1.2, 'critical-grip', 92),
  magic_level_5_death: art('number-sigil', 'fivefold-judgment', 8, 180, 124, 1.42, 'level-five-death', 93),
  magic_aeroga: art('wind-ring', 'tornado', 8, -160, 104, 1.32, 'vacuum-cyclone', 94),
  magic_1000_needles: art('needle-fan', 'barrage', 8, 15, 112, 1.24, 'thousand-hit', 95),
  magic_dark_spark: art('dark-lens', 'halve', 7, 80, 84, 1.14, 'level-break', 96),
  magic_white_wind: art('white-feather', 'party-sweep', 8, -20, 126, 1.34, 'white-heal', 97),
  magic_aqua_breath: art('water-wave', 'breath-surge', 8, 12, 132, 1.42, 'desert-tide', 98),
  magic_mighty_guard: art('triple-shield', 'field-assemble', 8, 60, 138, 1.46, 'mighty-lock', 99),
});

export function spellArtForAction(action = {}) {
  const ids = [action.visualId, action.sourceId, action.id]
    .filter(Boolean)
    .flatMap((id) => [String(id), String(id).replace(/^dual-/, '').replace(/^call-/, '')]);
  for (const id of ids) if (SPELL_ART_BLUEPRINTS[id]) return SPELL_ART_BLUEPRINTS[id];
  return null;
}

export function spellChoreographyForAction(action = {}) {
  const ids = [action.visualId, action.sourceId, action.id]
    .filter(Boolean)
    .flatMap((id) => [String(id), String(id).replace(/^dual-/, '').replace(/^call-/, '')]);
  const id = ids.find((candidate) => SPELL_CHOREOGRAPHIES[candidate]);
  return id ? SPELL_CHOREOGRAPHIES[id] : null;
}

export function spellChoreographyDuration(action = {}) {
  const choreography = spellChoreographyForAction(action);
  const spec = choreography ? SPELL_PIXEL_SEQUENCES[choreography.id] : null;
  return spec ? Math.round((spec.frameCount / spec.fps) * 1000) : null;
}

export function createSpellArtElement(action = {}) {
  const choreography = spellChoreographyForAction(action);
  const blueprint = spellArtForAction(action) ?? (choreography ? PIXEL_SEQUENCE_FALLBACK : null);
  if (!blueprint || typeof document === 'undefined') return null;
  const layer = document.createElement('span');
  layer.className = [
    'fx-spell-art',
    `spell-motif-${blueprint.motif}`,
    `spell-motion-${blueprint.motion}`,
    `spell-impact-${blueprint.impact}`,
    choreography ? 'spell-scene' : '',
    choreography ? `scene-${choreography.id}` : '',
  ].filter(Boolean).join(' ');
  layer.dataset.spellArt = String(action.sourceId ?? action.id ?? 'spell');
  if (choreography) layer.dataset.spellScene = choreography.id;
  layer.style.setProperty('--spell-layers', String(blueprint.layers));
  layer.style.setProperty('--spell-rotation', `${blueprint.rotation}deg`);
  layer.style.setProperty('--spell-rotation-negative', `${-blueprint.rotation}deg`);
  layer.style.setProperty('--spell-rotation-quarter-negative', `${-blueprint.rotation * 0.25}deg`);
  layer.style.setProperty('--spell-spread', `${blueprint.spread}px`);
  const sceneScale = choreography?.scale ?? blueprint.scale;
  layer.style.setProperty('--spell-scale', String(sceneScale));
  layer.style.setProperty('--spell-scale-pop', String(sceneScale * 1.16));
  layer.style.setProperty('--spell-variant', String(blueprint.variant));
  if (choreography) {
    const canvas = createSpellCanvas(choreography.id);
    if (canvas) layer.appendChild(canvas);
    layer.setAttribute('aria-hidden', 'true');
    return layer;
  }
  for (let index = 0; index < blueprint.layers; index += 1) {
    const piece = document.createElement('i');
    piece.style.setProperty('--spell-piece', String(index));
    piece.style.setProperty('--spell-piece-angle', `${blueprint.rotation + (360 / blueprint.layers) * index}deg`);
    piece.style.setProperty('--spell-piece-angle-negative', `${-(blueprint.rotation + (360 / blueprint.layers) * index)}deg`);
    piece.style.setProperty('--spell-piece-angle-plus', `${blueprint.rotation + (360 / blueprint.layers) * index + 80}deg`);
    piece.style.setProperty('--spell-radius', `${-blueprint.spread * 0.48}px`);
    piece.style.setProperty('--spell-radius-near', `${-blueprint.spread * 0.08}px`);
    piece.style.setProperty('--spell-piece-delay', `${index * -47}ms`);
    layer.appendChild(piece);
  }
  layer.setAttribute('aria-hidden', 'true');
  return layer;
}
import { createSpellCanvas, SPELL_PIXEL_SEQUENCES } from './SpellCanvasRenderer.js';
