import { battleReadyAbilities, battleReadyMagic, battleReadyShards, battleReadySongs } from '../database/battleCatalog.js';

const FAMILY_PROFILES = Object.freeze({
  restorative: ['ascend', 'petal-mandala', 'orbit-inward', 'soft-bloom'],
  resurrection: ['rise', 'winged-halo', 'vertical-return', 'soul-rejoin'],
  cleanse: ['unweave', 'concentric-lattice', 'radial-outward', 'prismatic-dissolve'],
  ward: ['assemble', 'hex-shield', 'intercept', 'barrier-ripple'],
  pyromancy: ['coil-and-burst', 'ember-torus', 'ballistic-arc', 'cinder-bloom'],
  cryomancy: ['crystallize', 'fractal-spire', 'ground-eruption', 'shard-fracture'],
  voltaic: ['branch', 'forked-bolt', 'sky-strike', 'arc-discharge'],
  aeromancy: ['spiral-cut', 'crescent-vortex', 'crosswind', 'vacuum-slice'],
  geomancy: ['heave', 'fault-prism', 'ground-wave', 'terrain-rupture'],
  hydromancy: ['ribbon-flow', 'water-lens', 'serpentine', 'pressure-ring'],
  sacred: ['consecrate', 'solar-cross', 'zenith-ray', 'radiant-pillar'],
  venom: ['seep', 'spore-cell', 'drifting-cloud', 'corrosive-splash'],
  astral: ['stellar-bloom', 'star-core', 'converging-orbit', 'whiteout-nova'],
  gravity: ['implode', 'target-reticle', 'lock-on-drop', 'space-compress'],
  judgment: ['countdown', 'execution-sigil', 'vertical-descent', 'soul-shatter'],
  affliction: ['bind', 'thorn-glyph', 'homing-thread', 'status-brand'],
  enhancement: ['attune', 'crown-ring', 'ally-orbit', 'aura-lock'],
  chronomancy: ['phase-shift', 'clock-lattice', 'time-helix', 'afterimage-snap'],
  'null-field': ['hush', 'broken-staff-ring', 'field-expansion', 'sound-collapse'],
  spatial: ['fold', 'doorway-polyhedron', 'vanishing-curve', 'space-iris'],
  'temporal-reversal': ['rewind', 'reverse-hourglass', 'reverse-spiral', 'timeline-snap'],
  siphon: ['tether', 'double-helix', 'target-to-caster', 'essence-transfer'],
  kinetic: ['lunge', 'impact-chevron', 'direct-line', 'hit-stop'],
  barrage: ['stutter-dash', 'multi-chevron', 'ricochet-chain', 'multi-impact'],
  scan: ['sweep', 'analysis-grid', 'orbital-scan', 'data-resolve'],
  sacrifice: ['collapse-inward', 'broken-halo', 'caster-to-target', 'bloodless-flash'],
  invocation: ['manifest', 'summoning-polygram', 'gate-to-field', 'eidolon-echo'],
  performance: ['conduct', 'wave-staff', 'stage-sweep', 'resonance-ring'],
  alchemy: ['combine', 'vial-constellation', 'cross-orbit', 'compound-pop'],
  stealth: ['vanish', 'smoke-knot', 'evasive-curve', 'shadow-cut'],
  armament: ['equip-flare', 'weapon-wireframe', 'hand-to-weapon', 'metal-chime'],
  'passive-aura': ['breathe', 'inscribed-aura', 'body-orbit', 'aura-pulse'],
  fieldcraft: ['survey', 'map-contour', 'forward-scan', 'path-reveal'],
  grimoire: ['page-turn', 'spellbook-grid', 'glyph-to-caster', 'command-ready'],
  mimicry: ['echo', 'mirror-frame', 'trace-replay', 'echo-impact'],
  throw: ['lunge', 'impact-chevron', 'ballistic-arc', 'hit-stop'],
  jump: ['lunge', 'fault-prism', 'sky-strike', 'terrain-rupture'],
  dance: ['conduct', 'wave-staff', 'stage-sweep', 'resonance-ring'],
  steal: ['vanish', 'smoke-knot', 'target-to-caster', 'shadow-cut'],
});

const ELEMENT_FAMILY = Object.freeze({
  fire: 'pyromancy', ice: 'cryomancy', lightning: 'voltaic', thunder: 'voltaic',
  wind: 'aeromancy', earth: 'geomancy', water: 'hydromancy', holy: 'sacred', poison: 'venom',
});

const ABILITY_FAMILY_BY_ID = Object.freeze({
  ability_guard: 'ward',
  ability_focus: 'enhancement',
  ability_chakra: 'restorative',
  ability_scram: 'stealth',
  ability_steal: 'steal',
  ability_mug: 'steal',
  ability_check: 'scan',
  ability_blue_magic: 'grimoire',
  ability_scan: 'scan',
  ability_white_magic: 'grimoire',
  ability_black_magic: 'grimoire',
  ability_spellblade: 'armament',
  ability_summon: 'invocation',
  ability_call: 'invocation',
  ability_time_magic: 'chronomancy',
  ability_red_magic: 'grimoire',
  ability_dualcast: 'barrage',
  ability_calm: 'affliction',
  ability_control: 'affliction',
  ability_catch: 'stealth',
  ability_gaia: 'geomancy',
  ability_smoke: 'stealth',
  ability_image: 'ward',
  ability_throw: 'throw',
  ability_animals: 'invocation',
  ability_aim: 'kinetic',
  ability_rapid_fire: 'barrage',
  ability_hide: 'stealth',
  ability_sing: 'performance',
  ability_mineuchi: 'affliction',
  ability_zeninage: 'throw',
  ability_iainuki: 'judgment',
  ability_flirt: 'affliction',
  ability_dance: 'dance',
  ability_jump: 'jump',
  ability_lance: 'siphon',
  ability_mix: 'alchemy',
  ability_drink: 'alchemy',
  ability_recover: 'cleanse',
  ability_revive: 'resurrection',
  ability_mimic: 'mimicry',
});

const SUMMON_MOTIFS = Object.freeze({
  magic_chocobo: 'comet-beak',
  magic_sylph: 'twin-feather',
  magic_remora: 'chain-cell',
  magic_shiva: 'frost-crown',
  magic_ramuh: 'forked-staff',
  magic_ifrit: 'horned-flame',
  magic_titan: 'mountain-fist',
  magic_golem: 'guardian-slab',
  magic_catoblepas: 'gaze-eye',
  magic_carbuncle: 'prism-jewel',
  magic_syldra: 'tidal-wing',
  magic_odin: 'spear-wheel',
  magic_phoenix: 'rebirth-wing',
  magic_leviathan: 'abyss-spiral',
  magic_bahamut: 'megaflare-crown',
});

const SONG_PATTERNS = Object.freeze({
  song_mighty_march: 'march-pulse',
  song_romeo_s_ballad: 'heart-stop',
  song_alluring_air: 'allure-spiral',
  song_requiem: 'requiem-fall',
  song_swift_song: 'swift-staccato',
  song_mana_s_paean: 'mana-helix',
  song_sinewy_etude: 'sinewy-beat',
  song_hero_s_rime: 'hero-crescendo',
});

const SIGNATURE_GLYPHS = Object.freeze({
  magic_missile: '⌖',
  magic_flare: '✹',
  magic_level_3_flare: 'Ⅲ',
  magic_level_5_death: 'Ⅴ',
});

const TEXTURE_MODES = Object.freeze([
  'etched-light', 'volumetric-mist', 'faceted-glass', 'inked-energy',
  'metallic-rune', 'soft-plasma', 'refractive-crystal', 'grain-spark',
]);
const PULSE_PATTERNS = Object.freeze(['single-accent', 'doublet', 'triplet-rise', 'syncopated', 'accelerando', 'heartbeat', 'countdown', 'wave-train']);
const SECONDARY_GEOMETRY = Object.freeze(['orbit-dots', 'split-rings', 'rune-spokes', 'trailing-diamonds', 'micro-spirals', 'radial-bars', 'broken-arcs', 'constellation-lines']);
const EASINGS = Object.freeze(['cubic-out', 'sine-in-out', 'expo-out', 'back-out', 'circ-in-out']);
const ENTRANCES = Object.freeze(['fade-scale', 'draw-on', 'materialize', 'snap-focus']);
const FORMATIONS = Object.freeze(['radial', 'staggered-line', 'nested-orbit', 'fan', 'cross-axis', 'constellation']);
const IMPACT_PLACEMENTS = Object.freeze(['target-core', 'ground-contact', 'silhouette-edge', 'screen-depth']);
const CAMERA_CUES = Object.freeze(['micro-push', 'lateral-track', 'impact-lock', 'depth-rack', 'vertical-tilt']);
const TARGET_REACTIONS = Object.freeze(['recoil', 'lift', 'compress', 'stagger-freeze', 'silhouette-flash', 'dissolve-edge']);
const SCHOOL_GLYPHS = Object.freeze({ white: '✦', black: '◆', time: '⌛', summon: '◇', blue: '◈' });
const TYPE_GLYPHS = Object.freeze({ command: '✧', passive: '○', equip: '△', field: '⌖' });
const FAMILY_PALETTES = Object.freeze({
  restorative: ['#f5fff7', '#65f0b1', '#168f70'], resurrection: ['#fffceb', '#ffd96a', '#f28b4b'],
  cleanse: ['#f8ffff', '#8de9ff', '#8c7cff'], ward: ['#edf7ff', '#55b9ff', '#3256bd'],
  pyromancy: ['#fff0bc', '#ff7538', '#a81231'], cryomancy: ['#f4ffff', '#79d7ff', '#5265ca'],
  voltaic: ['#ffffcf', '#b594ff', '#4c26a8'], aeromancy: ['#eafff4', '#6ce0c1', '#297f9a'],
  geomancy: ['#ffefc3', '#c39255', '#61433d'], hydromancy: ['#e9fbff', '#3fbce7', '#1856a4'],
  sacred: ['#fffef0', '#ffe672', '#e8a937'], venom: ['#efffc7', '#70ca4f', '#6b267f'],
  astral: ['#ffffff', '#70d4ff', '#7251d1'], gravity: ['#eadfff', '#7f62b7', '#1c173f'],
  judgment: ['#fff4e5', '#eb4b63', '#3a0c28'], affliction: ['#ffdff3', '#c852aa', '#49205c'],
  enhancement: ['#f4f5ff', '#77a5ff', '#4a4fd4'], chronomancy: ['#e7ffff', '#41e5dc', '#4b45bd'],
  'null-field': ['#edf0ff', '#788099', '#171b2f'], spatial: ['#edffff', '#4cc8c9', '#34368e'],
  'temporal-reversal': ['#fff2fa', '#e178cd', '#564eae'], siphon: ['#ffe6eb', '#d75075', '#5a214c'],
  kinetic: ['#fff4dc', '#ff9b48', '#8c3c32'], barrage: ['#fff8d6', '#ffc23d', '#d44439'],
  scan: ['#e7ffff', '#4be1ed', '#25639f'], sacrifice: ['#fff0f0', '#d74559', '#46182a'],
  invocation: ['#fff8e8', '#d99cff', '#4b469d'], performance: ['#fff0ff', '#ed7fda', '#6255c9'],
  alchemy: ['#efffdc', '#91dc5c', '#3d8473'], stealth: ['#edf1f4', '#6b8294', '#242b3b'],
  armament: ['#f5f8ff', '#9aafc9', '#46556d'], 'passive-aura': ['#f3f7ff', '#8ba9db', '#435878'],
  fieldcraft: ['#f3ffe8', '#79be72', '#3f6558'], grimoire: ['#f4edff', '#9b80e8', '#473879'],
  mimicry: ['#ffffff', '#a5b5ca', '#4b536b'],
  throw: ['#fff7df', '#ffbd5c', '#73412f'], jump: ['#effcff', '#82dcff', '#344c9c'],
  dance: ['#fff0ff', '#ef86dc', '#5c4cc0'], steal: ['#eafffb', '#79ead3', '#4059a8'],
});
const POSITIVE_STATUS = /回復|復帰|治療|上昇|軽減|回避|リフレク|浮遊|強化|無効|防ぐ|肩代わり/;

function hash32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hasOperation(record, ...operations) {
  return record.battle.operations.some((operation) => operations.includes(operation.op));
}

function magicFamily(record) {
  if (record.id === 'magic_missile') return 'gravity';
  if (record.id === 'magic_flare' || record.id === 'magic_level_3_flare') return 'astral';
  if (record.id === 'magic_level_5_death') return 'judgment';
  if (record.id === 'magic_return') return 'temporal-reversal';
  if (hasOperation(record, 'barrier.physical')) return 'ward';
  if (hasOperation(record, 'battle.speed', 'turn.extra', 'stat.song_growth')) return 'chronomancy';
  if (hasOperation(record, 'battle.field_status')) return 'null-field';
  if (hasOperation(record, 'battle.escape', 'remove.from_battle')) return 'spatial';
  if (hasOperation(record, 'revive')) return 'resurrection';
  if (hasOperation(record, 'restore.full', 'heal.hp', 'heal.caster_hp', 'heal.mp')) return 'restorative';
  if (hasOperation(record, 'status.remove', 'status.dispel')) return 'cleanse';
  if (hasOperation(record, 'drain.hp', 'drain.mp')) return 'siphon';
  if (hasOperation(record, 'damage.hp_ratio', 'damage.mp_ratio')) return 'gravity';
  if (hasOperation(record, 'damage.fixed', 'damage.missing_hp')) return 'kinetic';
  if (hasOperation(record, 'damage.caster_hp', 'caster.sacrifice')) return 'sacrifice';
  if (hasOperation(record, 'inspect')) return 'scan';
  if (hasOperation(record, 'status.apply')) return POSITIVE_STATUS.test(record.effect) ? 'enhancement' : 'affliction';
  if (record.battle.element && ELEMENT_FAMILY[record.battle.element]) return ELEMENT_FAMILY[record.battle.element];
  if (record.school === 'summon') return 'invocation';
  if (hasOperation(record, 'damage.magic')) return record.effect.includes('複数回') ? 'barrage' : 'astral';
  return record.school === 'time' ? 'chronomancy' : 'grimoire';
}

function abilityFamily(record) {
  const effect = record.effect ?? '';
  if (ABILITY_FAMILY_BY_ID[record.id]) return ABILITY_FAMILY_BY_ID[record.id];
  if (record.id === 'ability_mimic') return 'mimicry';
  if (record.type === 'equip') return 'armament';
  if (record.type === 'passive') return 'passive-aura';
  if (record.type === 'field') return 'fieldcraft';
  if (/魔法を使用|青魔法|白魔法|黒魔法|召喚魔法|時空魔法|連続で/.test(effect)) return 'grimoire';
  if (/回復|治療|復帰|そせい/.test(effect)) return 'restorative';
  if (/歌|うた|踊り|おどる/.test(effect)) return 'performance';
  if (/調合|薬|飲む|アイテム/.test(effect)) return 'alchemy';
  if (/逃走|退避|隠し|盗|捕獲|けむり/.test(effect)) return 'stealth';
  if (/調べる|詳細情報|発見/.test(effect)) return 'scan';
  if (/複数|4回|2回攻撃|連撃/.test(effect)) return 'barrage';
  if (/攻撃|一撃|投擲|ジャンプ|即死|麻痺/.test(effect)) return 'kinetic';
  if (/無効|回避|バリア|分身|止める/.test(effect)) return 'ward';
  if (/付与|上昇|強化|高める/.test(effect)) return 'enhancement';
  return 'mimicry';
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function familyFor(record, sourceType) {
  if (sourceType === 'magic') return magicFamily(record);
  if (sourceType === 'song') return 'performance';
  if (sourceType === 'crystal') return ELEMENT_FAMILY[record.battle.element] ?? 'invocation';
  return abilityFamily(record);
}

function makeDescriptor(record, sourceType, ordinal, familyOrdinal) {
  const family = familyFor(record, sourceType);
  const [motionKind, primaryGeometry, trajectoryKind, baseImpact] = FAMILY_PROFILES[family];
  const seed = hash32(`${record.id}|${record.effect}|${ordinal}`);
  const pick = (list, shift = 0) => list[(seed >>> shift) % list.length];
  const intensity = sourceType === 'magic'
    ? Math.max(1, Math.min(6, (record.level ?? Math.ceil((record.mpCost ?? 0) / 14)) || 2))
    : 1 + ((ordinal + familyOrdinal) % 6);
  const windupMs = 170 + intensity * 38 + (seed % 47);
  const travelMs = 120 + ((seed >>> 5) % 190);
  const impactMs = 110 + intensity * 26 + ((seed >>> 11) % 71);
  const decayMs = 160 + ((seed >>> 17) % 180);
  const beats = 1 + intensity + ((seed >>> 23) % 3);
  const glyphRoot = SIGNATURE_GLYPHS[record.id] ?? (sourceType === 'magic' ? SCHOOL_GLYPHS[record.school] : sourceType === 'song' ? '♫' : sourceType === 'crystal' ? '◇' : TYPE_GLYPHS[record.type]);
  // Mixed-radix structural axes: the tuple remains unique within a family
  // without relying on palette, text, ID, glyph, particles, timing, or seed.
  const entrance = ENTRANCES[familyOrdinal % ENTRANCES.length];
  const secondary = SECONDARY_GEOMETRY[Math.floor(familyOrdinal / ENTRANCES.length) % SECONDARY_GEOMETRY.length];
  const formation = FORMATIONS[Math.floor(familyOrdinal / (ENTRANCES.length * SECONDARY_GEOMETRY.length)) % FORMATIONS.length];
  const placement = IMPACT_PLACEMENTS[Math.floor(familyOrdinal / 2) % IMPACT_PLACEMENTS.length];
  const cameraCue = CAMERA_CUES[Math.floor(familyOrdinal / 3) % CAMERA_CUES.length];
  const generatedReaction = TARGET_REACTIONS[Math.floor(familyOrdinal / 5) % TARGET_REACTIONS.length];
  const targetReaction = ({
    restorative: 'lift', resurrection: 'silhouette-flash', cleanse: 'dissolve-edge', ward: 'silhouette-flash',
    enhancement: 'lift', alchemy: 'lift', performance: 'lift', cryomancy: 'stagger-freeze',
    gravity: 'compress', judgment: 'dissolve-edge', sacrifice: 'dissolve-edge', kinetic: 'recoil',
    barrage: 'recoil', siphon: 'compress', affliction: 'stagger-freeze', spatial: 'dissolve-edge',
    stealth: 'dissolve-edge', steal: 'dissolve-edge',
  })[family] ?? generatedReaction;
  const summonMotif = sourceType === 'magic' && record.school === 'summon' ? SUMMON_MOTIFS[record.id] : null;
  const songPattern = sourceType === 'song' ? SONG_PATTERNS[record.id] : null;

  return deepFreeze({
    key: record.id,
    id: record.id,
    actionId: record.id,
    sourceType,
    summonMotif,
    songPattern,
    family,
    motion: {
      kind: motionKind,
      entrance,
      rotationDegrees: ((seed >>> 7) % 9 - 4) * 45,
      oscillation: 1 + ((seed >>> 15) % 4),
    },
    geometry: {
      primary: primaryGeometry,
      secondary,
      formation,
      symmetry: 3 + ((seed >>> 9) % 10),
      layers: 2 + ((seed >>> 19) % 4),
    },
    trajectory: {
      kind: trajectoryKind,
      origin: record.target === 'self' ? 'caster-core' : 'caster-glyph',
      targetMode: record.target ?? 'none',
      arcBias: Number((((seed >>> 13) % 101) / 100 - 0.5).toFixed(2)),
      turns: Math.floor(familyOrdinal / (ENTRANCES.length * 2)) % 4,
    },
    pulsePattern: {
      shape: pick(PULSE_PATTERNS, 2),
      beats,
      spacingMs: 48 + ((seed >>> 8) % 93),
      amplitude: Number((0.55 + ((seed >>> 20) % 41) / 100).toFixed(2)),
    },
    particleCount: Math.min(14, 8 + intensity + ((seed >>> 24) % 4)),
    timing: {
      windupMs,
      travelMs,
      impactMs,
      decayMs,
      totalMs: windupMs + travelMs + impactMs + decayMs,
      easing: pick(EASINGS, 6),
    },
    glyph: {
      symbol: glyphRoot ?? '✦',
      runeSequence: `${record.id.replace(/^(magic|ability|song|shard)_/, '').slice(0, 12)}-${seed.toString(36).padStart(7, '0')}`,
      ringCount: 1 + ((seed >>> 12) % 4),
      clockwise: Boolean(seed & 1),
    },
    textureMode: pick(TEXTURE_MODES, 10),
    impactMode: `${baseImpact}:${pick(['center', 'radial', 'directional', 'layered'], 18)}`,
    impact: deepFreeze({ topology: baseImpact, placement }),
    palette: FAMILY_PALETTES[family] ?? FAMILY_PALETTES.astral,
    duration: windupMs + travelMs + impactMs + decayMs,
    titleTag: `${sourceType === 'magic' ? record.school : sourceType === 'song' ? 'song' : record.type}:${record.nameJa ?? record.name ?? record.id}`,
    castMotion: motionKind,
    cameraCue,
    targetReaction,
    audioCue: `${family}:${pick(['chime', 'snap', 'rush', 'rumble', 'pulse'], 16)}`,
    reducedMotionVariant: deepFreeze({ motion: 'cross-fade', cameraCue: 'none', particleCount: Math.min(6, 3 + intensity) }),
    performanceTier: 'iphone12-dom',
    phaseTopology: deepFreeze({
      phases: 2 + (familyOrdinal % 3),
      topology: `${['linear', 'overlap', 'call-response', 'nested'][Math.floor(familyOrdinal / 4) % 4]}-${Math.floor(familyOrdinal / 16) + 1}`,
    }),
    seed,
    mobileBudget: deepFreeze({ maxParticles: 14, usesTransformOnly: true, maxOverdrawLayers: 5 }),
  });
}

const familyCounts = new Map();
function makeRegistry(records, sourceType, offset) {
  return Object.freeze(Object.fromEntries(records.map((record, index) => {
    const family = familyFor(record, sourceType);
    const familyOrdinal = familyCounts.get(family) ?? 0;
    familyCounts.set(family, familyOrdinal + 1);
    return [record.id, makeDescriptor(record, sourceType, offset + index, familyOrdinal)];
  })));
}

export const magicEffectDescriptors = makeRegistry(battleReadyMagic, 'magic', 0);
export const abilityEffectDescriptors = makeRegistry(battleReadyAbilities, 'ability', battleReadyMagic.length);
export const songEffectDescriptors = makeRegistry(battleReadySongs, 'song', battleReadyMagic.length + battleReadyAbilities.length);
export const crystalEffectDescriptors = makeRegistry(battleReadyShards, 'crystal', battleReadyMagic.length + battleReadyAbilities.length + battleReadySongs.length);

export const battleEffectDescriptors = Object.freeze({
  ...magicEffectDescriptors,
  ...abilityEffectDescriptors,
  ...songEffectDescriptors,
  ...crystalEffectDescriptors,
});

export const battleEffectRecipes = battleEffectDescriptors;
const runtimeDescriptorCache = new Map();

export function getBattleEffectDescriptor(id) {
  return battleEffectDescriptors[id] ?? null;
}

export function hasBattleEffectDescriptor(id) {
  return Object.hasOwn(battleEffectDescriptors, id);
}

export function getBattleEffectRecipe(actionOrId) {
  if (typeof actionOrId === 'string') return getBattleEffectDescriptor(actionOrId);
  if (!actionOrId) return null;
  const nested = actionOrId.spell ?? actionOrId.ability ?? actionOrId.song ?? null;
  const candidates = [
    actionOrId.visualId, actionOrId.sourceId, actionOrId.commandSourceId,
    nested?.visualId, nested?.sourceId, nested?.commandSourceId, nested?.id, actionOrId.id,
  ];
  for (const id of candidates) {
    if (id && battleEffectRecipes[id]) return battleEffectRecipes[id];
  }
  return null;
}

/**
 * Renderer-facing resolver. It accepts wrapped menu actions, prefixed runtime
 * IDs (for example dual-magic_fire), or creates a deterministic fallback for
 * a future command that is not in the reference catalog yet.
 */
export function resolveBattleEffectDescriptor(actionOrId) {
  const exact = getBattleEffectRecipe(actionOrId);
  if (exact) return exact;
  const action = typeof actionOrId === 'string' ? { id: actionOrId } : (actionOrId ?? {});
  const nested = action.spell ?? action.ability ?? action.song ?? {};
  const candidates = [action.visualId, action.sourceId, action.commandSourceId, nested.visualId, nested.sourceId, nested.commandSourceId, nested.id, action.id].filter(Boolean);
  const registeredIds = Object.keys(battleEffectRecipes);
  for (const candidate of candidates) {
    const normalized = String(candidate).replaceAll('-', '_');
    const alias = registeredIds.find((id) => normalized === id || normalized.endsWith(id) || normalized.endsWith(id.replace(/^(magic|ability|song)_/, '')));
    if (alias) return battleEffectRecipes[alias];
  }

  const fallbackKey = candidates[0] ?? `runtime_${hash32(JSON.stringify({ kind: action.kind, name: action.name }))}`;
  if (!runtimeDescriptorCache.has(fallbackKey)) {
    runtimeDescriptorCache.set(fallbackKey, makeDescriptor({
      id: `runtime_${String(fallbackKey).replace(/[^a-z0-9_]+/gi, '_').toLowerCase()}`,
      nameJa: action.name ?? nested.name ?? '未登録アクション',
      effect: action.effect ?? nested.effect ?? action.kind ?? '未来の戦闘コマンド',
      target: action.target ?? nested.target ?? 'one_enemy',
      type: 'command',
    }, 'ability', hash32(String(fallbackKey)), hash32(String(fallbackKey)) % 128));
  }
  return runtimeDescriptorCache.get(fallbackKey);
}

export const battleEffectRegistryStats = Object.freeze({
  magic: Object.keys(magicEffectDescriptors).length,
  abilities: Object.keys(abilityEffectDescriptors).length,
  songs: Object.keys(songEffectDescriptors).length,
  crystals: Object.keys(crystalEffectDescriptors).length,
  total: Object.keys(battleEffectDescriptors).length,
});
