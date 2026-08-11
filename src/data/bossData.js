/**
 * Bosses fought in sequence. `size` only affects the placeholder sprite scale.
 * `ai` is a simple behaviour tag consumed by BattleManager's enemy AI step.
 */
export const bossData = [
  {
    id: 'boss1',
    name: 'ロックタイタン',
    maxHp: 3200,
    atk: 55,
    def: 25,
    magic: 10,
    agility: 18,
    weakness: 'water',
    resist: 'earth',
    size: 1.0,
    ai: 'aggressive', // always attacks the highest-ATK looking target
  },
  {
    id: 'boss2',
    name: 'ガルーダ',
    maxHp: 4200,
    atk: 65,
    def: 20,
    magic: 15,
    agility: 34,
    weakness: 'ice',
    resist: 'wind',
    size: 1.1,
    ai: 'random', // attacks a random alive party member
  },
  {
    id: 'boss3',
    name: '邪竜バハムート',
    maxHp: 6000,
    atk: 80,
    def: 30,
    magic: 40,
    agility: 26,
    weakness: 'thunder',
    resist: null,
    size: 1.3,
    ai: 'lowestHp', // targets whoever has the lowest current HP
  },
];

export const elementNames = {
  fire: 'ほのお',
  ice: 'こおり',
  water: 'みず',
  thunder: 'いかずち',
  wind: 'かぜ',
  earth: 'つち',
};
