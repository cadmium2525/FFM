import { CTBEngine } from './CTBEngine.js';
import { resolveAction } from './ActionResolver.js';
import { attackAction, defendAction, itemActions, magicSets } from '../data/abilityData.js';
import { eventBus } from '../core/EventBus.js';

const ENEMY_TURN_DELAY_MS = 900;
const AUTO_ADVANCE_DELAY_MS = 550;

export class BattleManager {
  constructor(partyUnits, bossUnit) {
    this.party = partyUnits;
    this.boss = bossUnit;
    this.units = [...partyUnits, bossUnit];
    this.ctb = new CTBEngine(this.units);

    this.currentActor = null;
    this.awaitingPlayerInput = false;
    this.finished = false;
    this.result = null; // 'victory' | 'defeat'
  }

  log(text) {
    eventBus.emit('battle:log', text);
  }

  broadcastState() {
    eventBus.emit('battle:stateUpdate', {
      party: this.party,
      boss: this.boss,
      preview: this.ctb.previewQueue(8),
    });
  }

  start() {
    this.log(`${this.boss.name} が あらわれた！`);
    this.broadcastState();
    this.scheduleNextTurn(400);
  }

  scheduleNextTurn(delay = AUTO_ADVANCE_DELAY_MS) {
    if (this.finished) return;
    setTimeout(() => this.advanceTurn(), delay);
  }

  checkBattleEnd() {
    if (!this.boss.isAlive()) {
      this.finished = true;
      this.result = 'victory';
      this.log(`${this.boss.name} を たおした！`);
      eventBus.emit('battle:end', { result: 'victory' });
      return true;
    }
    if (this.party.every((p) => !p.isAlive())) {
      this.finished = true;
      this.result = 'defeat';
      this.log('パーティは ぜんめつした...');
      eventBus.emit('battle:end', { result: 'defeat' });
      return true;
    }
    return false;
  }

  advanceTurn() {
    if (this.finished) return;
    const actor = this.ctb.advanceToNextActor();
    if (!actor) return;
    this.currentActor = actor;

    // Reset defend stance at the start of a unit's own turn.
    actor.defending = false;
    actor.physicalDamageMultiplier = actor.equipmentEffects?.physicalDamageMultiplier ?? 1;

    if (actor.isEnemy) {
      this.broadcastState();
      setTimeout(() => this.enemyAct(actor), ENEMY_TURN_DELAY_MS);
    } else {
      this.awaitingPlayerInput = true;
      this.broadcastState();
      eventBus.emit('battle:playerTurn', { actor });
    }
  }

  /** Simple AI: picks a target based on the boss's `ai` behaviour tag. */
  pickEnemyTarget() {
    const aliveParty = this.party.filter((p) => p.isAlive());
    if (aliveParty.length === 0) return null;

    switch (this.boss.ai) {
      case 'lowestHp':
        return aliveParty.reduce((a, b) => (a.hp < b.hp ? a : b));
      case 'aggressive':
        return aliveParty.reduce((a, b) => (a.atk > b.atk ? a : b));
      case 'random':
      default:
        return aliveParty[Math.floor(Math.random() * aliveParty.length)];
    }
  }

  enemyAct(actor) {
    if (this.finished) return;
    const target = this.pickEnemyTarget();
    if (!target) {
      this.checkBattleEnd();
      return;
    }

    const results = resolveAction({
      actor,
      action: { kind: 'physical-attack' },
      targets: [target],
    });

    results.forEach((r) => {
      if (r.type === 'damage') {
        this.log(`${actor.name} の こうげき！ ${target.name} に ${r.amount} の ダメージ！`);
      } else if (r.type === 'miss') {
        this.log(`${actor.name} の こうげきは はずれた！`);
      } else if (r.type === 'blocked') {
        this.log(`${target.name} は こうげきを ふせいだ！`);
      }
    });

    eventBus.emit('battle:actionResolved', { actor, results });
    this.ctb.consumeTurn(actor, attackAction.ctbCost);
    this.broadcastState();

    if (this.checkBattleEnd()) return;
    this.scheduleNextTurn();
  }

  /**
   * Called by the UI once the player has picked a command (+ target).
   * `choice` shape: { kind, name, ctbCost, element, power, mpCost, healAmount }
   */
  submitPlayerAction(choice, targetUnit) {
    if (!this.awaitingPlayerInput || !this.currentActor) return;
    const actor = this.currentActor;

    let action;
    let targets;

    switch (choice.type) {
      case 'attack':
        action = { kind: 'physical-attack' };
        targets = [targetUnit ?? this.boss];
        this.log(`${actor.name} の こうげき！`);
        break;
      case 'magic':
        action = {
          kind: choice.spell.actionKind ?? (choice.spell.healAmount !== undefined && choice.spell.power === undefined
            ? 'heal'
            : 'magic-attack'),
          ...choice.spell,
        };
        targets = [
          action.kind === 'heal' ? targetUnit ?? actor : targetUnit ?? this.boss,
        ];
        this.log(`${actor.name} の ${choice.spell.name}！`);
        break;
      case 'ability':
        action = {
          kind: choice.ability.actionKind ?? (choice.ability.healAmount !== undefined ? 'heal' : 'magic-attack'),
          ...choice.ability,
        };
        targets = [targetUnit ?? (choice.ability.target === 'self' ? actor : this.boss)];
        this.log(`${actor.name} の ${choice.ability.name}！`);
        break;
      case 'item':
        action = { kind: 'heal', healAmount: choice.item.healAmount };
        targets = [targetUnit ?? actor];
        this.log(`${actor.name} は ${choice.item.name} を つかった！`);
        break;
      case 'defend':
        action = { kind: 'defend' };
        targets = [actor];
        this.log(`${actor.name} は みをまもっている。`);
        break;
      default:
        return;
    }

    const results = resolveAction({ actor, action, targets });
    results.forEach((r) => {
      if (r.type === 'damage') {
        const weakText = r.weak ? '(弱点！)' : '';
        const hitText = r.hits > 1 ? ` ${r.hits}ヒット！` : '';
        const nullText = r.nullified ? ' 無効！' : '';
        this.log(`${targets[0].name} に ${r.amount} の ダメージ！${hitText}${weakText}${nullText}`);
      } else if (r.type === 'heal') {
        const healedUnit = this.units.find((unit) => unit.uid === r.targetUid) ?? targets[0];
        this.log(`${healedUnit.name} の HPが ${r.amount} かいふくした。`);
      } else if (r.type === 'mp-heal') {
        this.log(`${actor.name} の MPが ${r.amount} かいふくした。`);
      } else if (r.type === 'miss') {
        this.log(`${r.hits > 1 ? `${r.hits}回 ` : ''}ミス！`);
      } else if (r.type === 'blocked') {
        this.log(`${targets[0].name} は こうげきを ふせいだ！`);
      } else if (r.type === 'absorb') {
        this.log(`${targets[0].name} は属性攻撃を吸収し、HPが ${r.amount} かいふくした。`);
      } else if (r.type === 'buff') {
        this.log(`${actor.name}：${r.label}`);
      }
    });

    eventBus.emit('battle:actionResolved', { actor, results });

    const costUsed = choice.ctbCost ?? 1.0;
    this.ctb.consumeTurn(actor, costUsed);

    this.awaitingPlayerInput = false;
    this.currentActor = null;
    this.broadcastState();

    if (this.checkBattleEnd()) return;
    this.scheduleNextTurn();
  }
}

export { magicSets, itemActions, defendAction };
