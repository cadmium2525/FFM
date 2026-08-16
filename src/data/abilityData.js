import { battleReadyItems, itemRecordToAction, magicActionsForSchool } from '../database/battleCatalog.js';
import { ff5Songs } from '../database/ff5Database.js';
import { ff5MixActions } from '../battle/FF5MixCatalog.js';

/**
 * ctbCost is a multiplier applied to the CTB threshold when an action is
 * consumed: >1.0 delays the unit's next turn (slow/heavy actions),
 * <1.0 brings the next turn sooner (quick actions like Defend).
 */

export const basicCommands = [
  { id: 'attack', label: 'たたかう' },
  { id: 'ability', label: 'アビリティ' },
  { id: 'crystal', label: 'えんばんせき' },
  { id: 'item', label: 'アイテム' },
  { id: 'defend', label: 'ぼうぎょ' },
];

export const attackAction = {
  id: 'attack',
  name: 'こうげき',
  ctbCost: 1.0,
  power: 1.0,
  element: null,
  target: 'single-enemy',
};

export const defendAction = {
  id: 'defend',
  name: 'ぼうぎょ',
  ctbCost: 0.55,
  power: 0,
  element: null,
  target: 'self',
  damageTakenMultiplier: 0.5,
};

export const itemActions = Object.freeze(battleReadyItems.map(itemRecordToAction));

// Battle menus are generated directly from the reference database. Adding or
// correcting a spell record therefore updates every command that consumes it.
export const magicSets = {
  '白魔法': magicActionsForSchool('white'),
  '黒魔法': magicActionsForSchool('black'),
  '召喚魔法': magicActionsForSchool('summon'),
  '時空魔法': magicActionsForSchool('time'),
  '青魔法': magicActionsForSchool('blue'),
  '赤魔法': [
    ...magicActionsForSchool('white', { maxLevel: 3 }),
    ...magicActionsForSchool('black', { maxLevel: 3 }),
  ],
  // Characters without a magic command keep a single basic recovery option.
  'たたかう型': magicActionsForSchool('white').filter((spell) => spell.sourceId === 'magic_cure'),
};

const directAbilityActions = Object.freeze({
  ability_guard: [{ id: 'guard', name: 'まもり', actionKind: 'guard', ctbCost: 0.7, target: 'self' }],
  ability_focus: [{ id: 'focus', name: 'ためる', actionKind: 'focus', commandFormula: 'focus', ctbCost: 0.8, target: 'self' }],
  ability_chakra: [{ id: 'chakra', name: 'チャクラ', actionKind: 'special-command', specialCommand: 'chakra', ctbCost: 0.9, target: 'self' }],
  ability_image: [{ id: 'image', name: 'ぶんしん', actionKind: 'image', imageHits: 2, ctbCost: 0.9, target: 'self' }],
  ability_aim: [{ id: 'aim', name: 'ねらう', actionKind: 'physical-attack', commandFormula: 'aim', ignoreEvasion: true, ctbCost: 1.0, target: 'single-enemy' }],
  ability_rapid_fire: [{ id: 'rapid-fire', name: 'みだれうち', actionKind: 'physical-attack', commandFormula: 'rapid-fire', hits: 4, ignoreEvasion: true, ctbCost: 1.5, target: 'single-enemy' }],
  ability_jump: [{ id: 'jump', name: 'ジャンプ', actionKind: 'special-command', specialCommand: 'jump', commandFormula: 'jump', ctbCost: 1.0, target: 'single-enemy' }],
  ability_lance: [{ id: 'lance', name: 'りゅうけん', actionKind: 'special-command', specialCommand: 'lance', ctbCost: 1.1, target: 'single-enemy' }],
  ability_mug: [{ id: 'mug', name: 'ぶんどる', actionKind: 'special-command', specialCommand: 'mug', ctbCost: 1.1, target: 'single-enemy' }],
  ability_gaia: [{ id: 'gaia', name: 'ちけい', actionKind: 'special-command', specialCommand: 'gaia', ctbCost: 1.0, target: 'single-enemy' }],
  ability_throw: [
    { id: 'throw-fire-scroll', name: 'かとんのじゅつ', actionKind: 'special-command', specialCommand: 'throw', requiredItemId: 'item_fire_scroll', throwPower: 120, element: 'fire', ctbCost: 1, target: 'all_enemies' },
    { id: 'throw-water-scroll', name: 'すいとんのじゅつ', actionKind: 'special-command', specialCommand: 'throw', requiredItemId: 'item_water_scroll', throwPower: 120, element: 'water', ctbCost: 1, target: 'all_enemies' },
    { id: 'throw-lightning-scroll', name: 'らいじんのじゅつ', actionKind: 'special-command', specialCommand: 'throw', requiredItemId: 'item_lightning_scroll', throwPower: 120, element: 'thunder', ctbCost: 1, target: 'all_enemies' },
    { id: 'throw-ash', name: 'すす', actionKind: 'special-command', specialCommand: 'throw', requiredItemId: 'item_ash', throwPower: 50, ctbCost: 1, target: 'single-enemy' },
  ],
  ability_mineuchi: [{ id: 'mineuchi', name: 'みねうち', actionKind: 'scripted', operations: [{ op: 'damage.physical', power: 1 }, { op: 'status.apply', statuses: ['paralyze'], statusChance: 0.5 }], ctbCost: 1, target: 'single-enemy' }],
  ability_zeninage: [{ id: 'zeninage', name: 'ぜになげ', actionKind: 'special-command', specialCommand: 'zeninage', ctbCost: 1.3, target: 'all_enemies' }],
  ability_iainuki: [{ id: 'iainuki', name: 'いあいぬき', actionKind: 'status', statuses: ['ko'], statusChance: 0.85, heavyImmune: true, ctbCost: 1.4, target: 'all_enemies' }],
  ability_dance: [{ id: 'dance', name: 'おどる', actionKind: 'special-command', specialCommand: 'dance', ctbCost: 1.0, target: 'single-enemy' }],
  ability_mix: ff5MixActions,
  ability_drink: [
    ['item_giant_drink', 'きょじんのくすり', 'giant'], ['item_power_drink', 'ちからのくすり', 'power'],
    ['item_speed_shake', 'スピードドリンク', 'speed'], ['item_iron_draft', 'プロテスドリンク', 'iron'],
    ['item_hero_s_cocktail', 'えいゆうのくすり', 'hero'],
  ].map(([requiredItemId, name, drinkEffect]) => ({ id: `drink-${drinkEffect}`, name, actionKind: 'special-command', specialCommand: 'drink', requiredItemId, drinkEffect, ctbCost: 0.8, target: 'self' })),
  ability_scram: [{ id: 'scram', name: 'とんずら', actionKind: 'scripted', ctbCost: 0.45, target: 'self', disabledReason: 'ボス戦からは逃走できない。' }],
  ability_steal: [{ id: 'steal', name: 'ぬすむ', actionKind: 'special-command', specialCommand: 'steal', ctbCost: 0.75, target: 'single-enemy' }],
  ability_check: [{ id: 'check', name: 'しらべる', actionKind: 'scan', ctbCost: 0.65, target: 'single-enemy' }],
  ability_scan: [{ id: 'scan', name: 'みやぶる', actionKind: 'scan', ctbCost: 0.8, target: 'single-enemy' }],
  ability_calm: [{ id: 'calm', name: 'なだめる', actionKind: 'special-command', specialCommand: 'calm', ctbCost: 0.8, target: 'single-enemy' }],
  ability_control: [{ id: 'control', name: 'あやつる', actionKind: 'special-command', specialCommand: 'control', ctbCost: 1.0, target: 'single-enemy' }],
  ability_catch: [
    { id: 'catch', name: 'とらえる', actionKind: 'special-command', specialCommand: 'catch', ctbCost: 1.15, target: 'single-enemy', requiresNoCapture: true },
    { id: 'release', name: 'はなつ', actionKind: 'special-command', specialCommand: 'release', ctbCost: 1.15, target: 'all_enemies', requiresCapture: true },
  ],
  ability_smoke: [{ id: 'smoke', name: 'けむりだま', actionKind: 'scripted', ctbCost: 0.45, target: 'self', disabledReason: 'ボス戦からは逃走できない。' }],
  ability_animals: [{ id: 'animals', name: 'どうぶつ', actionKind: 'special-command', specialCommand: 'animals', ctbCost: 1.0, target: 'single-enemy' }],
  ability_hide: [{ id: 'hide', name: 'かくれる', actionKind: 'special-command', specialCommand: 'hide', ctbCost: 0.65, target: 'self' }],
  ability_flirt: [{ id: 'flirt', name: 'いろめ', actionKind: 'status', statuses: ['confuse'], statusChance: 0.78, ctbCost: 0.85, target: 'single-enemy' }],
  ability_recover: [{ id: 'recover', name: 'ちゆ', actionKind: 'cleanse', mode: 'all_curable', statuses: [], ctbCost: 1.15, target: 'all_allies' }],
  ability_revive: [{ id: 'revive-party', name: 'そせい', actionKind: 'revive', hpRatio: 0.25, ctbCost: 1.4, target: 'all_allies' }],
  ability_mimic: [{ id: 'mimic', name: 'ものまね', actionKind: 'special-command', specialCommand: 'mimic', ctbCost: 0.9, target: 'self' }],
});

const abilityMagicSet = Object.freeze({
  ability_white_magic: '白魔法', ability_black_magic: '黒魔法', ability_summon: '召喚魔法',
  ability_time_magic: '時空魔法', ability_red_magic: '赤魔法', ability_blue_magic: '青魔法',
});

export function getAbilityActions(abilityId) {
  if (abilityMagicSet[abilityId]) {
    return magicSets[abilityMagicSet[abilityId]].map((spell) => ({
      ...spell,
      commandSourceId: abilityId,
    }));
  }
  if (abilityId === 'ability_dualcast') {
    return magicSets['赤魔法'].map((spell) => ({
      ...spell,
      id: `dual-${spell.id}`,
      visualId: `ability_dualcast_${spell.sourceId}`,
      commandSourceId: 'ability_dualcast',
      dualcastCandidate: true,
    }));
  }
  if (abilityId === 'ability_spellblade') {
    return [
      ['fire', 'ファイア剣', 'fire', 2, 5], ['blizzard', 'ブリザド剣', 'ice', 2, 5], ['thunder', 'サンダー剣', 'thunder', 2, 5],
      ['poison', 'ポイズン剣', 'poison', 1, 5, 'poison'], ['silence', 'サイレス剣', null, 1, 5, 'silence'], ['sleep', 'スリプル剣', null, 1, 5, 'sleep'],
      ['fira', 'ファイラ剣', 'fire', 2, 10], ['blizzara', 'ブリザラ剣', 'ice', 2, 10], ['thundara', 'サンダラ剣', 'thunder', 2, 10],
      ['drain', 'ドレイン剣', null, 1, 15, 'drain'], ['break', 'ブレイク剣', null, 1, 15, 'petrify'], ['bio', 'バイオ剣', 'poison', 2, 15, 'poison'],
      ['firaga', 'ファイガ剣', 'fire', 3, 20], ['blizzaga', 'ブリザガ剣', 'ice', 3, 20], ['thundaga', 'サンダガ剣', 'thunder', 3, 20],
      ['holy', 'ホーリー剣', 'holy', 3, 30], ['flare', 'フレア剣', null, 1, 30, 'flare'], ['osmose', 'アスピル剣', null, 1, 1, 'osmose'],
    ].map(([id, name, element, spellbladeTier, mpCost, spellbladeEffect]) => ({
      id: `spellblade-${id}`, name, actionKind: 'imbue', element, spellbladeTier, spellbladeEffect, mpCost, ctbCost: 0.8, target: 'self',
    })).map((action) => ({ ...action, sourceType: 'ability', sourceId: 'ability_spellblade', visualId: `ability_spellblade_${action.id}` }));
  }
  if (abilityId === 'ability_call') return [{ id: 'call', sourceId: 'ability_call', sourceType: 'ability', visualId: 'ability_call_random', commandSourceId: 'ability_call', name: 'よびだす', actionKind: 'special-command', specialCommand: 'call', target: 'all_enemies', ctbCost: 1, mpCost: 0 }];
  if (abilityId === 'ability_sing') {
    // Instant songs each apply a specific status; continuous songs are
    // stat-up buffs that persist while the dancer keeps singing.
    const instantSongEffects = Object.freeze({
      song_mighty_march: { actionKind: 'status', statuses: ['regen'] },
      song_romeo_s_ballad: { actionKind: 'status', statuses: ['stop'], statusChance: 0.62, element: 'sound' },
      song_alluring_air: { actionKind: 'status', statuses: ['confuse'], statusChance: 0.62, element: 'sound' },
      song_requiem: { actionKind: 'magic-attack', element: 'holy', power: 2.2 },
    });
    return ff5Songs.map((song, index) => {
      const instant = instantSongEffects[song.id];
      return {
        id: song.id,
        sourceId: song.id,
        sourceType: 'song',
        commandSourceId: 'ability_sing',
        visualId: song.id,
        name: song.nameJa,
        actionKind: instant?.actionKind ?? 'special-command',
        specialCommand: instant ? null : 'sing',
        songMode: song.mode,
        element: instant?.element ?? null,
        power: instant?.power,
        statuses: instant?.statuses ?? [],
        statusChance: instant?.statusChance,
        stat: song.id.includes('mana') ? 'magic' : song.id.includes('sinewy') ? 'atk' : 'agility',
        multiplier: 1.18 + index * 0.01,
        ctbCost: song.mode === 'continuous' ? 1.15 : 1,
        target: song.target,
        effect: song.effect,
      };
    });
  }
  return (directAbilityActions[abilityId] ?? []).map((action) => ({
    ...action,
    sourceType: 'ability',
    sourceId: abilityId,
    visualId: `${abilityId}_${action.id}`,
  }));
}

export function isAbilityImplemented(abilityId) {
  return getAbilityActions(abilityId).length > 0;
}

export const abilityMenu = {
  id: 'ability_review',
  note: 'アビリティ枠はプロトタイプでは「まほう」に統合されています。',
};
