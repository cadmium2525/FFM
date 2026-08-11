import { GameState, States } from './core/GameState.js';
import { eventBus } from './core/EventBus.js';
import { Unit } from './battle/Unit.js';
import { BattleManager } from './battle/BattleManager.js';
import { BattleUI } from './ui/BattleUI.js';
import { IntermissionUI } from './ui/IntermissionUI.js';
import { partyData, weaponOptions } from './data/partyData.js';
import { bossData } from './data/bossData.js';

// ---------- Screen switching ----------
const screens = {
  TITLE: document.getElementById('title-screen'),
  BATTLE: document.getElementById('battle-screen'),
  INTERMISSION: document.getElementById('intermission-screen'),
  VICTORY: document.getElementById('victory-screen'),
  GAMEOVER: document.getElementById('gameover-screen'),
};

function showScreen(stateName) {
  Object.values(screens).forEach((el) => el.classList.remove('active-screen'));
  screens[stateName]?.classList.add('active-screen');
}

eventBus.on('state:changed', ({ next }) => showScreen(next));

// ---------- Persistent party (carries HP/MP/equip across bosses) ----------
let livingParty = null; // array of plain-state objects, rebuilt into Units per battle

function freshPartyState() {
  return partyData.map((p) => ({
    ...p,
    hp: p.maxHp,
    mp: p.maxMp,
    baseAtk: p.atk,
    weaponId: 'w_neutral',
    weaponElement: null,
    weaponAtkBonus: 0,
  }));
}

function buildPartyUnits(state) {
  return state.map(
    (p) =>
      new Unit({
        id: p.id,
        name: p.name,
        role: p.role,
        isEnemy: false,
        maxHp: p.maxHp,
        hp: p.hp,
        maxMp: p.maxMp,
        mp: p.mp,
        atk: p.baseAtk + (p.weaponAtkBonus ?? 0),
        def: p.def,
        magic: p.magic,
        agility: p.agility,
        weaponElement: p.weaponElement,
      })
  );
}

function syncStateFromUnits(state, units) {
  // Only HP/MP change during battle (atk/weapon/ability-set are edited only
  // in the intermission screen), so that's all that needs to flow back.
  state.forEach((p, i) => {
    p.hp = units[i].hp;
    p.mp = units[i].mp;
  });
}

function buildBossUnit(bossConfig) {
  return new Unit({
    id: bossConfig.id,
    name: bossConfig.name,
    isEnemy: true,
    maxHp: bossConfig.maxHp,
    atk: bossConfig.atk,
    def: bossConfig.def,
    magic: bossConfig.magic,
    agility: bossConfig.agility,
    weakness: bossConfig.weakness,
    resist: bossConfig.resist,
    size: bossConfig.size,
    ai: bossConfig.ai,
  });
}

// ---------- UI instances ----------
const battleUI = new BattleUI();
const intermissionUI = new IntermissionUI();

// ---------- Boss rush flow ----------
function startNewRun() {
  GameState.bossIndex = 0;
  livingParty = freshPartyState();
  startBossBattle();
}

function startBossBattle() {
  showScreen('BATTLE');
  GameState.set(States.BATTLE);

  const partyUnits = buildPartyUnits(livingParty);
  const bossConfig = bossData[GameState.bossIndex];
  const bossUnit = buildBossUnit(bossConfig);

  const battleManager = new BattleManager(partyUnits, bossUnit);
  battleUI.attachBattle(battleManager);

  const onEnd = ({ result }) => {
    eventBus.off('battle:end', onEnd);
    syncStateFromUnits(livingParty, partyUnits);

    if (result === 'victory') {
      setTimeout(() => goToIntermissionOrWin(), 1200);
    } else {
      setTimeout(() => {
        GameState.set(States.GAMEOVER);
      }, 1200);
    }
  };
  eventBus.on('battle:end', onEnd);

  battleManager.start();
}

function goToIntermissionOrWin() {
  GameState.bossIndex += 1;
  if (GameState.bossIndex >= bossData.length) {
    GameState.set(States.VICTORY);
    return;
  }
  GameState.set(States.INTERMISSION);
  showScreen('INTERMISSION');

  const partyUnits = buildPartyUnits(livingParty).map((u, i) => {
    // carry over runtime-editable fields onto plain state objects for the UI
    return Object.assign(u, {
      baseAtk: livingParty[i].baseAtk,
      weaponId: livingParty[i].weaponId,
      equippedAbilitySet: livingParty[i].equippedAbilitySet,
    });
  });

  intermissionUI.render(partyUnits, bossData[GameState.bossIndex]);

  document.getElementById('ready-button').onclick = () => {
    // pull edits back into livingParty plain-state
    partyUnits.forEach((u, i) => {
      livingParty[i].weaponId = u.weaponId;
      livingParty[i].weaponElement = u.weaponElement;
      livingParty[i].baseAtk = u.baseAtk;
      const chosenWeapon = weaponOptions.find((w) => w.id === u.weaponId);
      livingParty[i].weaponAtkBonus = chosenWeapon ? chosenWeapon.atkBonus : 0;
      livingParty[i].equippedAbilitySet = u.equippedAbilitySet;
      // full heal between fights, FF5-style save point feel
      livingParty[i].hp = livingParty[i].maxHp;
      livingParty[i].mp = livingParty[i].maxMp;
    });
    startBossBattle();
  };
}

// ---------- Title / restart wiring ----------
document.getElementById('start-button').addEventListener('click', () => {
  startNewRun();
});

document.getElementById('restart-button-win').addEventListener('click', () => {
  GameState.set(States.TITLE);
});

document.getElementById('restart-button-lose').addEventListener('click', () => {
  GameState.set(States.TITLE);
});

// initial screen
showScreen('TITLE');
